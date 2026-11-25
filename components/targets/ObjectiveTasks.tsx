'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare, Plus, ExternalLink, Link2, X, Search, Loader2, Check,
  MessageSquare, ChevronDown, ChevronRight, CornerDownRight, GripVertical,
  Send, CheckCircle2, Clock, ArrowUpRight, FileText,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatISTDateTime, accurateTimeAgo } from '@/utils/date';
import { departmentTargetsService as api, LinkedTask, LinkedTaskFollowup, PersonBrief } from '@/services/departmentTargets';
import { workcenterService, WCTask } from '@/services/workcenter';

const fmt = (iso?: string | null) => iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const STATUS: Record<string, [string, string]> = {
  completed: ['Done', 'text-accent-green bg-accent-green/10'],
  done: ['Done', 'text-accent-green bg-accent-green/10'],
  in_progress: ['In progress', 'text-accent-blue bg-accent-blue/10'],
  review: ['In review', 'text-accent-orange bg-accent-orange/10'],
  blocked: ['Blocked', 'text-accent-orange bg-accent-orange/10'],
  todo: ['To do', 'text-text-secondary bg-[var(--bg-primary)]'],
};

function stripLeadingCode(title: string, code?: string) {
  if (!title) return '';
  if (code) {
    const escaped = code.replace(/\./g, '\\.');
    const re = new RegExp(`^${escaped}\\s+`);
    if (re.test(title)) return title.replace(re, '');
  }
  return title;
}

function collectTaskIds(t: LinkedTask): Set<number> {
  const s = new Set<number>([t.id]);
  for (const sub of t.subtasks || []) {
    collectTaskIds(sub).forEach(id => s.add(id));
  }
  return s;
}

/**
 * Task Center tasks under one objective or sub-objective:
 * - Hierarchical numbering (1.1.1, 1.1.2, and subtasks 1.1.1.1 ...)
 * - Shows description, follow-ups (expandable + post/toggle inline), and nested subtasks
 * - Drag-and-drop OR select existing tasks to nest as subtasks under any task
 * - "+ New Task" (with default next code + description) and "Link Existing Task"
 */
export function ObjectiveTasks({
  objectiveId,
  tasks,
  people,
  onChanged,
  indent = 0,
  compact,
  parentCode,
  startIndex = 1,
  projectId,
  defaultExpanded = false,
  onOpenTask,
}: {
  objectiveId: number;
  tasks: LinkedTask[];
  people: PersonBrief[];
  onChanged: () => void;
  indent?: number;
  compact?: boolean;
  parentCode?: string;
  startIndex?: number;
  projectId?: number | null;
  defaultExpanded?: boolean;
  onOpenTask?: (taskId: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [who, setWho] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Existing tasks state for connecting to this objective or nesting under a task
  const [availableTasks, setAvailableTasks] = useState<WCTask[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<number>>(new Set());
  const [bulkLinking, setBulkLinking] = useState(false);
  const [unlinkingTaskId, setUnlinkingTaskId] = useState<number | null>(null);
  const [containerDragOver, setContainerDragOver] = useState(false);

  const nextTaskCode = parentCode ? `${parentCode}.${startIndex + tasks.length}` : `${startIndex + tasks.length}`;

  const fetchAvailable = async () => {
    setLoadingAvailable(true);
    try {
      const res = await workcenterService.getTasks({ page_size: 300 });
      const flat: WCTask[] = [];
      const walk = (list: any[]) => {
        for (const item of list || []) {
          flat.push(item);
          if (item.subtasks?.length) walk(item.subtasks);
        }
      };
      walk(res?.tasks || []);
      setAvailableTasks(flat);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch existing tasks.');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Name the task.');
    setBusy(true);
    setError('');
    try {
      const task: any = await workcenterService.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority: 'medium',
        project_id: projectId || undefined,
        assigned_to_id: who || undefined,
        deadline: deadline || undefined,
      });
      const id = task?.id ?? task?.data?.id;
      if (!id) throw new Error('The Task Center did not return the new task.');
      await api.linkTask(objectiveId, id);
      setTitle('');
      setDescription('');
      setWho('');
      setDeadline('');
      setAdding(false);
      onChanged();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (err: any) {
      setError(err.message || 'Could not create the task.');
    } finally {
      setBusy(false);
    }
  };

  const openLinker = async () => {
    setLinking(true);
    setAdding(false);
    setError('');
    setSelectedLinkIds(new Set());
    if (availableTasks.length === 0) await fetchAvailable();
  };

  const linkExisting = async (taskId: number) => {
    setLinkingTaskId(taskId);
    setError('');
    try {
      await api.linkTask(objectiveId, taskId);
      setLinking(false);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to link task.');
    } finally {
      setLinkingTaskId(null);
    }
  };

  const linkSelectedBatch = async () => {
    if (selectedLinkIds.size === 0) return;
    setBulkLinking(true);
    setError('');
    try {
      for (const tid of selectedLinkIds) {
        await api.linkTask(objectiveId, tid);
      }
      setSelectedLinkIds(new Set());
      setLinking(false);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to link selected tasks.');
    } finally {
      setBulkLinking(false);
    }
  };

  const unlink = async (taskId: number) => {
    setUnlinkingTaskId(taskId);
    setError('');
    try {
      await api.unlinkTask(taskId);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to unlink task.');
    } finally {
      setUnlinkingTaskId(null);
    }
  };

  const handleDropOnObjective = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContainerDragOver(false);
    const rawId = e.dataTransfer.getData('application/x-nurofin-task-id') || e.dataTransfer.getData('text/plain');
    const draggedId = Number(rawId);
    if (!draggedId || Number.isNaN(draggedId)) return;
    try {
      await api.linkTask(objectiveId, draggedId);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Could not link dropped task.');
    }
  };

  const allLinkedIds = new Set<number>();
  tasks.forEach(t => collectTaskIds(t).forEach(id => allLinkedIds.add(id)));

  const filteredAvailable = availableTasks.filter(t => {
    if (allLinkedIds.has(t.id)) return false;
    if (!linkSearch.trim()) return true;
    const q = linkSearch.toLowerCase().trim();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.project_name && t.project_name.toLowerCase().includes(q)) ||
      (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{ paddingLeft: indent }}
      onDragOver={e => {
        if (e.dataTransfer.types.includes('application/x-nurofin-task-id')) {
          e.preventDefault();
          setContainerDragOver(true);
        }
      }}
      onDragLeave={() => setContainerDragOver(false)}
      onDrop={handleDropOnObjective}
      className={cn(
        'flex flex-col rounded-xl transition-colors',
        containerDragOver && 'bg-accent-blue/10 ring-1 ring-accent-blue/40 p-1'
      )}
    >
      {/* Linked tasks list */}
      {tasks.map((t, idx) => (
        <TaskRowNode
          key={t.id}
          task={t}
          code={t.code || (parentCode ? `${parentCode}.${startIndex + idx}` : `${startIndex + idx}`)}
          depth={0}
          objectiveId={objectiveId}
          people={people}
          compact={compact}
          defaultExpanded={defaultExpanded}
          onChanged={onChanged}
          onUnlink={unlink}
          unlinkingTaskId={unlinkingTaskId}
          onOpenTask={onOpenTask}
          onError={setError}
        />
      ))}

      {error && <div className="text-[11.5px] text-accent-red font-medium px-2 py-1">{error}</div>}

      {/* Linking existing task panel */}
      {linking && (
        <div className="p-3 my-1.5 border border-border-subtle rounded-xl bg-background-secondary flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-bold text-text-primary flex items-center gap-1.5">
              <Link2 size={13} className="text-accent-blue" />
              Connect Existing Tasks ({parentCode ? `becomes ${nextTaskCode}…` : 'to objective'})
            </span>
            <button
              type="button"
              onClick={() => { setLinking(false); setError(''); setLinkSearch(''); setSelectedLinkIds(new Set()); }}
              className="text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-text-muted pointer-events-none" />
            <input
              autoFocus
              value={linkSearch}
              onChange={e => setLinkSearch(e.target.value)}
              placeholder="Search existing tasks by title, description, project, assignee..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-background-primary text-text-primary outline-none focus:border-accent-blue"
            />
          </div>

          {loadingAvailable ? (
            <div className="py-4 text-center text-xs text-text-secondary flex items-center justify-center gap-2">
              <Loader2 size={13} className="animate-spin text-accent-blue" />
              Loading tasks from Task Center...
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin pr-1">
              {filteredAvailable.length === 0 ? (
                <div className="py-3 text-center text-xs text-text-muted">
                  {linkSearch ? 'No matching tasks found.' : 'All existing tasks are already linked or none found.'}
                </div>
              ) : (
                filteredAvailable.map(at => {
                  const checked = selectedLinkIds.has(at.id);
                  return (
                    <div
                      key={at.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-border-subtle/60 text-xs transition-colors"
                    >
                      <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedLinkIds);
                            checked ? next.delete(at.id) : next.add(at.id);
                            setSelectedLinkIds(next);
                          }}
                          className="accent-[var(--accent-blue)] shrink-0"
                        />
                        <CheckSquare size={13} className={cn('shrink-0', at.status === 'completed' || at.status === 'done' ? 'text-accent-green' : 'text-text-secondary')} />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-text-primary truncate">{at.title}</div>
                          {at.description && <div className="text-[10.5px] text-text-secondary truncate">{at.description}</div>}
                        </div>
                        {at.parent_title && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 shrink-0">
                            ↳ {at.parent_title}
                          </span>
                        )}
                        {at.project_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue shrink-0">
                            #{at.project_name}
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2 shrink-0">
                        {at.assigned_to_name && (
                          <span className="text-[11px] text-text-secondary truncate max-w-[90px]">
                            {at.assigned_to_name}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => linkExisting(at.id)}
                          disabled={linkingTaskId === at.id}
                          className="px-2.5 py-1 rounded bg-accent-blue hover:bg-accent-blue-hover text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          {linkingTaskId === at.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Connect
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {selectedLinkIds.size > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-[11px] font-semibold text-text-secondary">{selectedLinkIds.size} selected</span>
              <button
                type="button"
                onClick={linkSelectedBatch}
                disabled={bulkLinking}
                className="px-3 py-1 rounded-lg bg-accent-blue text-white text-[11.5px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {bulkLinking ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Connect Selected ({selectedLinkIds.size})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creating new task form */}
      {adding ? (
        <form onSubmit={add} className="flex flex-col gap-2 py-2 px-2 my-1 rounded-xl border border-border-subtle bg-background-secondary/70 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            {parentCode && (
              <span className="font-mono text-[11.5px] font-bold px-2 py-1 rounded-md bg-accent-blue/15 text-accent-blue shrink-0" title="Auto-assigned task number">
                {nextTaskCode}
              </span>
            )}
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={300}
              placeholder={`Task ${nextTaskCode}, e.g. Call 30 NBFCs`}
              aria-label="Task title"
              className="flex-1 rounded-md border border-border-subtle bg-background-primary px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_140px] gap-1.5">
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Description / notes (optional)"
              aria-label="Task description"
              className="rounded-md border border-border-subtle bg-background-primary px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-accent-blue"
            />
            <select value={who} onChange={e => setWho(e.target.value ? Number(e.target.value) : '')} aria-label="Assignee"
              className="rounded-md border border-border-subtle bg-background-primary px-2 py-1.5 text-[12px] text-text-primary">
              <option value="">Unassigned</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Deadline"
              className="rounded-md border border-border-subtle bg-background-primary px-2 py-1.5 text-[12px] text-text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={busy} className="px-2.5 py-1 rounded-md bg-accent-blue text-white text-[12px] font-semibold disabled:opacity-60 cursor-pointer">
              {busy ? 'Creating…' : `Create task ${nextTaskCode}`}
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(''); }} className="px-2 py-1 text-[12px] text-text-secondary cursor-pointer">Cancel</button>
            <span className="text-[11px] text-text-secondary">Goes into the Task Center, linked as {nextTaskCode}.</span>
          </div>
        </form>
      ) : !linking ? (
        <div className="flex items-center gap-3 py-1 flex-wrap">
          <button
            type="button"
            onClick={() => { setAdding(true); setLinking(false); setError(''); }}
            className="text-[12px] font-semibold text-accent-blue inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus size={12} /> New Task {parentCode ? nextTaskCode : ''}
          </button>
          <button
            type="button"
            onClick={openLinker}
            className="text-[12px] font-semibold text-accent-blue inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Link2 size={12} /> Link Existing Task
          </button>
          {tasks.length > 0 && (
            <Link href="/workcenter" className="text-[11.5px] text-text-secondary inline-flex items-center gap-1 hover:text-text-primary">
              <ExternalLink size={11} /> Task center
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================ Recursive Task Row with Description, Follow-ups, Subtasks & Nesting */

function TaskRowNode({
  task,
  code,
  depth,
  objectiveId,
  people,
  compact,
  defaultExpanded,
  onChanged,
  onUnlink,
  unlinkingTaskId,
  onOpenTask,
  onError,
}: {
  task: LinkedTask;
  code: string;
  depth: number;
  objectiveId: number;
  people: PersonBrief[];
  compact?: boolean;
  defaultExpanded?: boolean;
  onChanged: () => void;
  onUnlink: (taskId: number) => void;
  unlinkingTaskId: number | null;
  onOpenTask?: (taskId: number) => void;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const [addingSub, setAddingSub] = useState(false);
  const [attachingSub, setAttachingSub] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subWho, setSubWho] = useState<number | ''>('');
  const [subDeadline, setSubDeadline] = useState('');
  const [subBusy, setSubBusy] = useState(false);

  // Follow-up posting state
  const [followupText, setFollowupText] = useState('');
  const [postingFollowup, setPostingFollowup] = useState(false);

  // Attach existing tasks as subtask under this task
  const [allTasks, setAllTasks] = useState<WCTask[]>([]);
  const [loadingAttach, setLoadingAttach] = useState(false);
  const [attachSearch, setAttachSearch] = useState('');
  const [selectedSubIds, setSelectedSubIds] = useState<Set<number>>(new Set());
  const [attachingBusy, setAttachingBusy] = useState(false);

  // Drag-and-drop state
  const [dragOver, setDragOver] = useState(false);

  const [label, cls] = STATUS[task.status] || STATUS.todo;
  const followups = task.followups || [];
  const followupCount = task.followup_count ?? followups.length;
  const pendingCount = task.pending_followup_count ?? followups.filter(f => !f.is_followup_completed).length;
  const subtasks = task.subtasks || [];
  const nextSubCode = `${code}.${subtasks.length + 1}`;
  const cleanTitle = stripLeadingCode(task.title, code);
  const hasDetails = !!(task.description || followupCount > 0 || subtasks.length > 0);

  const toggleStatus = async () => {
    try {
      await workcenterService.updateStatus(task.id, task.done ? 'in_progress' : 'completed');
      onChanged();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (e: any) {
      onError(e.message || 'Could not update task status.');
    }
  };

  const updateProgress = async (pct: number) => {
    try {
      const nextStatus = pct >= 100 ? 'completed' : pct > 0 && task.status === 'todo' ? 'in_progress' : undefined;
      await workcenterService.updateTask(task.id, { progress: pct, ...(nextStatus ? { status: nextStatus } : {}) });
      onChanged();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (e: any) {
      onError(e.message || 'Could not update task progress.');
    }
  };

  const createSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) return;
    setSubBusy(true);
    try {
      await workcenterService.createTask({
        title: subTitle.trim(),
        description: subDesc.trim() || undefined,
        parent_id: task.id,
        project_id: task.project_id || undefined,
        quarter_id: task.quarter_id || undefined,
        priority: 'medium',
        assigned_to_id: subWho || undefined,
        deadline: subDeadline || task.deadline || undefined,
      });
      setSubTitle('');
      setSubDesc('');
      setSubWho('');
      setSubDeadline('');
      setAddingSub(false);
      setExpanded(true);
      onChanged();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (e: any) {
      onError(e.message || 'Could not create subtask.');
    } finally {
      setSubBusy(false);
    }
  };

  const openAttachPicker = async () => {
    setAttachingSub(true);
    setAddingSub(false);
    setSelectedSubIds(new Set());
    if (allTasks.length === 0) {
      setLoadingAttach(true);
      try {
        const res = await workcenterService.getTasks({ page_size: 300 });
        const flat: WCTask[] = [];
        const walk = (list: any[]) => {
          for (const item of list || []) {
            flat.push(item);
            if (item.subtasks?.length) walk(item.subtasks);
          }
        };
        walk(res?.tasks || []);
        setAllTasks(flat);
      } catch (e: any) {
        onError(e.message || 'Failed to load tasks.');
      } finally {
        setLoadingAttach(false);
      }
    }
  };

  const attachSelectedAsSubtasks = async () => {
    if (selectedSubIds.size === 0) return;
    setAttachingBusy(true);
    try {
      await workcenterService.bulkUpdateParent([...selectedSubIds], task.id);
      setAttachingSub(false);
      setSelectedSubIds(new Set());
      setExpanded(true);
      onChanged();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (e: any) {
      onError(e.message || 'Failed to attach tasks as subtasks.');
    } finally {
      setAttachingBusy(false);
    }
  };

  const detachSubtask = async () => {
    try {
      await workcenterService.updateTask(task.id, { parent_id: 0 });
      onChanged();
    } catch (e: any) {
      onError(e.message || 'Failed to detach subtask.');
    }
  };

  const postFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupText.trim()) return;
    setPostingFollowup(true);
    try {
      await workcenterService.addComment(task.id, { content: followupText.trim() });
      setFollowupText('');
      onChanged();
    } catch (e: any) {
      onError(e.message || 'Failed to post follow-up.');
    } finally {
      setPostingFollowup(false);
    }
  };

  const toggleFollowupDone = async (f: LinkedTaskFollowup) => {
    try {
      await workcenterService.updateComment(task.id, f.id, { is_followup_completed: !f.is_followup_completed });
      onChanged();
    } catch (e: any) {
      onError(e.message || 'Failed to update follow-up.');
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/x-nurofin-task-id', String(task.id));
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnTask = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const rawId = e.dataTransfer.getData('application/x-nurofin-task-id') || e.dataTransfer.getData('text/plain');
    const draggedId = Number(rawId);
    if (!draggedId || Number.isNaN(draggedId) || draggedId === task.id) return;
    try {
      await workcenterService.updateTask(draggedId, { parent_id: task.id });
      setExpanded(true);
      onChanged();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (e: any) {
      onError(e.message || 'Could not move task under this task.');
    }
  };

  const ownAndSubIds = collectTaskIds(task);
  const attachCandidates = allTasks.filter(t => {
    if (ownAndSubIds.has(t.id) || t.parent_id === task.id) return false;
    if (!attachSearch.trim()) return true;
    const q = attachSearch.toLowerCase().trim();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.project_name && t.project_name.toLowerCase().includes(q)) ||
      (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ marginLeft: depth > 0 ? 18 : 0 }} className="flex flex-col">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={e => {
          if (e.dataTransfer.types.includes('application/x-nurofin-task-id')) {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropOnTask}
        className={cn(
          'group/task rounded-lg transition-colors px-2 py-1.5 border border-transparent',
          dragOver ? 'bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/30' : 'hover:bg-surface-hover/50'
        )}
      >
        <div className="flex items-start gap-2 text-[12.5px]">
          <span className="text-text-muted/60 cursor-grab pt-0.5 shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity" title="Drag onto another task to make it a subtask">
            <GripVertical size={12} />
          </span>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="pt-0.5 text-text-secondary hover:text-text-primary shrink-0 cursor-pointer"
            title={expanded ? 'Hide details & follow-ups' : 'Show description, follow-ups & subtasks'}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          <button
            type="button"
            onClick={toggleStatus}
            title={task.done ? 'Mark in progress' : 'Mark done'}
            className="pt-0.5 shrink-0 cursor-pointer"
          >
            <CheckSquare size={13} className={cn(task.done ? 'text-accent-green' : 'text-text-secondary hover:text-accent-blue')} />
          </button>

          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue shrink-0">
            {code}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => (onOpenTask ? onOpenTask(task.id) : setExpanded(!expanded))}
                className={cn(
                  'font-semibold text-left hover:text-accent-blue transition-colors cursor-pointer break-words',
                  task.done && 'line-through text-text-secondary'
                )}
              >
                {cleanTitle}
              </button>
              {task.project_name && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-primary border border-border-subtle text-text-secondary font-medium">
                  #{task.project_name}
                </span>
              )}
            </div>

            {/* Inline description preview */}
            {task.description && !expanded && (
              <div className="text-[11.5px] text-text-secondary line-clamp-1 mt-0.5 flex items-center gap-1">
                <FileText size={10} className="shrink-0 opacity-70" />
                <span className="truncate">{task.description}</span>
              </div>
            )}

            {/* Quick metadata pills: follow-ups + subtasks */}
            {(followupCount > 0 || subtasks.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {followupCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className={cn(
                      'inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md cursor-pointer transition-colors',
                      pendingCount > 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    )}
                  >
                    <MessageSquare size={10} />
                    <span>{followupCount} {followupCount === 1 ? 'follow-up' : 'follow-ups'}</span>
                    {pendingCount > 0 && <span>· {pendingCount} pending</span>}
                  </button>
                )}
                {subtasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 cursor-pointer"
                  >
                    <CornerDownRight size={10} />
                    <span>{subtasks.filter(s => s.done).length}/{subtasks.length} subtasks</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {!compact && task.assignee && (
              <span className="text-[11px] text-text-secondary truncate max-w-[110px]">{task.assignee.name}</span>
            )}
            {task.deadline && (
              <span className={cn('text-[11px] shrink-0', task.overdue ? 'text-accent-red font-semibold' : 'text-text-secondary')}>
                {fmt(task.deadline)}
              </span>
            )}
            <select
              aria-label="Task progress percentage"
              value={Math.round((task.done ? 100 : (task.progress ?? 0)) / 10) * 10}
              onChange={e => updateProgress(Number(e.target.value))}
              onClick={e => e.stopPropagation()}
              title="Update task progress %"
              className="text-[10.5px] font-semibold rounded-md border border-border-subtle bg-background-primary px-1 py-0.5 text-text-primary cursor-pointer shrink-0"
            >
              {Array.from({ length: 11 }, (_, i) => i * 10).map(v => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
            <span className={cn('text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', task.overdue ? 'text-accent-red bg-accent-red/10' : cls)}>
              {task.overdue ? 'Overdue' : label}
            </span>

            {/* Actions */}
            <button
              type="button"
              onClick={() => { setAddingSub(!addingSub); setAttachingSub(false); setExpanded(true); }}
              title={`Add new subtask ${nextSubCode}`}
              className="opacity-70 group-hover/task:opacity-100 px-1.5 py-0.5 rounded text-[10.5px] font-semibold text-accent-blue hover:bg-accent-blue/10 cursor-pointer inline-flex items-center gap-0.5"
            >
              <Plus size={11} /> Sub
            </button>
            <button
              type="button"
              onClick={openAttachPicker}
              title={`Attach existing task under ${code}`}
              className="opacity-70 group-hover/task:opacity-100 px-1.5 py-0.5 rounded text-[10.5px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer inline-flex items-center gap-0.5"
            >
              <Link2 size={10} /> Nest
            </button>
            {onOpenTask && (
              <button
                type="button"
                onClick={() => onOpenTask(task.id)}
                title="Open task side panel"
                className="opacity-70 group-hover/task:opacity-100 p-1 rounded text-text-secondary hover:text-accent-blue cursor-pointer"
              >
                <ArrowUpRight size={12} />
              </button>
            )}
            {depth === 0 ? (
              <button
                type="button"
                onClick={() => onUnlink(task.id)}
                disabled={unlinkingTaskId === task.id}
                title="Disconnect task from this objective"
                className="opacity-0 group-hover/task:opacity-100 p-1 hover:text-accent-red text-text-muted transition-opacity cursor-pointer shrink-0"
              >
                {unlinkingTaskId === task.id ? <Loader2 size={11} className="animate-spin text-accent-red" /> : <X size={11} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={detachSubtask}
                title="Detach subtask to top-level"
                className="opacity-0 group-hover/task:opacity-100 p-1 hover:text-accent-orange text-text-muted transition-opacity cursor-pointer shrink-0"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Drag hint */}
        {dragOver && (
          <div className="mt-1 ml-8 text-[11px] font-bold text-purple-600 dark:text-purple-400">
            Drop to nest as subtask {nextSubCode} under &ldquo;{cleanTitle}&rdquo;
          </div>
        )}

        {/* Expanded drawer: Description + Follow-ups + Inline Follow-up Form */}
        {expanded && (
          <div className="mt-2 ml-8 pl-3 border-l-2 border-border-subtle space-y-2.5 text-[12px]">
            {/* Full Description */}
            {task.description ? (
              <div className="bg-background-primary/80 border border-border-subtle/70 rounded-lg p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Description</div>
                <div className="text-[12px] text-text-primary whitespace-pre-wrap leading-relaxed">{task.description}</div>
              </div>
            ) : !hasDetails ? (
              <div className="text-[11px] text-text-secondary italic">No description or follow-ups yet.</div>
            ) : null}

            {/* Follow-ups list */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                  <MessageSquare size={11} className="text-accent-blue" />
                  Follow-ups & Updates ({followupCount})
                </span>
                <Link
                  href={`/workcenter?task=${task.id}&tab=updates`}
                  className="text-[10.5px] font-semibold text-accent-blue hover:underline inline-flex items-center gap-1"
                >
                  Open in Task Center <ExternalLink size={10} />
                </Link>
              </div>

              {followups.length > 0 && (
                <div className="space-y-1.5">
                  {followups.map(f => (
                    <FollowupCard key={f.id} f={f} onToggle={toggleFollowupDone} />
                  ))}
                </div>
              )}

              {/* Quick post follow-up */}
              <form onSubmit={postFollowup} className="flex items-center gap-1.5 pt-1">
                <input
                  value={followupText}
                  onChange={e => setFollowupText(e.target.value)}
                  placeholder={`Post follow-up / update on ${code}...`}
                  className="flex-1 rounded-md border border-border-subtle bg-background-primary px-2.5 py-1 text-[11.5px] text-text-primary outline-none focus:border-accent-blue"
                />
                <button
                  type="submit"
                  disabled={postingFollowup || !followupText.trim()}
                  className="px-2.5 py-1 rounded-md bg-accent-blue hover:bg-accent-blue-hover text-white text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  {postingFollowup ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Post
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Inline add subtask form */}
        {addingSub && (
          <form onSubmit={createSubtask} className="mt-2 ml-8 p-2.5 rounded-xl border border-border-subtle bg-background-secondary/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                {nextSubCode}
              </span>
              <input
                autoFocus
                value={subTitle}
                onChange={e => setSubTitle(e.target.value)}
                placeholder={`New subtask ${nextSubCode} under ${code}...`}
                className="flex-1 rounded-md border border-border-subtle bg-background-primary px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent-blue"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_130px] gap-1.5">
              <input
                value={subDesc}
                onChange={e => setSubDesc(e.target.value)}
                placeholder="Description (optional)"
                className="rounded-md border border-border-subtle bg-background-primary px-2 py-1 text-[11.5px] text-text-primary outline-none focus:border-accent-blue"
              />
              <select
                value={subWho}
                onChange={e => setSubWho(e.target.value ? Number(e.target.value) : '')}
                className="rounded-md border border-border-subtle bg-background-primary px-2 py-1 text-[11.5px] text-text-primary"
              >
                <option value="">Assignee...</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                type="date"
                value={subDeadline}
                onChange={e => setSubDeadline(e.target.value)}
                className="rounded-md border border-border-subtle bg-background-primary px-2 py-1 text-[11.5px] text-text-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={subBusy || !subTitle.trim()}
                className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[11.5px] font-semibold disabled:opacity-50 cursor-pointer"
              >
                {subBusy ? 'Adding…' : `Add subtask ${nextSubCode}`}
              </button>
              <button type="button" onClick={() => setAddingSub(false)} className="px-2 py-1 text-[11.5px] text-text-secondary cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Inline attach existing tasks as subtasks under this task */}
        {attachingSub && (
          <div className="mt-2 ml-8 p-2.5 rounded-xl border border-purple-500/30 bg-background-secondary space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold text-text-primary flex items-center gap-1.5">
                <CornerDownRight size={12} className="text-purple-500" />
                Select existing tasks to make subtasks under {code} ({nextSubCode}…)
              </span>
              <button type="button" onClick={() => setAttachingSub(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={13} />
              </button>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2 text-text-muted" />
              <input
                autoFocus
                value={attachSearch}
                onChange={e => setAttachSearch(e.target.value)}
                placeholder="Search existing tasks to nest here..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-border-subtle bg-background-primary text-text-primary outline-none focus:border-purple-500"
              />
            </div>
            {loadingAttach ? (
              <div className="py-3 text-center text-xs text-text-secondary flex items-center justify-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Loading tasks...
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {attachCandidates.length === 0 ? (
                  <div className="py-2 text-center text-xs text-text-muted">No matching tasks available.</div>
                ) : (
                  attachCandidates.map(ct => {
                    const checked = selectedSubIds.has(ct.id);
                    return (
                      <label
                        key={ct.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-border-subtle/50 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedSubIds);
                            checked ? next.delete(ct.id) : next.add(ct.id);
                            setSelectedSubIds(next);
                          }}
                          className="accent-purple-600 shrink-0"
                        />
                        <span className="font-medium text-text-primary truncate flex-1">{ct.title}</span>
                        {ct.assigned_to_name && <span className="text-[10.5px] text-text-secondary shrink-0">{ct.assigned_to_name}</span>}
                      </label>
                    );
                  })
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
              <span className="text-[11px] text-text-secondary">{selectedSubIds.size} selected</span>
              <button
                type="button"
                disabled={attachingBusy || selectedSubIds.size === 0}
                onClick={attachSelectedAsSubtasks}
                className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                {attachingBusy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Make Subtask{selectedSubIds.size > 1 ? 's' : ''} ({selectedSubIds.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recursive Subtasks (1.1.1.1, 1.1.1.2, ...) */}
      {subtasks.length > 0 && (
        <div className="border-l border-border-subtle/70 ml-5 pl-1 mt-0.5 space-y-0.5">
          {subtasks.map((st, sIdx) => (
            <TaskRowNode
              key={st.id}
              task={st}
              code={st.code || `${code}.${sIdx + 1}`}
              depth={depth + 1}
              objectiveId={objectiveId}
              people={people}
              compact={compact}
              onChanged={onChanged}
              onUnlink={onUnlink}
              unlinkingTaskId={unlinkingTaskId}
              onOpenTask={onOpenTask}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowupCard({ f, onToggle, isReply }: { f: LinkedTaskFollowup; onToggle: (f: LinkedTaskFollowup) => void; isReply?: boolean }) {
  return (
    <div className={cn('rounded-lg border border-border-subtle/70 bg-background-primary p-2 space-y-1', isReply && 'ml-4 bg-background-secondary/50')}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-text-primary truncate">{f.user_name}</span>
          {f.created_at && (
            <span className="text-[10px] text-text-muted font-mono shrink-0" title={formatISTDateTime(f.created_at)}>
              {accurateTimeAgo(f.created_at)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggle(f)}
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full cursor-pointer shrink-0',
            f.is_followup_completed
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          )}
          title="Click to toggle follow-up completion"
        >
          {f.is_followup_completed ? <CheckCircle2 size={10} /> : <Clock size={10} />}
          <span>{f.is_followup_completed ? 'Completed' : 'Pending'}</span>
        </button>
      </div>
      <div className="text-[11.5px] text-text-primary whitespace-pre-wrap leading-relaxed">{f.content}</div>
      {f.replies && f.replies.length > 0 && (
        <div className="space-y-1 pt-1">
          {f.replies.map(r => <FollowupCard key={r.id} f={r} onToggle={onToggle} isReply />)}
        </div>
      )}
    </div>
  );
}
