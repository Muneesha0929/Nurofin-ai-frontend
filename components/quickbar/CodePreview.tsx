'use client';

// The card shown above the quick bar when the text starts with a universal code (PROD-1.2.3 ...).
// It says what the code is, what the typed command will do, and which commands exist.
import React, { useEffect } from 'react';
import { ChevronRight, CornerDownLeft, Loader2, Undo2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CodeChip } from '@/components/timeline/CodeChip';
import { PriorityBadge } from '@/components/timeline/PriorityChip';
import { ResolvedCode, fmtDay, isoDay } from '@/services/timeline';
import { Hint, ParsedCommand } from './parseCommand';

export const MOVE_REASONS = ['Waiting on someone else', 'Took longer than planned', 'Scope grew', 'Priority changed', 'Blocked by a bug'];

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started', todo: 'To do', in_progress: 'In progress', completed: 'Done', done: 'Done', blocked: 'On hold', review: 'In review',
};
const statusLabel = (s?: string | null) => (s ? STATUS_LABEL[s] || s.replace(/_/g, ' ') : '');

function isHintActive(h: Hint, cmd: ParsedCommand): boolean {
  if (h.type !== cmd.type) return false;
  if (cmd.type === 'status') {
    return (h.key === 'done' && cmd.status === 'completed') || (h.key === 'start' && cmd.status === 'in_progress') || (h.key === 'blocked' && cmd.status === 'blocked');
  }
  if (cmd.type === 'move') return cmd.relative ? h.key === 'plus' : h.key === 'to';
  return true;
}

export function CodePreview({
  resolved, cmd, hints, busy, error, needReason, reason, onReason, onSubmitReason, onCancelReason, dropUp = true, newDate,
}: {
  resolved: ResolvedCode;
  cmd: ParsedCommand;
  hints: Hint[];
  busy: boolean;
  error: string;
  needReason: boolean;
  reason: string;
  onReason: (v: string) => void;
  onSubmitReason: () => void;
  onCancelReason: () => void;
  dropUp?: boolean;
  newDate?: string | null;
}) {
  const crumbs = resolved.breadcrumb.slice(0, -1);
  const today = isoDay(new Date());
  const done = resolved.status === 'done' || resolved.status === 'completed';
  const moved = !!resolved.original_deadline && !!resolved.deadline && resolved.original_deadline.slice(0, 10) !== resolved.deadline.slice(0, 10);
  const overdue = !done && !!resolved.deadline && resolved.deadline.slice(0, 10) < today;
  const showPending = cmd.type === 'move' && cmd.date;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'absolute left-0 right-0 z-[9998] rounded-2xl border border-border-subtle bg-background-secondary shadow-2xl p-3 normal-case text-left',
        dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
      )}
      style={{ backgroundColor: 'var(--bg-secondary, #FFFFFF)', opacity: 1 }}
    >
      {/* breadcrumb */}
      {crumbs.length > 0 && (
        <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 mb-1.5 text-[11.5px] text-text-secondary min-w-0">
          {crumbs.map((c, i) => (
            <React.Fragment key={`${c.kind}-${c.id}`}>
              {i > 0 && <ChevronRight size={11} className="shrink-0 opacity-60" />}
              <span className="inline-flex items-center gap-1 min-w-0 max-w-[220px]">
                {(c.full_code || c.code) && <CodeChip code={c.full_code || c.code} size="xs" />}
                <span className="truncate" title={c.title}>{c.title}</span>
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* title + facts */}
      <div className="flex items-start gap-2 min-w-0">
        <CodeChip code={resolved.full_code} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-text-primary leading-snug break-words line-clamp-2" title={resolved.title}>{resolved.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-text-secondary">
            {resolved.status && <span className="rounded-md bg-[var(--bg-primary)] border border-border-subtle px-1.5 py-[1px] font-medium text-text-primary">{statusLabel(resolved.status)}</span>}
            {resolved.progress != null && resolved.kind !== 'department' && <span>{Math.round(resolved.progress)}% done</span>}
            {resolved.deadline && (
              <span className={cn('inline-flex items-center gap-1', overdue && 'text-accent-red')}>
                Due{' '}
                {moved ? (<><span className="line-through opacity-70">{fmtDay(resolved.original_deadline)}</span><span>→</span><span className="font-semibold text-text-primary">{fmtDay(resolved.deadline)}</span></>) : <span className="font-medium">{fmtDay(resolved.deadline)}</span>}
                {showPending && (<><span className="mx-0.5">→</span><span className="font-bold text-accent-orange">{fmtDay(newDate)}</span></>)}
              </span>
            )}
            {!resolved.deadline && showPending && <span>Due <span className="font-bold text-accent-orange">{fmtDay(newDate)}</span></span>}
            <PriorityBadge p={resolved.priority} />
            <span className="truncate max-w-[180px]" title={resolved.department.name}>{resolved.department.name}</span>
          </div>
        </div>
      </div>

      {/* what Enter will do */}
      <div className="mt-2.5 flex items-center gap-2 text-[12.5px] min-h-[24px]">
        {busy ? (
          <span className="inline-flex items-center gap-1.5 text-text-secondary"><Loader2 size={13} className="animate-spin" />Working on it…</span>
        ) : cmd.type === 'unknown' ? (
          <span className="text-text-secondary">{cmd.error ? <span className="text-accent-orange">{cmd.error}</span> : null}{' '}Try one of the commands below, or press Esc.</span>
        ) : cmd.error ? (
          <span className="text-accent-orange">{cmd.error}</span>
        ) : (
          <span className={cn('inline-flex items-center gap-1.5 font-semibold', cmd.incomplete ? 'text-text-secondary' : 'text-accent-blue')}>
            {!cmd.incomplete && <CornerDownLeft size={13} />}
            {cmd.label}
          </span>
        )}
      </div>

      {/* reason needed for a date move */}
      {needReason && (
        <div className="mt-2 rounded-xl border border-accent-orange/30 bg-accent-orange/5 p-2.5">
          <label className="block text-[12px] font-semibold text-text-primary mb-1.5">Why is it moving? <span className="text-accent-red">*</span></label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {MOVE_REASONS.map(r => (
              <button key={r} type="button" onClick={() => onReason(r)}
                className={cn('rounded-full px-2 py-0.5 text-[11.5px] border transition-colors',
                  reason === r ? 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={reason}
              onChange={e => onReason(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onSubmitReason(); }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancelReason(); }
              }}
              placeholder="e.g. Bank UAT moved to next week"
              className="flex-1 min-w-0 rounded-lg border border-border-subtle bg-[var(--bg-primary)] px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue focus-visible:ring-2 focus-visible:ring-accent-blue/30"
            />
            <button type="button" onClick={onSubmitReason} disabled={busy || reason.trim().length < 3}
              className="rounded-lg bg-accent-blue text-white px-3 text-[12.5px] font-semibold disabled:opacity-50">Move</button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 rounded-lg bg-accent-red/10 border border-accent-red/20 px-2.5 py-1.5 text-[12px] text-accent-red">{error}</p>}

      {/* commands */}
      {hints.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-border-subtle/70 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-text-secondary mr-0.5">Then type</span>
          {hints.map(h => {
            const active = isHintActive(h, cmd);
            return (
              <span key={h.key}
                className={cn('font-mono text-[11px] rounded-md border px-1.5 py-[1px] transition-colors',
                  active ? 'border-accent-blue bg-accent-blue/10 text-accent-blue font-semibold' : 'border-border-subtle text-text-secondary')}>
                {h.text}
              </span>
            );
          })}
          <span className="ml-auto text-[10.5px] text-text-secondary hidden sm:inline">Enter runs · Tab completes · Esc clears</span>
        </div>
      )}
    </div>
  );
}

/** Quiet line shown when the typed code matches nothing. Normal task creation carries on. */
export function CodeNotFound({ code, dropUp = true }: { code: string; dropUp?: boolean }) {
  return (
    <div className={cn('absolute left-3 z-[9998] text-[11.5px] text-text-secondary normal-case', dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5')}>
      No item with code <span className="font-mono font-semibold">{code}</span> — Enter will add it as a new task.
    </div>
  );
}

/** Small confirmation with Undo, above the bar. Fades away after ~6 s. */
export function QuickToast({ message, onUndo, onClose, dropUp = true }: { message: string; onUndo?: () => void; onClose: () => void; dropUp?: boolean }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div
      role="status"
      className={cn(
        'absolute left-0 right-0 z-[9998] mx-auto w-fit max-w-full flex items-center gap-2.5 rounded-xl border border-border-subtle bg-background-secondary shadow-xl px-3 py-2 text-[12.5px] text-text-primary normal-case',
        dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
      )}
      style={{ backgroundColor: 'var(--bg-secondary, #FFFFFF)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0" />
      <span className="truncate">{message}</span>
      {onUndo && (
        <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 font-semibold text-accent-blue hover:underline shrink-0">
          <Undo2 size={12} />Undo
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Dismiss" className="text-text-secondary hover:text-text-primary shrink-0"><X size={13} /></button>
    </div>
  );
}
