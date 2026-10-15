'use client';

import React, { useState } from 'react';
import { CalendarClock, Pencil, Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService as api, MonthlyTarget, MonthlyTargetInput, QuarterOverview, WidgetKind } from '@/services/departmentTargets';
import { PaceBar, Panel } from '@/components/targets/ui';
import { HoldToDelete } from '@/components/HoldToDelete';
import { fmtValue } from '@/components/targets/CompanyTargets';

const daysTo = (iso: string) => Math.round((new Date(iso + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const field = 'w-full rounded-lg border border-border-subtle bg-background-primary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-blue';

/**
 * Right side of the Overview: dated targets like "10 lakh transactions by 30 Nov".
 * Everyone sees them. The Director adds and edits; the responsible HOD updates the current value.
 */
export function MonthlyTargets({ data, onChange }: { data: QuarterOverview; onChange: () => void }) {
  const items = data.monthly_targets || [];
  const [form, setForm] = useState<{ id?: number; value: MonthlyTargetInput } | null>(null);
  const [quick, setQuick] = useState<{ id: number; value: string } | null>(null);
  const [error, setError] = useState('');
  const director = data.can_edit;

  const saveQuick = async () => {
    if (!quick) return;
    setError('');
    try { await api.updateMonthly(quick.id, { current: Number(quick.value) }); setQuick(null); onChange(); } catch (e: any) { setError(e.message); }
  };

  return (
    <Panel className="p-4 flex flex-col gap-3 normal-case h-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold text-text-primary flex items-center gap-1.5"><CalendarClock size={15} className="text-accent-blue" /> Monthly targets</h2>
        {director && (
          <button onClick={() => setForm({ value: { title: '', kind: 'number', unit: null, target: 0, current: 0, due_date: endOfMonth(), department_id: null, note: null } })}
            className="px-2.5 py-1 rounded-lg bg-accent-blue text-white text-[12px] font-semibold inline-flex items-center gap-1"><Plus size={12} /> Add</button>
        )}
      </div>
      {error && <div className="text-[12px] text-accent-red">{error}</div>}

      {items.length ? (
        <div className="flex flex-col">
          {items.map(m => {
            const d = daysTo(m.due_date);
            const done = m.progress >= 100;
            return (
              <div key={m.id} className="py-3 border-t border-border-subtle first:border-t-0 first:pt-0 flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-text-primary leading-snug">{m.title}</div>
                    <div className={cn('text-[12px]', m.overdue ? 'text-accent-red font-semibold' : 'text-text-secondary')}>
                      by {fmtDate(m.due_date)} · {done ? 'reached' : m.overdue ? `${-d} days late` : d === 0 ? 'due today' : `${d} days left`}
                      {m.department?.name ? ` · ${m.department.name}` : ''}
                    </div>
                  </div>
                  {director && (
                    <button aria-label={`Edit ${m.title}`} onClick={() => setForm({ id: m.id, value: { title: m.title, kind: m.kind, unit: m.unit, target: m.target, current: m.current, due_date: m.due_date, department_id: m.department?.id ?? null, note: m.note } })}
                      className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover"><Pencil size={13} /></button>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  {quick?.id === m.id ? (
                    <span className="flex items-center gap-1.5">
                      <input autoFocus type="number" step="any" value={quick.value} onChange={e => setQuick({ id: m.id, value: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') saveQuick(); if (e.key === 'Escape') setQuick(null); }}
                        aria-label="Current value" className="w-24 rounded-md border border-border-subtle bg-background-primary px-2 py-1 text-[13px] text-text-primary outline-none focus:border-accent-blue" />
                      <button onClick={saveQuick} className="text-[12px] font-semibold text-accent-blue">Save</button>
                      <button onClick={() => setQuick(null)} className="text-[12px] text-text-secondary">Cancel</button>
                    </span>
                  ) : (
                    <span className="text-[19px] font-extrabold text-text-primary">
                      {fmtValue(m, m.current)}{m.kind !== 'milestone' && <span className="text-[12.5px] font-medium text-text-secondary"> / {fmtValue(m, m.target)}</span>}
                    </span>
                  )}
                  {m.can_update && quick?.id !== m.id && (
                    <button onClick={() => setQuick({ id: m.id, value: String(m.current) })} className="text-[12px] font-semibold text-accent-blue shrink-0">Update</button>
                  )}
                </div>
                {m.kind !== 'milestone' && <PaceBar value={m.progress} h={done ? 'done' : m.overdue ? 'off' : null} />}
                {m.note && <div className="text-[12px] text-text-secondary">{m.note}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[13px] text-text-secondary">
          {director ? 'No dated targets yet. Add one, for example “10 lakh transactions by 30 Nov”.' : 'The Director has not set any monthly targets yet.'}
        </div>
      )}

      {form && <MonthlyForm initial={form.value} id={form.id} departments={data.departments.map(d => ({ id: d.id, name: d.name }))}
        onClose={() => setForm(null)} onSaved={() => { setForm(null); onChange(); }} />}
    </Panel>
  );
}

function endOfMonth() {
  const n = new Date(), e = new Date(n.getFullYear(), n.getMonth() + 1, 0);
  return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
}

const KINDS: [WidgetKind, string][] = [['number', 'Number'], ['money', 'Money (₹)'], ['percent', 'Percentage'], ['milestone', 'Done / not done']];

function MonthlyForm({ initial, id, departments, onClose, onSaved }: { initial: MonthlyTargetInput; id?: number; departments: { id: number; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof MonthlyTargetInput>(k: K, val: MonthlyTargetInput[K]) => setV({ ...v, [k]: val });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return setError('Give the target a title.');
    if (!v.due_date) return setError('Pick the date it should be reached by.');
    setBusy(true); setError('');
    const out = { ...v, title: v.title.trim(), unit: v.unit?.trim() || null, note: v.note?.trim() || null, ...(v.kind === 'milestone' ? { target: 1 } : {}) };
    try { if (id) await api.updateMonthly(id, out); else await api.createMonthly(out); onSaved(); } catch (err: any) { setError(err.message); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end normal-case" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md h-full bg-background-secondary border-l border-border-subtle flex flex-col text-text-primary">
        <div className="p-5 border-b border-border-subtle flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary">{id ? 'Edit monthly target' : 'New monthly target'}</div>
            <div className="text-lg font-extrabold mt-0.5">{v.title || 'e.g. 10 lakh transactions'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-hover"><X size={16} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">What</span>
            <input autoFocus value={v.title} onChange={e => set('title', e.target.value)} maxLength={200} placeholder="e.g. 15 lakh transactions per month" className={field} /></label>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">Type</span>
            <div className="flex flex-wrap gap-1.5">{KINDS.map(([k, l]) => (
              <button type="button" key={k} onClick={() => set('kind', k)} className={cn('px-2.5 py-1 rounded-full border text-[12px]', v.kind === k ? 'border-accent-blue bg-accent-blue/10 text-accent-blue font-semibold' : 'border-border-subtle text-text-primary')}>{l}</button>
            ))}</div></div>
          {v.kind === 'milestone' ? (
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={v.current >= 1} onChange={e => set('current', e.target.checked ? 1 : 0)} className="accent-[var(--accent-blue)]" /> Done</label>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">Now</span><input type="number" step="any" value={v.current} onChange={e => set('current', Number(e.target.value))} className={field} /></label>
              <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">Target</span><input type="number" step="any" value={v.target} onChange={e => set('target', Number(e.target.value))} className={field} /></label>
              {v.kind !== 'percent' && <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">Unit</span><input value={v.unit || ''} onChange={e => set('unit', e.target.value)} maxLength={30} placeholder={v.kind === 'money' ? 'Cr / L' : 'lakh txns'} className={field} /></label>}
            </div>
          )}
          <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">Reach it by</span>
            <input type="date" value={v.due_date} onChange={e => set('due_date', e.target.value)} className={field} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">Responsible department (its HOD can update the value)</span>
            <select value={v.department_id ?? ''} onChange={e => set('department_id', e.target.value ? Number(e.target.value) : null)} className={field}>
              <option value="">Whole company (only you update it)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></label>
          <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-text-secondary">Note (optional)</span>
            <textarea value={v.note || ''} onChange={e => set('note', e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Needs 4 more clients; BD to lead" className={field} /></label>
          {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
        </div>
        <div className="p-5 border-t border-border-subtle flex items-center gap-2">
          <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold disabled:opacity-60">{busy ? 'Saving…' : id ? 'Save' : 'Add target'}</button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">Cancel</button>
          {id && <span className="ml-auto"><HoldToDelete label="Hold to delete" onConfirm={async () => { await api.deleteMonthly(id); onSaved(); }} /></span>}
        </div>
      </form>
    </div>
  );
}
