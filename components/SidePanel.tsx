'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Target, Calendar, ExternalLink, Send, Hash, CornerDownRight, Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService as api, ObjectiveDetail, PersonBrief } from '@/services/departmentTargets';
import { workcenterService, WCTask } from '@/services/workcenter';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';
import { ProgressBar } from '@/components/QuarterGoalHero';
import { ObjectiveTasks } from '@/components/targets/ObjectiveTasks';
import { TaskObjectiveBadge } from '@/components/targets/TaskObjectiveLink';

export const fmtDay = (iso?: string | null) =>
  iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const Avatar = ({ p, size = 28 }: { p: PersonBrief | { name: string; avatar?: string | null } | null; size?: number }) => {
  if (!p) return <span style={{ width: size, height: size }} className="rounded-full bg-[var(--bg-primary)] text-text-secondary inline-flex items-center justify-center text-[10px] font-bold shrink-0">?</span>;
  // eslint-disable-next-line @next/next/no-img-element
  if (p.avatar) return <img src={p.avatar} alt={p.name} title={p.name} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  const initials = p.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  return <span title={p.name} style={{ width: size, height: size, fontSize: size * 0.38 }} className="rounded-full bg-accent-blue/15 text-accent-blue inline-flex items-center justify-center font-bold shrink-0">{initials}</span>;
};

export const StatusChip = ({ status, overdue }: { status: string; overdue?: boolean }) => {
  const s = status === 'completed' ? 'done' : status;
  const [label, cls] = s === 'done' ? ['Done', 'text-accent-green bg-accent-green/10']
    : overdue ? ['Overdue', 'text-accent-red bg-accent-red/10']
    : s === 'in_progress' ? ['In progress', 'text-accent-blue bg-accent-blue/10']
    : s === 'blocked' ? ['Blocked', 'text-accent-orange bg-accent-orange/10']
    : s === 'review' ? ['In review', 'text-accent-orange bg-accent-orange/10']
    : ['Not started', 'text-text-secondary bg-[var(--bg-primary)]'];
  return <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', cls)}>{label}</span>;
};

/** Slide-in panel shell. */
function Shell({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end normal-case" onClick={onClose}>
      <aside role="dialog" aria-label={title} onClick={e => e.stopPropagation()}
        className="w-full max-w-[540px] h-full bg-background-secondary border-l border-border-subtle flex flex-col overflow-y-auto">
        <div className="sticky top-0 bg-background-secondary border-b border-border-subtle px-5 py-4 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary">{eyebrow}</div>
            <div className="text-lg font-extrabold mt-0.5 text-text-primary">{title}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover"><X size={16} /></button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-5 text-text-primary">{children}</div>
      </aside>
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary mb-1.5">{children}</div>;

/* ------------------------------------------------------------ objective */

export function ObjectivePanel({ id, onClose, onChanged, onOpen }: { id: number; onClose: () => void; onChanged?: () => void; onOpen?: (id: number) => void }) {
  const [o, setO] = useState<ObjectiveDetail | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.getObjective(id).then(setO).catch(e => setError(e.message)); }, [id]);
  useEffect(() => { setO(null); load(); }, [load]);

  const setProgress = async (v: number) => {
    try { await api.updateObjective(id, { progress: v }); load(); onChanged?.(); } catch (e: any) { setError(e.message); }
  };
  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setError('');
    try { await api.postUpdate(id, text.trim()); setText(''); load(); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  if (!o) return <Shell eyebrow="Objective" title={error || 'Loading…'} onClose={onClose}>{null}</Shell>;
  const level = o.level === 'objective' ? 'Objective' : 'Sub-objective';

  return (
    <Shell eyebrow={`${o.department.name} · ${o.quarter.short} · ${level}`} title={o.title} onClose={onClose}>
      <div>
        <Label>Why this matters</Label>
        <div className="border border-border-subtle rounded-xl overflow-hidden text-[13px]">
          <div className="px-3 py-2.5 grid grid-cols-[100px_1fr] gap-2"><span className="text-text-secondary text-[11.5px] font-semibold">Director → {o.department.name.split(' ')[0]}</span><span className="line-clamp-3">{o.director_message || 'No target written yet.'}</span></div>
          {o.parent && (
            <button onClick={() => onOpen?.(o.parent!.id)} className="w-full text-left px-3 py-2.5 grid grid-cols-[100px_1fr] gap-2 border-t border-border-subtle hover:bg-surface-hover">
              <span className="text-text-secondary text-[11.5px] font-semibold">Objective</span><span className="font-medium">{o.parent.title}</span>
            </button>
          )}
          <div className="px-3 py-2.5 grid grid-cols-[100px_1fr] gap-2 border-t border-border-subtle bg-accent-blue/10"><span className="text-text-secondary text-[11.5px] font-semibold">{level}</span><span className="font-semibold">{o.title}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-[13px]">
        <div><Label>Person</Label><span className="flex items-center gap-1.5"><Avatar p={o.owner} size={20} />{o.owner ? o.owner.name : 'Unassigned'}</span></div>
        <div><Label>Deadline</Label><span className={cn(o.overdue && 'text-accent-red font-semibold')}>{fmtDay(o.deadline) || '—'}</span></div>
        <div><Label>Status</Label><StatusChip status={o.status} overdue={o.overdue} /></div>
      </div>

      {o.description && <div><Label>Description</Label><p className="text-[13.5px] leading-relaxed whitespace-pre-line">{o.description}</p></div>}

      <div>
        <Label>Progress · {Math.round(o.progress)}%</Label>
        {o.permissions.can_update_progress ? (
          <div className="flex flex-wrap gap-1.5">
            {[0, 25, 50, 75, 100].map(v => (
              <button key={v} onClick={() => setProgress(v)}
                className={cn('px-3 py-1.5 rounded-lg border text-[12px] font-semibold', Math.round(o.progress) === v ? 'bg-accent-blue text-white border-accent-blue' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
                {v === 100 ? 'Done' : `${v}%`}
              </button>
            ))}
          </div>
        ) : (
          <>
            <ProgressBar value={o.progress} className="h-2" />
            <div className="text-[11.5px] text-text-secondary mt-1.5">{o.children.length || o.tasks.length ? 'Rolls up from the sub-objectives and tasks under it.' : 'The person in charge and the HOD update progress.'}</div>
          </>
        )}
      </div>

      {o.children.length > 0 && (
        <div>
          <Label>Sub-objectives · {o.children.filter(c => c.status === 'done').length} of {o.children.length} done</Label>
          <div className="border border-border-subtle rounded-xl overflow-hidden">
            {o.children.map(c => (
              <button key={c.id} onClick={() => onOpen?.(c.id)} className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-t border-border-subtle first:border-t-0 hover:bg-surface-hover">
                <Avatar p={c.owner} size={22} />
                <span className="flex-1 min-w-0"><span className="block text-[13px] font-medium truncate">{c.title}</span><span className="block text-[11.5px] text-text-secondary">{c.owner?.name || 'Unassigned'} · {fmtDay(c.deadline)} · {Math.round(c.progress)}%</span></span>
                <StatusChip status={c.status} overdue={c.overdue} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Tasks from the Task center{o.tasks.length ? ` · ${o.tasks.filter(t => t.done).length} of ${o.tasks.length} done` : ''}</Label>
        <ObjectiveTasks objectiveId={o.id} tasks={o.tasks}
          people={[o.department.hod, ...(o.department.members || [])].filter((p, i, a): p is PersonBrief => !!p && a.findIndex(x => x?.id === p.id) === i)}
          onChanged={() => { load(); onChanged?.(); }} />
      </div>

      <div>
        <Label>Updates</Label>
        <div className="flex flex-col gap-3">
          {o.updates.length ? o.updates.map(u => (
            <div key={u.id} className="flex gap-2.5">
              <Avatar p={u.user} size={26} />
              <div className="min-w-0">
                <div className="text-[12.5px]"><b>{u.user?.name}</b> <span className="text-text-secondary">{u.created_at ? new Date(u.created_at + 'Z').toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
                <p className="text-[13px] leading-relaxed whitespace-pre-line">{u.text}</p>
              </div>
            </div>
          )) : <div className="text-[12.5px] text-text-secondary">No updates yet.</div>}
        </div>
        {o.permissions.can_post && (
          <form onSubmit={post} className="mt-3 flex flex-col gap-2">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={4000} placeholder="What moved? Anything blocking?"
              className="w-full rounded-lg border border-border-subtle bg-background-primary px-3 py-2 text-[13px] outline-none focus:border-accent-blue" />
            <div><button type="submit" disabled={busy || !text.trim()} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={12} /> {busy ? 'Posting…' : 'Post update'}</button></div>
          </form>
        )}
      </div>

      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
      <Link href={`/departments?id=${o.department.id}`} className="text-[12.5px] font-semibold text-accent-blue inline-flex items-center gap-1"><Target size={13} /> Open {o.department.name}</Link>
    </Shell>
  );
}

/* ------------------------------------------------------------ Task Center task (read + quick status) */

const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'In review' },
  { value: 'completed', label: 'Done' },
];

export function TaskPanel({ task, canChange, onClose, onChanged }: { task: WCTask; canChange: boolean; onClose: () => void; onChanged?: () => void }) {
  const [t, setT] = useState<WCTask>(task);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [extended, setExtended] = useState('');
  const [error, setError] = useState('');
  const [isUpdatingTiming, setIsUpdatingTiming] = useState(false);

  useEffect(() => { 
    workcenterService.getTask(task.id)
      .then(res => {
        setT(prev => ({ ...prev, ...res }));
      })
      .catch(() => {}); 
  }, [task.id]);

  const overdue = !!t.deadline && t.status !== 'completed' && t.status !== 'done' && t.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10);
  const isIssue = Boolean((t as any).source === 'issue' || (t as any).source?.startsWith('issue:') || (t as any).is_issue || t.title.startsWith('[Issue]'));
  const cleanTitle = t.title.replace(/^\[Issue\]\s*/i, '');

  const change = async (status: string) => {
    setError('');
    if (status === 'completed') { setCompleteOpen(true); return; }
    try { 
      await workcenterService.updateStatus(t.id, status); 
      setT({ ...t, status }); 
      onChanged?.(); 
    } catch (e: any) { 
      setError(e.message || 'Could not update the task.'); 
    }
  };

  const updateTimingSlot = async (slotStart: string, slotEnd: string) => {
    setError('');
    setIsUpdatingTiming(true);
    try {
      const targetDate = t.scheduled_date || (t.deadline ? t.deadline.slice(0, 10) : new Date().toISOString().slice(0, 10));
      await workcenterService.updateTask(t.id, {
        scheduled_date: targetDate,
        scheduled_start_time: slotStart,
        scheduled_end_time: slotEnd,
      });
      setT(prev => ({
        ...prev,
        scheduled_date: targetDate,
        scheduled_start_time: slotStart,
        scheduled_end_time: slotEnd,
      }));
      onChanged?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('task:created'));
      }
    } catch (e: any) {
      setError(e.message || 'Could not update timing slot.');
    } finally {
      setIsUpdatingTiming(false);
    }
  };

  return (
    <Shell eyebrow={`Task Center · ${t.project_name ? '#' + t.project_name : 'General Task'}`} title={cleanTitle} onClose={onClose}>
      {/* Top Banner / Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {isIssue && (
          <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
            <AlertCircle size={12} className="stroke-[2.5]" /> Issue
          </span>
        )}
        <StatusChip status={t.status} overdue={overdue} />
        {t.priority && (
          <span className={cn(
            "text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-2xs",
            ['high', 'critical'].includes(t.priority.toLowerCase())
              ? "bg-accent-red/10 text-accent-red border-accent-red/30"
              : "bg-surface-card text-text-secondary border-border-subtle"
          )}>
            Priority: {t.priority}
          </span>
        )}
      </div>

      {/* 1. Project Details Card */}
      <div className="p-3.5 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center shrink-0 border border-accent-blue/20">
            <Hash size={18} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-secondary">Assigned Project</div>
            <div className="text-[13.5px] font-extrabold text-text-primary truncate">
              {t.project_name ? `#${t.project_name}` : 'General (No Project)'}
            </div>
          </div>
        </div>
        {t.project_id && (
          <Link 
            href={`/projects?id=${t.project_id}`} 
            className="text-xs font-semibold text-accent-blue hover:underline flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg hover:bg-accent-blue/10 transition-colors"
          >
            <span>Open Project</span>
            <ExternalLink size={11} />
          </Link>
        )}
      </div>

      {/* 2. Subtask / Parent Task Hierarchy Card */}
      {t.parent_id && (
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
            <CornerDownRight size={18} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Parent Task</div>
            <div className="text-[13.5px] font-extrabold text-text-primary truncate">
              {t.parent_title || `Main Task #${t.parent_id}`}
            </div>
          </div>
        </div>
      )}

      {/* 3. Schedule & Timing Card (Scheduled Slot, Date, Deadline) */}
      <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-accent-blue stroke-[2.5]" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Schedule & Timing</span>
          </div>
          {t.scheduled_date && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
              📅 {t.scheduled_date}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-background-primary border border-border-subtle">
            <div className="text-[10.5px] font-bold uppercase text-text-secondary">Scheduled Slot</div>
            <div className="text-sm font-extrabold text-accent-blue mt-1 flex items-center gap-1.5">
              <Clock size={14} />
              <span>{t.scheduled_start_time && t.scheduled_end_time ? `${t.scheduled_start_time} - ${t.scheduled_end_time}` : 'Not scheduled'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background-primary border border-border-subtle">
            <div className="text-[10.5px] font-bold uppercase text-text-secondary">Deadline</div>
            <div className={cn("text-sm font-bold mt-1 flex items-center gap-1.5", overdue ? "text-accent-red font-extrabold" : "text-text-primary")}>
              <Calendar size={14} />
              <span>{fmtDay(t.deadline) || 'No deadline'}</span>
            </div>
          </div>
        </div>

        {/* Quick Time Slot Switcher */}
        {canChange && (
          <div className="pt-2 border-t border-border-subtle/60">
            <div className="text-[10.5px] font-bold uppercase text-text-secondary mb-1.5">Quick Reschedule Time Slot</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { start: '09:00', end: '10:00' },
                { start: '10:00', end: '11:00' },
                { start: '11:00', end: '12:00' },
                { start: '13:00', end: '14:00' },
                { start: '14:00', end: '15:00' },
                { start: '16:00', end: '17:00' },
              ].map(slot => {
                const isActive = t.scheduled_start_time === slot.start && t.scheduled_end_time === slot.end;
                return (
                  <button
                    key={`${slot.start}-${slot.end}`}
                    type="button"
                    disabled={isUpdatingTiming}
                    onClick={() => updateTimingSlot(slot.start, slot.end)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center border",
                      isActive
                        ? "bg-accent-blue text-white border-accent-blue shadow-xs"
                        : "bg-background-primary hover:bg-surface-hover border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-blue/40"
                    )}
                  >
                    {slot.start} - {slot.end}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. People Card (Assigned To, Assigned By) */}
      <div className="p-3.5 rounded-2xl bg-surface-card border border-border-subtle space-y-3 shadow-xs">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-secondary">Assigned People</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar p={t.assigned_to_name ? { name: t.assigned_to_name, avatar: t.assigned_to_avatar } : null} size={28} />
            <div className="min-w-0">
              <div className="text-xs font-bold text-text-primary truncate">{t.assigned_to_name || 'Unassigned'}</div>
              <div className="text-[10.5px] text-text-secondary font-medium">Assigned Person</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar p={t.assigned_by_name ? { name: t.assigned_by_name } : null} size={28} />
            <div className="min-w-0">
              <div className="text-xs font-bold text-text-primary truncate">{t.assigned_by_name || 'System / Self'}</div>
              <div className="text-[10.5px] text-text-secondary font-medium">Created / Assigned By</div>
            </div>
          </div>
        </div>
      </div>

      <TaskObjectiveBadge taskId={t.id} />

      {/* 5. Description */}
      {t.description && (
        <div>
          <Label>Description</Label>
          <div className="p-3 rounded-xl bg-surface-card border border-border-subtle text-[13px] leading-relaxed whitespace-pre-line text-text-primary">
            {t.description}
          </div>
        </div>
      )}

      {/* 6. Subtasks List (if has subtasks) */}
      {t.subtasks && t.subtasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Sub-tasks ({t.subtasks.filter(s => s.status === 'completed' || s.status === 'done').length}/{t.subtasks.length} Done)</Label>
          </div>
          <div className="border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle bg-surface-card">
            {t.subtasks.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[13px]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                    s.status === 'completed' || s.status === 'done' ? "bg-emerald-500/20 text-emerald-500" : "bg-border-subtle text-text-secondary"
                  )}>
                    {s.status === 'completed' || s.status === 'done' ? '✓' : '•'}
                  </span>
                  <span className={cn("font-medium truncate", (s.status === 'completed' || s.status === 'done') && "line-through text-text-secondary")}>
                    {s.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.assigned_to_name && (
                    <span className="text-[11px] text-text-secondary">@{s.assigned_to_name}</span>
                  )}
                  <StatusChip status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Change Status */}
      {canChange && (
        <div>
          <Label>Change Status</Label>
          <div className="flex flex-wrap gap-1.5">
            {TASK_STATUSES.map(s => (
              <button 
                key={s.value} 
                onClick={() => change(s.value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl border text-[12px] font-bold transition-all cursor-pointer',
                  t.status === s.value 
                    ? 'bg-accent-blue text-white border-accent-blue shadow-xs' 
                    : 'border-border-subtle bg-surface-card text-text-secondary hover:text-text-primary hover:border-accent-blue/40'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="text-[12.5px] text-accent-red font-medium p-2 rounded-lg bg-accent-red/10 border border-accent-red/20">{error}</div>}
      
      <Link href={`/workcenter?task=${t.id}`} className="text-[12.5px] font-semibold text-accent-blue inline-flex items-center gap-1.5 hover:underline">
        <ExternalLink size={13} /> Open full Task Center for comments, checklist, and audit history
      </Link>

      <CompleteTaskModal
        isOpen={completeOpen}
        onClose={() => setCompleteOpen(false)}
        taskExtendedTime={extended}
        setTaskExtendedTime={setExtended}
        onSubmit={async (extendedTime, completionDate) => {
          const ext = parseFloat(extendedTime);
          try {
            await workcenterService.updateTask(t.id, { status: 'completed', extended_time: isNaN(ext) ? undefined : ext, actual_completion_date: completionDate });
            setT({ ...t, status: 'completed' });
            onChanged?.();
          } catch (e: any) { setError(e.message || 'Could not complete the task.'); }
          setCompleteOpen(false);
        }}
      />
    </Shell>
  );
}
