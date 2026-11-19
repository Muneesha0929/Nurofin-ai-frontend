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

/** One line under the greeting: the next meeting today, with Join. If today is clear/completed, shows tomorrow's scheduled meeting. */
export function NextMeeting() {
  const { meetings } = useMyMeetings();
  const left = leftToday(meetings);
  const next = left[0];
  if (next) {
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

  // If no more meetings left today, show next meeting scheduled for tomorrow
  const tomorrows = meetings.filter(m => !m.all_day && dayOf(m.start) === 'Tomorrow');
  const nextTomorrow = tomorrows[0];
  if (!nextTomorrow) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-background-secondary/80 border border-border-subtle rounded-xl px-4 py-3 normal-case">
      <span className="w-8 h-8 rounded-lg bg-accent-blue/10 text-accent-blue grid place-items-center shrink-0"><CalendarClock className="w-[18px] h-[18px]" /></span>
      <span className="flex-1 min-w-0 text-[14px] text-text-secondary">
        <span className="text-accent-blue font-semibold">Next meeting tomorrow: </span>
        <b className="text-text-primary font-semibold">{nextTomorrow.title}</b> at {timeOf(nextTomorrow.start)}
        {tomorrows.length > 1 && <span className="text-text-secondary"> · {tomorrows.length - 1} more tomorrow</span>}
      </span>
      <JoinOrOpen m={nextTomorrow} />
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

const SEEN_KEY = 'nurofin-meeting-reminded-stages';
/** Pops up 30 minutes, 15 minutes before a meeting, or when it starts, anywhere in the app. */
export function MeetingReminder() {
  const { meetings, tick } = useMyMeetings();
  const [shown, setShown] = useState<{ meeting: MyMeeting; stage: '30m' | '15m' | 'now'; minsRemaining: number } | null>(null);
  const seenStages = useRef<Set<string>>(new Set());
  const snoozedUntil = useRef<number>(0);

  useEffect(() => {
    try { 
      seenStages.current = new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]')); 
    } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    if (shown) return;
    const now = Date.now();
    if (now < snoozedUntil.current) return;

    for (const m of meetings) {
      if (m.all_day) continue;
      const s = new Date(m.start).getTime();
      const diffMins = Math.round((s - now) / 60000);

      // 1. "30 minutes before" reminder
      if (diffMins > 15 && diffMins <= 30) {
        const key = `${m.id}-30m`;
        if (!seenStages.current.has(key)) {
          setShown({ meeting: m, stage: '30m', minsRemaining: diffMins });
          seenStages.current.add(key);
          try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seenStages.current])); } catch {}
          break;
        }
      }

      // 2. "15 minutes before" reminder (starting soon)
      if (diffMins > 0 && diffMins <= 15) {
        const key = `${m.id}-15m`;
        if (!seenStages.current.has(key)) {
          setShown({ meeting: m, stage: '15m', minsRemaining: diffMins });
          seenStages.current.add(key);
          try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seenStages.current])); } catch {}
          break;
        }
      }

      // 3. "Starting now / Live" reminder
      if (diffMins <= 0 && diffMins >= -10) {
        const key = `${m.id}-now`;
        if (!seenStages.current.has(key)) {
          setShown({ meeting: m, stage: 'now', minsRemaining: 0 });
          seenStages.current.add(key);
          try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seenStages.current])); } catch {}
          break;
        }
      }
    }
  }, [meetings, tick, shown]);

  const handleSnooze = () => {
    snoozedUntil.current = Date.now() + 5 * 60 * 1000;
    setShown(null);
  };

  const handleDismiss = () => {
    setShown(null);
  };

  return (
    <AnimatePresence>
      {shown && (
        <motion.div 
          role="alert" 
          initial={{ opacity: 0, y: 20, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{ backgroundColor: 'var(--bg-secondary)' }}
          className="fixed z-[100] right-5 bottom-24 w-[340px] max-w-[calc(100vw-40px)] bg-background-secondary border-2 border-accent-blue/40 rounded-3xl shadow-2xl p-4 normal-case animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-3">
            <span className={cn(
              "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs",
              shown.stage === 'now' 
                ? "bg-emerald-500 text-white animate-pulse" 
                : shown.stage === '15m'
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-accent-blue/15 text-accent-blue"
            )}>
              <Bell className="w-[18px] h-[18px]" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn(
                  "text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                  shown.stage === 'now'
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : shown.stage === '15m'
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                )}>
                  {shown.stage === 'now' ? '🔴 Live Now' : `In ${shown.minsRemaining} mins`}
                </span>
                <span className="text-[11px] font-medium text-text-secondary">
                  {shown.stage === '30m' ? 'Upcoming (30m alert)' : shown.stage === '15m' ? 'Starting soon!' : 'Join call'}
                </span>
              </div>
              <p className="text-[14px] font-bold text-text-primary leading-snug mt-1 truncate">
                {shown.meeting.title}
              </p>
              <p className="text-[11.5px] text-text-secondary mt-0.5">
                {timeOf(shown.meeting.start)} · {shown.meeting.location || SOURCE_LABEL[shown.meeting.source]}
              </p>
            </div>
            <button 
              onClick={handleDismiss} 
              aria-label="Close" 
              className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-background-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border-subtle">
            <button 
              type="button"
              onClick={handleSnooze} 
              className="text-[11.5px] font-semibold text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg hover:bg-background-primary transition-colors cursor-pointer"
            >
              Snooze (5m)
            </button>
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={handleDismiss} 
                className="px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <span onClick={handleDismiss}>
                <JoinOrOpen m={shown.meeting} />
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
