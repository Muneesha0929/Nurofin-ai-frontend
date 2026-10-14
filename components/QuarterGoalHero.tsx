'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target, Pencil, Bell, ArrowRight, Building2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService, QuarterOverview } from '@/services/departmentTargets';

const daysLeft = (end: string) => Math.max(0, Math.ceil((new Date(end + 'T23:59:59').getTime() - Date.now()) / 86400000));

export const ProgressBar = ({ value, className }: { value: number | null; className?: string }) => (
  <div className={cn('h-1.5 rounded-full bg-surface-hover overflow-hidden', className)}>
    <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
  </div>
);

/**
 * Top of the Overview: the quarter's one-line company target in big type, the HOD's
 * "new target" banner, and one small card per department. Renders nothing if the
 * department-targets API is unavailable, so the rest of the dashboard is unaffected.
 */
export function QuarterGoalHero() {
  const [data, setData] = useState<QuarterOverview | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    departmentTargetsService.overview().then(d => alive && setData(d)).catch(() => alive && setData(null));
    return () => { alive = false; };
  }, []);

  if (!data) return null;
  const { quarter, headline, can_edit, departments, totals } = data;

  const save = async () => {
    setSaving(true); setError('');
    try {
      const r = await departmentTargetsService.setHeadline(quarter.fiscal_year, quarter.quarter_number, draft);
      setData({ ...data, headline: r.headline });
      setEditing(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // normal-case: the app capitalises every word globally; targets must read exactly as written
  return (
    <div className="flex flex-col gap-4 normal-case">
      {data.new_targets_for_me.map(t => (
        <Link key={t.department_id} href={`/departments?id=${t.department_id}`}
          className="flex items-center gap-3 rounded-2xl border border-accent-blue/40 bg-accent-blue/10 px-4 py-3 hover:bg-accent-blue/15 transition-colors">
          <span className="w-8 h-8 rounded-xl bg-accent-blue text-white flex items-center justify-center shrink-0"><Bell size={15} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-text-primary">New {quarter.short} target from the Director for {t.department_name}</div>
            <div className="text-[12px] text-text-muted">
              {t.objectives ? 'The target was updated. Check that your objectives still match it.' : 'Read it and set your department’s objectives.'}
            </div>
          </div>
          <span className="text-[12px] font-semibold text-accent-blue flex items-center gap-1 shrink-0">Open <ArrowRight size={13} /></span>
        </Link>
      ))}

      <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 md:p-6 flex flex-col lg:flex-row gap-6 lg:items-center">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted flex items-center gap-2">
            <Target size={13} className="text-accent-blue" /> {quarter.label} target · {quarter.range}
          </div>

          {editing ? (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="One line the whole company works towards this quarter"
                className="w-full rounded-xl border border-border-subtle bg-background-primary px-3 py-2 text-xl md:text-2xl font-extrabold text-text-primary outline-none focus:border-accent-blue"
              />
              {error && <div className="text-[12px] text-accent-red">{error}</div>}
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12px] font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save target'}</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-muted hover:bg-surface-hover">Cancel</button>
              </div>
            </div>
          ) : headline ? (
            <div className="mt-2 flex items-start gap-2 group">
              <h2 className="text-2xl md:text-[34px] leading-tight font-extrabold text-text-primary text-balance">{headline}</h2>
              {can_edit && (
                <button onClick={() => { setDraft(headline); setEditing(true); }} aria-label="Edit quarter target"
                  className="mt-1 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover opacity-60 group-hover:opacity-100"><Pencil size={14} /></button>
              )}
            </div>
          ) : can_edit ? (
            <button onClick={() => { setDraft(''); setEditing(true); }}
              className="mt-3 text-left text-xl md:text-2xl font-extrabold text-text-muted hover:text-text-primary border-2 border-dashed border-border-subtle rounded-xl px-4 py-3 w-full">
              + Write the {quarter.short} target for the company
            </button>
          ) : (
            <div className="mt-2 text-lg font-bold text-text-muted">The Director has not set the {quarter.short} target yet.</div>
          )}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-text-muted">
            <span><b className="text-text-primary">{daysLeft(quarter.end)}</b> days left</span>
            <span><b className="text-text-primary">{departments.length}</b> departments</span>
            <span><b className="text-text-primary">{totals.objectives}</b> {totals.objectives === 1 ? 'objective' : 'objectives'}</span>
            {totals.items > 0 && <span><b className="text-text-primary">{totals.done}/{totals.items}</b> done</span>}
            {totals.overdue > 0 && <span className="text-accent-red font-semibold">{totals.overdue} overdue</span>}
          </div>
        </div>

        {data.progress !== null && (
          <div className="lg:w-56 shrink-0">
            <div className="flex items-baseline justify-between">
              <span className="text-[11.5px] font-semibold text-text-muted">Overall progress</span>
              <span className="text-2xl font-extrabold text-text-primary">{Math.round(data.progress)}%</span>
            </div>
            <ProgressBar value={data.progress} className="mt-2 h-2" />
            <div className="text-[11px] text-text-muted mt-1.5">Average of all departments</div>
          </div>
        )}
      </div>

      {departments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {departments.map(d => (
            <Link key={d.id} href={`/departments?id=${d.id}`}
              className="bg-surface-card border border-border-subtle rounded-2xl p-4 flex flex-col gap-2.5 hover:-translate-y-0.5 hover:shadow-lg hover:border-border-active transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-bold text-text-primary truncate">{d.name}</span>
                <span className="text-[15px] font-extrabold text-text-primary">{d.progress === null ? '—' : `${Math.round(d.progress)}%`}</span>
              </div>
              <ProgressBar value={d.progress} />
              <div className="text-[12px] text-text-muted line-clamp-2 min-h-[2.4em]">
                {d.message ? d.message.split('\n')[0] : `No ${quarter.short} target yet`}
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-text-muted">
                <span className="truncate">{d.hod ? d.hod.name : 'No HOD yet'}</span>
                <span className={cn(d.overdue > 0 && 'text-accent-red font-semibold')}>
                  {d.overdue > 0 ? `${d.overdue} overdue` : `${d.objectives} ${d.objectives === 1 ? 'objective' : 'objectives'}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : can_edit ? (
        <Link href="/departments" className="flex items-center gap-3 rounded-2xl border border-dashed border-border-subtle px-4 py-3 text-[13px] text-text-muted hover:text-text-primary hover:border-border-active">
          <Building2 size={16} /> No departments yet. Create the first one and write its {quarter.short} target.
        </Link>
      ) : null}
    </div>
  );
}
