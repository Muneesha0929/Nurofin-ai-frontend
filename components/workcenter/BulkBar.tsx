'use client';
// Floating bar for the selected tasks: status, move deadline, reassign, make subtask, link to objective.
// Pinned just under the top bar, so it never covers the list rows or the quick bar at the bottom.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CornerDownRight, Loader2, Target, UserRound, X, CircleDot } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface PickOption { id: number; label: string; sub?: string }

type PopKey = 'status' | 'assign' | 'parent' | 'objective';

const STATUSES = [
  { value: 'in_progress', label: 'In Progress', dot: 'bg-accent-blue' },
  { value: 'completed', label: 'Done', dot: 'bg-accent-green' },
  { value: 'blocked', label: 'On Hold', dot: 'bg-accent-red' },
];

function Picker({ options, placeholder, empty, onPick, extra }: {
  options: PickOption[]; placeholder: string; empty: string; onPick: (id: number) => void;
  extra?: { label: string; onPick: () => void };
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? options.filter(o => o.label.toLowerCase().includes(s) || (o.sub || '').toLowerCase().includes(s)) : options).slice(0, 80);
  }, [q, options]);
  return (
    <div>
      <input
        autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && list[0]) onPick(list[0].id); }}
        className="w-full mb-1.5 rounded-lg border border-border-subtle bg-[var(--bg-primary)] px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue"
      />
      <div className="max-h-56 overflow-y-auto">
        {extra && (
          <button type="button" onClick={extra.onPick} className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12.5px] text-text-secondary hover:bg-[var(--bg-primary)]">{extra.label}</button>
        )}
        {list.map(o => (
          <button key={o.id} type="button" onClick={() => onPick(o.id)}
            className="w-full text-left rounded-lg px-2.5 py-1.5 hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:bg-[var(--bg-primary)]">
            <div className="text-[12.5px] text-text-primary truncate">{o.label}</div>
            {o.sub && <div className="text-[11px] text-text-secondary truncate">{o.sub}</div>}
          </button>
        ))}
        {list.length === 0 && <p className="px-2.5 py-2 text-[12px] text-text-secondary">{empty}</p>}
      </div>
    </div>
  );
}

export function BulkBar({
  count, busy, onClear, onStatus, onMoveDeadline, onReassign, onMakeSubtask, onLinkObjective, people, parents, objectives,
}: {
  count: number;
  busy?: boolean;
  onClear: () => void;
  onStatus: (status: string) => void;
  onMoveDeadline: () => void;
  onReassign: (userId: number) => void;      // 0 = unassign
  onMakeSubtask: (parentId: number) => void;
  onLinkObjective: (objectiveId: number) => void;
  people: PickOption[];
  parents: PickOption[];
  objectives: PickOption[];
}) {
  const [open, setOpen] = useState<PopKey | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(null); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const pick = (fn: () => void) => { setOpen(null); fn(); };
  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-text-primary hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue disabled:opacity-50 whitespace-nowrap';
  const pop = 'absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 max-w-[calc(100vw-24px)] rounded-xl border border-border-subtle bg-background-secondary shadow-2xl p-2 normal-case';

  return (
    <div
      ref={root}
      role="toolbar"
      aria-label={`${count} selected tasks`}
      className="fixed left-1/2 -translate-x-1/2 top-[64px] z-50 max-w-[calc(100vw-24px)] normal-case rounded-2xl border border-accent-blue/40 bg-background-secondary shadow-2xl px-2 py-1.5 flex flex-wrap lg:flex-nowrap whitespace-nowrap items-center justify-center gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <span className="px-2.5 py-1 text-[12px] font-bold text-accent-blue flex items-center gap-1.5">
        {busy ? <Loader2 size={13} className="animate-spin" /> : null}
        {count} selected
      </span>
      <span className="w-px h-5 bg-border-subtle mx-0.5" />

      <span className="relative">
        <button type="button" className={cn(btn, open === 'status' && 'bg-[var(--bg-primary)]')} onClick={() => setOpen(open === 'status' ? null : 'status')} disabled={busy}>
          <CircleDot size={13} />Status
        </button>
        {open === 'status' && (
          <div data-cos-pop className={cn(pop, 'w-44')}>
            {STATUSES.map(s => (
              <button key={s.value} type="button" autoFocus={s.value === 'in_progress'} onClick={() => pick(() => onStatus(s.value))}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] text-text-primary hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:bg-[var(--bg-primary)]">
                <span className={cn('w-2 h-2 rounded-full', s.dot)} />{s.label}
              </button>
            ))}
          </div>
        )}
      </span>

      <button type="button" className={btn} onClick={() => { setOpen(null); onMoveDeadline(); }} disabled={busy}>
        <CalendarClock size={13} />Move deadline
      </button>

      <span className="relative">
        <button type="button" className={cn(btn, open === 'assign' && 'bg-[var(--bg-primary)]')} onClick={() => setOpen(open === 'assign' ? null : 'assign')} disabled={busy}>
          <UserRound size={13} />Reassign
        </button>
        {open === 'assign' && (
          <div data-cos-pop className={pop}>
            <Picker options={people} placeholder="Who takes these?" empty="No one found." onPick={id => pick(() => onReassign(id))} extra={{ label: 'Unassigned', onPick: () => pick(() => onReassign(0)) }} />
          </div>
        )}
      </span>

      <span className="relative">
        <button type="button" className={cn(btn, open === 'parent' && 'bg-[var(--bg-primary)]')} onClick={() => setOpen(open === 'parent' ? null : 'parent')} disabled={busy}>
          <CornerDownRight size={13} />Make subtask under
        </button>
        {open === 'parent' && (
          <div data-cos-pop className={cn(pop, 'w-80')}>
            <Picker options={parents} placeholder="Search tasks or codes…" empty="No other tasks to nest under." onPick={id => pick(() => onMakeSubtask(id))} />
          </div>
        )}
      </span>

      {objectives.length > 0 && (
        <span className="relative">
          <button type="button" className={cn(btn, open === 'objective' && 'bg-[var(--bg-primary)]')} onClick={() => setOpen(open === 'objective' ? null : 'objective')} disabled={busy}>
            <Target size={13} />Link to objective
          </button>
          {open === 'objective' && (
            <div data-cos-pop className={cn(pop, 'w-80')}>
              <Picker options={objectives} placeholder="Search objectives or codes…" empty="No objectives found." onPick={id => pick(() => onLinkObjective(id))} />
            </div>
          )}
        </span>
      )}

      <span className="w-px h-5 bg-border-subtle mx-0.5" />
      <button type="button" onClick={onClear} className={cn(btn, 'text-text-secondary')} title="Clear selection (Esc)">
        <X size={13} />Clear
      </button>
    </div>
  );
}
