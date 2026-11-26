'use client';

// "31 Oct → 15 Nov · 2" — the deadline everywhere a task or objective shows one.
// Click opens the timeline dropdown with Move deadline / Add update / Ask someone.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, Hand, MessageSquarePlus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TimelineEntity, fmtDay, isoDay, timelineService } from '@/services/timeline';
import { TimelineList } from './TimelineList';
import { ExtendDeadlineDialog } from './ExtendDeadlineDialog';

interface Person { id: number; name: string }
let peopleCache: Person[] | null = null;
async function loadPeople(): Promise<Person[]> {
  if (peopleCache) return peopleCache;
  const token = localStorage.getItem('auth_token') || '';
  const res = await fetch('/api/v1/users?limit=500', { headers: { Authorization: `Bearer ${token}` } });
  const j = await res.json().catch(() => ({}));
  peopleCache = (j.data || []).map((u: any) => ({ id: Number(u.id), name: u.full_name || u.name || u.email }));
  return peopleCache!;
}

/** Post a plain update, or ask someone to look after it (no date change). */
export function UpdateComposer({ entity, id, onPosted, autoFocus }: { entity: TimelineEntity; id: number; onPosted?: () => void; autoFocus?: boolean }) {
  const [mode, setMode] = useState<'update' | 'handover'>('update');
  const [text, setText] = useState('');
  const [personId, setPersonId] = useState<number | ''>('');
  const [people, setPeople] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (mode === 'handover' && !people.length) loadPeople().then(setPeople).catch(() => {}); }, [mode, people.length]);

  const post = async () => {
    if (!text.trim() && mode === 'update') return;
    if (mode === 'handover' && !personId) { setErr('Pick who should look after it.'); return; }
    setSaving(true); setErr('');
    try {
      await timelineService.post(entity, id, { kind: mode, text: text.trim(), ...(mode === 'handover' ? { person_id: Number(personId) } : {}) });
      setText(''); setPersonId(''); onPosted?.();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="normal-case">
      <div className="flex gap-1 mb-1.5">
        {([['update', 'Add update', MessageSquarePlus], ['handover', 'Ask someone', Hand]] as const).map(([k, l, Icon]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium border',
              mode === k ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
            <Icon size={12} />{l}
          </button>
        ))}
      </div>
      {mode === 'handover' && (
        <select value={personId} onChange={e => setPersonId(e.target.value ? Number(e.target.value) : '')}
          className="w-full mb-1.5 rounded-lg border border-border-subtle bg-[var(--bg-primary)] px-2 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue">
          <option value="">Who should look after it?</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <div className="flex gap-1.5">
        <input autoFocus={autoFocus} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') post(); }}
          placeholder={mode === 'update' ? 'What happened? (the date stays the same)' : 'What should they do? (optional)'}
          className="flex-1 min-w-0 rounded-lg border border-border-subtle bg-[var(--bg-primary)] px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue" />
        <button onClick={post} disabled={saving || (mode === 'update' && !text.trim())}
          className="rounded-lg bg-accent-blue text-white px-3 text-[12.5px] font-semibold disabled:opacity-50">{saving ? '…' : 'Post'}</button>
      </div>
      {err && <p className="mt-1 text-[11.5px] text-accent-red">{err}</p>}
    </div>
  );
}

export function DeadlineBadge({
  entity, id, deadline, originalDeadline, changes = 0, done, canEdit = true, title, onChanged, className,
}: {
  entity: TimelineEntity; id: number; deadline?: string | null; originalDeadline?: string | null; changes?: number;
  done?: boolean; canEdit?: boolean; title?: string; onChanged?: () => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [extend, setExtend] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const W = 340, H = 440;
    const up = r.bottom + H > window.innerHeight - 90 && r.top > H;
    setPos({ left: Math.max(8, Math.min(window.innerWidth - W - 8, r.left)), top: up ? r.top - 6 : r.bottom + 6, up });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
    };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !extend) setOpen(false); };
    const s = () => setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k); window.addEventListener('resize', s);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); window.removeEventListener('resize', s); };
  }, [open, extend]);

  const today = isoDay(new Date());
  const overdue = !done && !!deadline && deadline.slice(0, 10) < today;
  const moved = !!originalDeadline && !!deadline && originalDeadline.slice(0, 10) !== deadline.slice(0, 10);
  const changed = () => { setRefresh(x => x + 1); onChanged?.(); };

  return (
    <>
      <button ref={btn} type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title={moved ? `First due ${fmtDay(originalDeadline)}, now ${fmtDay(deadline)} — click for the history` : 'Deadline — click for the history'}
        className={cn('normal-case inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap transition-colors hover:bg-[var(--bg-primary)]',
          overdue ? 'text-accent-red' : 'text-text-secondary', className)}>
        <CalendarClock size={12} className="shrink-0" />
        {deadline ? (
          moved ? <><span className="line-through decoration-1 opacity-70">{fmtDay(originalDeadline)}</span><span>→</span><span className="font-semibold text-text-primary">{fmtDay(deadline)}</span></>
            : <span>{fmtDay(deadline)}</span>
        ) : <span>No date</span>}
        {changes > 0 && <span className="ml-0.5 rounded-full bg-accent-orange/15 text-accent-orange text-[10px] font-bold px-1.5 leading-4">{changes}</span>}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={pop} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', left: pos.left, top: pos.top, transform: pos.up ? 'translateY(-100%)' : undefined, width: 340 }}
          className="z-[70] rounded-2xl border border-border-subtle bg-background-secondary shadow-2xl p-3.5 normal-case">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[12.5px] font-bold text-text-primary truncate" title={title}>{title || 'Timeline'}</span>
            {canEdit && (
              <button onClick={() => setExtend(true)} className="inline-flex items-center gap-1 rounded-lg bg-accent-orange/10 text-accent-orange px-2 py-1 text-[11.5px] font-semibold hover:bg-accent-orange/20">
                <CalendarClock size={12} />Move deadline
              </button>
            )}
          </div>
          <TimelineList entity={entity} id={id} refreshKey={refresh} maxHeight={240} />
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <UpdateComposer entity={entity} id={id} onPosted={changed} />
          </div>
        </div>,
        document.body,
      )}
      <ExtendDeadlineDialog open={extend} onClose={() => setExtend(false)} entity={entity} ids={[id]} current={deadline} title={title} onDone={changed} />
    </>
  );
}
