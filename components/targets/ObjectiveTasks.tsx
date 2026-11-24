'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckSquare, Plus, ExternalLink, Link2, X, Search, Loader2, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService as api, LinkedTask, PersonBrief } from '@/services/departmentTargets';
import { workcenterService, WCTask } from '@/services/workcenter';

const fmt = (iso?: string | null) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const STATUS: Record<string, [string, string]> = {
  completed: ['Done', 'text-accent-green bg-accent-green/10'],
  done: ['Done', 'text-accent-green bg-accent-green/10'],
  in_progress: ['In progress', 'text-accent-blue bg-accent-blue/10'],
  review: ['In review', 'text-accent-orange bg-accent-orange/10'],
  blocked: ['Blocked', 'text-accent-orange bg-accent-orange/10'],
  todo: ['To do', 'text-text-secondary bg-[var(--bg-primary)]'],
};

/**
 * Task Center tasks under one objective or sub-objective:
 * - Shows all linked tasks with disconnect / unlink action
 * - "+ New Task": creates a new Task Center task and links it
 * - "Link Existing Task": connects an already existing task from the Task Center
 */
export function ObjectiveTasks({ objectiveId, tasks, people, onChanged, indent = 0, compact }: {
  objectiveId: number; tasks: LinkedTask[]; people: PersonBrief[]; onChanged: () => void; indent?: number; compact?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);
  const [title, setTitle] = useState('');
  const [who, setWho] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Existing tasks state for connecting
  const [availableTasks, setAvailableTasks] = useState<WCTask[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const [unlinkingTaskId, setUnlinkingTaskId] = useState<number | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Name the task.');
    setBusy(true); setError('');
    try {
      const task: any = await workcenterService.createTask({ title: title.trim(), priority: 'medium', assigned_to_id: who || undefined, deadline: deadline || undefined });
      const id = task?.id ?? task?.data?.id;
      if (!id) throw new Error('The Task Center did not return the new task.');
      await api.linkTask(objectiveId, id);
      setTitle(''); setWho(''); setDeadline(''); setAdding(false);
      onChanged();
    } catch (err: any) { setError(err.message || 'Could not create the task.'); } finally { setBusy(false); }
  };

  const openLinker = async () => {
    setLinking(true);
    setAdding(false);
    setError('');
    if (availableTasks.length === 0) {
      setLoadingAvailable(true);
      try {
        const res = await workcenterService.getTasks({ page_size: 200 });
        setAvailableTasks(res?.tasks || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch existing tasks.');
      } finally {
        setLoadingAvailable(false);
      }
    }
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

  const filteredAvailable = availableTasks.filter(t => {
    if (tasks.some(lt => lt.id === t.id)) return false;
    if (!linkSearch.trim()) return true;
    const q = linkSearch.toLowerCase().trim();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.project_name && t.project_name.toLowerCase().includes(q)) ||
      (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ paddingLeft: indent }} className="flex flex-col">
      {/* Linked tasks list */}
      {tasks.map(t => {
        const [label, cls] = STATUS[t.status] || STATUS.todo;
        return (
          <div key={t.id} className="group/task flex items-center gap-2 py-1.5 text-[12.5px] hover:bg-surface-hover/50 px-2 rounded-lg transition-colors">
            <CheckSquare size={12} className={cn('shrink-0', t.done ? 'text-accent-green' : 'text-text-secondary')} />
            <span className={cn('flex-1 min-w-0 truncate', t.done && 'line-through text-text-secondary')}>{t.title}</span>
            {!compact && t.assignee && <span className="text-[11.5px] text-text-secondary truncate max-w-[120px]">{t.assignee.name}</span>}
            {t.deadline && <span className={cn('text-[11.5px] shrink-0', t.overdue ? 'text-accent-red font-semibold' : 'text-text-secondary')}>{fmt(t.deadline)}</span>}
            <span className={cn('text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', t.overdue ? 'text-accent-red bg-accent-red/10' : cls)}>{t.overdue ? 'Overdue' : label}</span>
            <button
              type="button"
              onClick={() => unlink(t.id)}
              disabled={unlinkingTaskId === t.id}
              title="Disconnect task from this objective"
              className="opacity-0 group-hover/task:opacity-100 p-1 hover:text-accent-red text-text-muted transition-opacity cursor-pointer shrink-0"
            >
              {unlinkingTaskId === t.id ? <Loader2 size={11} className="animate-spin text-accent-red" /> : <X size={11} />}
            </button>
          </div>
        );
      })}

      {/* Linking existing task panel */}
      {linking && (
        <div className="p-3 my-1.5 border border-border-subtle rounded-xl bg-background-secondary flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-bold text-text-primary flex items-center gap-1.5">
              <Link2 size={13} className="text-accent-blue" />
              Connect Existing Task to Department Objective
            </span>
            <button 
              type="button"
              onClick={() => { setLinking(false); setError(''); setLinkSearch(''); }}
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
              placeholder="Search existing tasks by title, project, assignee..."
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
                filteredAvailable.map(at => (
                  <div
                    key={at.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-border-subtle/60 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CheckSquare size={13} className={cn("shrink-0", at.status === 'completed' || at.status === 'done' ? "text-accent-green" : "text-text-secondary")} />
                      <span className="font-semibold text-text-primary truncate">{at.title}</span>
                      {at.project_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue shrink-0">
                          #{at.project_name}
                        </span>
                      )}
                    </div>
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
                ))
              )}
            </div>
          )}

          {error && <div className="text-[11.5px] text-accent-red font-medium">{error}</div>}
        </div>
      )}

      {/* Creating new task form */}
      {adding ? (
        <form onSubmit={add} className="flex flex-col gap-1.5 py-2 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_140px] gap-1.5">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={300} placeholder="Task, e.g. Call 30 NBFCs" aria-label="Task title"
              className="rounded-md border border-border-subtle bg-background-primary px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue" />
            <select value={who} onChange={e => setWho(e.target.value ? Number(e.target.value) : '')} aria-label="Assignee"
              className="rounded-md border border-border-subtle bg-background-primary px-2 py-1.5 text-[12.5px] text-text-primary">
              <option value="">Unassigned</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Deadline"
              className="rounded-md border border-border-subtle bg-background-primary px-2 py-1.5 text-[12.5px] text-text-primary" />
          </div>
          {error && <div className="text-[12px] text-accent-red">{error}</div>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={busy} className="px-2.5 py-1 rounded-md bg-accent-blue text-white text-[12px] font-semibold disabled:opacity-60 cursor-pointer">{busy ? 'Creating…' : 'Create task'}</button>
            <button type="button" onClick={() => { setAdding(false); setError(''); }} className="px-2 py-1 text-[12px] text-text-secondary cursor-pointer">Cancel</button>
            <span className="text-[11.5px] text-text-secondary">Goes into the Task center, linked here.</span>
          </div>
        </form>
      ) : !linking ? (
        <div className="flex items-center gap-3 py-1 flex-wrap">
          <button 
            type="button" 
            onClick={() => { setAdding(true); setLinking(false); setError(''); }} 
            className="text-[12px] font-semibold text-accent-blue inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus size={12} /> New Task
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
