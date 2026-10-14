'use client';

import React, { useEffect, useState } from 'react';
import { GripVertical, Pencil, Plus, Copy, X, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CompanyWidget, departmentTargetsService as api, QuarterOverview, WidgetInput, WidgetKind } from '@/services/departmentTargets';
import { PaceBar, Panel, quarterPace } from '@/components/targets/ui';
import { HoldToDelete } from '@/components/HoldToDelete';

const KINDS: { value: WidgetKind; label: string; hint: string }[] = [
  { value: 'number', label: 'Number', hint: 'e.g. merchants live, leads, hires' },
  { value: 'money', label: 'Money (₹)', hint: 'e.g. payout volume, revenue' },
  { value: 'percent', label: 'Percentage', hint: 'e.g. satisfaction, uptime' },
  { value: 'milestone', label: 'Done / not done', hint: 'e.g. a launch or a licence' },
];

// Starting points sir can pick and then adjust.
const TEMPLATES: (Partial<WidgetInput> & { title: string })[] = [
  { title: 'Monthly payout volume', kind: 'money', unit: 'Cr' },
  { title: 'Merchants live', kind: 'number', unit: 'merchants' },
  { title: 'Revenue', kind: 'money', unit: 'L' },
  { title: 'Customer satisfaction', kind: 'percent' },
  { title: 'Open audit findings', kind: 'number', lower_is_better: true },
  { title: 'Product launch', kind: 'milestone' },
];

const blank = (t?: Partial<WidgetInput>): WidgetInput => ({
  title: '', kind: 'number', unit: null, base: 0, current: 0, target: 0, lower_is_better: false, note: null, department_id: null, ...t,
});

const num = (v: number) => (Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
export function fmtValue(w: Pick<CompanyWidget, 'kind' | 'unit'>, v: number) {
  if (w.kind === 'money') return `₹${num(v)}${w.unit ? ' ' + w.unit : ''}`;
  if (w.kind === 'percent') return `${num(v)}%`;
  if (w.kind === 'milestone') return v >= 1 ? 'Done' : 'Not done';
  return `${num(v)}${w.unit ? ' ' + w.unit : ''}`;
}

/** "Company targets for Q3": cards T1, T2 … that the Director adds, edits and drags into order. */
export function CompanyTargets({ data, onChange }: { data: QuarterOverview; onChange: () => void }) {
  const { quarter, can_edit } = data;
  const [widgets, setWidgets] = useState<CompanyWidget[]>(data.widgets || []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ id?: number; value: WidgetInput } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const pace = quarterPace(quarter);

  useEffect(() => setWidgets(data.widgets || []), [data.widgets]);

  if (!widgets.length && !can_edit) return null;

  const reorder = async (fromId: number | null, overId: number) => {
    if (fromId === null || fromId === overId) return;
    const ids = widgets.map(w => w.id);
    const from = ids.indexOf(fromId), to = ids.indexOf(overId);
    ids.splice(to, 0, ...ids.splice(from, 1));
    const next = ids.map(id => widgets.find(w => w.id === id)!);
    setWidgets(next); setDragId(null);
    try { await api.reorderWidgets(ids); } catch (e: any) { setError(e.message); onChange(); }
  };
  const move = (id: number, dir: -1 | 1) => {
    const i = widgets.findIndex(w => w.id === id), j = i + dir;
    if (j < 0 || j >= widgets.length) return;
    reorder(id, widgets[j].id);
  };

  const copyLastQuarter = async () => {
    setError('');
    // Q1 follows Q4 of the previous financial year
    const from = quarter.quarter_number === 1 ? { fy: quarter.fiscal_year - 1, q: 4 } : { fy: quarter.fiscal_year, q: quarter.quarter_number - 1 };
    try {
      const old = await api.overview(from.fy, from.q);
      if (!old.widgets?.length) { setError('Last quarter has no company targets to copy.'); return; }
      for (const w of old.widgets) {
        await api.createWidget(quarter.fiscal_year, quarter.quarter_number, {
          title: w.title, kind: w.kind, unit: w.unit, base: w.current, current: w.current, target: w.target,
          lower_is_better: w.lower_is_better, note: w.note, department_id: w.department?.id ?? null,
        });
      }
      onChange();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <section className="normal-case">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-[18px] font-extrabold text-text-primary">Company targets for {quarter.short}</h2>
        {can_edit && (
          <div className="flex flex-wrap gap-2">
            {editing && <button onClick={copyLastQuarter} className="px-3 py-1.5 rounded-lg border border-border-subtle bg-background-secondary text-[12.5px] font-semibold text-text-primary inline-flex items-center gap-1.5 hover:border-border-active"><Copy size={13} /> Copy from last quarter</button>}
            {editing && <button onClick={() => setForm({ value: blank() })} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus size={13} /> Add widget</button>}
            <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 rounded-lg border border-border-subtle bg-background-secondary text-[12.5px] font-semibold text-text-primary inline-flex items-center gap-1.5 hover:border-border-active">
              {editing ? <><Check size={13} /> Done</> : <><Pencil size={13} /> Customize</>}
            </button>
          </div>
        )}
      </div>
      {editing && <div className="text-[12.5px] text-text-secondary mb-3">Drag cards to reorder (or use the arrows). Click a card to edit it. Hold the delete button to remove one.</div>}
      {error && <div className="text-[12.5px] text-accent-red mb-2">{error}</div>}

      {widgets.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {widgets.map((w, i) => {
            const behind = w.kind !== 'milestone' && w.progress < pace - 15;
            return (
              <div key={w.id}
                draggable={editing}
                onDragStart={() => setDragId(w.id)}
                onDragOver={e => editing && e.preventDefault()}
                onDrop={() => reorder(dragId, w.id)}
                onDragEnd={() => setDragId(null)}
                onClick={() => editing && setForm({ id: w.id, value: { title: w.title, kind: w.kind, unit: w.unit, base: w.base, current: w.current, target: w.target, lower_is_better: w.lower_is_better, note: w.note, department_id: w.department?.id ?? null } })}
                className={cn('bg-background-secondary border rounded-2xl p-4 flex flex-col gap-2.5 transition-all',
                  editing ? 'cursor-grab border-dashed border-border-active hover:shadow-md' : 'border-border-subtle',
                  dragId === w.id && 'opacity-40')}>
                <div className="flex items-center gap-2">
                  {editing && <GripVertical size={14} className="text-text-secondary shrink-0" />}
                  <span className="font-mono text-[11px] text-accent-blue bg-accent-blue/10 rounded px-1.5 py-px">T{i + 1}</span>
                  {w.department?.name && <span className="text-[11.5px] text-text-secondary truncate">{w.department.name}</span>}
                  {editing && (
                    <span className="ml-auto flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <button aria-label="Move left" onClick={() => move(w.id, -1)} disabled={i === 0} className="px-1 text-text-secondary hover:text-text-primary disabled:opacity-30">‹</button>
                      <button aria-label="Move right" onClick={() => move(w.id, 1)} disabled={i === widgets.length - 1} className="px-1 text-text-secondary hover:text-text-primary disabled:opacity-30">›</button>
                    </span>
                  )}
                </div>
                <div className="text-[13.5px] font-semibold text-text-primary leading-snug">{w.title}</div>
                {w.kind === 'milestone' ? (
                  <div className={cn('text-[24px] font-extrabold', w.current >= 1 ? 'text-accent-green' : 'text-text-primary')}>{fmtValue(w, w.current)}</div>
                ) : (
                  <div className="text-[26px] font-extrabold leading-none text-text-primary">
                    {fmtValue(w, w.current)}<span className="text-[13px] font-medium text-text-secondary"> / {fmtValue(w, w.target)}{w.lower_is_better ? ' (lower is better)' : ''}</span>
                  </div>
                )}
                <PaceBar value={w.progress} h={w.progress >= 100 ? 'done' : behind ? 'risk' : null} pace={quarter.status === 'current' && w.kind !== 'milestone' ? pace : undefined} />
                <div className="flex justify-between text-[12px] text-text-secondary">
                  <span>{w.kind === 'milestone' ? (w.current >= 1 ? 'Completed' : 'Not yet') : `${Math.round(w.progress)}% of the way`}</span>
                  {editing && <span onClick={e => e.stopPropagation()}><HoldToDelete compact label={`Delete ${w.title}`} onConfirm={async () => { await api.deleteWidget(w.id); setWidgets(widgets.filter(x => x.id !== w.id)); }} /></span>}
                </div>
                {w.note && !editing && <div className="text-[12px] text-text-secondary line-clamp-2">{w.note}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <Panel className="p-6 text-[13.5px] text-text-secondary flex flex-wrap items-center gap-3">
          No company targets for {quarter.short} yet.
          {!editing && <button onClick={() => { setEditing(true); setForm({ value: blank() }); }} className="text-accent-blue font-semibold">Add the first one</button>}
        </Panel>
      )}

      {form && (
        <WidgetForm
          initial={form.value}
          isNew={!form.id}
          departments={data.departments.map(d => ({ id: d.id, name: d.name }))}
          onClose={() => setForm(null)}
          onSave={async v => {
            if (form.id) await api.updateWidget(form.id, v); else await api.createWidget(quarter.fiscal_year, quarter.quarter_number, v);
            setForm(null); onChange();
          }}
        />
      )}
    </section>
  );
}

const field = 'w-full rounded-lg border border-border-subtle bg-background-primary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-blue';

function WidgetForm({ initial, isNew, departments, onClose, onSave }: {
  initial: WidgetInput; isNew: boolean; departments: { id: number; name: string }[]; onClose: () => void; onSave: (v: WidgetInput) => Promise<void>;
}) {
  const [v, setV] = useState<WidgetInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof WidgetInput>(k: K, val: WidgetInput[K]) => setV({ ...v, [k]: val });
  const numIn = (k: 'base' | 'current' | 'target', label: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-text-secondary">{label}</span>
      <input type="number" step="any" value={Number.isFinite(v[k]) ? v[k] : 0} onChange={e => set(k, Number(e.target.value))} className={field} />
    </label>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return setError('Give the widget a title.');
    setBusy(true); setError('');
    const out = v.kind === 'milestone' ? { ...v, base: 0, target: 1, unit: null, lower_is_better: false } : v;
    try { await onSave({ ...out, title: v.title.trim(), unit: out.unit?.trim() || null, note: out.note?.trim() || null }); } catch (err: any) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end normal-case" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md h-full bg-background-secondary border-l border-border-subtle flex flex-col text-text-primary">
        <div className="p-5 border-b border-border-subtle flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary">{isNew ? 'New company target' : 'Edit company target'}</div>
            <div className="text-lg font-extrabold mt-0.5">{v.title || 'Untitled widget'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-hover"><X size={16} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {isNew && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-secondary">Start from a template (optional)</span>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map(t => (
                  <button type="button" key={t.title} onClick={() => setV(blank({ ...t, department_id: v.department_id }))}
                    className="px-2.5 py-1 rounded-full border border-border-subtle text-[12px] text-text-primary hover:border-accent-blue">{t.title}</button>
                ))}
              </div>
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Title</span>
            <input autoFocus value={v.title} onChange={e => set('title', e.target.value)} maxLength={200} placeholder="e.g. Monthly payout volume" className={field} />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Type</span>
            <div className="grid grid-cols-2 gap-1.5">
              {KINDS.map(k => (
                <button type="button" key={k.value} onClick={() => set('kind', k.value)}
                  className={cn('text-left rounded-lg border px-3 py-2', v.kind === k.value ? 'border-accent-blue bg-accent-blue/10' : 'border-border-subtle hover:border-border-active')}>
                  <span className="block text-[13px] font-semibold">{k.label}</span><span className="block text-[11.5px] text-text-secondary">{k.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {v.kind === 'milestone' ? (
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={v.current >= 1} onChange={e => set('current', e.target.checked ? 1 : 0)} className="accent-[var(--accent-blue)]" /> Done
            </label>
          ) : (
            <>
              {v.kind !== 'percent' && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-secondary">Unit {v.kind === 'money' ? '(Cr, L, K, or leave empty for ₹)' : '(optional, e.g. merchants)'}</span>
                  {v.kind === 'money' ? (
                    <select value={v.unit || ''} onChange={e => set('unit', e.target.value || null)} className={field}>
                      <option value="Cr">₹ Crore (Cr)</option><option value="L">₹ Lakh (L)</option><option value="K">₹ Thousand (K)</option><option value="">₹ (plain)</option>
                    </select>
                  ) : <input value={v.unit || ''} onChange={e => set('unit', e.target.value)} maxLength={30} className={field} />}
                </label>
              )}
              <div className="grid grid-cols-3 gap-2">{numIn('base', 'Start of quarter')}{numIn('current', 'Now')}{numIn('target', 'Target')}</div>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={v.lower_is_better} onChange={e => set('lower_is_better', e.target.checked)} className="accent-[var(--accent-blue)]" /> Lower is better (e.g. open findings, failure rate)
              </label>
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Owned by (optional)</span>
            <select value={v.department_id ?? ''} onChange={e => set('department_id', e.target.value ? Number(e.target.value) : null)} className={field}>
              <option value="">Whole company</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Note (optional)</span>
            <textarea value={v.note || ''} onChange={e => set('note', e.target.value)} rows={3} maxLength={1000} className={field} />
          </label>
          {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
        </div>
        <div className="p-5 border-t border-border-subtle flex gap-2">
          <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold disabled:opacity-60">{busy ? 'Saving…' : isNew ? 'Add widget' : 'Save'}</button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">Cancel</button>
        </div>
      </form>
    </div>
  );
}
