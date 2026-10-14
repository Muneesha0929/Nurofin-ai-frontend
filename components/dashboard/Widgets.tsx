'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, StickyNote, CheckSquare, Target } from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask } from '@/services/workcenter';
import { DeadlineItem } from '@/services/departmentTargets';
import { StatusChip, fmtDay } from '@/components/SidePanel';

/** One row on the calendar / lists: either a Task Center task or a department objective. */
export interface Entry {
  key: string;
  kind: 'task' | 'objective';
  id: number;
  title: string;
  date: string;           // YYYY-MM-DD
  status: string;
  done: boolean;
  overdue: boolean;
  person: string | null;
  avatar?: string | null;
  where: string;          // project or department
  progress?: number;
  mine: boolean;
  deptId?: number;
  task?: WCTask;
}

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => isoDay(new Date());

export function fromTask(t: WCTask, meId: string): Entry | null {
  if (!t.deadline) return null;
  const date = t.deadline.slice(0, 10);
  const done = t.status === 'completed' || t.status === 'done';
  return {
    key: `t${t.id}`, kind: 'task', id: t.id, title: t.title, date, status: t.status, done,
    overdue: !done && date < today(), person: t.assigned_to_name, avatar: t.assigned_to_avatar,
    where: t.project_name || 'Task center', mine: String(t.assigned_to_id) === String(meId), task: t,
  };
}

export function fromObjective(o: DeadlineItem): Entry {
  return {
    key: `o${o.id}`, kind: 'objective', id: o.id, title: o.title, date: o.deadline, status: o.status, done: o.status === 'done',
    overdue: o.overdue, person: o.owner?.name || null, avatar: o.owner?.avatar, where: o.department.name || 'Department',
    progress: o.progress, mine: o.mine, deptId: o.department.id,
  };
}

const Card = ({ title, right, children, className }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={cn('bg-background-secondary border border-border-subtle rounded-2xl p-4 flex flex-col gap-3 normal-case min-w-0', className)}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-[13.5px] font-bold text-text-primary">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

const KindIcon = ({ kind }: { kind: Entry['kind'] }) =>
  kind === 'objective' ? <Target size={12} className="text-accent-blue shrink-0" /> : <CheckSquare size={12} className="text-text-secondary shrink-0" />;

export function EntryRow({ e, onOpen, showDate = true, action }: { e: Entry; onOpen: (e: Entry) => void; showDate?: boolean; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-t border-border-subtle first:border-t-0">
      <button onClick={() => onOpen(e)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left group">
        {showDate && (
          <span className={cn('w-10 text-center leading-tight shrink-0', e.overdue && 'text-accent-red')}>
            <b className="block text-[15px] font-extrabold">{new Date(e.date + 'T00:00:00').getDate()}</b>
            <span className="block text-[10px] uppercase text-text-secondary">{new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}</span>
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className={cn('flex items-center gap-1.5 text-[13px] font-medium text-text-primary group-hover:text-accent-blue', e.done && 'line-through text-text-secondary')}>
            <KindIcon kind={e.kind} /><span className="truncate">{e.title}</span>
          </span>
          <span className="block text-[11.5px] text-text-secondary truncate">{e.where}{e.person ? ` · ${e.person}` : ''}</span>
        </span>
      </button>
      {action ?? <StatusChip status={e.status} overdue={e.overdue} />}
    </div>
  );
}

/* ------------------------------------------------------------ calendar */

export function DeadlineCalendar({ entries, month, setMonth, selected, setSelected, scope, colorOf }: {
  entries: Entry[]; month: Date; setMonth: (d: Date) => void; selected: string | null; setSelected: (d: string | null) => void; scope?: React.ReactNode;
  colorOf?: (deptId?: number) => string | undefined;
}) {
  const byDay = useMemo(() => {
    const m: Record<string, Entry[]> = {};
    entries.forEach(e => (m[e.date] = m[e.date] || []).push(e));
    Object.values(m).forEach(l => l.sort((a, b) => Number(a.done) - Number(b.done) || (a.kind === b.kind ? 0 : a.kind === 'objective' ? -1 : 1)));
    return m;
  }, [entries]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => isoDay(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);
  const now = today();
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <Card className="lg:col-span-2"
      title={<span className="flex items-center gap-2">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover"><ChevronLeft size={15} /></button>
        <span className="w-32 text-center">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => shift(1)} aria-label="Next month" className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover"><ChevronRight size={15} /></button>
        <button onClick={() => { setMonth(new Date()); setSelected(now); }} className="text-[11.5px] font-semibold text-accent-blue px-1.5">Today</button>
      </span>}
      right={scope}>
      <div>
          <div className="grid grid-cols-7 text-[10.5px] font-bold uppercase tracking-wide text-text-secondary mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="px-1.5 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const list = byDay[iso] || [];
              const late = list.some(e => e.overdue);
              return (
                <button key={iso} onClick={() => setSelected(iso === selected ? null : iso)} aria-label={`${fmtDay(iso)}, ${list.length} deadlines`}
                  className={cn('min-h-[64px] md:min-h-[78px] rounded-lg border p-1.5 flex flex-col gap-1 text-left transition-colors min-w-0',
                    iso === selected ? 'border-accent-blue bg-accent-blue/5' : 'border-border-subtle hover:border-border-active')}>
                  <span className="flex items-center justify-between text-[11.5px]">
                    <span className={cn('font-semibold', iso === now ? 'bg-accent-blue text-white rounded px-1.5' : 'text-text-secondary')}>{Number(iso.slice(8))}</span>
                    {list.length > 0 && <span className={cn('w-1.5 h-1.5 rounded-full', late ? 'bg-accent-red' : 'bg-accent-blue')} />}
                  </span>
                  {list.slice(0, 2).map(e => (
                    <span key={e.key} className={cn('hidden md:flex items-center gap-1 text-[10.5px] leading-tight rounded px-1 py-0.5 truncate border-l-2',
                      e.done ? 'border-accent-green text-text-secondary line-through' : e.overdue ? 'border-accent-red bg-accent-red/10 text-text-primary' : e.kind === 'objective' ? 'border-accent-blue bg-accent-blue/10 text-text-primary' : 'border-border-active bg-[var(--bg-primary)] text-text-primary')}>
                      {colorOf?.(e.deptId) && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: colorOf(e.deptId) }} />}
                      <span className="truncate">{e.title}</span>
                    </span>
                  ))}
                  {list.length > 2 && <span className="hidden md:block text-[10px] text-text-secondary px-1">+{list.length - 2} more</span>}
                  {list.length > 0 && <span className="md:hidden text-[10px] text-text-secondary">{list.length}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1"><Target size={11} className="text-accent-blue" /> Objective</span>
            <span className="flex items-center gap-1"><CheckSquare size={11} /> Task</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-red" /> Overdue</span>
            <span className="ml-auto">Click a day to see its deadlines</span>
          </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ upcoming */

/** Right-hand card: the clicked day's deadlines, or the next 14 days when no day is picked. */
export function Upcoming({ entries, onOpen, day, clearDay }: { entries: Entry[]; onOpen: (e: Entry) => void; day: string | null; clearDay: () => void }) {
  const now = today(), soon = isoDay(new Date(Date.now() + 14 * 86400000));
  if (day) {
    const list = entries.filter(e => e.date === day).sort((a, b) => Number(a.done) - Number(b.done));
    return (
      <Card title={day === now ? 'Due today' : `Due ${fmtDay(day)}`}
        right={<button onClick={clearDay} className="text-[11.5px] font-semibold text-accent-blue">Back to upcoming</button>}>
        {list.length ? <div>{list.map(e => <EntryRow key={e.key} e={e} onOpen={onOpen} showDate={false} />)}</div>
          : <div className="text-[12.5px] text-text-secondary py-2">Nothing due on this day.</div>}
      </Card>
    );
  }
  const list = entries.filter(e => !e.done && e.date <= soon && (e.date >= now || e.overdue)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  return (
    <Card title="Upcoming deadlines" right={<span className="text-[11.5px] text-text-secondary">next 14 days</span>}>
      {list.length ? <div>{list.map(e => <EntryRow key={e.key} e={e} onOpen={onOpen} />)}</div>
        : <div className="text-[12.5px] text-text-secondary py-2">Nothing due in the next two weeks.</div>}
    </Card>
  );
}

/* ------------------------------------------------------------ my work */

const TASK_OPTIONS = [['todo', 'To do'], ['in_progress', 'In progress'], ['review', 'In review'], ['completed', 'Done']];

export function MyWork({ entries, onOpen, onTaskStatus, onObjectiveProgress }: {
  entries: Entry[]; onOpen: (e: Entry) => void; onTaskStatus: (e: Entry, status: string) => void; onObjectiveProgress: (e: Entry, p: number) => void;
}) {
  const list = entries.filter(e => e.mine && !e.done).sort((a, b) => a.date.localeCompare(b.date));
  const sel = 'text-[11.5px] rounded-md border border-border-subtle bg-background-primary px-1.5 py-1 text-text-primary shrink-0';
  return (
    <Card className="lg:col-span-2" title="My work" right={<span className="text-[11.5px] text-text-secondary">{list.length} open · change status right here</span>}>
      {list.length ? (
        <div>
          {list.slice(0, 10).map(e => (
            <EntryRow key={e.key} e={e} onOpen={onOpen} action={
              e.kind === 'task' ? (
                <select aria-label="Task status" value={e.status} onChange={ev => onTaskStatus(e, ev.target.value)} className={cn(sel, e.overdue && 'border-accent-red text-accent-red')}>
                  {!TASK_OPTIONS.some(([v]) => v === e.status) && <option value={e.status}>{e.status}</option>}
                  {TASK_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <select aria-label="Objective progress" value={Math.round((e.progress || 0) / 25) * 25} onChange={ev => onObjectiveProgress(e, Number(ev.target.value))} className={cn(sel, e.overdue && 'border-accent-red text-accent-red')}>
                  {[0, 25, 50, 75, 100].map(v => <option key={v} value={v}>{v === 100 ? 'Done' : `${v}%`}</option>)}
                </select>
              )
            } />
          ))}
          {list.length > 10 && <div className="text-[11.5px] text-text-secondary pt-2">+{list.length - 10} more in the Task center</div>}
        </div>
      ) : <div className="text-[12.5px] text-text-secondary py-2">Nothing open with a deadline. Nice.</div>}
    </Card>
  );
}

/* ------------------------------------------------------------ quick notes */

export function QuickNotes({ userId }: { userId?: string }) {
  const key = `nurofin-quick-notes:${userId || 'me'}`;
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { try { setText(localStorage.getItem(key) || ''); } catch { setText(''); } }, [key]);

  const change = (v: string) => {
    setText(v); setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { try { localStorage.setItem(key, v); } catch { /* storage blocked */ } setSaved(true); }, 500);
  };

  return (
    <Card title={<span className="flex items-center gap-1.5"><StickyNote size={14} className="text-accent-orange" /> Quick notes</span>}
      right={<span className="text-[11px] text-text-secondary">{saved ? 'Saved on this device' : 'Saving…'}</span>}>
      <textarea value={text} onChange={e => change(e.target.value)} rows={7} placeholder="Ideas, reminders, things to bring up with the team…"
        className="w-full flex-1 rounded-lg border border-border-subtle bg-background-primary px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent-blue resize-y" />
    </Card>
  );
}
