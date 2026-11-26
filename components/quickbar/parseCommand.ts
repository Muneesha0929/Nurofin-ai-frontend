// Pure parsing for the quick bar's "update mode": a universal code, then an optional command.
// No React, no network. Everything here is unit-testable by hand.
//
// Examples (code → command):
//   "PROD-1.2.3"                        -> open
//   "prod 1.2 done"                     -> status completed
//   "##PROD-1.2.3 start"                -> status in_progress
//   "prod-1.2.3 in progress"            -> status in_progress
//   "PROD-1.2.3 blocked"                -> status blocked
//   "PROD-1.2 60%"                      -> progress 60
//   "PROD-1.2.3 +15d vendor delay"      -> move deadline (current + 15 days), reason "vendor delay"
//   "PROD-1.2.3 +2w"                    -> move deadline, reason missing (the UI asks "Why is it moving?")
//   "PROD-1.2.3 → 10 Dec bank UAT"      -> move to 10 Dec, reason "bank UAT"
//   "PROD-1.2.3 to 10 dec because x"    -> move to 10 Dec, reason "x"
//   "PROD-1.2.3 by friday scope grew"   -> move to the coming Friday, reason "scope grew"
//   "PROD-1.2 note: waiting on bank"    -> add an update to the timeline
//   "PROD-1.2 update waiting on bank"   -> same
//   "PROD-1.2 ask @Muneesha check UAT"  -> handover to Muneesha with the note
//   "PROD-1.2 P1" / "p2" / "no priority"-> set priority (objectives, CEO only)

import { Priority, addDays, isoDay, normalizeCode } from '@/services/timeline';

export type ItemKind = 'department' | 'objective' | 'task';

export interface CodePrefix {
  /** Normalised, e.g. "PROD-1.2.3" */
  code: string;
  /** What the user typed for it, e.g. "##prod 1.2.3" */
  typed: string;
  /** Everything after the code, trimmed */
  rest: string;
  /** Dept letters only, upper-case, e.g. "PROD" */
  dept: string;
  hashed: boolean;
}

// Optional #/##, dept letters, then "-" or a space, then 1.2.3 — followed by whitespace or the end.
const PREFIX_RE = /^(\s*)(#{0,2})([A-Za-z][A-Za-z0-9]{0,9})(?:-|\s+)(\d+(?:\.\d+)*)(?=\s|$)/;

/**
 * Does the text START with a universal code? `known` is the set of department codes (upper-case) so that
 * ordinary titles such as "Fix 2 bugs" are not mistaken for codes. If `known` is empty (board not loaded yet)
 * we only accept the explicit forms (a hyphen, or a leading #).
 */
export function parseCodePrefix(text: string, known?: Set<string>): CodePrefix | null {
  const m = PREFIX_RE.exec(text);
  if (!m) return null;
  const hashed = m[2].length > 0;
  const dept = m[3].toUpperCase();
  const usedHyphen = /^-/.test(text.slice(m[1].length + m[2].length + m[3].length));
  const dotted = m[4].includes('.');
  if (known && known.size > 0) {
    // A department we know is always a code. Others only when the form is explicit (##, or PROD-1.2).
    if (!known.has(dept) && !hashed && !(usedHyphen && dotted)) return null;
  } else if (!hashed && !usedHyphen && !dotted) {
    // Board not loaded (or no departments visible): still accept "prod 1.2" and "prod-1", but not "fix 2 bugs".
    return null;
  }
  const rest = text.slice(m[0].length).trim().replace(/^[:,]\s*/, '');
  return { code: normalizeCode(`${dept}-${m[4]}`), typed: m[0].trim(), rest, dept, hashed };
}

export interface Person { id: number; name: string }

interface Base { label: string; error?: string; incomplete?: boolean }
export type ParsedCommand =
  | (Base & { type: 'open' })
  | (Base & { type: 'status'; status: 'completed' | 'in_progress' | 'blocked' })
  | (Base & { type: 'progress'; value: number })
  | (Base & { type: 'move'; date: string | null; reason: string; relative?: string })
  | (Base & { type: 'note'; text: string })
  | (Base & { type: 'ask'; person: Person | null; ambiguous?: Person[]; text: string })
  | (Base & { type: 'priority'; priority: Priority | null })
  | (Base & { type: 'unknown'; text: string });

export interface ParseOpts {
  kind: ItemKind;
  teammates?: Person[];
  /** Current deadline of the item (YYYY-MM-DD), used by "+15d". */
  currentDeadline?: string | null;
  now?: Date;
  /** Can this user set priorities? (CEO only) */
  canPrioritise?: boolean;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function build(y: number, m: number, d: number): Date | null {
  const dt = new Date(y, m, d);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? dt : null;
}

/** Year was not typed: use this year, or next year if that day has already passed. */
function inferYear(m: number, d: number, now: Date): Date | null {
  const today = startOfDay(now);
  const a = build(today.getFullYear(), m, d);
  if (a && a >= today) return a;
  return build(today.getFullYear() + 1, m, d);
}

/** Read a date at the START of `s`. Returns the ISO day and how many characters were used. */
export function parseDateAtStart(s: string, nowIn?: Date): { date: string; used: number } | null {
  const now = nowIn || new Date();
  const today = startOfDay(now);
  let m: RegExpExecArray | null;

  if ((m = /^(today|tonight)\b/i.exec(s))) return { date: isoDay(today), used: m[0].length };
  if ((m = /^(tomorrow|tmrw|tmr)\b/i.exec(s))) return { date: addDays(isoDay(today), 1), used: m[0].length };
  if ((m = /^next\s+week\b/i.exec(s))) {
    const add = ((8 - today.getDay()) % 7) || 7; // coming Monday
    return { date: addDays(isoDay(today), add), used: m[0].length };
  }
  if ((m = /^(?:end\s+of\s+(?:the\s+)?month|eom)\b/i.exec(s))) {
    return { date: isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)), used: m[0].length };
  }
  if ((m = /^(next\s+)?([A-Za-z]{3,9})\b/.exec(s)) && WEEKDAYS[m[2].toLowerCase()] !== undefined) {
    const target = WEEKDAYS[m[2].toLowerCase()];
    let add = (target - today.getDay() + 7) % 7;
    if (add === 0) add = 7;
    if (m[1]) add += 7;
    return { date: addDays(isoDay(today), add), used: m[0].length };
  }
  if ((m = /^(\d{4})-(\d{2})-(\d{2})\b/.exec(s))) {
    const dt = build(+m[1], +m[2] - 1, +m[3]);
    return dt ? { date: isoDay(dt), used: m[0].length } : null;
  }
  // 10 Dec / 10th December 2026
  if ((m = /^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]{3,9})\.?(?:,?\s+(\d{4}))?\b/.exec(s)) && MONTHS[m[2].toLowerCase()] !== undefined) {
    const mo = MONTHS[m[2].toLowerCase()];
    const dt = m[3] ? build(+m[3], mo, +m[1]) : inferYear(mo, +m[1], now);
    return dt ? { date: isoDay(dt), used: m[0].length } : null;
  }
  // Dec 10 / December 10th, 2026
  if ((m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/.exec(s)) && MONTHS[m[1].toLowerCase()] !== undefined) {
    const mo = MONTHS[m[1].toLowerCase()];
    const dt = m[3] ? build(+m[3], mo, +m[2]) : inferYear(mo, +m[2], now);
    return dt ? { date: isoDay(dt), used: m[0].length } : null;
  }
  // 10/12 or 10/12/26 (day first, as in India)
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?=\s|$)/.exec(s))) {
    const mo = +m[2] - 1;
    let dt: Date | null;
    if (m[3]) dt = build(m[3].length === 2 ? 2000 + +m[3] : +m[3], mo, +m[1]);
    else dt = inferYear(mo, +m[1], now);
    return dt ? { date: isoDay(dt), used: m[0].length } : null;
  }
  return null;
}

const cleanReason = (s: string) =>
  s.trim().replace(/^(?:because(?:\s+of)?|since|as|due\s+to|coz|cuz|cause)\b[\s:,-]*/i, '').replace(/^[\s:,–—-]+/, '').trim();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** "Muneesha please check" -> { person: Muneesha, text: "please check" }. Longest name wins. */
export function matchPersonAtStart(s: string, people: Person[]): { person: Person | null; ambiguous?: Person[]; text: string } {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { person: null, text: '' };
  for (let k = Math.min(3, words.length); k >= 1; k--) {
    const cand = norm(words.slice(0, k).join(' '));
    if (!cand) continue;
    const exact = people.filter(u => norm(u.name) === cand);
    const loose = people.filter(u => {
      const n = norm(u.name);
      return n.startsWith(cand) || (k === 1 && n.split(' ').some(w => w === cand));
    });
    const pool = exact.length ? exact : loose;
    if (pool.length) {
      const text = words.slice(k).join(' ');
      return pool.length === 1 || exact.length === 1
        ? { person: exact.length === 1 ? exact[0] : pool[0], text }
        : { person: null, ambiguous: pool.slice(0, 5), text };
    }
  }
  return { person: null, text: words.slice(1).join(' ') };
}

const fmtShort = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** Parse what comes after the code. */
export function parseCommand(restIn: string, opts: ParseOpts): ParsedCommand {
  const rest = restIn.trim();
  const now = opts.now || new Date();
  const people = opts.teammates || [];
  let m: RegExpExecArray | null;

  if (!rest) return { type: 'open', label: 'Open it' };

  // status
  if (/^(done|complete|completed|finish|finished|close|closed)$/i.test(rest)) {
    return { type: 'status', status: 'completed', label: 'Mark as done' };
  }
  if (/^(start|started|begin|in[\s-]?progress|wip)$/i.test(rest)) {
    return { type: 'status', status: 'in_progress', label: 'Mark as in progress' };
  }
  if (/^(blocked?|on[\s-]?hold)$/i.test(rest)) {
    return opts.kind === 'task'
      ? { type: 'status', status: 'blocked', label: 'Mark as on hold' }
      : { type: 'unknown', text: rest, label: '', error: 'Only tasks can be put on hold.' };
  }

  // progress
  if ((m = /^(\d{1,3})\s*%$/.exec(rest))) {
    const v = +m[1];
    return v > 100
      ? { type: 'unknown', text: rest, label: '', error: 'Progress goes from 0 to 100%.' }
      : { type: 'progress', value: v, label: `Set progress to ${v}%` };
  }

  // priority
  if ((m = /^(?:priority\s+)?p\s?([123])$/i.exec(rest))) {
    const p = (`P${m[1]}`) as Priority;
    if (opts.kind !== 'objective') return { type: 'unknown', text: rest, label: '', error: 'Priorities apply to objectives, not tasks.' };
    if (opts.canPrioritise === false) return { type: 'unknown', text: rest, label: '', error: 'Only the CEO can set priorities.' };
    return { type: 'priority', priority: p, label: `Set priority ${p}` };
  }
  if (/^(?:(?:no|clear|remove|drop)\s+(?:priority|p)|p0)$/i.test(rest)) {
    if (opts.kind !== 'objective') return { type: 'unknown', text: rest, label: '', error: 'Priorities apply to objectives, not tasks.' };
    if (opts.canPrioritise === false) return { type: 'unknown', text: rest, label: '', error: 'Only the CEO can set priorities.' };
    return { type: 'priority', priority: null, label: 'Remove priority' };
  }

  // note / update
  if ((m = /^(?:note|update|log)\b\s*:?\s*(.*)$/i.exec(rest))) {
    const text = m[1].trim();
    return text
      ? { type: 'note', text, label: 'Add an update to the timeline' }
      : { type: 'note', text: '', label: 'Add an update — type it after the colon', incomplete: true };
  }

  // ask @Name text
  if ((m = /^(?:ask|handover|hand\s+over)\b\s*(.*)$/i.exec(rest))) {
    const after = m[1].replace(/^@/, '').trim();
    if (!after) return { type: 'ask', person: null, text: '', label: 'Ask someone — type @Name', incomplete: true };
    const r = matchPersonAtStart(after, people);
    if (r.ambiguous) return { type: 'ask', person: null, ambiguous: r.ambiguous, text: r.text, label: 'Which one? ' + r.ambiguous.map(p => p.name).join(', '), incomplete: true };
    if (!r.person) return { type: 'ask', person: null, text: r.text, label: '', error: `No teammate called "${after.split(/\s+/)[0]}".` };
    return { type: 'ask', person: r.person, text: r.text, label: `Ask ${r.person.name} to look after it` };
  }

  // move deadline: "+15d reason", "→ 10 Dec reason", "to 10 dec because x", "by friday x"
  const body = rest.replace(/^(?:move|extend|push|postpone|shift)\s+/i, '');
  if ((m = /^\+\s*(\d+)\s*(d|days?|w|wks?|weeks?|m|mo|months?)(?=\s|$)\s*(.*)$/i.exec(body))) {
    const n = +m[1];
    const unit = m[2].toLowerCase();
    const base = opts.currentDeadline ? opts.currentDeadline.slice(0, 10) : isoDay(now);
    let date: string;
    if (unit.startsWith('w')) date = addDays(base, n * 7);
    else if (unit.startsWith('m')) {
      const d = new Date(base + 'T00:00:00');
      d.setMonth(d.getMonth() + n);
      date = isoDay(d);
    } else date = addDays(base, n);
    const reason = cleanReason(m[3]);
    const rel = `+${n}${unit.startsWith('w') ? 'w' : unit.startsWith('m') ? 'mo' : 'd'}`;
    return { type: 'move', date, reason, relative: rel, label: `Move deadline ${opts.currentDeadline ? fmtShort(opts.currentDeadline) + ' → ' : 'to '}${fmtShort(date)}` };
  }
  if ((m = /^(?:(?:→|->|=>)\s*|(?:to|by|until|till|on)(?:\s+|$))(.*)$/i.exec(body))) {
    const tail = m[1].trim();
    if (!tail) return { type: 'move', date: null, reason: '', label: 'Move deadline — type a date, e.g. 10 Dec or friday', incomplete: true };
    const d = parseDateAtStart(tail, now);
    if (!d) {
      // "to " followed by something that is not (yet) a date. Not an error while typing.
      return { type: 'move', date: null, reason: '', label: 'Move deadline — type a date, e.g. 10 Dec or friday', incomplete: true };
    }
    const reason = cleanReason(tail.slice(d.used));
    return { type: 'move', date: d.date, reason, label: `Move deadline ${opts.currentDeadline ? fmtShort(opts.currentDeadline) + ' → ' : 'to '}${fmtShort(d.date)}` };
  }

  return { type: 'unknown', text: rest, label: '', error: `Didn't understand "${rest.length > 24 ? rest.slice(0, 24) + '…' : rest}".` };
}

// ---- hints + Tab completion

export interface Hint { key: string; text: string; type: ParsedCommand['type']; insert: string }

export function hintsFor(kind: ItemKind, canPrioritise: boolean): Hint[] {
  if (kind === 'department') return [];
  const h: Hint[] = [
    { key: 'done', text: 'done', type: 'status', insert: 'done' },
    { key: 'start', text: 'start', type: 'status', insert: 'start' },
  ];
  if (kind === 'task') h.push({ key: 'blocked', text: 'blocked', type: 'status', insert: 'blocked' });
  h.push(
    { key: 'pct', text: '60%', type: 'progress', insert: '' },
    { key: 'plus', text: '+15d why', type: 'move', insert: '+15d ' },
    { key: 'to', text: '→ 10 Dec why', type: 'move', insert: '→ ' },
    { key: 'note', text: 'note: …', type: 'note', insert: 'note: ' },
    { key: 'ask', text: 'ask @Name …', type: 'ask', insert: 'ask @' },
  );
  if (kind === 'objective' && canPrioritise) h.push({ key: 'p', text: 'P1 · P2 · P3', type: 'priority', insert: 'P1' });
  return h;
}

const WORDS = ['done', 'complete', 'start', 'blocked', 'note: ', 'ask @', 'in progress', 'update '];

/**
 * Tab: complete the partly typed command word (or teammate name after "ask @").
 * Returns the new `rest` or null when there is nothing to complete.
 */
export function completeRest(rest: string, opts: ParseOpts): string | null {
  const r = rest.trimStart();
  if (!r) return null;
  const lower = r.toLowerCase();
  // teammate name after "ask @"
  const ask = /^(ask|handover)\s+@?(\S*)$/i.exec(r);
  if (ask && ask[2]) {
    const q = ask[2].toLowerCase();
    const hit = (opts.teammates || []).find(u => norm(u.name).startsWith(q) || norm(u.name).split(' ').some(w => w.startsWith(q)));
    if (hit && norm(hit.name) !== norm(ask[2])) return `${ask[1]} @${hit.name} `;
    return null;
  }
  if (/\s/.test(r) && !/^in\s/.test(lower)) return null;
  const words = WORDS.filter(w => (w !== 'blocked' || opts.kind === 'task'));
  const hit = words.find(w => w.startsWith(lower) && w !== lower);
  if (hit) return hit;
  if ('p'.startsWith(lower[0]) && /^p$/.test(lower) && opts.kind === 'objective' && opts.canPrioritise) return 'P1';
  return null;
}
