'use client';

// Meetings on the Overview, the reminder that pops up before one starts, and the sidebar count.
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarClock, ExternalLink, Video, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MyMeeting, SOURCE_LABEL, dayOf, isToday, leftToday, timeOf, untilText, useMyMeetings } from './useMyMeetings';

const SourceDot = ({ s }: { s: MyMeeting['source'] }) => (
  <span title={SOURCE_LABEL[s]} className={cn('w-2 h-2 rounded-full shrink-0', s === 'google' ? 'bg-[#4285F4]' : s === 'outlook' ? 'bg-[#0F6CBD]' : 'bg-accent-blue')} />
);

function JoinOrOpen({ m, compact }: { m: MyMeeting; compact?: boolean }) {
  if (m.join_url) return (
    <a href={m.join_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
      className={cn('inline-flex items-center gap-1.5 rounded-lg font-semibold text-white bg-accent-blue hover:opacity-90 shrink-0', compact ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[12.5px]')}>
      <Video className="w-3.5 h-3.5" />Join
    </a>
  );
  if (!m.open_url) return null;
  const inApp = m.open_url.startsWith('/');
  return inApp
    ? <Link href={m.open_url} className="text-[12.5px] font-semibold text-accent-blue shrink-0">Open</Link>
    : <a href={m.open_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-blue shrink-0">Open<ExternalLink className="w-3 h-3" /></a>;
}

export function MeetingRow({ m, showDay }: { m: MyMeeting; showDay?: boolean }) {
  const until = untilText(m);
  const live = until === 'now';
  return (
    <div className="flex items-center gap-3 py-2.5 border-t border-border-subtle first:border-t-0">
      <span className="w-[68px] shrink-0 leading-tight">
        {showDay && <span className="block text-[11px] text-text-secondary">{dayOf(m.start)}</span>}
        <b className="block text-[13.5px] font-bold text-text-primary">{m.all_day ? 'All day' : timeOf(m.start)}</b>
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary"><SourceDot s={m.source} /><span className="truncate">{m.title}</span></span>
        <span className="block text-[11.5px] text-text-secondary truncate">
          {live ? <b className="text-accent-green font-semibold">Happening now</b> : until && isToday(m.start) ? <span className="font-semibold text-accent-blue">{until}</span> : null}
          {(live || (until && isToday(m.start))) && (m.location || true) ? ' · ' : ''}{m.location || SOURCE_LABEL[m.source]}
        </span>
      </span>
      <JoinOrOpen m={m} compact />
    </div>
  );
}

/** One line under the greeting: the next meeting today, with Join. Nothing when the day is clear. */
export function NextMeeting() {
  const { meetings } = useMyMeetings();
  const left = leftToday(meetings);
  const next = left[0];
  if (!next) return null;
  const until = untilText(next);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-background-secondary border border-border-subtle rounded-xl px-4 py-3 normal-case">
      <span className="w-8 h-8 rounded-lg bg-accent-blue/10 text-accent-blue grid place-items-center shrink-0"><CalendarClock className="w-[18px] h-[18px]" /></span>
      <span className="flex-1 min-w-0 text-[14px] text-text-secondary">
        {until === 'now' ? <b className="text-accent-green font-semibold">Happening now: </b> : <span>Next meeting {until && <b className="text-accent-blue font-semibold">{until}</b>}: </span>}
        <b className="text-text-primary font-semibold">{next.title}</b> at {timeOf(next.start)}
        {left.length > 1 && <span className="text-text-secondary"> · {left.length - 1} more today</span>}
      </span>
      <JoinOrOpen m={next} />
    </div>
  );
}

/** Meetings in the next two weeks, for the top of the Overview's "Coming up" card. */
export function UpcomingMeetings({ limit = 4 }: { limit?: number }) {
  const { meetings, problems, loaded } = useMyMeetings();
  const now = Date.now();
  const list = meetings.filter(m => new Date(m.end).getTime() > now).slice(0, limit);
  if (!loaded) return null;
  return (
    <div className="mb-1">
      {list.map(m => <MeetingRow key={m.id} m={m} showDay />)}
      {problems.map(p => <div key={p.calendar} className="py-2 text-[12.5px] text-accent-orange">{p.message} <Link href="/planner" className="font-semibold underline">Reconnect</Link></div>)}
    </div>
  );
}

/** Number of meetings left today, for the sidebar. Pulses when one starts within 15 minutes. */
export function useMeetingBadge() {
  const { meetings } = useMyMeetings();
  const now = Date.now();
  const left = leftToday(meetings);
  const soon = left.some(m => { const s = new Date(m.start).getTime(); return s - now <= 15 * 60000; });
  return { count: left.length, soon };
}

const SEEN_KEY = 'nurofin-meeting-reminded';
/** Pops up 10 minutes before a meeting, once per meeting, anywhere in the app. */
export function MeetingReminder() {
  const { meetings, tick } = useMyMeetings();
  const [shown, setShown] = useState<MyMeeting | null>(null);
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    try { seen.current = new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]')); } catch { /* private mode */ }
  }, []);
  useEffect(() => {
    if (shown) return;
    const now = Date.now();
    const next = meetings.find(m => {
      if (m.all_day || seen.current.has(m.id)) return false;
      const s = new Date(m.start).getTime();
      return s - now <= 10 * 60000 && now < s + 5 * 60000;   // from 10 min before to 5 min after it starts
    });
    if (next) {
      setShown(next);
      seen.current.add(next.id);
      try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current])); } catch { /* ignore */ }
    }
  }, [meetings, tick, shown]);
  return (
    <AnimatePresence>
      {shown && (
        <motion.div role="alert" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          className="fixed z-[80] right-5 bottom-24 w-[320px] max-w-[calc(100vw-40px)] bg-background-secondary border border-border-subtle rounded-2xl shadow-[0_16px_40px_rgba(14,23,38,.18)] p-4 normal-case">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-accent-blue/10 text-accent-blue grid place-items-center shrink-0"><Bell className="w-[18px] h-[18px]" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-accent-blue">{untilText(shown) === 'now' ? 'Starting now' : `Starts ${untilText(shown)}`}</p>
              <p className="text-[14.5px] font-bold text-text-primary leading-snug">{shown.title}</p>
              <p className="text-[12px] text-text-secondary">{timeOf(shown.start)} · {shown.location || SOURCE_LABEL[shown.source]}</p>
            </div>
            <button onClick={() => setShown(null)} aria-label="Close" className="text-text-secondary hover:text-text-primary"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShown(null)} className="px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary">Dismiss</button>
            <span onClick={() => setShown(null)}><JoinOrOpen m={shown} /></span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
