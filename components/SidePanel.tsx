'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Target, Calendar, ExternalLink, Send, Hash, CornerDownRight, Clock, User, AlertCircle, CheckCircle2, FolderKanban } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService as api, ObjectiveDetail, PersonBrief } from '@/services/departmentTargets';
import { projectsService } from '@/services/projects';
import { Project } from '@/types';
import { workcenterService, WCTask } from '@/services/workcenter';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';
import { ProgressBar } from '@/components/QuarterGoalHero';
import { ObjectiveTasks } from '@/components/targets/ObjectiveTasks';
import { TaskObjectiveBadge, taskCodeOf } from '@/components/targets/TaskObjectiveLink';
import { CodeChip } from '@/components/timeline/CodeChip';
import { PriorityBadge, PriorityPicker, canSetPriority } from '@/components/timeline/PriorityChip';
import { DeadlineBadge } from '@/components/timeline/DeadlineBadge';
import { StatusSelect, OBJECTIVE_STATUS_OPTIONS, codeOf, deptPrefix, useOptimistic } from '@/components/targets/ui';
import { useStore } from '@/lib/store';
import type { Priority } from '@/services/timeline';

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
function Shell({ eyebrow, title, code, onClose, children }: { eyebrow: string; title: string; code?: string; onClose: () => void; children: React.ReactNode }) {
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
            {code && <div className="mt-1"><CodeChip code={code} /></div>}
            <div className="text-lg font-extrabold mt-0.5 text-text-primary break-words">{title}</div>
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
  const [taskPanel, setTaskPanel] = useState<WCTask | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customPct, setCustomPct] = useState('0');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const { userProfile } = useStore();
  const [prio, setPrio] = useOptimistic<Priority | null>(o?.priority ?? null);

  const load = useCallback(() => {
    api.getObjective(id).then(res => {
      setO(res);
      setCustomPct(String(Math.round(res.progress)));
    }).catch(e => setError(e.message));
  }, [id]);
  useEffect(() => { setO(null); load(); }, [load]);
  useEffect(() => { projectsService.getProjects().then(setProjects).catch(() => {}); }, []);

  const openTask = useCallback((taskId: number) => {
    workcenterService.getTask(taskId).then(setTaskPanel).catch(() => {});
  }, []);

  const setProgress = async (v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setError('');
    try { await api.updateObjective(id, { progress: clamped }); load(); onChanged?.(); } catch (e: any) { setError(e.message); }
  };
  const setProject = async (pid: number | null) => {
    setError('');
    try { await api.updateObjective(id, { project_id: pid }); load(); onChanged?.(); } catch (e: any) { setError(e.message); }
  };
  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setError('');
    try { await api.postUpdate(id, text.trim()); setText(''); load(); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  if (!o) return <Shell eyebrow="Objective" title={error || 'Loading…'} onClose={onClose}>{null}</Shell>;
  const level = o.level === 'objective' ? 'Objective' : 'Sub-objective';
  const deptTag = o.department.short_code ? `##${o.department.short_code} · ` : '';
  const prefix = deptPrefix(o.department);
  const fullCode = codeOf(o, prefix);
  const canMoveDate = o.permissions.can_plan || o.permissions.can_update_progress;
  const canStatus = o.permissions.can_plan || (!o.children.length && o.permissions.can_update_progress);

  return (
    <>
    <Shell eyebrow={`${deptTag}${o.department.name} · ${o.quarter.short} · ${level}`} code={fullCode} title={o.title} onClose={onClose}>
      <div>
        <Label>Why this matters</Label>
        <div className="border border-border-subtle rounded-xl overflow-hidden text-[13px]">
          <div className="px-3 py-2.5 grid grid-cols-[100px_1fr] gap-2"><span className="text-text-secondary text-[11.5px] font-semibold">Director → {o.department.short_code || o.department.name.split(' ')[0]}</span><span className="line-clamp-3">{o.director_message || 'No target written yet.'}</span></div>
          {o.parent && (
            <button onClick={() => onOpen?.(o.parent!.id)} className="w-full text-left px-3 py-2.5 grid grid-cols-[100px_1fr] gap-2 border-t border-border-subtle hover:bg-surface-hover">
              <span className="text-text-secondary text-[11.5px] font-semibold flex flex-col items-start gap-1">Objective <CodeChip code={o.parent.full_code || (o.parent.code ? `${prefix}-${o.parent.code}` : '')} size="xs" /></span><span className="font-medium">{o.parent.title}</span>
            </button>
          )}
          <div className="px-3 py-2.5 grid grid-cols-[100px_1fr] gap-2 border-t border-border-subtle bg-accent-blue/10"><span className="text-text-secondary text-[11.5px] font-semibold flex flex-col items-start gap-1">{level} <CodeChip code={fullCode} size="xs" /></span><span className="font-semibold">{o.title}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
        <div><Label>Person</Label><span className="flex items-center gap-1.5"><Avatar p={o.owner} size={20} />{o.owner ? o.owner.name : 'Unassigned'}</span></div>
        <div><Label>Deadline</Label>
          <DeadlineBadge entity="objective" id={o.id} deadline={o.deadline} originalDeadline={o.original_deadline} changes={o.deadline_changes}
            done={o.status === 'done'} canEdit={canMoveDate} title={`${fullCode} ${o.title}`} onChanged={() => { load(); onChanged?.(); }} className="-ml-1.5" />
        </div>
        <div><Label>Status</Label>
          <StatusSelect value={o.status} options={OBJECTIVE_STATUS_OPTIONS} canEdit={canStatus} label="Status"
            onSave={async v => { await api.updateObjective(id, { status: v as ObjectiveDetail['status'] }); load(); onChanged?.(); }} onError={setError} />
        </div>
        <div><Label>Priority</Label>
          {canSetPriority(userProfile) || prio
            ? <PriorityPicker objectiveId={o.id} value={prio} canEdit={canSetPriority(userProfile)} onChanged={p => { setPrio(p); load(); onChanged?.(); }} />
            : <span className="text-text-secondary text-[12.5px]">None</span>}
        </div>
        <div>
          <Label>Project</Label>
          {(o.permissions.can_edit_project ?? o.permissions.can_plan) ? (
            <select
              aria-label="Project"
              value={o.own_project_id ?? o.project_id ?? ''}
              onChange={e => setProject(e.target.value ? Number(e.target.value) : null)}
              className="w-full text-[12px] rounded-lg border border-border-subtle bg-background-primary px-2 py-1 text-text-primary"
            >
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <span className="inline-flex items-center gap-1 text-[12.5px] font-medium">
              {o.project_name ? <><FolderKanban size={12} className="text-purple-500" /> {o.project_name}</> : '—'}
            </span>
          )}
        </div>
      </div>

      {o.description && <div><Label>Description</Label><p className="text-[13.5px] leading-relaxed whitespace-pre-line">{o.description}</p></div>}

      <div>
        <Label>Progress · {Math.round(o.progress)}%</Label>
        {o.permissions.can_update_progress ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[0, 10, 25, 50, 75, 100].map(v => (
                <button key={v} onClick={() => setProgress(v)}
                  className={cn('px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold cursor-pointer', Math.round(o.progress) === v ? 'bg-accent-blue text-white border-accent-blue' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
                  {v === 100 ? '100% Done' : `${v}%`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-secondary">Custom %:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={customPct}
                onChange={e => setCustomPct(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const n = Number(customPct);
                    if (!Number.isNaN(n)) setProgress(n);
                  }
                }}
                aria-label="Custom progress percentage"
                className="w-16 rounded-lg border border-border-subtle bg-background-primary px-2 py-1 text-[12.5px] text-right text-text-primary"
              />
              <button
                type="button"
                onClick={() => {
                  const n = Number(customPct);
                  if (!Number.isNaN(n)) setProgress(n);
                }}
                className="px-2.5 py-1 rounded-lg bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 text-[12px] font-semibold cursor-pointer"
              >
                Save %
              </button>
            </div>
          </div>
        ) : (
          <>
            <ProgressBar value={o.progress} className="h-2" />
            <div className="text-[11.5px] text-text-secondary mt-1.5">{o.children.length ? 'Rolls up from the sub-objectives under it.' : 'The person in charge, task assignee, or HOD updates progress.'}</div>
          </>
        )}
      </div>

      {o.children.length > 0 && (
        <div>
          <Label>Sub-objectives · {o.children.filter(c => c.status === 'done').length} of {o.children.length} done</Label>
          <div className="border border-border-subtle rounded-xl overflow-hidden">
            {o.children.map((c, idx) => (
              <button key={c.id} onClick={() => onOpen?.(c.id)} className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-t border-border-subtle first:border-t-0 hover:bg-surface-hover">
                <CodeChip code={codeOf(c, prefix, o.code ? `${o.code}.${idx + 1}` : undefined)} size="xs" />
                <Avatar p={c.owner} size={22} />
                <span className="flex-1 min-w-0"><span className="block text-[13px] font-medium truncate" title={c.title}>{c.title}</span><span className="block text-[11.5px] text-text-secondary truncate">{c.owner?.name || 'Unassigned'} · {fmtDay(c.deadline) || 'No date'} · {Math.round(c.progress)}%</span></span>
                <PriorityBadge p={c.priority} />
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
          parentCode={fullCode}
          startIndex={o.children.length ? o.children.length + 1 : 1}
          projectId={o.project_id}
          onOpenTask={openTask}
          canPlan={o.permissions.can_plan}
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
      <Link href={`/departments?id=${o.department.id}&objective=${o.id}`} className="text-[12.5px] font-semibold text-accent-blue inline-flex items-center gap-1"><Target size={13} /> Open {fullCode} in {o.department.name}</Link>
    </Shell>
    {taskPanel && <TaskPanel task={taskPanel} canChange onClose={() => setTaskPanel(null)} onChanged={() => { load(); onChanged?.(); }} />}
    </>
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
  const [code, setCode] = useState('');
  // the task's own code (PROD-1.2.3) when it is linked to an objective
  const reloadTask = useCallback(() => {
    workcenterService.getTask(task.id).then(res => setT(prev => ({ ...prev, ...res }))).catch(() => {});
    onChanged?.();
  }, [task.id, onChanged]);
  useEffect(() => {
    let alive = true;
    api.taskLinks([task.id]).then(r => alive && setCode(taskCodeOf(r[String(task.id)]))).catch(() => alive && setCode(''));
    return () => { alive = false; };
  }, [task.id]);

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
    <Shell eyebrow={`Task Center · ${t.project_name ? '#' + t.project_name : 'General Task'}`} code={code} title={cleanTitle} onClose={onClose}>
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
            <div className="mt-1 text-sm font-bold">
              <DeadlineBadge entity="task" id={t.id} deadline={t.deadline ? t.deadline.slice(0, 10) : null}
                originalDeadline={(t as any).original_deadline} changes={(t as any).deadline_changes}
                done={t.status === 'completed' || t.status === 'done'} canEdit={canChange}
                title={`${code ? code + ' ' : ''}${cleanTitle}`} onChanged={reloadTask} className="-ml-1.5 !text-sm" />
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
                  {code && <CodeChip code={`${code}.${t.subtasks!.indexOf(s) + 1}`} size="xs" />}
                  <span title={s.title} className={cn("font-medium truncate min-w-0", (s.status === 'completed' || s.status === 'done') && "line-through text-text-secondary")}>
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
