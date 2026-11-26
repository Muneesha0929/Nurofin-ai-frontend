'use client';
// The deadline wherever a task is shown. Clicking it must never open the task, so we stop the click here
// (the "Move deadline" dialog renders inside the badge and would otherwise bubble to the row).
import React from 'react';
import { CalendarClock } from 'lucide-react';
import { DeadlineBadge } from '@/components/timeline/DeadlineBadge';
import { fmtDay, isoDay } from '@/services/timeline';
import { cn } from '@/utils/cn';

export function RowDeadline({ task, label, onChanged, className }: { task: any; label?: string; onChanged?: () => void; className?: string }) {
  return (
    <div onClick={e => e.stopPropagation()} className="inline-block">
      <DeadlineBadge
        entity="task"
        id={task.id}
        deadline={task.deadline}
        originalDeadline={task.original_deadline}
        changes={task.deadline_changes || 0}
        done={task.status === 'completed' || task.status === 'done'}
        title={label ? `${label} ${task.title}` : task.title}
        onChanged={onChanged}
        className={className}
      />
    </div>
  );
}

/** For the task panel, which is a modal dialog: a popover portalled to <body> can't be clicked inside one,
 *  so the panel shows the dates plainly and opens the Timeline tab / Move deadline dialog instead. */
export function PanelDeadline({ task, onOpenTimeline, onMove }: { task: any; onOpenTimeline: () => void; onMove: () => void }) {
  const today = isoDay(new Date());
  const done = task.status === 'completed' || task.status === 'done';
  const overdue = !done && !!task.deadline && task.deadline.slice(0, 10) < today;
  const moved = !!task.original_deadline && !!task.deadline && task.original_deadline.slice(0, 10) !== task.deadline.slice(0, 10);
  const changes = task.deadline_changes || 0;
  return (
    <span className="inline-flex items-center gap-1.5 normal-case">
      <button
        type="button"
        onClick={onOpenTimeline}
        title="See every change to this deadline"
        className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue', overdue ? 'text-accent-red' : 'text-text-secondary')}
      >
        <CalendarClock size={12} />
        {task.deadline ? (
          moved ? <><span className="line-through opacity-70">{fmtDay(task.original_deadline)}</span><span>→</span><span className="font-semibold text-text-primary">{fmtDay(task.deadline)}</span></>
            : <span className="text-text-primary font-semibold">{fmtDay(task.deadline)}</span>
        ) : <span>No date</span>}
        {changes > 0 && <span className="ml-0.5 rounded-full bg-accent-orange/15 text-accent-orange text-[10px] font-bold px-1.5 leading-4">{changes}</span>}
      </button>
      {task.deadline && (
        <button
          type="button"
          onClick={onMove}
          className="inline-flex items-center gap-1 rounded-lg bg-accent-orange/10 text-accent-orange px-2 py-0.5 text-[11px] font-semibold hover:bg-accent-orange/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange"
        >
          <CalendarClock size={11} />Move deadline
        </button>
      )}
    </span>
  );
}
