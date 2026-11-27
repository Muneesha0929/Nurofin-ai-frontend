'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X, Target, Calendar, ExternalLink, Send, Hash, CornerDownRight, Clock,
  AlertCircle, CheckCircle2, FolderKanban, Pencil, Loader2, Check
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatISTDate, formatISTTime } from '@/utils/date';
import { departmentTargetsService as api, ObjectiveDetail, PersonBrief } from '@/services/departmentTargets';
import { projectsService } from '@/services/projects';
import { Project } from '@/types';
import { workcenterService, WCTask, TaskComment } from '@/services/workcenter';
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

/** Fixed-shell side drawer: details stay pinned while only the updates feed scrolls. */
function Shell({
  eyebrow,
  title,
  onClose,
  headerActions,
  children,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end normal-case" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[560px] h-full bg-background-secondary border-l border-border-subtle flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="shrink-0 bg-background-secondary border-b border-border-subtle px-5 py-3.5 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary truncate">{eyebrow}</div>
            <div className="text-base font-extrabold mt-0.5 text-text-primary leading-snug">{title}</div>
          </div>
          {headerActions}
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden text-text-primary">
          {children}
        </div>
      </aside>
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-text-secondary mb-1">{children}</div>
);

/** Formats an update header strictly as: Date · Time · User */
export function UpdateMetaLine({ createdAt, userName }: { createdAt?: string | null; userName?: string | null }) {
  const datePart = formatISTDate(createdAt);
  const timePart = formatISTTime(createdAt, { withTimezone: false });
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
      {datePart && <span className="font-semibold text-text-primary">{datePart}</span>}
      {timePart && (
        <>
          <span>·</span>
          <span className="font-mono">{timePart}</span>
        </>
      )}
      <span>·</span>
      <span className="font-bold text-accent-blue">{userName || 'Teammate'}</span>
    </div>
  );
}

/* ------------------------------------------------------------ Objective Panel */

export function ObjectivePanel({ id, onClose, onChanged, onOpen }: { id: number; onClose: () => void; onChanged?: () => void; onOpen?: (id: number) => void }) {
  const [o, setO] = useState<ObjectiveDetail | null>(null);
  const [taskPanel, setTaskPanel] = useState<WCTask | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customPct, setCustomPct] = useState('0');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.getObjective(id).then(res => {
      setO(res);
      setCustomPct(String(Math.round(res.progress)));
    }).catch(e => setError(e.message));
  }, [id]);

  useEffect(() => { setO(null); load(); }, [load]);
  useEffect(() => { projectsService.getProjects().then(setProjects).catch(() => {}); }, []);

  useEffect(() => {
    const onLive = () => load();
    window.addEventListener('app:refresh', onLive);
    window.addEventListener('objective:updated', onLive);
    window.addEventListener('task:created', onLive);
    return () => {
      window.removeEventListener('app:refresh', onLive);
      window.removeEventListener('objective:updated', onLive);
      window.removeEventListener('task:created', onLive);
    };
  }, [load]);

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
    try {
      await api.postUpdate(id, text.trim());
      setText('');
      load();
      onChanged?.();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  if (!o) return <Shell eyebrow="Objective" title={error || 'Loading…'} onClose={onClose}><div className="p-5 text-xs text-text-secondary">Loading details…</div></Shell>;
  const level = o.level === 'objective' ? 'Objective' : 'Sub-objective';
  const deptTag = o.department.short_code ? `##${o.department.short_code} · ` : '';

  return (
    <>
      <Shell
        eyebrow={`${deptTag}${o.department.name} · ${o.quarter.short} · ${level}${o.code ? ` ${o.code}` : ''}`}
        title={o.code ? `${o.code} ${o.title}` : o.title}
        onClose={onClose}
      >
        {/* FIXED NON-SCROLLABLE DETAILS SECTION */}
        <div className="shrink-0 px-5 py-3.5 border-b border-border-subtle space-y-3 bg-background-secondary max-h-[55%] overflow-y-auto">
          <div className="border border-border-subtle rounded-xl overflow-hidden text-[12.5px]">
            <div className="px-3 py-2 grid grid-cols-[96px_1fr] gap-2">
              <span className="text-text-secondary text-[11px] font-semibold">Director → {o.department.short_code || o.department.name.split(' ')[0]}</span>
              <span className="line-clamp-2">{o.director_message || 'No target written yet.'}</span>
            </div>
            {o.parent && (
              <button onClick={() => onOpen?.(o.parent!.id)} className="w-full text-left px-3 py-2 grid grid-cols-[96px_1fr] gap-2 border-t border-border-subtle hover:bg-surface-hover cursor-pointer">
                <span className="text-text-secondary text-[11px] font-semibold">Objective {o.parent.code || ''}</span>
                <span className="font-medium truncate">{o.parent.title}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[12.5px]">
            <div>
              <Label>Owner</Label>
              <span className="flex items-center gap-1.5"><Avatar p={o.owner} size={20} /><span className="truncate">{o.owner ? o.owner.name : 'Unassigned'}</span></span>
            </div>
            <div>
              <Label>Date</Label>
              <span className={cn(o.overdue && 'text-accent-red font-semibold')}>{fmtDay(o.deadline) || '—'}</span>
            </div>
            <div>
              <Label>Status</Label>
              <StatusChip status={o.status} overdue={o.overdue} />
            </div>
            <div>
              <Label>Project</Label>
              {(o.permissions.can_edit_project ?? o.permissions.can_plan) ? (
                <select
                  aria-label="Project"
                  value={o.own_project_id ?? o.project_id ?? ''}
                  onChange={e => setProject(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-[11.5px] rounded-lg border border-border-subtle bg-background-primary px-2 py-1 text-text-primary"
                >
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium">
                  {o.project_name ? <><FolderKanban size={12} className="text-purple-500" /> {o.project_name}</> : '—'}
                </span>
              )}
            </div>
          </div>

          {o.description && (
            <div className="p-2.5 rounded-xl bg-background-primary border border-border-subtle text-[12.5px] leading-relaxed whitespace-pre-line">
              {o.description}
            </div>
          )}

          <div>
            <Label>Progress · {Math.round(o.progress)}%</Label>
            {o.permissions.can_update_progress ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 25, 50, 75, 100].map(v => (
                  <button key={v} onClick={() => setProgress(v)}
                    className={cn('px-2 py-1 rounded-lg border text-[11.5px] font-semibold cursor-pointer', Math.round(o.progress) === v ? 'bg-accent-blue text-white border-accent-blue' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
                    {v === 100 ? 'Done' : `${v}%`}
                  </button>
                ))}
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
                  className="w-14 rounded-lg border border-border-subtle bg-background-primary px-2 py-1 text-[11.5px] text-right text-text-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = Number(customPct);
                    if (!Number.isNaN(n)) setProgress(n);
                  }}
                  className="px-2 py-1 rounded-lg bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 text-[11.5px] font-semibold cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <ProgressBar value={o.progress} className="h-2" />
            )}
          </div>

          {o.children.length > 0 && (
            <div>
              <Label>Sub-objectives ({o.children.filter(c => c.status === 'done').length}/{o.children.length} done)</Label>
              <div className="border border-border-subtle rounded-xl overflow-hidden max-h-28 overflow-y-auto">
                {o.children.map((c, idx) => (
                  <button key={c.id} onClick={() => onOpen?.(c.id)} className="w-full text-left flex items-center gap-2 px-3 py-1.5 border-t border-border-subtle first:border-t-0 hover:bg-surface-hover cursor-pointer">
                    <span className="font-mono text-[11px] font-bold text-accent-blue w-8 shrink-0">{c.code || (o.code ? `${o.code}.${idx + 1}` : '')}</span>
                    <span className="flex-1 min-w-0 text-[12px] font-medium truncate">{c.title}</span>
                    <span className="text-[11px] text-text-secondary shrink-0">{fmtDay(c.deadline)}</span>
                    <StatusChip status={c.status} overdue={c.overdue} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Tasks ({o.tasks.filter(t => t.done).length}/{o.tasks.length} done)</Label>
            <ObjectiveTasks
              objectiveId={o.id}
              tasks={o.tasks}
              people={[o.department.hod, ...(o.department.members || [])].filter((p, i, a): p is PersonBrief => !!p && a.findIndex(x => x?.id === p.id) === i)}
              parentCode={o.code}
              startIndex={o.children.length ? o.children.length + 1 : 1}
              projectId={o.project_id}
              onOpenTask={openTask}
              onChanged={() => { load(); onChanged?.(); }}
            />
          </div>
          {error && <div className="text-[12px] text-accent-red">{error}</div>}
        </div>

        {/* ONLY THIS UPDATES / FOLLOW-UPS LIST SCROLLS */}
        <div className="flex-1 min-h-0 flex flex-col bg-background-primary/40">
          <div className="shrink-0 px-5 pt-3 pb-1.5 flex items-center justify-between border-b border-border-subtle/50">
            <Label>Updates &amp; Follow-ups ({o.updates.length})</Label>
            <Link href={`/departments?id=${o.department.id}`} className="text-[11.5px] font-semibold text-accent-blue inline-flex items-center gap-1 hover:underline">
              <Target size={12} /> {o.department.name}
            </Link>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-2.5">
            {o.updates.length ? o.updates.map(u => (
              <div key={u.id} className="p-3 rounded-xl bg-background-secondary border border-border-subtle space-y-1">
                <UpdateMetaLine createdAt={u.created_at} userName={u.user?.name} />
                <p className="text-[13px] leading-relaxed whitespace-pre-line text-text-primary">{u.text}</p>
              </div>
            )) : (
              <div className="text-[12.5px] text-text-secondary py-4 text-center">No follow-ups or updates yet.</div>
            )}
          </div>

          {o.permissions.can_post && (
            <form onSubmit={post} className="shrink-0 px-5 py-3 border-t border-border-subtle bg-background-secondary flex gap-2 items-end">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Write a follow-up or progress update..."
                className="flex-1 rounded-xl border border-border-subtle bg-background-primary px-3 py-2 text-[12.5px] outline-none focus:border-accent-blue resize-none"
              />
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="px-3.5 py-2 rounded-xl bg-accent-blue text-white text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Send size={12} /> {busy ? 'Posting…' : 'Post'}
              </button>
            </form>
          )}
        </div>
      </Shell>
      {taskPanel && <TaskPanel task={taskPanel} canChange onClose={() => setTaskPanel(null)} onChanged={() => { load(); onChanged?.(); }} />}
    </>
  );
}

/* ------------------------------------------------------------ Task Center / Department Task Panel */

const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'In review' },
  { value: 'completed', label: 'Done' },
];

export function TaskPanel({ task, canChange, onClose, onChanged }: { task: WCTask; canChange: boolean; onClose: () => void; onChanged?: () => void }) {
  const [t, setT] = useState<WCTask>(task);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [followupText, setFollowupText] = useState('');
  const [postingFollowup, setPostingFollowup] = useState(false);

  const [completeOpen, setCompleteOpen] = useState(false);
  const [extended, setExtended] = useState('');
  const [error, setError] = useState('');
  const [isUpdatingTiming, setIsUpdatingTiming] = useState(false);

  // Inline Edit Mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [editDeadline, setEditDeadline] = useState(task.deadline ? task.deadline.slice(0, 10) : '');
  const [editPriority, setEditPriority] = useState(task.priority || 'medium');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadTaskAndComments = useCallback(() => {
    workcenterService.getTask(task.id)
      .then(res => {
        setT(prev => ({ ...prev, ...res }));
        setEditTitle(res.title || '');
        setEditDesc(res.description || '');
        setEditDeadline(res.deadline ? res.deadline.slice(0, 10) : '');
        setEditPriority(res.priority || 'medium');
      })
      .catch(() => {});

    workcenterService.getComments(task.id)
      .then(list => setComments(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [task.id]);

  useEffect(() => {
    setLoadingComments(true);
    loadTaskAndComments();
  }, [loadTaskAndComments]);

  useEffect(() => {
    const onLive = () => loadTaskAndComments();
    window.addEventListener('app:refresh', onLive);
    window.addEventListener('task:created', onLive);
    return () => {
      window.removeEventListener('app:refresh', onLive);
      window.removeEventListener('task:created', onLive);
    };
  }, [loadTaskAndComments]);

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
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (e: any) {
      setError(e.message || 'Could not update timing slot.');
    } finally {
      setIsUpdatingTiming(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    setError('');
    try {
      const updated = await workcenterService.updateTask(t.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        deadline: editDeadline || undefined,
        priority: editPriority,
      });
      setT(prev => ({ ...prev, ...updated }));
      setEditing(false);
      onChanged?.();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (e: any) {
      setError(e.message || 'Failed to save task changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const postFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupText.trim()) return;
    setPostingFollowup(true);
    setError('');
    try {
      await workcenterService.addComment(t.id, { content: followupText.trim() });
      setFollowupText('');
      loadTaskAndComments();
      onChanged?.();
    } catch (e: any) {
      setError(e.message || 'Failed to post follow-up.');
    } finally {
      setPostingFollowup(false);
    }
  };

  const toggleFollowupDone = async (c: TaskComment) => {
    try {
      await workcenterService.updateComment(t.id, c.id, { is_followup_completed: !c.is_followup_completed });
      loadTaskAndComments();
      onChanged?.();
    } catch (e: any) {
      setError(e.message || 'Failed to update follow-up status.');
    }
  };

  return (
    <Shell
      eyebrow={`Task · ${t.project_name ? '#' + t.project_name : 'General'}`}
      title={cleanTitle}
      onClose={onClose}
      headerActions={canChange ? (
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="px-2.5 py-1 rounded-lg border border-border-subtle bg-background-primary hover:border-accent-blue text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Pencil size={11} /> {editing ? 'Cancel' : 'Edit'}
        </button>
      ) : null}
    >
      {/* FIXED NON-SCROLLABLE TOP DETAILS SECTION */}
      <div className="shrink-0 px-5 py-3.5 border-b border-border-subtle space-y-3 bg-background-secondary max-h-[58%] overflow-y-auto">
        {editing ? (
          <form onSubmit={saveEdit} className="space-y-2.5 p-3 rounded-xl bg-background-primary border border-border-subtle">
            <div>
              <Label>Title</Label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-background-secondary px-2.5 py-1.5 text-[13px] outline-none focus:border-accent-blue" required />
            </div>
            <div>
              <Label>Description</Label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-border-subtle bg-background-secondary px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent-blue" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Deadline</Label>
                <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-background-secondary px-2.5 py-1.5 text-[12px]" />
              </div>
              <div>
                <Label>Priority</Label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-background-secondary px-2.5 py-1.5 text-[12px]">
                  <option value="critical">Critical (P1)</option>
                  <option value="high">High (P1/P2)</option>
                  <option value="medium">Medium (P2)</option>
                  <option value="low">Low (P3)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="submit" disabled={savingEdit} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer">
                <Check size={12} /> {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {isIssue && (
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <AlertCircle size={11} /> Issue
                </span>
              )}
              <StatusChip status={t.status} overdue={overdue} />
              {t.priority && (
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-background-primary border border-border-subtle text-text-secondary">
                  {t.priority}
                </span>
              )}
              {t.project_name && (
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-lg bg-accent-blue/10 text-accent-blue inline-flex items-center gap-1">
                  <Hash size={10} /> {t.project_name}
                </span>
              )}
            </div>

            {t.parent_id && (
              <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center gap-2 text-xs">
                <CornerDownRight size={13} className="text-purple-500 shrink-0" />
                <span className="text-text-secondary">Parent:</span>
                <span className="font-bold text-text-primary truncate">{t.parent_title || `Task #${t.parent_id}`}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-background-primary border border-border-subtle">
                <Label>Assigned To</Label>
                <div className="flex items-center gap-1.5 font-semibold truncate">
                  <Avatar p={t.assigned_to_name ? { name: t.assigned_to_name, avatar: t.assigned_to_avatar } : null} size={20} />
                  <span className="truncate">{t.assigned_to_name || 'Unassigned'}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-background-primary border border-border-subtle">
                <Label>Date</Label>
                <div className={cn('font-semibold flex items-center gap-1', overdue && 'text-accent-red')}>
                  <Calendar size={12} /> {fmtDay(t.deadline || t.scheduled_date) || '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-background-primary border border-border-subtle col-span-2 sm:col-span-1">
                <Label>Time Slot</Label>
                <div className="font-bold text-accent-blue flex items-center gap-1">
                  <Clock size={12} />
                  <span>{t.scheduled_start_time && t.scheduled_end_time ? `${t.scheduled_start_time}–${t.scheduled_end_time}` : 'Unscheduled'}</span>
                </div>
              </div>
            </div>

            {t.description && (
              <div className="p-2.5 rounded-xl bg-background-primary border border-border-subtle text-[12.5px] leading-relaxed whitespace-pre-line">
                {t.description}
              </div>
            )}

            <TaskObjectiveBadge taskId={t.id} />

            {canChange && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {TASK_STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => change(s.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg border text-[11.5px] font-bold transition-all cursor-pointer',
                        t.status === s.value
                          ? 'bg-accent-blue text-white border-accent-blue'
                          : 'border-border-subtle bg-background-primary text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
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
                          'px-2 py-0.5 rounded-md text-[10.5px] font-semibold border cursor-pointer',
                          isActive
                            ? 'bg-accent-blue text-white border-accent-blue'
                            : 'bg-background-primary border-border-subtle text-text-secondary hover:text-text-primary'
                        )}
                      >
                        {slot.start}–{slot.end}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {t.subtasks && t.subtasks.length > 0 && (
              <div className="border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle bg-background-primary max-h-24 overflow-y-auto">
                {t.subtasks.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                    <span className={cn('truncate font-medium', (s.status === 'completed' || s.status === 'done') && 'line-through text-text-secondary')}>{s.title}</span>
                    <StatusChip status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {error && <div className="text-[12px] text-accent-red font-medium">{error}</div>}
      </div>

      {/* ONLY THIS FOLLOW-UPS / UPDATES SECTION SCROLLS */}
      <div className="flex-1 min-h-0 flex flex-col bg-background-primary/40">
        <div className="shrink-0 px-5 pt-3 pb-1.5 flex items-center justify-between border-b border-border-subtle/50">
          <Label>Follow-ups &amp; Updates ({comments.length})</Label>
          <Link href={`/workcenter?task=${t.id}`} className="text-[11.5px] font-semibold text-accent-blue inline-flex items-center gap-1 hover:underline">
            <ExternalLink size={11} /> Full Task Center
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-2.5">
          {loadingComments ? (
            <div className="text-xs text-text-secondary flex items-center gap-1.5 py-4 justify-center">
              <Loader2 size={13} className="animate-spin" /> Loading follow-ups…
            </div>
          ) : comments.length === 0 ? (
            <div className="text-xs text-text-secondary text-center py-5">No follow-ups recorded on this task yet.</div>
          ) : (
            comments.map(c => (
              <div key={c.id} className={cn(
                'p-3 rounded-xl border space-y-1.5',
                c.is_followup_completed ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-background-secondary border-border-subtle'
              )}>
                <div className="flex items-center justify-between gap-2">
                  <UpdateMetaLine createdAt={c.created_at} userName={c.user_name} />
                  <button
                    type="button"
                    onClick={() => toggleFollowupDone(c)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer shrink-0',
                      c.is_followup_completed
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    )}
                  >
                    {c.is_followup_completed ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    <span>{c.is_followup_completed ? 'Done' : 'Pending'}</span>
                  </button>
                </div>
                <p className="text-[13px] leading-relaxed whitespace-pre-line text-text-primary">{c.content}</p>
                {c.replies && c.replies.length > 0 && (
                  <div className="pl-3 border-l-2 border-border-subtle space-y-1.5 pt-1">
                    {c.replies.map(r => (
                      <div key={r.id} className="text-[12px] space-y-0.5">
                        <UpdateMetaLine createdAt={r.created_at} userName={r.user_name} />
                        <p className="text-text-primary whitespace-pre-line">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={postFollowup} className="shrink-0 px-5 py-3 border-t border-border-subtle bg-background-secondary flex gap-2 items-end">
          <textarea
            value={followupText}
            onChange={e => setFollowupText(e.target.value)}
            rows={2}
            placeholder="Add a follow-up or update on this task..."
            className="flex-1 rounded-xl border border-border-subtle bg-background-primary px-3 py-2 text-[12.5px] outline-none focus:border-accent-blue resize-none"
          />
          <button
            type="submit"
            disabled={postingFollowup || !followupText.trim()}
            className="px-3.5 py-2 rounded-xl bg-accent-blue text-white text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {postingFollowup ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Post
          </button>
        </form>
      </div>

      <CompleteTaskModal
        isOpen={completeOpen}
        onClose={() => setCompleteOpen(false)}
        taskExtendedTime={extended}
        setTaskExtendedTime={setExtended}
        onSubmit={async (extendedTime, completionDate) => {
          const ext = parseFloat(extendedTime);
          try {
            await workcenterService.updateTask(t.id, {
              status: 'completed',
              extended_time: isNaN(ext) ? undefined : ext,
              actual_completion_date: completionDate,
            });
            setT({ ...t, status: 'completed' });
            onChanged?.();
          } catch (e: any) {
            setError(e.message || 'Could not complete the task.');
          }
          setCompleteOpen(false);
        }}
      />
    </Shell>
  );
}
