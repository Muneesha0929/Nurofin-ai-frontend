'use client';
// Month calendar of task deadlines. Drag a task onto another day to move its deadline
// (you will be asked why). Tasks with no deadline wait in the tray below: drop them on a day to set one.
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CodeChip } from '@/components/timeline/CodeChip';
import { isoDay } from '@/services/timeline';
import { draggingIds, endTaskDrag, isTaskDrag, readDraggedIds, startTaskDrag } from './dnd';
import type { TaskSelection } from './useTaskSelection';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PER_DAY = 3;

const dot = (s: string) => (s === 'completed' || s === 'done' ? 'bg-accent-green' : s === 'blocked' ? 'bg-accent-red' : 'bg-accent-blue');

export function TaskCalendarView({
  tasks, codeOf, onSelectTask, onDropOnDay, selection, revealId,
}: {
  tasks: any[];
  codeOf: (id: number) => string | undefined;
  onSelectTask: (t: any) => void;
  onDropOnDay: (ids: number[], day: string) => void;
  selection: TaskSelection;
  revealId?: number | null;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [overDay, setOverDay] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const today = isoDay(now);

  // Deep link to a task: show the month its deadline is in.
  useEffect(() => {
    if (!revealId) return;
    const t = tasks.find(x => x.id === revealId);
    if (t?.deadline) { const d = new Date(t.deadline.slice(0, 10) + 'T00:00:00'); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }
  }, [revealId, tasks]);

  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const t of tasks) if (t.deadline) (m[t.deadline.slice(0, 10)] ||= []).push(t);
    return m;
  }, [tasks]);
  const undated = useMemo(() => tasks.filter(t => !t.deadline), [tasks]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const start = new Date(cursor.y, cursor.m, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);
  const rows = cells[35].getMonth() === cursor.m ? 6 : 5;

  const step = (n: number) => setCursor(c => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const renderChip = (t: any) => {
    const done = t.status === 'completed' || t.status === 'done';
    const overdue = !done && t.deadline && t.deadline.slice(0, 10) < today;
    const code = codeOf(t.id);
    return (
      <div
        key={t.id}
        data-task-id={t.id}
        draggable
        role="button"
        tabIndex={0}
        title={`${code ? code + ' · ' : ''}${t.title}`}
        onDragStart={e => { startTaskDrag(e, t.id, selection.selected); }}
        onDragEnd={() => { endTaskDrag(); setOverDay(null); }}
        onClick={() => onSelectTask(t)}
        onKeyDown={e => { if (e.key === 'Enter') onSelectTask(t); }}
        className={cn(
          'group flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] cursor-grab active:cursor-grabbing bg-background-primary hover:border-accent-blue/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue',
          selection.has(t.id) ? 'border-accent-blue ring-1 ring-accent-blue/40' : 'border-border-subtle',
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot(t.status))} />
        {code && <CodeChip code={code} size="xs" />}
        <span className={cn('truncate min-w-0 font-medium', done ? 'line-through text-text-secondary' : overdue ? 'text-accent-red' : 'text-text-primary')}>{t.title}</span>
      </div>
    );
  };

  const dropProps = (day: string) => ({
    onDragOver: (e: React.DragEvent) => { if (isTaskDrag(e)) { e.preventDefault(); setOverDay(day); } },
    onDragLeave: () => setOverDay(prev => (prev === day ? null : prev)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOverDay(null);
      const ids = readDraggedIds(e);
      endTaskDrag();
      if (ids.length) onDropOnDay(ids, day);
    },
  });

  const count = draggingIds().length;

  return (
    <div className="space-y-3 normal-case">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-text-primary">{MONTHS[cursor.m]} {cursor.y}</h4>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="p-1.5 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-background-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"><ChevronLeft size={14} /></button>
          <button type="button" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })} className="px-2.5 py-1 rounded-lg border border-border-subtle text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-background-secondary">Today</button>
          <button type="button" onClick={() => step(1)} aria-label="Next month" className="p-1.5 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-background-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"><ChevronRight size={14} /></button>
        </div>
      </div>
      <p className="text-[12px] text-text-secondary">Drag a task onto another day to move its deadline. You will be asked why, and it goes on the task timeline.</p>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[760px] rounded-xl border border-border-subtle overflow-hidden bg-background-secondary">
          <div className="grid grid-cols-7 border-b border-border-subtle">
            {WEEKDAYS.map(d => <div key={d} className="px-2 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-text-secondary">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.slice(0, rows * 7).map((d, i) => {
              const day = isoDay(d);
              const inMonth = d.getMonth() === cursor.m;
              const list = byDay[day] || [];
              const shown = openDay === day ? list : list.slice(0, PER_DAY);
              const over = overDay === day;
              return (
                <div
                  key={day}
                  {...dropProps(day)}
                  className={cn(
                    'min-h-[112px] p-1.5 border-b border-r border-border-subtle/70 space-y-1 transition-colors',
                    (i + 1) % 7 === 0 && 'border-r-0',
                    !inMonth && 'bg-background-primary/50',
                    over && 'bg-accent-blue/10 ring-2 ring-inset ring-accent-blue/60',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[11px] font-semibold w-5 h-5 inline-flex items-center justify-center rounded-full', day === today ? 'bg-accent-blue text-white' : inMonth ? 'text-text-primary' : 'text-text-secondary/60')}>{d.getDate()}</span>
                    {over && <span className="text-[10px] font-semibold text-accent-blue">{count > 1 ? `Move ${count} here` : 'Move here'}</span>}
                  </div>
                  {shown.map(renderChip)}
                  {list.length > PER_DAY && (
                    <button type="button" onClick={() => setOpenDay(openDay === day ? null : day)} className="text-[10.5px] font-semibold text-accent-blue hover:underline">
                      {openDay === day ? 'Show less' : `+${list.length - PER_DAY} more`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border-subtle p-3">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-text-primary mb-2"><CalendarOff size={13} className="text-text-secondary" />No deadline yet ({undated.length})</div>
        {undated.length === 0 ? (
          <p className="text-[12px] text-text-secondary">Every task here has a deadline. Tasks without one will wait here until you drop them on a day.</p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{undated.map(renderChip)}</div>
        )}
      </div>
    </div>
  );
}
