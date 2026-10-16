'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Target, Calendar, ExternalLink, Send } from 'lucide-react';
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
  useEffect(() => { workcenterService.getTask(task.id).then(setT).catch(() => {}); }, [task.id]);

  const overdue = !!t.deadline && t.status !== 'completed' && t.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10);
  const change = async (status: string) => {
    setError('');
    if (status === 'completed') { setCompleteOpen(true); return; }
    try { await workcenterService.updateStatus(t.id, status); setT({ ...t, status }); onChanged?.(); } catch (e: any) { setError(e.message || 'Could not update the task.'); }
  };

  return (
    <Shell eyebrow={`Task center${t.project_name ? ' · ' + t.project_name : ''}`} title={t.title} onClose={onClose}>
      <div className="grid grid-cols-3 gap-3 text-[13px]">
        <div><Label>Person</Label><span className="flex items-center gap-1.5"><Avatar p={t.assigned_to_name ? { name: t.assigned_to_name, avatar: t.assigned_to_avatar } : null} size={20} />{t.assigned_to_name || 'Unassigned'}</span></div>
        <div><Label>Deadline</Label><span className={cn('inline-flex items-center gap-1', overdue && 'text-accent-red font-semibold')}><Calendar size={12} />{fmtDay(t.deadline) || '—'}</span></div>
        <div><Label>Status</Label><StatusChip status={t.status} overdue={overdue} /></div>
      </div>
      <TaskObjectiveBadge taskId={t.id} />
      {t.description && <div><Label>Description</Label><p className="text-[13.5px] leading-relaxed whitespace-pre-line">{t.description}</p></div>}
      {canChange && (
        <div>
          <Label>Change status</Label>
          <div className="flex flex-wrap gap-1.5">
            {TASK_STATUSES.map(s => (
              <button key={s.value} onClick={() => change(s.value)}
                className={cn('px-3 py-1.5 rounded-lg border text-[12px] font-semibold', t.status === s.value ? 'bg-accent-blue text-white border-accent-blue' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {t.subtasks?.length > 0 && (
        <div>
          <Label>Sub-tasks</Label>
          <div className="border border-border-subtle rounded-xl overflow-hidden">
            {t.subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5 border-t border-border-subtle first:border-t-0 text-[13px]">
                <span className="flex-1 min-w-0 truncate">{s.title}</span>
                <span className="text-[11.5px] text-text-secondary">{s.assigned_to_name}</span>
                <StatusChip status={s.status} />
              </div>
            ))}
          </div>
        </div>
      )}
      {t.assigned_by_name && <div className="text-[12px] text-text-secondary">Assigned by {t.assigned_by_name}</div>}
      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
      <Link href="/workcenter" className="text-[12.5px] font-semibold text-accent-blue inline-flex items-center gap-1"><ExternalLink size={13} /> Open the Task center for comments, checklist and history</Link>

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
