// Money formatting, months, and the plain-language story the Overview tells.
// Shared by the Runway page and the small card on the CEO's dashboard so both say the same thing.
import type { Glance, RunwaySummary } from '@/services/runway';

const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MS = MN.map(m => m.slice(0, 3));

export const mIdx = (m: string) => +m.slice(0, 4) * 12 + +m.slice(5, 7) - 1;
export const mOf = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
export const addM = (m: string, n: number) => mOf(mIdx(m) + n);
export const range = (a: string, b: string) => { const o: string[] = []; for (let i = mIdx(a); i <= mIdx(b); i++) o.push(mOf(i)); return o; };
export const mLong = (m: string) => `${MN[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
export const mName = (m: string) => MN[+m.slice(5, 7) - 1];
export const mShort = (m: string) => `${MS[+m.slice(5, 7) - 1]} ${m.slice(2, 4)}`;
export const dShort = (d: string) => `${+d.slice(8, 10)} ${MS[+d.slice(5, 7) - 1]}`;
export const dLong = (d: string) => `${+d.slice(8, 10)} ${MS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
export const daysIn = (m: string) => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);

/** ₹1,50,000 */
export const rs = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
/** ₹57.5 L, ₹1.2 Cr, ₹42k */
export function L(n: number) {
  const s = n < 0 ? '−' : ''; n = Math.abs(n);
  if (n >= 1e7) return `${s}₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `${s}₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')} L`;
  if (n >= 1e3) return `${s}₹${Math.round(n / 1e3)}k`;
  return s + rs(n);
}
export const parseRs = (v: string) => { const t = String(v ?? '').replace(/[,₹\s]/g, ''); return t === '' ? NaN : +t; };

export type Tone = 'good' | 'watch' | 'risk';
export interface Story { tone: Tone; status: string; headline: string; sub: string; short: string; basis: string }

/**
 * The words at the top of the Overview. Leads with the goal and how close it is, then says the
 * risk plainly with a way forward. Never hides that it is a forecast.
 */
export function story(s: RunwaySummary | Glance): Story {
  const E = s.expected, C = s.slower;
  const slower = C.out ? `Even if income grows more slowly, there is enough until ${mLong(C.out)}.` : 'Even if income grows more slowly, the money does not run out.';
  const basis = `This is a forecast from your figures up to ${s.last_figure_day ? dShort(s.last_figure_day) : mName(addM(s.current_month, -1))}. It updates every time you add one.`;
  if (s.state === 'self_funding') {
    return { tone: 'good', status: 'On track', headline: 'The company now pays for itself.', basis,
      sub: 'Income is more than everything the company spends, so every month from here adds to the bank.',
      short: 'Income now covers all monthly costs.' };
  }
  if (s.state === 'risk') {
    if (E.be) return { tone: 'risk', status: 'Needs a plan', basis,
      headline: `Break-even is reachable with about ${L(s.need)} more.`,
      sub: `Income is on track to pay for every cost from ${mLong(E.be)}. At today's pace the bank runs low in ${mLong(E.out!)}, ${mIdx(E.be) - mIdx(E.out!)} months before that. Adding about ${L(s.need)}, or trimming costs, carries the company across.`,
      short: `Break-even ${mLong(E.be)}; about ${L(s.need)} more needed to get there.` };
    return { tone: 'risk', status: 'Needs a plan', basis,
      headline: `Today's cash covers the next ${E.runway} months.`,
      sub: `Income is growing, but not yet fast enough to pay for every cost within three years. About ${L(s.need)} more, faster growth or lower costs would change that.`,
      short: `Cash covers the next ${E.runway} months.` };
  }
  if (!E.be) {
    return { tone: s.state === 'good' ? 'good' : 'watch', status: s.state === 'good' ? 'On track' : 'Within reach', basis,
      headline: 'The money is secure for the next three years.',
      sub: 'Income keeps growing and the bank never runs dry over that time. It does not cover every cost yet, so faster growth is what brings break-even into view.',
      short: 'The money lasts for the next three years.' };
  }
  if (s.state === 'good') {
    return { tone: 'good', status: 'On track', basis,
      headline: `On course to break even by ${mLong(E.be)}.`,
      sub: `If things carry on as they are, income will pay for every monthly cost from ${mName(E.be)}. The money in the bank is enough to get there: at its lowest it still holds about ${L(E.low_cash)} in ${mLong(E.low)}, and it grows from then on. ${slower}`,
      short: `On course to break even by ${mLong(E.be)}.` };
  }
  return { tone: 'watch', status: 'Within reach', basis,
    headline: `Break-even is within reach: ${mLong(E.be)}.`,
    sub: `At today's pace the money gets there, with about ${L(E.low_cash)} left at the lowest point. If income grows more slowly, the money could run short around ${mLong(C.out!)}, so keeping costs steady until then gives you room.`,
    short: `Break-even within reach: ${mLong(E.be)}.` };
}

export const TONE_COLOR: Record<Tone, string> = { good: '#12A26B', watch: '#D98A00', risk: '#D64545' };
