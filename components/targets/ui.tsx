'use client';

// Building blocks copied from the approved Chief of Staff design (design/chief-of-staff.html),
// so the Overview, Departments and Deadlines pages look like the prototype.
import React from 'react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { Health, OverviewDepartment, PersonBrief, QuarterInfo } from '@/services/departmentTargets';

export const HEALTH_LABEL: Record<Health, string> = { on: 'On track', risk: 'At risk', off: 'Off track', done: 'Done' };
const HEALTH_CLS: Record<Health, string> = {
  on: 'text-accent-blue bg-accent-blue/10',
  risk: 'text-accent-orange bg-accent-orange/10',
  off: 'text-accent-red bg-accent-red/10',
  done: 'text-accent-green bg-accent-green/10',
};
const BAR_CLS: Record<Health, string> = { on: 'bg-accent-blue', risk: 'bg-accent-orange', off: 'bg-accent-red', done: 'bg-accent-green' };

export const HealthChip = ({ h, children }: { h: Health; children?: React.ReactNode }) => (
  <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap', HEALTH_CLS[h])}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />{children ?? HEALTH_LABEL[h]}
  </span>
);

/** Department health from its objectives' health counts (same rule as the design). */
export const deptHealth = (c?: Record<Health, number>): Health | null => {
  if (!c) return null;
  const total = c.on + c.risk + c.off + c.done;
  if (!total) return null;
  if (c.off) return 'off';
  if (c.risk) return 'risk';
  return c.done === total ? 'done' : 'on';
};

/** How far through the quarter we are today, 0-100. */
export const quarterPace = (q: Pick<QuarterInfo, 'start' | 'end'>) => {
  const s = new Date(q.start + 'T00:00:00').getTime(), e = new Date(q.end + 'T23:59:59').getTime();
  return Math.max(0, Math.min(100, ((Date.now() - s) / (e - s)) * 100));
};
export const quarterDay = (q: Pick<QuarterInfo, 'start' | 'end'>) => {
  const s = new Date(q.start + 'T00:00:00').getTime(), e = new Date(q.end + 'T00:00:00').getTime();
  const total = Math.round((e - s) / 86400000) + 1;
  const day = Math.min(total, Math.max(1, Math.floor((Date.now() - s) / 86400000) + 1));
  return { day, total, left: total - day };
};

/** Progress bar with an optional "where we should be today" tick. */
export const PaceBar = ({ value, pace, h, className }: { value: number | null; pace?: number; h?: Health | null; className?: string }) => (
  <div className={cn('relative h-1.5 rounded-full bg-[var(--bg-primary)]', className)}>
    <div className={cn('h-full rounded-full', h ? BAR_CLS[h] : 'bg-accent-blue')} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    {pace !== undefined && <span title={`Where we should be today (${Math.round(pace)}%)`} className="absolute -top-1 w-0.5 h-3.5 rounded" style={{ left: `${pace}%`, background: 'var(--text-primary)', opacity: 0.45 }} />}
  </div>
);

export function Ring({ value, pace, size = 132 }: { value: number; pace: number; size?: number }) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, a = (pace / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(value)}% complete`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-primary)" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-blue)" strokeWidth={10} strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <circle cx={size / 2 + Math.cos(a) * r} cy={size / 2 + Math.sin(a) * r} r={4} fill="var(--text-primary)" opacity={0.55}>
        <title>Expected by today: {Math.round(pace)}%</title>
      </circle>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" style={{ font: '800 28px var(--font-family)' }}>{Math.round(value)}%</text>
    </svg>
  );
}

export const Avatar = ({ p, size = 28, ring }: { p: PersonBrief | null; size?: number; ring?: boolean }) => {
  const cls = cn('rounded-full shrink-0', ring && 'ring-2 ring-[var(--bg-secondary)]');
  if (!p) return <span title="No HOD yet" style={{ width: size, height: size }} className={cn(cls, 'bg-[var(--bg-primary)] text-text-secondary inline-flex items-center justify-center text-[10px] font-bold')}>?</span>;
  // eslint-disable-next-line @next/next/no-img-element
  if (p.avatar) return <img src={p.avatar} alt={p.name} title={p.name} style={{ width: size, height: size }} className={cn(cls, 'object-cover')} />;
  const initials = p.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  return <span title={p.name} style={{ width: size, height: size, fontSize: size * 0.38 }} className={cn(cls, 'bg-accent-blue/15 text-accent-blue inline-flex items-center justify-center font-bold')}>{initials}</span>;
};

/** White card, like the design. The app's own surface colour is almost the page colour. */
export const Panel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('bg-background-secondary border border-border-subtle rounded-2xl', className)}>{children}</div>
);

export function QuarterPills({ quarter }: { quarter: QuarterInfo }) {
  const { day, total } = quarterDay(quarter);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 border border-border-subtle bg-background-secondary rounded-full px-3 py-1 text-[12.5px] font-semibold text-text-primary">
        <span className="w-[7px] h-[7px] rounded-full bg-accent-green" />{quarter.label}
      </span>
      {quarter.status === 'current' && (
        <span className="inline-flex border border-border-subtle bg-background-secondary rounded-full px-3 py-1 text-[12px] font-mono text-text-secondary">day {day} of {total}</span>
      )}
    </div>
  );
}

export function DeptCard({ d, quarter }: { d: OverviewDepartment; quarter: QuarterInfo }) {
  const h = deptHealth(d.health);
  const order: Health[] = ['off', 'risk', 'on', 'done'];
  return (
    <Link href={`/departments?id=${d.id}`}
      className="bg-background-secondary border border-border-subtle rounded-2xl p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:border-border-active transition-all normal-case">
      <div className="flex items-center gap-2.5">
        <Avatar p={d.hod} size={30} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-extrabold text-text-primary leading-tight truncate">{d.name}</div>
          <div className="text-[12.5px] text-text-secondary truncate">{d.hod ? `${d.hod.name} · HOD` : 'No HOD yet'}</div>
        </div>
        <span className="text-[22px] font-extrabold text-text-primary">{d.progress === null ? '—' : `${Math.round(d.progress)}%`}</span>
      </div>
      {d.progress !== null && <PaceBar value={d.progress} h={h} pace={quarter.status === 'current' ? quarterPace(quarter) : undefined} />}
      <div className="text-[13px] text-text-secondary line-clamp-2 border-l-2 border-border-subtle pl-2.5">
        {d.message ? d.message.split('\n')[0] : `No ${quarter.short} target from the Director yet.`}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {d.new_for_me && <span className="text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 bg-accent-blue text-white">New target</span>}
        {order.filter(k => d.health?.[k]).map(k => <HealthChip key={k} h={k}>{d.health[k]} {HEALTH_LABEL[k].toLowerCase()}</HealthChip>)}
        {!d.objectives && <span className="text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 bg-[var(--bg-primary)] text-text-secondary">No objectives yet</span>}
      </div>
      <div className="flex items-center justify-between text-[12px] text-text-secondary">
        <span className="flex">{d.members.slice(0, 6).map((m, i) => <span key={m.id} className={cn(i && '-ml-1.5')}><Avatar p={m} size={22} ring /></span>)}</span>
        <span>{d.members.length} {d.members.length === 1 ? 'member' : 'members'}</span>
      </div>
    </Link>
  );
}
