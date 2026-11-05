'use client';

// The parts of a feature added on 4 Nov: which products it touches, screenshots and supporting
// documents, the cost and profit estimate, and replies under each idea in the brainstorm.
import React, { useEffect, useRef, useState } from 'react';
import { FileText, ImagePlus, MessageCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/targets/ui';
import { CostLine, FeatureAttachment, FeatureDetail, FeatureSolution, MoneyTotals, productFeaturesService as api } from '@/services/productFeatures';

const input = 'w-full rounded-lg border border-border-subtle bg-background-secondary px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-accent-blue';
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50';
const primary = cn(btn, 'bg-accent-blue text-white hover:bg-accent-blue-hover');
const ghost = cn(btn, 'border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-hover');

export const rupees = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export function short(n: number) {
  const s = n < 0 ? '−' : ''; n = Math.abs(n);
  if (n >= 1e7) return `${s}₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `${s}₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')} L`;
  if (n >= 1e3) return `${s}₹${Math.round(n / 1e3)}k`;
  return s + rupees(n);
}
const parseAmount = (v: string) => {
  const t = v.replace(/[,₹\s]/g, '').toLowerCase();
  if (!t) return NaN;
  const m = t.match(/^(\d+(?:\.\d+)?)(cr|l|k)?$/);
  if (!m) return NaN;
  return +m[1] * (m[2] === 'cr' ? 1e7 : m[2] === 'l' ? 1e5 : m[2] === 'k' ? 1e3 : 1);
};

/* ------------------------------------------------------------ products */

export function ProductTags({ f, onChanged }: { f: FeatureDetail; onChanged: (f: FeatureDetail) => void }) {
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState<number[]>(f.products.map(p => p.id));
  const [all, setAll] = useState(f.all_products);
  const [adding, setAdding] = useState('');
  const [error, setError] = useState('');
  const canEdit = !!f.permissions.can_cost;
  const save = async () => {
    setError('');
    try { onChanged(await api.setProducts(f.id, pick)); setEditing(false); } catch (e: any) { setError(e.message); }
  };
  const addProduct = async () => {
    if (!adding.trim()) return;
    try { const list = await api.addProduct(adding.trim()); setAll(list); const n = list.find(p => p.name.toLowerCase() === adding.trim().toLowerCase()); if (n) setPick(p => [...p, n.id]); setAdding(''); }
    catch (e: any) { setError(e.message); }
  };
  if (!editing) return (
    <div className="flex flex-wrap items-center gap-1.5">
      {f.products.length ? f.products.map(p => <span key={p.id} className="text-[12px] font-semibold rounded-full px-2.5 py-0.5 bg-accent-blue/10 text-accent-blue">{p.name}</span>)
        : <span className="text-[13px] text-text-secondary">Not tagged to a product yet.</span>}
      {canEdit && <button onClick={() => { setPick(f.products.map(p => p.id)); setEditing(true); }} className="text-[12px] font-semibold text-accent-blue hover:underline ml-1">{f.products.length ? 'Change' : 'Tag products'}</button>}
    </div>
  );
  return (
    <div className="rounded-xl border border-border-subtle p-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {all.map(p => {
          const on = pick.includes(p.id);
          return <button key={p.id} onClick={() => setPick(on ? pick.filter(x => x !== p.id) : [...pick, p.id])} aria-pressed={on}
            className={cn('text-[12.5px] font-semibold rounded-full px-3 py-1 border', on ? 'bg-accent-blue text-white border-accent-blue' : 'border-border-subtle text-text-secondary hover:text-text-primary')}>{p.name}</button>;
        })}
      </div>
      <div className="flex gap-2">
        <input className={input} value={adding} onChange={e => setAdding(e.target.value)} placeholder="Another product (Director or HOD)" onKeyDown={e => e.key === 'Enter' && addProduct()} />
        <button onClick={addProduct} disabled={!adding.trim()} className={ghost}><Plus size={14} />Add</button>
      </div>
      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
      <div className="flex justify-end gap-2"><button onClick={() => setEditing(false)} className={ghost}>Cancel</button><button onClick={save} className={primary}>Save</button></div>
    </div>
  );
}

/* ------------------------------------------------------------ screenshots and documents */

function Thumb({ f, a, onOpen }: { f: FeatureDetail; a: FeatureAttachment; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let gone = false, made: string | null = null;
    if (a.is_image) api.attachmentUrl(f.id, a.id).then(u => { made = u; if (!gone) setUrl(u); }).catch(() => {});
    return () => { gone = true; if (made) URL.revokeObjectURL(made); };
  }, [f.id, a.id, a.is_image]);
  const open = async () => { try { const u = url || await api.attachmentUrl(f.id, a.id); onOpen(u); } catch { /* shown as unavailable */ } };
  return a.is_image ? (
    <button onClick={open} title={a.filename} className="block w-full aspect-[4/3] rounded-lg overflow-hidden border border-border-subtle bg-[var(--bg-primary)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt={a.filename} className="w-full h-full object-cover" /> : <span className="text-[11px] text-text-secondary">Loading…</span>}
    </button>
  ) : (
    <button onClick={open} title={a.filename} className="flex items-center gap-2 w-full rounded-lg border border-border-subtle px-2.5 py-2 text-left hover:bg-surface-hover">
      <FileText size={18} className="text-text-secondary shrink-0" /><span className="text-[12.5px] font-medium truncate">{a.filename}</span>
    </button>
  );
}

export function Attachments({ f, onChanged }: { f: FeatureDetail; onChanged: (f: FeatureDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<{ url: string; a: FeatureAttachment } | null>(null);
  const [drag, setDrag] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const upload = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true); setError('');
    try { let last: FeatureDetail | null = null; for (const file of files.slice(0, 10)) last = await api.addAttachment(f.id, file); if (last) onChanged(last); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  // paste a screenshot straight from the clipboard while the panel is open
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
      const files = Array.from(e.clipboardData?.files || []).filter(x => x.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); upload(files.map((x, i) => new File([x], x.name && x.name !== 'image.png' ? x.name : `screenshot-${Date.now()}-${i + 1}.png`, { type: x.type }))); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });
  const mine = f.attachments.filter(a => !a.solution_id);
  return (
    <div ref={zone} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); upload(Array.from(e.dataTransfer.files || [])); }}
      className={cn('rounded-xl transition-colors', drag && 'bg-accent-blue/5 outline-dashed outline-2 outline-accent-blue')}>
      {mine.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {mine.map(a => (
            <div key={a.id} className="relative group">
              <Thumb f={f} a={a} onOpen={url => setView({ url, a })} />
              <div className="text-[11px] text-text-secondary truncate mt-1" title={`${a.filename}, by ${a.by?.name || 'someone'}`}>{a.by?.name?.split(' ')[0] || 'Someone'} · {(a.size / 1024 / 1024 >= 1 ? `${(a.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(a.size / 1024))} KB`)}</div>
              {a.can_remove && (
                <button onClick={async () => { try { onChanged(await api.removeAttachment(f.id, a.id)); } catch (e: any) { setError(e.message); } }}
                  aria-label={`Remove ${a.filename}`} title="Remove" className="absolute top-1 right-1 p-1 rounded-md bg-black/55 text-white opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 size={12} /></button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => picker.current?.click()} disabled={busy} className={ghost}><ImagePlus size={14} />{busy ? 'Uploading…' : 'Add a screenshot or file'}</button>
        <span className="text-[12px] text-text-secondary">or paste a screenshot, or drop files here · up to 10 MB each</span>
        <input ref={picker} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={e => { upload(Array.from(e.target.files || [])); e.target.value = ''; }} />
      </div>
      {error && <div className="mt-2 text-[12.5px] text-accent-red">{error}</div>}
      {view && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-6" onClick={() => setView(null)}>
          <div className="max-w-[92vw] max-h-[88vh] flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-white text-[13px]">
              <span className="flex-1 truncate">{view.a.filename}</span>
              <a href={view.url} download={view.a.filename} className="font-semibold underline">Download</a>
              <button onClick={() => setView(null)} aria-label="Close"><X size={18} /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {view.a.is_image ? <img src={view.url} alt={view.a.filename} className="max-w-full max-h-[80vh] object-contain rounded-lg bg-white" />
              : view.a.content_type === 'application/pdf' ? <iframe src={view.url} title={view.a.filename} className="w-[80vw] h-[80vh] rounded-lg bg-white" />
              : <div className="bg-white rounded-lg p-6 text-[14px]">This file opens in its own app. <a href={view.url} download={view.a.filename} className="text-accent-blue font-semibold underline">Download it</a>.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ cost and profit */

function moneyStory(t: MoneyTotals): { headline: string; lines: string[]; tone: 'good' | 'watch' | 'bad' } {
  const lines: string[] = [];
  if (t.one_time_cost) lines.push(`${short(t.one_time_cost)} to build`);
  if (t.monthly_cost) lines.push(`${short(t.monthly_cost)} a month to run`);
  if (t.monthly_benefit) lines.push(`brings ${short(t.monthly_benefit)} a month`);
  if (t.one_time_benefit) lines.push(`${short(t.one_time_benefit)} once`);
  if (!t.has_benefit) return { headline: `Costs ${short(t.one_time_cost + 12 * t.monthly_cost)} in its first year`, lines: [...lines, 'no benefit estimated yet'], tone: 'watch' };
  if (t.payback_months === 0) return { headline: `Pays for itself straight away`, lines, tone: 'good' };
  if (t.payback_months != null) {
    const m = t.payback_months;
    return { headline: `Pays for itself in ${m < 1 ? 'under a month' : `${Math.round(m * 10) / 10} months`}`, lines, tone: m <= 12 ? 'good' : 'watch' };
  }
  return { headline: 'Does not pay for itself at these numbers', lines, tone: 'bad' };
}

export function MoneySummary({ t, compact }: { t: MoneyTotals; compact?: boolean }) {
  const st = moneyStory(t);
  const color = st.tone === 'good' ? 'text-accent-green' : st.tone === 'watch' ? 'text-accent-orange' : 'text-accent-red';
  if (compact) return <span className={cn('text-[11.5px] font-semibold', color)}>{st.headline}</span>;
  return (
    <div className="rounded-xl border border-border-subtle p-3.5">
      <div className={cn('text-[15px] font-bold', color)}>{st.headline}</div>
      <div className="text-[13px] text-text-secondary mt-0.5">{st.lines.join(' · ')}</div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="rounded-lg bg-[var(--bg-primary)] px-2 py-2"><div className="text-[11px] text-text-secondary">Each month</div><div className={cn('text-[15px] font-bold tabular-nums', t.net_monthly >= 0 ? 'text-text-primary' : 'text-accent-red')}>{short(t.net_monthly)}</div></div>
        <div className="rounded-lg bg-[var(--bg-primary)] px-2 py-2"><div className="text-[11px] text-text-secondary">After 1 year</div><div className={cn('text-[15px] font-bold tabular-nums', t.net_first_year >= 0 ? 'text-accent-green' : 'text-accent-red')}>{short(t.net_first_year)}</div></div>
        <div className="rounded-lg bg-[var(--bg-primary)] px-2 py-2"><div className="text-[11px] text-text-secondary">Return in year 1</div><div className="text-[15px] font-bold tabular-nums">{t.return_first_year != null ? `${t.return_first_year}%` : '—'}</div></div>
      </div>
    </div>
  );
}

type Draft = { side: 'cost' | 'benefit'; label: string; kind: 'one_time' | 'monthly'; amount: string; days: string; rate: string; byTime: boolean };
const toDraft = (c: CostLine): Draft => ({ side: c.side, label: c.label, kind: c.kind, amount: c.amount != null ? String(c.amount) : '', days: c.days != null ? String(c.days) : '', rate: c.rate != null ? String(c.rate) : '', byTime: c.days != null });
const STARTERS: Draft[] = [
  { side: 'cost', label: 'Developer time', kind: 'one_time', amount: '', days: '', rate: '', byTime: true },
  { side: 'cost', label: 'Hosting, tools or subscriptions', kind: 'monthly', amount: '', days: '', rate: '', byTime: false },
  { side: 'benefit', label: 'New revenue or money saved', kind: 'monthly', amount: '', days: '', rate: '', byTime: false },
];

export function CostProfit({ f, onChanged }: { f: FeatureDetail; onChanged: (f: FeatureDetail) => void }) {
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = f.costs.totals;
  const can = !!f.permissions.can_cost;
  const start = () => { setRows(f.costs.lines.length ? f.costs.lines.map(toDraft) : STARTERS.map(x => ({ ...x }))); setError(''); };
  const set = (i: number, k: keyof Draft, v: any) => setRows(r => r!.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const amountOf = (d: Draft) => d.byTime ? (parseAmount(d.days) * parseAmount(d.rate)) : parseAmount(d.amount);
  const save = async () => {
    const lines: CostLine[] = [];
    for (const d of rows!) {
      if (!d.label.trim() && !d.amount && !d.days) continue;
      if (!d.label.trim()) { setError('Every line needs a name.'); return; }
      const a = amountOf(d);
      if (isNaN(a)) { setError(`“${d.label}” needs ${d.byTime ? 'days and a rate per day' : 'an amount'}.`); return; }
      lines.push({ side: d.side, label: d.label.trim(), kind: d.kind, amount: d.byTime ? null : a,
                   days: d.byTime ? parseAmount(d.days) : null, rate: d.byTime ? parseAmount(d.rate) : null });
    }
    setBusy(true); setError('');
    try { onChanged(await api.setCosts(f.id, lines)); setRows(null); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  if (!rows) return (
    <div className="flex flex-col gap-2">
      {t ? <MoneySummary t={t} /> : <div className="text-[13px] text-text-secondary">No estimate yet. What would it cost to build and run, and what would it bring in?</div>}
      {t && f.costs.lines.length > 0 && (
        <ul className="text-[12.5px] text-text-secondary flex flex-col gap-0.5">
          {f.costs.lines.map((c, i) => (
            <li key={i} className="flex gap-2"><span className={cn('w-14 shrink-0 font-semibold', c.side === 'cost' ? 'text-accent-red' : 'text-accent-green')}>{c.side === 'cost' ? 'Cost' : 'Benefit'}</span>
              <span className="flex-1 min-w-0 truncate">{c.label}{c.days != null ? ` (${c.days} days × ${rupees(c.rate || 0)})` : ''}</span>
              <span className="tabular-nums text-text-primary">{rupees(c.amount || 0)}{c.kind === 'monthly' ? ' a month' : ''}</span></li>
          ))}
        </ul>
      )}
      {can && <button onClick={start} className={cn(ghost, 'self-start')}><Pencil size={13} />{t ? 'Change the estimate' : 'Estimate cost and profit'}</button>}
    </div>
  );
  return (
    <div className="rounded-xl border border-border-subtle p-3 flex flex-col gap-2.5">
      {(['cost', 'benefit'] as const).map(side => (
        <div key={side}>
          <div className={cn('text-[12px] font-bold mb-1.5', side === 'cost' ? 'text-accent-red' : 'text-accent-green')}>{side === 'cost' ? 'What it costs' : 'What it brings in'}</div>
          {rows.map((d, i) => d.side !== side ? null : (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-1.5 mb-2 pb-2 border-b border-border-subtle last:border-0">
              <input className={input} value={d.label} onChange={e => set(i, 'label', e.target.value)} placeholder={side === 'cost' ? 'e.g. Developer time' : 'e.g. 2 more clients'} aria-label="What" />
              <button onClick={() => setRows(r => r!.filter((_, j) => j !== i))} aria-label="Remove line" className="p-2 text-text-secondary hover:text-accent-red"><X size={14} /></button>
              <div className="col-span-2 flex flex-wrap items-center gap-1.5">
                <select className={cn(input, 'w-auto')} value={d.kind} onChange={e => set(i, 'kind', e.target.value)} aria-label="How often">
                  <option value="one_time">Once</option><option value="monthly">Every month</option>
                </select>
                {side === 'cost' && (
                  <select className={cn(input, 'w-auto')} value={d.byTime ? 'time' : 'amount'} onChange={e => set(i, 'byTime', e.target.value === 'time')} aria-label="Enter as">
                    <option value="amount">Amount</option><option value="time">Days × rate</option>
                  </select>
                )}
                {d.byTime ? (
                  <>
                    <input className={cn(input, 'w-20')} inputMode="decimal" value={d.days} onChange={e => set(i, 'days', e.target.value)} placeholder="days" aria-label="Days" />
                    <span className="text-text-secondary text-[12px]">×</span>
                    <input className={cn(input, 'w-28')} inputMode="numeric" value={d.rate} onChange={e => set(i, 'rate', e.target.value)} placeholder="₹ per day" aria-label="Rate per day" />
                    <span className="text-[12.5px] tabular-nums text-text-secondary">= {isNaN(amountOf(d)) ? '—' : rupees(amountOf(d))}</span>
                  </>
                ) : (
                  <input className={cn(input, 'w-36')} inputMode="numeric" value={d.amount} onChange={e => set(i, 'amount', e.target.value)} placeholder="₹, e.g. 1.5L" aria-label="Amount" />
                )}
              </div>
            </div>
          ))}
          <button onClick={() => setRows(r => [...r!, { side, label: '', kind: side === 'cost' ? 'one_time' : 'monthly', amount: '', days: '', rate: '', byTime: false }])}
            className="text-[12px] font-semibold text-accent-blue hover:underline inline-flex items-center gap-1"><Plus size={12} />Add a {side === 'cost' ? 'cost' : 'benefit'}</button>
        </div>
      ))}
      <div className="text-[12px] text-text-secondary">Amounts before GST. People’s time can be days × a day rate; it is worked out for you.</div>
      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
      <div className="flex justify-end gap-2"><button onClick={() => setRows(null)} className={ghost}>Cancel</button><button onClick={save} disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save estimate'}</button></div>
    </div>
  );
}

/* ------------------------------------------------------------ replies under an idea */

export function Replies({ f, s, onChanged }: { f: FeatureDetail; s: FeatureSolution; onChanged: (f: FeatureDetail) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const replies = s.replies || [];
  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try { onChanged(await api.comment(f.id, text.trim(), s.id)); setText(''); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-1.5">
      {replies.map(r => (
        <div key={r.id} className="flex gap-2 pl-1">
          <Avatar p={r.user} size={18} />
          <div className="flex-1 min-w-0 text-[12.5px]"><b className="font-semibold">{r.user?.name?.split(' ')[0] || 'Someone'}</b> <span className="whitespace-pre-wrap break-words text-text-primary">{r.text}</span></div>
        </div>
      ))}
      {open ? (
        <div className="flex gap-2 pt-0.5">
          <input autoFocus className={input} value={text} onChange={e => setText(e.target.value)} placeholder="Reply to this idea" onKeyDown={e => e.key === 'Enter' && send()} />
          <button onClick={send} disabled={busy || !text.trim()} className={primary}>Reply</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="self-start text-[12px] font-semibold text-text-secondary hover:text-text-primary inline-flex items-center gap-1">
          <MessageCircle size={12} />{replies.length ? `Reply (${replies.length})` : 'Reply'}
        </button>
      )}
    </div>
  );
}

