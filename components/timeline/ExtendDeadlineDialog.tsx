'use client';

// Move a deadline with a reason. Works for one task, many tasks (bulk) or an objective.
// The reason is required: Sir reads it later in the timeline.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TimelineEntity, addDays, fmtDay, isoDay, timelineService } from '@/services/timeline';

const REASONS = ['Waiting on someone else', 'Took longer than planned', 'Scope grew', 'Priority changed', 'Blocked by a bug', 'On leave'];
const SHIFTS = [{ d: 1, l: '+1 day' }, { d: 3, l: '+3 days' }, { d: 7, l: '+1 week' }, { d: 15, l: '+15 days' }, { d: 30, l: '+30 days' }];

export interface ExtendResult { ids: number[]; new_date?: string; shift_days?: number; previous?: Record<string, string | null> }

export function ExtendDeadlineDialog({
  open, onClose, entity = 'task', ids, current, title, onDone, presetDate,
}: {
  open: boolean;
  onClose: () => void;
  entity?: TimelineEntity;
  ids: number[];
  current?: string | null;     // current deadline (single item); omitted for bulk
  title?: string;              // what is being moved, e.g. "PROD-1.2.3 Fix login"
  onDone?: (r: ExtendResult) => void;
  presetDate?: string | null;  // e.g. the day a card was dropped on
}) {
  const bulk = ids.length > 1;
  const [mode, setMode] = useState<'shift' | 'date'>(presetDate ? 'date' : 'shift');
  const [shift, setShift] = useState(7);
  const [date, setDate] = useState(presetDate || addDays(current, 7));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode(presetDate ? 'date' : 'shift'); setShift(7); setDate(presetDate || addDays(current, 7)); setReason(''); setErr('');
    setTimeout(() => (presetDate ? reasonRef.current?.focus() : null), 50);
  }, [open, current, presetDate]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, onClose]);

  const newDate = useMemo(() => (mode === 'shift' ? (bulk ? null : addDays(current, shift)) : date), [mode, bulk, current, shift, date]);
  const ok = reason.trim().length >= 3 && (mode === 'shift' || !!date);

  if (!open) return null;

  const save = async () => {
    if (!ok) { setErr(reason.trim().length < 3 ? 'Please say why the date is moving.' : 'Pick a date.'); return; }
    setSaving(true); setErr('');
    try {
      if (entity === 'objective') {
        await timelineService.extendObjective(ids[0], newDate as string, reason.trim());
        onDone?.({ ids, new_date: newDate as string });
      } else if (!bulk && mode === 'date') {
        await timelineService.extendTask(ids[0], date, reason.trim());
        onDone?.({ ids, new_date: date, previous: { [ids[0]]: current ?? null } });
      } else {
        const r = await timelineService.extendTasks(ids, reason.trim(), mode === 'shift' ? { shift_days: shift } : { new_date: date });
        onDone?.({ ids: r.updated, previous: r.previous, ...(mode === 'shift' ? { shift_days: shift } : { new_date: date }) });
      }
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;
  // Portalled to <body> so clicks and drags here never reach the task row it was opened from.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 normal-case" onMouseDown={onClose}
      onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        role="dialog" aria-modal="true" aria-label="Move deadline"
        className="relative w-full max-w-md rounded-2xl bg-background-secondary border border-border-subtle shadow-2xl p-5"
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 p-1 rounded-md text-text-secondary hover:bg-[var(--bg-primary)]"><X size={16} /></button>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-full bg-accent-orange/10 text-accent-orange inline-flex items-center justify-center"><CalendarClock size={16} /></span>
          <h3 className="text-[15px] font-bold text-text-primary">{bulk ? `Move ${ids.length} deadlines` : 'Move deadline'}</h3>
        </div>
        {title && <p className="text-[12.5px] text-text-secondary mb-3 truncate" title={title}>{title}</p>}

        {!bulk && (
          <div className="flex items-center gap-2 text-[12.5px] mb-3">
            <span className="rounded-md bg-[var(--bg-primary)] px-2 py-1 text-text-secondary">Now {fmtDay(current)}</span>
            <span className="text-text-secondary">→</span>
            <span className="rounded-md bg-accent-orange/10 text-accent-orange font-semibold px-2 py-1">{newDate ? fmtDay(newDate) : 'pick a date'}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-2">
          {SHIFTS.map(s => (
            <button key={s.d} type="button" onClick={() => { setMode('shift'); setShift(s.d); }}
              className={cn('rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                mode === 'shift' && shift === s.d ? 'border-accent-blue bg-accent-blue text-white' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
              {s.l}
            </button>
          ))}
          <label className={cn('rounded-full border px-2.5 py-1 text-[12px] font-medium inline-flex items-center gap-1 cursor-pointer',
            mode === 'date' ? 'border-accent-blue text-accent-blue' : 'border-border-subtle text-text-secondary')}>
            Pick date
            <input type="date" value={date} min={isoDay(new Date(Date.now() - 365 * 864e5))}
              onChange={e => { setMode('date'); setDate(e.target.value); }}
              className="bg-transparent outline-none text-[12px] w-[110px]" />
          </label>
        </div>
        {bulk && mode === 'shift' && <p className="text-[11.5px] text-text-secondary mb-2">Each task moves {shift} day{shift > 1 ? 's' : ''} from its own deadline (tasks with no deadline move from today).</p>}

        <label className="block text-[12px] font-semibold text-text-primary mt-3 mb-1">Why is it moving? <span className="text-accent-red">*</span></label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {REASONS.map(r => (
            <button key={r} type="button" onClick={() => { setReason(prev => (prev && !REASONS.includes(prev) ? prev : r)); reasonRef.current?.focus(); }}
              className={cn('rounded-full px-2 py-0.5 text-[11.5px] border transition-colors',
                reason === r ? 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
              {r}
            </button>
          ))}
        </div>
        <textarea ref={reasonRef} value={reason} onChange={e => setReason(e.target.value)} rows={2}
          placeholder="e.g. Bank UAT moved to next week"
          className="w-full rounded-lg border border-border-subtle bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-blue resize-none" />
        {err && <p className="mt-1.5 text-[12px] text-accent-red">{err}</p>}

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-secondary">Saved to the timeline with your name.</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[13px] text-text-secondary hover:bg-[var(--bg-primary)]">Cancel</button>
            <button onClick={save} disabled={saving || !ok}
              className="rounded-lg bg-accent-blue text-white px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Move deadline'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
