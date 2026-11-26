'use client';

// The one history Sir reads: original deadline, every move with its reason and who did it,
// plain updates and "look after this" handovers, status changes and transfers — newest first.
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, CircleDot, Hand, MessageSquare, Repeat, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Timeline, TimelineEntity, TimelineEntry, fmtDay, fmtWhen, timelineService } from '@/services/timeline';

const STATUS_LABEL: Record<string, string> = {
  todo: 'To do', in_progress: 'In progress', review: 'In review', completed: 'Completed', blocked: 'Blocked',
  not_started: 'Not started', done: 'Done',
};
const sl = (v?: string | null) => (v ? STATUS_LABEL[v] || v.replace(/_/g, ' ') : '—');

function Row({ e }: { e: TimelineEntry }) {
  let icon = <CircleDot size={13} />, tone = 'text-text-secondary bg-[var(--bg-primary)]', head: React.ReactNode = null;
  switch (e.kind) {
    case 'date_change':
      icon = <CalendarClock size={13} />; tone = 'text-accent-orange bg-accent-orange/10';
      head = <>Deadline <b className="font-semibold">{fmtDay(e.old_date)}</b> <ArrowRight size={11} className="inline -mt-0.5" /> <b className="font-semibold text-text-primary">{fmtDay(e.new_date)}</b></>;
      break;
    case 'handover':
      icon = <Hand size={13} />; tone = 'text-accent-blue bg-accent-blue/10';
      head = <>Asked <b className="font-semibold text-text-primary">{e.person?.name || 'someone'}</b> to look after this</>;
      break;
    case 'update':
      icon = <MessageSquare size={13} />; tone = 'text-text-primary bg-[var(--bg-primary)]';
      head = <>Update</>;
      break;
    case 'status':
      icon = <CheckCircle2 size={13} />; tone = 'text-accent-green bg-accent-green/10';
      head = <>Status {sl(e.old_value)} <ArrowRight size={11} className="inline -mt-0.5" /> <b className="font-semibold text-text-primary">{sl(e.new_value)}</b></>;
      break;
    case 'transfer':
      icon = <Repeat size={13} />; tone = 'text-accent-blue bg-accent-blue/10';
      head = <>Transferred{e.person?.name ? <> to <b className="font-semibold text-text-primary">{e.person.name}</b></> : null}</>;
      break;
    case 'completion_date':
      icon = <CalendarClock size={13} />;
      head = e.old_value || e.new_value
        ? <>Finish date {fmtDay(e.old_value)} <ArrowRight size={11} className="inline -mt-0.5" /> {fmtDay(e.new_value)}</>
        : <>Finish date changed</>;
      break;
  }
  return (
    <li className="relative pl-8 pb-3 last:pb-0">
      <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border-subtle" />
      <span className={cn('absolute left-0 top-0.5 w-[23px] h-[23px] rounded-full inline-flex items-center justify-center', tone)}>{icon}</span>
      <div className="text-[12.5px] text-text-secondary leading-snug">{head}</div>
      {e.text && !(e.kind === 'completion_date' && (e.old_value || e.new_value)) && <div className="mt-0.5 text-[12.5px] text-text-primary leading-snug whitespace-pre-wrap break-words">{e.kind === 'date_change' ? <span className="text-text-secondary">Reason: </span> : null}{e.text}</div>}
      <div className="mt-0.5 text-[11px] text-text-secondary">{e.by?.name || 'System'} · {fmtWhen(e.at)}</div>
    </li>
  );
}

export function TimelineList({
  entity, id, refreshKey, className, maxHeight = 320, onLoaded,
}: { entity: TimelineEntity; id: number; refreshKey?: unknown; className?: string; maxHeight?: number; onLoaded?: (t: Timeline) => void }) {
  const [data, setData] = useState<Timeline | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const t = await timelineService.get(entity, id);
      setData(t); setErr(''); onLoaded?.(t);
    } catch (e: any) {
      setErr(e.message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, id]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (err) return <p className={cn('text-[12px] text-accent-red normal-case', className)}>{err} <button className="underline" onClick={load}>Try again</button></p>;
  if (!data) return <div className={cn('space-y-2 normal-case', className)}>{[0, 1].map(i => <div key={i} className="h-9 rounded-lg bg-[var(--bg-primary)] animate-pulse" />)}</div>;

  const moved = data.original_deadline && data.current_deadline && data.original_deadline !== data.current_deadline;
  return (
    <div className={cn('normal-case', className)}>
      {(data.original_deadline || data.current_deadline) && (
        <div className="flex items-stretch gap-2 mb-3">
          <div className="flex-1 rounded-lg bg-[var(--bg-primary)] px-2.5 py-1.5">
            <div className="text-[10.5px] uppercase tracking-wide text-text-secondary font-semibold">First deadline</div>
            <div className={cn('text-[13px] font-semibold', moved ? 'text-text-secondary line-through decoration-1' : 'text-text-primary')}>{fmtDay(data.original_deadline || data.current_deadline)}</div>
          </div>
          <div className={cn('flex-1 rounded-lg px-2.5 py-1.5', moved ? 'bg-accent-orange/10' : 'bg-[var(--bg-primary)]')}>
            <div className="text-[10.5px] uppercase tracking-wide text-text-secondary font-semibold">Now due</div>
            <div className="text-[13px] font-semibold text-text-primary">{fmtDay(data.current_deadline)}{data.changes ? <span className="ml-1 text-[11px] font-medium text-accent-orange">· moved {data.changes}×</span> : null}</div>
          </div>
        </div>
      )}
      {data.entries.length === 0 ? (
        <p className="text-[12.5px] text-text-secondary py-2">No changes yet. Deadline moves, updates and handovers will show here.</p>
      ) : (
        <ul className="overflow-y-auto pr-1" style={{ maxHeight }}>
          {data.entries.map(e => <Row key={`${e.kind}-${e.id}`} e={e} />)}
        </ul>
      )}
    </div>
  );
}
