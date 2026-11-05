'use client';

// The signed-in person's meetings (Chief of Staff + Google + Outlook) for the next two weeks.
// One shared store, so the Overview card, the sidebar badge and the meeting reminder make a single
// request between them and always agree. Refreshes every 5 minutes and when the tab comes back.
import { useEffect } from 'react';
import { create } from 'zustand';

export interface MyMeeting {
  id: string;
  source: 'nurofin' | 'google' | 'outlook';
  title: string;
  start: string;          // ISO with offset
  end: string;
  all_day: boolean;
  join_url: string | null;
  location: string | null;
  open_url: string | null;
  meeting_id?: number;
}
interface Problem { calendar: string; message: string }
interface State {
  meetings: MyMeeting[];
  problems: Problem[];
  loaded: boolean;
  tick: number;           // re-renders "in 5 min" labels each minute
  load: (fresh?: boolean) => Promise<void>;
}

let inflight: Promise<void> | null = null;
let users = 0;
let stop: (() => void) | null = null;

export const useMeetingsStore = create<State>((set) => ({
  meetings: [], problems: [], loaded: false, tick: 0,
  load: async (fresh = false) => {
    if (inflight) return inflight;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    inflight = fetch(`/api/v1/my-meetings?days=14${fresh ? '&fresh=true' : ''}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.data) set({ meetings: j.data.meetings || [], problems: j.data.problems || [], loaded: true }); })
      .catch(() => {})
      .finally(() => { inflight = null; });
    return inflight;
  },
}));

/** Any component can call this; polling runs while at least one of them is on screen. */
export function useMyMeetings() {
  const state = useMeetingsStore();
  useEffect(() => {
    users += 1;
    if (users === 1) {
      const { load } = useMeetingsStore.getState();
      load();
      const every = setInterval(() => load(), 5 * 60 * 1000);
      const minute = setInterval(() => useMeetingsStore.setState(s => ({ tick: s.tick + 1 })), 60 * 1000);
      const onFocus = () => document.visibilityState === 'visible' && load();
      document.addEventListener('visibilitychange', onFocus);
      stop = () => { clearInterval(every); clearInterval(minute); document.removeEventListener('visibilitychange', onFocus); };
    }
    return () => { users -= 1; if (users === 0 && stop) { stop(); stop = null; } };
  }, []);
  return state;
}

// ----------------------------------------------------------------- helpers

export const isToday = (iso: string, now = new Date()) => new Date(iso).toDateString() === now.toDateString();
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
export const dayOf = (iso: string) => {
  const d = new Date(iso), t = new Date();
  const tomorrow = new Date(t); tomorrow.setDate(t.getDate() + 1);
  if (d.toDateString() === t.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};
/** "in 12 min", "now", "in 2 h", "ended" */
export function untilText(m: MyMeeting, now = Date.now()) {
  const s = new Date(m.start).getTime(), e = new Date(m.end).getTime();
  if (now >= e) return 'ended';
  if (now >= s) return 'now';
  const mins = Math.round((s - now) / 60000);
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60), r = mins % 60;
  return h < 24 ? `in ${h} h${r ? ` ${r} min` : ''}` : '';
}
/** Meetings still to come today, or happening now. */
export const leftToday = (ms: MyMeeting[], now = new Date()) =>
  ms.filter(m => !m.all_day && isToday(m.start, now) && new Date(m.end).getTime() > now.getTime());
export const SOURCE_LABEL: Record<MyMeeting['source'], string> = { nurofin: 'Chief of Staff', google: 'Google Calendar', outlook: 'Outlook' };
