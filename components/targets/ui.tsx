'use client';

// Building blocks copied from the approved Chief of Staff design (design/chief-of-staff.html),
// so the Overview, Departments and Deadlines pages look like the prototype.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Health, OverviewDepartment, PersonBrief, QuarterInfo } from '@/services/departmentTargets';
import type { Priority } from '@/services/timeline';

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
  const allMembers = [
    ...(d.hod ? [d.hod] : []),
    ...d.members.filter(m => !d.hod || m.id !== d.hod.id),
  ];
  return (
    <Link
      href={`/departments?id=${d.id}`}
      className="bg-background-secondary border border-border-subtle rounded-2xl p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:border-border-active transition-all normal-case"
    >
      {/* 1. Department Name & Progress Status */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[15px] font-extrabold text-text-primary leading-tight truncate">{d.name}</span>
          {d.short_code && (
            <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue shrink-0">
              ##{d.short_code}
            </span>
          )}
        </div>
        <span className="text-[18px] font-extrabold text-text-primary shrink-0">
          {d.progress === null ? '—' : `${Math.round(d.progress)}%`}
        </span>
      </div>

      <PaceBar
        value={d.progress ?? 0}
        h={d.progress === null ? null : h}
        pace={quarter.status === 'current' ? quarterPace(quarter) : undefined}
      />

      {/* 2. Members List & Profiles */}
      <div className="flex items-center justify-between gap-2 pt-1 text-[12px] text-text-secondary">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex shrink-0">
            {allMembers.slice(0, 6).map((m, i) => (
              <span key={m.id} className={cn(i > 0 && '-ml-1.5')}>
                <Avatar p={m} size={24} ring />
              </span>
            ))}
          </span>
          <span className="truncate text-[11.5px] font-medium text-text-secondary">
            {allMembers.length > 0
              ? allMembers.slice(0, 3).map(m => m.name.split(' ')[0]).join(', ') +
                (allMembers.length > 3 ? ` +${allMembers.length - 3}` : '')
              : 'No members yet'}
          </span>
        </div>
        <span className="shrink-0 text-[11px] font-semibold">
          {allMembers.length} {allMembers.length === 1 ? 'member' : 'members'}
        </span>
      </div>
    </Link>
  );
}


/* ============================================================ codes, priorities, status in place, deep links */

/** The department's code prefix: the explicit short code, else the initials of its name (the backend does the same). */
export const deptPrefix = (d?: { short_code?: string | null; name?: string | null } | null) =>
  ((d?.short_code || '').replace(/^#+/, '') || (d?.name || '').split(/\s+/).map(w => w[0]).join('').slice(0, 4) || 'DEPT').toUpperCase();

/** full_code from the API; if the backend is older, build it from the department prefix + the bare path ("1.2"). */
export const codeOf = (item: { full_code?: string | null; code?: string | null }, prefix: string, fallbackPath?: string) =>
  item.full_code || (item.code ? `${prefix}-${item.code}` : fallbackPath ? `${prefix}-${fallbackPath}` : '');

/** A thin red bar on the left of P1 rows. Not a loud background. */
export const p1Accent = (p?: Priority | null) => (p === 'P1' ? 'shadow-[inset_3px_0_0_var(--accent-red)]' : '');

export const PRIORITY_RANK: Record<string, number> = { P1: 0, P2: 1, P3: 2 };
/** P1 > P2 > P3 > none. Stable, so the existing order is kept within a priority. */
export const sortByPriority = <T extends { priority?: Priority | null }>(list: T[]): T[] =>
  list.map((x, i) => [x, i] as const)
    .sort((a, b) => (PRIORITY_RANK[a[0].priority || ''] ?? 9) - (PRIORITY_RANK[b[0].priority || ''] ?? 9) || a[1] - b[1])
    .map(x => x[0]);

/** Keep a local copy of a server value so a change shows at once; it follows the server value again after a reload. */
export function useOptimistic<T>(server: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(server);
  useEffect(() => setV(server), [server]);
  return [v, setV];
}

export const OBJECTIVE_STATUS_OPTIONS = [
  { value: 'not_started', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];
export const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'In review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Done' },
];
const statusTone = (v: string) =>
  v === 'done' || v === 'completed' ? 'text-accent-green bg-accent-green/10'
    : v === 'in_progress' ? 'text-accent-blue bg-accent-blue/10'
    : v === 'review' || v === 'blocked' ? 'text-accent-orange bg-accent-orange/10'
    : 'text-text-secondary bg-[var(--bg-primary)]';

/**
 * Compact status pill that is also the control: change it right in the row.
 * Updates at once; if the server refuses, it goes back and `onError` gets the server's message.
 * Without `canEdit` it is a plain pill.
 */
export function StatusSelect({ value, options, canEdit, onSave, onError, label = 'Status', className }: {
  value: string; options: { value: string; label: string }[]; canEdit: boolean;
  onSave: (next: string) => Promise<unknown>; onError?: (msg: string) => void; label?: string; className?: string;
}) {
  const [local, setLocal] = useOptimistic(value);
  const [busy, setBusy] = useState(false);
  const current = options.find(o => o.value === local) || options.find(o => o.value === (local === 'done' ? 'completed' : local)) || options[0];
  const pill = cn('normal-case inline-flex items-center rounded-full text-[11.5px] font-semibold whitespace-nowrap', statusTone(local), className);
  if (!canEdit) return <span className={cn(pill, 'px-2.5 py-0.5')}>{current.label}</span>;
  return (
    <span className={cn(pill, 'relative', busy && 'opacity-60')} onClick={e => e.stopPropagation()}>
      <select
        aria-label={label}
        value={current.value}
        disabled={busy}
        onChange={async e => {
          const prev = local, next = e.target.value;
          if (next === prev) return;
          setLocal(next); setBusy(true); onError?.('');
          try { await onSave(next); }
          catch (err: any) { setLocal(prev); onError?.(err?.message || 'Could not change the status.'); }
          finally { setBusy(false); }
        }}
        className="appearance-none bg-transparent text-inherit font-semibold cursor-pointer pl-2.5 pr-5 py-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 normal-case"
      >
        {options.map(o => <option key={o.value} value={o.value} className="text-text-primary bg-background-secondary">{o.label}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
    </span>
  );
}

/** Scroll to an element, flash a ring for ~2 s. Waits briefly for it to render. Returns a cancel function. */
export function scrollAndFlash(elId: string, tries = 25): () => void {
  let stop = false;
  const attempt = (n: number) => {
    if (stop) return;
    const el = typeof document !== 'undefined' ? document.getElementById(elId) : null;
    if (!el) { if (n > 0) setTimeout(() => attempt(n - 1), 120); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const cls = ['ring-2', 'ring-accent-blue', 'ring-offset-2', 'ring-offset-[var(--bg-secondary)]', 'bg-accent-blue/10', 'transition-shadow'];
    el.classList.add(...cls);
    setTimeout(() => el.classList.remove(...cls), 2000);
  };
  attempt(tries);
  return () => { stop = true; };
}
