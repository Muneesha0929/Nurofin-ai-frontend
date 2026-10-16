'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckSquare, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService as api, LinkedTask, PersonBrief } from '@/services/departmentTargets';
import { workcenterService } from '@/services/workcenter';

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
 * Task Center tasks under one objective or sub-objective, plus "+ Task": creates a real
 * Task Center task (through the Task Center's own API) and links it here.
 */
export function ObjectiveTasks({ objectiveId, tasks, people, onChanged, indent = 0, compact }: {
  objectiveId: number; tasks: LinkedTask[]; people: PersonBrief[]; onChanged: () => void; indent?: number; compact?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [who, setWho] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div style={{ paddingLeft: indent }} className="flex flex-col">
      {tasks.map(t => {
        const [label, cls] = STATUS[t.status] || STATUS.todo;
        return (
          <div key={t.id} className="flex items-center gap-2 py-1.5 text-[12.5px]">
            <CheckSquare size={12} className={cn('shrink-0', t.done ? 'text-accent-green' : 'text-text-secondary')} />
            <span className={cn('flex-1 min-w-0 truncate', t.done && 'line-through text-text-secondary')}>{t.title}</span>
            {!compact && t.assignee && <span className="text-[11.5px] text-text-secondary truncate max-w-[120px]">{t.assignee.name}</span>}
            {t.deadline && <span className={cn('text-[11.5px] shrink-0', t.overdue ? 'text-accent-red font-semibold' : 'text-text-secondary')}>{fmt(t.deadline)}</span>}
            <span className={cn('text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', t.overdue ? 'text-accent-red bg-accent-red/10' : cls)}>{t.overdue ? 'Overdue' : label}</span>
          </div>
        );
      })}
      {adding ? (
        <form onSubmit={add} className="flex flex-col gap-1.5 py-2">
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
            <button type="submit" disabled={busy} className="px-2.5 py-1 rounded-md bg-accent-blue text-white text-[12px] font-semibold disabled:opacity-60">{busy ? 'Creating…' : 'Create task'}</button>
            <button type="button" onClick={() => { setAdding(false); setError(''); }} className="px-2 py-1 text-[12px] text-text-secondary">Cancel</button>
            <span className="text-[11.5px] text-text-secondary">Goes into the Task center, linked here.</span>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3 py-1">
          <button onClick={() => setAdding(true)} className="text-[12px] font-semibold text-accent-blue inline-flex items-center gap-1"><Plus size={12} /> Task</button>
          {tasks.length > 0 && <Link href="/workcenter" className="text-[11.5px] text-text-secondary inline-flex items-center gap-1 hover:text-text-primary"><ExternalLink size={11} /> Task center</Link>}
        </div>
      )}
    </div>
  );
}
