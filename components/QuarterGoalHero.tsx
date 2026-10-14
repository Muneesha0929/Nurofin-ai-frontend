'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Pencil, Bell, ArrowRight, Target } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService, QuarterOverview } from '@/services/departmentTargets';
import { Panel, Ring, quarterDay, quarterPace } from '@/components/targets/ui';

export const ProgressBar = ({ value, className }: { value: number | null; className?: string }) => (
  <div className={cn('h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden', className)}>
    <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
  </div>
);

/** HOD only: one banner per department whose Director target changed since they last opened it. */
export function NewTargetBanners({ data }: { data: QuarterOverview }) {
  return (
    <>
      {data.new_targets_for_me.map(t => (
        <Link key={t.department_id} href={`/departments?id=${t.department_id}`}
          className="flex items-center gap-3 rounded-2xl border border-accent-blue/40 bg-accent-blue/10 px-4 py-3 hover:bg-accent-blue/15 transition-colors normal-case">
          <span className="w-8 h-8 rounded-xl bg-accent-blue text-white flex items-center justify-center shrink-0"><Bell size={15} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-bold text-text-primary">New {data.quarter.short} target from the Director for {t.department_name}</div>
            <div className="text-[12.5px] text-text-secondary">
              {t.objectives ? 'The target was updated. Check that your objectives still match it.' : 'Read it and set your department’s objectives.'}
            </div>
          </div>
          <span className="text-[12.5px] font-semibold text-accent-blue flex items-center gap-1 shrink-0">Open <ArrowRight size={13} /></span>
        </Link>
      ))}
    </>
  );
}

/** The quarter's one-line target in big type, with the progress ring. Same layout as the design. */
export function QuarterHero({ data, onChange }: { data: QuarterOverview; onChange: (headline: string | null) => void }) {
  const { quarter, headline, can_edit, departments, totals } = data;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { left } = quarterDay(quarter);
  const pace = quarterPace(quarter);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const r = await departmentTargetsService.setHeadline(quarter.fiscal_year, quarter.quarter_number, draft);
      onChange(r.headline);
      setEditing(false);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <Panel className="p-6 md:p-7 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-7 items-center normal-case">
      <div className="min-w-0">
        <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-text-secondary">{quarter.label} target · {quarter.range}</div>

        {editing ? (
          <div className="mt-3 flex flex-col gap-2">
            <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} rows={2}
              placeholder="One line the whole company works towards this quarter"
              className="w-full rounded-xl border border-border-subtle bg-background-primary px-3 py-2 text-2xl md:text-3xl font-extrabold text-text-primary outline-none focus:border-accent-blue" />
            {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save target'}</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">Cancel</button>
            </div>
          </div>
        ) : headline ? (
          <div className="mt-2 flex items-start gap-2 group">
            <h1 className="text-[30px] md:text-[44px] leading-[1.08] font-extrabold text-text-primary max-w-[24ch] text-balance">{headline}</h1>
            {can_edit && (
              <button onClick={() => { setDraft(headline); setEditing(true); }} aria-label="Edit quarter target"
                className="mt-2 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover opacity-60 group-hover:opacity-100"><Pencil size={15} /></button>
            )}
          </div>
        ) : can_edit ? (
          <button onClick={() => { setDraft(''); setEditing(true); }}
            className="mt-3 text-left text-2xl font-extrabold text-text-secondary hover:text-text-primary border-2 border-dashed border-border-subtle rounded-xl px-4 py-3 w-full">
            + Write the {quarter.short} target for the company
          </button>
        ) : (
          <div className="mt-2 text-xl font-bold text-text-secondary">The Director has not set the {quarter.short} target yet.</div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-text-secondary">
          <span><b className="text-text-primary">{left}</b> days left</span>
          <span><b className="text-text-primary">{departments.length}</b> departments</span>
          <span><b className="text-text-primary">{totals.objectives}</b> {totals.objectives === 1 ? 'objective' : 'objectives'}</span>
          <span><b className="text-text-primary">{totals.done}/{totals.items}</b> items done</span>
          {totals.overdue > 0 && <span className="text-accent-red font-semibold">{totals.overdue} overdue</span>}
        </div>
        {can_edit && (
          <Link href="/departments?view=targets" className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold hover:bg-accent-blue-hover">
            <Target size={13} /> Set quarter targets
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3.5">
        <Ring value={data.progress ?? 0} pace={pace} />
        <div className="text-[12.5px] text-text-secondary max-w-[15ch]">Average of all departments.<br />Dot = where we should be today ({Math.round(pace)}%).</div>
      </div>
    </Panel>
  );
}
