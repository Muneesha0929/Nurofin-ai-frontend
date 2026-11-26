'use client';

// Priority popups, mounted once in the app shell.
//  - P1: ONE calm centred note listing every P1 that needs attention (never stacked).
//  - P2: small cards bottom-right that stay until closed or clicked.
//  - P3: the same cards, but they fade away after 8 s (paused while the mouse is over them).
// Closing or clicking marks the item as seen, so it does not come back until its priority changes
// (a P1 comes back once a day while it is still open; the backend decides, we just show `show_popup`).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStore } from '@/lib/store';
import { PriorityItem, fmtDay, prioritiesService } from '@/services/timeline';
import { CodeChip } from '@/components/timeline/CodeChip';
import { PRIORITY_META, PriorityBadge, canSetPriority } from '@/components/timeline/PriorityChip';

const POLL_MS = 60_000;
const P3_MS = 8_000;
const MAX_CARDS = 3;
const keyOf = (i: PriorityItem) => `${i.objective_id}:${i.priority}`;

export default function PriorityPopups() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { userProfile } = useStore();
  const isCeo = canSetPriority(userProfile);
  const ready = !!userProfile?.id;

  const [items, setItems] = useState<PriorityItem[]>([]);
  const [seenLocal, setSeenLocal] = useState<Set<string>>(() => new Set());
  const seenRef = useRef(seenLocal);
  seenRef.current = seenLocal;

  // ---- polling: on mount, every 60 s, and when the tab/window comes back
  const load = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!localStorage.getItem('auth_token')) return;
    try {
      const r = await prioritiesService.mine();
      setItems(r.items || []);
    } catch { /* quiet: the backend may not be ready, or we are offline */ }
  }, []);

  useEffect(() => {
    if (!ready || isCeo) { setItems([]); return; }
    load();
    const t = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('cos:changed', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('cos:changed', onFocus);
    };
  }, [ready, isCeo, load]);

  const popups = useMemo(() => (isCeo ? [] : items.filter(i => i.show_popup && !seenLocal.has(keyOf(i)))), [items, seenLocal, isCeo]);
  const p1 = popups.filter(i => i.priority === 'P1');
  const rest = popups.filter(i => i.priority !== 'P1');

  const markSeen = useCallback((list: PriorityItem[]) => {
    if (!list.length) return;
    setSeenLocal(prev => {
      const n = new Set(prev);
      list.forEach(i => n.add(keyOf(i)));
      return n;
    });
    prioritiesService.seen(list.map(i => i.objective_id)).catch(() => { /* stays hidden for this visit */ });
  }, []);

  const go = (link: string) => router.push(link);

  return (
    <>
      <P1Modal items={p1} reduce={!!reduce} onGotIt={() => markSeen(p1)} onOpen={(item) => { markSeen(p1); go(item.link); }} />
      {p1.length === 0 && (
        <ToastStack
          items={rest}
          reduce={!!reduce}
          onClose={i => markSeen([i])}
          onOpen={i => { markSeen([i]); go(i.link); }}
          onMore={hidden => { markSeen(hidden); go('/dashboard'); }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- P1 modal

function P1Modal({ items, reduce, onGotIt, onOpen }: { items: PriorityItem[]; reduce: boolean; onGotIt: () => void; onOpen: (i: PriorityItem) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const open = items.length > 0;
  const btn = useRef<HTMLButtonElement>(null);
  const gotItRef = useRef(onGotIt);
  gotItRef.current = onGotIt;

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') gotItRef.current(); };
    document.addEventListener('keydown', k);
    const t = setTimeout(() => btn.current?.focus(), 60);
    return () => { document.removeEventListener('keydown', k); clearTimeout(t); };
  }, [open]);

  if (!mounted) return null;
  const n = items.length;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="p1-modal"
          className="fixed inset-0 z-[10040] flex items-center justify-center p-4 normal-case"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="p1-title"
            className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-background-secondary shadow-2xl p-5 sm:p-6"
            style={{ backgroundColor: 'var(--bg-secondary, #FFFFFF)' }}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-accent-red shrink-0" aria-hidden />
              <div className="min-w-0">
                <h2 id="p1-title" className="text-[16px] font-bold text-text-primary">Priority work for you</h2>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  {n === 1 ? '1 priority objective needs your attention.' : `${n} priority objectives need your attention.`}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-1 max-h-[46vh] overflow-y-auto pr-1">
              {items.map(i => (
                <li key={i.objective_id} className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-[var(--bg-primary)] transition-colors">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-text-secondary shrink-0" aria-hidden />
                  <CodeChip code={i.full_code} className="mt-0.5" />
                  <button type="button" onClick={() => onOpen(i)} className="min-w-0 flex-1 text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40">
                    <span className="block text-[13.5px] font-semibold text-text-primary leading-snug break-words">{i.title}</span>
                    <span className="block text-[12px] text-text-secondary mt-0.5">
                      {i.department.name}{i.deadline ? ` · due ${fmtDay(i.deadline)}` : ''}
                      {i.owner ? ` · ${i.owner.name}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => onOpen(items[0])}
                className="rounded-xl border border-border-subtle px-3.5 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40">
                Open first
              </button>
              <button ref={btn} type="button" onClick={onGotIt}
                className="rounded-xl bg-accent-blue text-white px-4 py-2 text-[13px] font-semibold hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus-visible:ring-offset-2">
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------------------------------------------------------------- P2 / P3 cards

/**
 * Where the stack sits: just above the quick bar (so it never covers it) and clear of the chat button.
 * `tuckAway` is true while the quick bar is being used (it opens big pickers and cards) or the chat panel
 * is open; the stack then fades out of the way instead of overlapping, and comes back afterwards.
 */
function useStackLayout(): { bottom: number; tuckAway: boolean } {
  const [bottom, setBottom] = useState(96);
  const [tuckAway, setTuckAway] = useState(false);
  useEffect(() => {
    const bar = () => (document.getElementById('global-quick-add-input')?.closest('.fixed') as HTMLElement | null);
    const measure = () => {
      const b = bar();
      const barTop = b ? b.getBoundingClientRect().top : window.innerHeight - 90;
      let o = Math.round(window.innerHeight - barTop + 12);
      if (window.innerWidth < 640) o = Math.max(o, 152); // the chat button sits at the right on phones
      setBottom(Math.max(96, o));
      const barBusy = !!b && b.contains(document.activeElement);
      const chatOpen = !!document.querySelector('div.fixed[class*="h-[460px]"]'); // GlobalChat panel
      setTuckAway(barBusy || chatOpen);
    };
    measure();
    window.addEventListener('resize', measure);
    document.addEventListener('focusin', measure);
    document.addEventListener('focusout', () => setTimeout(measure, 0));
    const b = bar();
    const ro = typeof ResizeObserver !== 'undefined' && b ? new ResizeObserver(measure) : null;
    if (ro && b) ro.observe(b);
    const t = setInterval(measure, 1000); // the bar mounts after us; the chat panel opens without telling us
    return () => {
      window.removeEventListener('resize', measure);
      document.removeEventListener('focusin', measure);
      ro?.disconnect();
      clearInterval(t);
    };
  }, []);
  return { bottom, tuckAway };
}

function ToastStack({ items, reduce, onClose, onOpen, onMore }: {
  items: PriorityItem[]; reduce: boolean;
  onClose: (i: PriorityItem) => void; onOpen: (i: PriorityItem) => void; onMore: (hidden: PriorityItem[]) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { bottom, tuckAway } = useStackLayout();
  // P2 first (they stay), then P3 (they fade)
  const ordered = useMemo(() => [...items.filter(i => i.priority === 'P2'), ...items.filter(i => i.priority === 'P3')], [items]);
  const shown = ordered.slice(0, MAX_CARDS);
  const hidden = ordered.slice(MAX_CARDS);
  if (!mounted) return null;

  return createPortal(
    <div
      className={cn('fixed right-3 sm:right-5 z-[45] flex flex-col items-end gap-2 w-[min(320px,calc(100vw-24px))] pointer-events-none normal-case transition-opacity duration-150', tuckAway && 'opacity-0 invisible')}
      style={{ bottom }}
      aria-hidden={tuckAway}
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {hidden.length > 0 && (
          <motion.button
            key="more" type="button" layout={!reduce}
            initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => onMore(hidden)}
            className="pointer-events-auto rounded-full border border-border-subtle bg-background-secondary px-3 py-1 text-[12px] font-semibold text-text-secondary hover:text-accent-blue shadow-md"
            style={{ backgroundColor: 'var(--bg-secondary, #FFFFFF)' }}
          >
            +{hidden.length} more
          </motion.button>
        )}
        {[...shown].reverse().map(i => (
          <ToastCard key={keyOf(i)} item={i} reduce={reduce} paused={tuckAway} onClose={() => onClose(i)} onOpen={() => onOpen(i)} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function ToastCard({ item, reduce, paused, onClose, onOpen }: { item: PriorityItem; reduce: boolean; paused: boolean; onClose: () => void; onOpen: () => void }) {
  const auto = item.priority === 'P3';
  const [hover, setHover] = useState(false);
  const remaining = useRef(P3_MS);
  const startedAt = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // P3 only: count down 8 s, pausing while the mouse is over the card.
  useEffect(() => {
    if (!auto || hover || paused) return;
    startedAt.current = Date.now();
    const t = setTimeout(() => closeRef.current(), remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current = Math.max(600, remaining.current - (Date.now() - startedAt.current));
    };
  }, [auto, hover, paused]);

  const meta = PRIORITY_META[item.priority];
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
      transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="pointer-events-auto relative w-full rounded-xl border border-border-subtle bg-background-secondary shadow-xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary, #FFFFFF)' }}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-1', meta.dot)} aria-hidden />
      <button type="button" onClick={onClose} aria-label="Dismiss"
        className="absolute right-1.5 top-1.5 p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40">
        <X size={14} />
      </button>
      <button type="button" onClick={onOpen}
        className="block w-full text-left pl-4 pr-8 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-blue/40">
        <span className="flex items-center gap-1.5 mb-1">
          <PriorityBadge p={item.priority} />
          <span className="text-[11px] text-text-secondary">{item.priority === 'P2' ? 'High priority for you' : 'New priority for you'}</span>
        </span>
        <span className="block text-[13px] font-semibold text-text-primary leading-snug line-clamp-2 break-words">{item.title}</span>
        <span className="flex items-center gap-1.5 mt-1 text-[11.5px] text-text-secondary">
          <span className="font-mono font-semibold">{item.full_code}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{item.department.name}</span>
          {item.deadline && <><span aria-hidden>·</span><span className="whitespace-nowrap">due {fmtDay(item.deadline)}</span></>}
        </span>
      </button>
    </motion.div>
  );
}
