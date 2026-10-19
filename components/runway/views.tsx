'use client';

// The four Runway screens, laid out as in the approved design (design/runway.html).
import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Clock, Landmark, Pencil, Plus, Upload } from 'lucide-react';
import { cn } from '@/utils/cn';
import { runwayService as api, Expense, Product, Runway } from '@/services/runway';
import { Banner, Btn, C, Card, IconBtn, Pill, useToast } from './ui';
import { L, TONE_COLOR, addM, dLong, dShort, daysIn, mIdx, mLong, mName, mShort, parseRs, range, rs, story } from './story';

export type Open =
  | { kind: 'expense'; expense: Expense | null }
  | { kind: 'categories' }
  | { kind: 'product'; product: Product | null }
  | { kind: 'figure'; productId: number | null; figureId: number | null }
  | { kind: 'month'; productId: number; month: string }
  | { kind: 'capital'; id: number | null }
  | { kind: 'bank' }
  | { kind: 'how' }
  | { kind: 'import' };
interface ViewProps { rw: Runway; apply: (r: Runway) => void; open: (o: Open) => void; go: (tab: string, month?: string) => void }

// ================================================================= OVERVIEW

export function Overview({ rw, open, go }: ViewProps) {
  const s = rw.summary, E = s.expected, cur = s.current_month;
  const st = story(s);

  // timeline: today, lowest balance, cash runs low, break-even, all money back
  type Pt = { m: string; t: string; s: string; today?: boolean };
  let pts: Pt[] = [{ m: cur, t: 'Today', s: `${L(s.cash_now)} in the bank`, today: true }];
  if (E.low && E.low !== cur && (!E.out || mIdx(E.low) < mIdx(E.out))) pts.push({ m: E.low, t: 'Lowest balance', s: `${L(E.low_cash)} in ${mShort(E.low)}` });
  if (E.out) pts.push({ m: E.out, t: 'Bank runs low', s: mLong(E.out) });
  if (E.be) pts.push({ m: E.be, t: 'Break-even', s: mLong(E.be) });
  if (E.back) pts.push({ m: E.back, t: 'All money back', s: mLong(E.back) });
  pts.sort((a, b) => mIdx(a.m) - mIdx(b.m));
  const span0 = Math.max(mIdx(pts[pts.length - 1].m) - mIdx(cur), 1);
  pts = pts.filter((p, i) => p.t !== 'Lowest balance' || !pts.some((q, j) => j !== i && Math.abs(mIdx(q.m) - mIdx(p.m)) / span0 < .16));
  const span = Math.max(mIdx(pts[pts.length - 1].m) - mIdx(cur), 1);
  const pos = (m: string) => 1 + (mIdx(m) - mIdx(cur)) / span * 98;
  const beX = E.be ? pos(E.be) : 99;

  const share = s.share_now != null ? Math.round(s.share_now * 100) : null;
  const shareFirst = s.share_first != null ? Math.round(s.share_first * 100) : null;
  const lead = s.now.gap <= 0 ? 'Income now covers all costs.'
    : `Income now pays for ${share}% of the monthly costs${shareFirst != null && s.first_income_month ? `, up from ${shareFirst}% in ${mName(s.first_income_month)}` : ''}.`
      + (s.gap_change_3m && s.gap_change_3m > 0 ? ` The monthly gap is ${L(s.gap_change_3m)} smaller than in ${mName(addM(cur, -3))}.` : '')
      + (E.be ? ' The two lines meet at break-even.' : '');

  const todo = s.todo.map(t => t.kind === 'expenses_missing'
    ? { t: `${t.names.length} ${mName(t.month)} expense${t.names.length > 1 ? 's' : ''} not entered`, s: t.names.join(', '), b: 'Enter now', act: () => go('expenses', t.month) }
    : t.kind === 'product_month_estimated'
    ? { t: `${t.product} total for ${mName(t.month)} is missing`, s: `It is estimated at ${L(t.revenue)} for now.`, b: 'Enter total', act: () => open({ kind: 'month', productId: t.product_id, month: t.month }) }
    : { t: `Add a ${t.product} figure`, s: t.days == null ? 'None added yet.' : `The last one was ${t.days} days ago.`, b: 'Add figure', act: () => open({ kind: 'figure', productId: t.product_id, figureId: null }) });

  return (
    <>
      <div className="inline-flex items-center gap-2 text-[14px] font-medium text-[#526070]"><span className="w-2 h-2 rounded-full" style={{ background: TONE_COLOR[st.tone] }} />{st.status}</div>
      <h1 className="mt-3.5 text-[clamp(28px,4.2vw,40px)] leading-[1.15] font-semibold tracking-[-.025em] max-w-[22ch] text-[#0E1726]">{st.headline}</h1>
      <p className="mt-3.5 text-[16.5px] text-[#526070] max-w-[62ch]">{st.sub}</p>
      <p className="mt-2.5 text-[13.5px] text-[#8A94A3]">{st.basis}</p>

      <div className="mt-10" role="img" aria-label={pts.map(p => `${p.t}: ${p.s}`).join('. ')}>
        <div className="relative h-14">
          <div className="absolute top-[27px] h-[3px] rounded rw-grow" style={{ left: '1%', width: `${beX - 1}%`, background: C.out }} />
          {E.be && <div className="absolute top-[27px] h-[3px] rounded rw-grow" style={{ left: `${beX}%`, width: `${99 - beX}%`, background: C.in }} />}
          {pts.map(p => <span key={p.t} className="absolute top-5 -translate-x-1/2" style={{ left: `${pos(p.m)}%` }}><i className={cn('block w-[17px] h-[17px] rounded-full border-[3px] border-[#0E1726]', p.today ? 'bg-[#0E1726]' : 'bg-white')} /></span>)}
        </div>
        <div className="flex flex-col gap-2 sm:block sm:relative sm:h-[58px]">
          {pts.map((p, i) => {
            const last = i === pts.length - 1 && i > 0;
            return (
              <div key={p.t} className={cn('flex justify-between gap-3 sm:block sm:absolute sm:top-0 sm:w-[150px]', i === 0 ? 'sm:text-left' : last ? 'sm:text-right sm:-translate-x-full' : 'sm:text-center sm:-translate-x-1/2')}
                style={{ left: `${i === 0 ? 0 : last ? 100 : pos(p.m)}%` }}>
                <b className="block text-[15px] font-semibold text-[#0E1726]">{p.t}</b><span className="text-[13px] text-[#526070]">{p.s}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Key items={[[C.out, 'Spending more than earning'], ...(E.be ? [[C.in, 'Earning more than spending'] as [string, string]] : [])]} />

      <Card className="grid grid-cols-1 sm:grid-cols-3 mt-8">
        <Fact icon={<Landmark className="w-[18px] h-[18px]" />} k="In the bank" v={L(s.cash_now)} s={`end of ${mName(s.last_month)}`} />
        <Fact icon={<ArrowUp className="w-[18px] h-[18px]" style={{ color: C.out }} />} k="Going out each month" v={L(s.now.cost)} s={`all expenses in ${mName(cur)}`} border />
        <Fact icon={<ArrowDown className="w-[18px] h-[18px]" style={{ color: C.in }} />} k="Coming in each month" v={L(s.now.inc)} s={`all products, expected for ${mName(cur)}`} border />
      </Card>

      <Card className="p-6 mt-5">
        <h2 className="text-[17px] font-semibold tracking-[-.01em]">Money coming in and going out</h2>
        <p className="mt-1 text-[14.5px] text-[#526070] max-w-[64ch]">{lead}</p>
        <Key items={[[C.in, 'Coming in'], [C.out, 'Going out']]} extra="Dashed lines are expected, not yet happened" />
        <InOutChart rw={rw} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        <Card className="p-6 mt-5">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div><h2 className="text-[17px] font-semibold">Where the money goes</h2><p className="mt-1 text-[14.5px] text-[#526070]">{mName(cur)}, {L(s.where.reduce((a, w) => a + w.amount, 0))} in total</p></div>
            <Btn kind="text" onClick={() => go('expenses', cur)}>See expenses</Btn>
          </div>
          <ul className="mt-4 flex flex-col gap-3.5">
            {s.where.map(w => (
              <li key={w.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[14.5px]">
                <span>{w.name}</span><span className="tabular-nums">{L(w.amount)}</span>
                <span className="col-span-2 h-1.5 rounded bg-[#F0F2F5] overflow-hidden"><i className="block h-full rounded" style={{ width: `${w.amount / (s.where[0]?.amount || 1) * 100}%`, background: C.out }} /></span>
              </li>
            ))}
            {!s.where.length && <li className="text-[14.5px] text-[#526070]">No expenses yet. <button className="text-[#2F54EB] font-medium" onClick={() => open({ kind: 'expense', expense: null })}>Add the first one</button>.</li>}
          </ul>
        </Card>
        <Card className="p-6 mt-5">
          <h2 className="text-[17px] font-semibold">To update</h2>
          {todo.length ? (
            <ul className="mt-3.5">
              {todo.map((t, i) => (
                <li key={i} className={cn('flex gap-3 items-start py-3 text-[14.5px]', i ? 'border-t border-[#E4E7EC]' : 'pt-1')}>
                  <span className="w-[30px] h-[30px] rounded-[9px] grid place-items-center shrink-0 bg-[#FFF6E5] text-[#D98A00]"><Clock className="w-4 h-4" /></span>
                  <div className="min-w-0"><p>{t.t}</p><small className="block text-[13px] text-[#8A94A3]">{t.s}</small><Btn kind="text" className="!px-0" onClick={t.act}>{t.b}</Btn></div>
                </li>
              ))}
            </ul>
          ) : <div className="flex gap-2.5 items-center text-[14.5px] text-[#526070] mt-3.5"><Check className="w-[18px] h-[18px]" style={{ color: C.in }} />Everything is up to date.</div>}
        </Card>
      </div>
      <div className="mt-7 text-center"><Btn kind="text" onClick={() => open({ kind: 'how' })}>How these numbers are worked out</Btn></div>
    </>
  );
}

const Key = ({ items, extra }: { items: [string, string][]; extra?: string }) => (
  <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13.5px] text-[#526070] mt-4 mb-1">
    {items.map(([c, l]) => <span key={l} className="inline-flex items-center gap-2"><i className="w-4 h-[3px] rounded" style={{ background: c }} />{l}</span>)}
    {extra && <span className="text-[#8A94A3]">{extra}</span>}
  </div>
);

const Fact = ({ icon, k, v, s, border }: { icon: React.ReactNode; k: string; v: string; s: string; border?: boolean }) => (
  <div className={cn('px-6 py-[22px] min-w-0', border && 'border-t sm:border-t-0 sm:border-l border-[#E4E7EC]')}>
    <div className="text-[14px] text-[#526070] flex items-center gap-2">{icon}{k}</div>
    <div className="text-[28px] font-semibold tracking-[-.02em] mt-1.5 tabular-nums">{v}</div>
    <div className="text-[13px] text-[#8A94A3] mt-0.5">{s}</div>
  </div>
);

function nice(r: number) { const p = Math.pow(10, Math.floor(Math.log10(r || 1))), f = r / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }

/** Two lines, one axis: money in vs money out by month. Solid = happened, dashed = expected. */
function InOutChart({ rw }: { rw: Runway }) {
  const s = rw.summary, E = s.expected;
  const last = s.months[s.months.length - 1].month;
  let end = E.be ? addM(E.be, 6) : addM(s.current_month, 18); if (end > last) end = last;
  const rows = s.months.filter(m => m.month <= end);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (rows.length < 2) return <p className="text-[14px] text-[#8A94A3] mt-3">The chart appears once there are two months of figures.</p>;
  const W = 860, H = 280, P = { l: 56, r: 12, t: 18, b: 30 }, n = rows.length, iw = W - P.l - P.r, ih = H - P.t - P.b;
  const hi0 = Math.max(...rows.map(r => Math.max(r.inc, r.cost)), 1), step = nice(hi0 / 4), hi = Math.ceil(hi0 / step) * step;
  const x = (i: number) => P.l + i * iw / (n - 1), y = (v: number) => P.t + ih - v / hi * ih;
  const t0 = rows.findIndex(r => !r.actual);
  const be = E.be ? rows.findIndex(r => r.month === E.be) : -1;
  const pts = (k: 'inc' | 'cost', a: number, b: number) => rows.slice(a, b + 1).map((r, j) => `${x(a + j)},${y(r[k])}`).join(' ');
  const every = Math.ceil(n / 9);
  const grid: number[] = []; for (let v = 0; v <= hi + 1; v += step) grid.push(v);
  const onMove = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const sx = (e.clientX - box.left) * W / box.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round((sx - P.l) / (iw / (n - 1))))));
  };
  const h = hover != null ? rows[hover] : null;
  const split = Math.max(t0 - 1, 0);
  return (
    <div className="relative mt-1.5">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto overflow-visible" role="img" aria-label="Line chart of money coming in and going out each month">
        {grid.map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#D0D5DD' : '#EEF0F3'} />
            <text x={P.l - 10} y={y(v) + 4} textAnchor="end" fontSize="12" fill={C.ink3}>{v === 0 ? '0' : L(v)}</text>
          </g>
        ))}
        {rows.map((r, i) => ((i % every === 0 && n - 1 - i >= every / 2) || i === n - 1) && <text key={r.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill={C.ink3}>{mShort(r.month)}</text>)}
        {t0 > 0 && <><line x1={x(t0)} x2={x(t0)} y1={P.t} y2={P.t + ih} stroke="#D0D5DD" strokeDasharray="3 4" /><text x={x(t0) + 6} y={P.t + 4} fontSize="12" fill={C.ink3}>Today</text></>}
        {(['cost', 'inc'] as const).map(k => (
          <g key={k} stroke={k === 'inc' ? C.in : C.out} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {t0 !== 0 && <polyline points={pts(k, 0, t0 < 0 ? n - 1 : split)} />}
            {t0 >= 0 && <polyline points={pts(k, split, n - 1)} strokeDasharray="6 5" />}
          </g>
        ))}
        {be >= 0 && <>
          <circle cx={x(be)} cy={y(rows[be].inc)} r={6} fill="#fff" stroke={C.ink} strokeWidth={2.5} />
          <text x={x(be) - 12} y={y(rows[be].inc) - 16} textAnchor="end" fontSize="13" fontWeight={600} fill={C.ink} stroke="#fff" strokeWidth={5} paintOrder="stroke" strokeLinejoin="round">Break-even</text>
        </>}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={P.t + ih} stroke={C.ink} opacity={.18} />}
        <rect x={P.l} y={P.t} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {h && (
        <div className="absolute top-0 pointer-events-none bg-white border border-[#E4E7EC] rounded-xl px-3 py-2.5 text-[13px] shadow-[0_10px_28px_rgba(14,23,38,.12)] min-w-[190px] z-10"
          style={x(hover!) / W > .7 ? { right: `${(1 - x(hover!) / W) * 100 + 2}%` } : { left: `${x(hover!) / W * 100 + 2}%` }}>
          <b className="block mb-1.5 font-semibold">{mLong(h.month)}{h.actual ? '' : ', expected'}</b>
          <div className="flex justify-between gap-4 text-[#526070]"><span>Coming in</span><span className="text-[#0E1726] font-medium">{L(h.inc)}</span></div>
          <div className="flex justify-between gap-4 text-[#526070]"><span>Going out</span><span className="text-[#0E1726] font-medium">{L(h.cost)}</span></div>
          <div className="flex justify-between gap-4 text-[#526070] mt-1"><span>{h.inc >= h.cost ? 'Left over' : 'Taken from the bank'}</span><span className="text-[#0E1726] font-medium">{L(Math.abs(h.inc - h.cost))}</span></div>
        </div>
      )}
    </div>
  );
}

// ================================================================= EXPENSES

export function Expenses({ rw, apply, open, month, setMonth }: ViewProps & { month: string; setMonth: (m: string) => void }) {
  const toast = useToast();
  const { data, summary } = rw;
  const cur = summary.current_month, start = data.settings.start_month, isPast = month < cur;
  const months = range(start, addM(cur, 12));
  const active = (e: Expense, m: string) => e.how === 'once' ? m in e.months : m >= e.start && (!e.end || m <= e.end);
  const valueOf = (e: Expense, m: string) => m in e.months ? e.months[m] : m < cur ? 0 : (summary.planned[e.id]?.[m] ?? 0);
  const items = data.expenses.filter(e => active(e, month) || month in e.months);
  const total = items.reduce((a, e) => a + valueOf(e, month), 0);
  const prev = addM(month, -1);
  const prevTotal = month > start ? data.expenses.reduce((a, e) => a + valueOf(e, prev), 0) : null;
  const change = prevTotal ? (total - prevTotal) / prevTotal * 100 : null;
  const missing = isPast ? items.filter(e => e.how !== 'once' && !(month in e.months)) : [];
  const [editing, setEditing] = useState<number | null>(null);

  const saveOne = async (e: Expense, raw: string) => {
    setEditing(null);
    const v = parseRs(raw);
    const had = month in e.months ? e.months[month] : null;
    if (raw.trim() === '' ? had == null : (isNaN(v) || v === had || (!isPast && had == null && Math.round(v) === Math.round(valueOf(e, month))))) return;
    apply(await api.setExpenseMonth(e.id, month, raw.trim() === '' ? null : v));
    if (raw.trim() !== '') toast(`${e.name}: ${rs(v)} for ${mName(month)}`);
  };
  const fill = async (onlyMissing: boolean) => {
    const r = await api.fillMonth(month, onlyMissing); apply(r);
    toast(r.filled ? `Filled ${r.filled} from ${mName(prev)}. Change any that were different.` : `Nothing to copy from ${mName(prev)}.`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-0.5">
          <IconBtn label="Previous month" onClick={() => setMonth(addM(month, -1))} disabled={month <= start} className="disabled:opacity-30"><ChevronLeft className="w-[18px] h-[18px]" /></IconBtn>
          <select aria-label="Month" value={month} onChange={e => setMonth(e.target.value)} className="appearance-none bg-transparent text-[20px] font-semibold tracking-[-.015em] px-2 py-1 rounded-lg hover:bg-[#F0F2F5] cursor-pointer">
            {months.map(m => <option key={m} value={m}>{mLong(m)}</option>)}
          </select>
          <IconBtn label="Next month" onClick={() => setMonth(addM(month, 1))} disabled={month >= months[months.length - 1]} className="disabled:opacity-30"><ChevronRight className="w-[18px] h-[18px]" /></IconBtn>
        </div>
        <div className="flex flex-wrap gap-2"><Btn onClick={() => open({ kind: 'import' })}><Upload className="w-[17px] h-[17px]" />Import</Btn><Btn onClick={() => open({ kind: 'categories' })}>Categories</Btn><Btn onClick={() => open({ kind: 'expense', expense: null })}><Plus className="w-[18px] h-[18px]" />Expense</Btn></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-[18px] mb-[22px]">
        <span className="text-[28px] sm:text-[34px] font-semibold tracking-[-.025em] tabular-nums">{rs(total)}</span>
        {isPast ? <Pill tone="ok">Spent</Pill> : <Pill tone="plan">{month === cur ? 'This month, planned' : 'Planned'}</Pill>}
        {change != null && isFinite(change) && Math.abs(change) >= 1 && <span className="text-[14.5px] text-[#526070]">{change > 0 ? '+' : ''}{change.toFixed(0)}% compared with {mName(prev)}</span>}
      </div>
      {missing.length > 0 && (
        <Banner><span>{missing.length === 1 ? 'One expense has' : `${missing.length} expenses have`} no figure for {mName(month)} yet. Tap <b>Not entered</b> to type it.</span>
          {month > start && <Btn onClick={() => fill(true)}>Use {mName(prev)}’s amount{missing.length > 1 ? 's' : ''}</Btn>}</Banner>
      )}
      {!isPast && items.length > 0 && <Banner tone="info"><span>These are planned. Tap an amount to change {mName(month)} only, or the pencil to change it for every month.</span></Banner>}
      {!items.length ? (
        <div className="bg-white border border-dashed border-[#D0D5DD] rounded-[20px] px-6 py-9 text-center">
          <h3 className="text-[17px] font-semibold mb-1.5">No expenses for {mLong(month)}</h3>
          <p className="text-[#526070] max-w-[46ch] mx-auto mb-4">Add what the company spent this month, or copy last month’s list and adjust it.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {month > start && <Btn onClick={() => fill(false)}>Copy {mName(prev)}</Btn>}
            <Btn onClick={() => open({ kind: 'import' })}><Upload className="w-[17px] h-[17px]" />Import a spreadsheet</Btn>
            <Btn kind="primary" onClick={() => open({ kind: 'expense', expense: null })}><Plus className="w-[18px] h-[18px]" />Add expense</Btn>
          </div>
        </div>
      ) : data.categories.map(c => {
        const its = items.filter(e => e.category_id === c.id);
        if (!its.length) return null;
        return (
          <Card key={c.id} className="mb-3.5 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E4E7EC]"><h3 className="text-[15.5px] font-semibold">{c.name}</h3><span className="font-semibold tabular-nums">{rs(its.reduce((a, e) => a + valueOf(e, month), 0))}</span></div>
            {its.map((e, i) => {
              const has = month in e.months;
              const sub = e.how === 'monthly' ? `Every month${e.raise ? `, +${e.raise}% each April` : ''}${e.end ? `, until ${mShort(e.end)}` : ''}` : e.how === 'varies' ? 'Every month, amount changes' : 'One-time';
              return (
                <div key={e.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 pl-4 sm:pl-5 pr-3 py-2 min-h-[60px] hover:bg-[#FAFBFC]', i && 'border-t border-[#E4E7EC]')}>
                  <div className="min-w-0"><b className="block font-medium truncate">{e.name}</b><small className="text-[13px] text-[#8A94A3]">{sub}</small></div>
                  {editing === e.id
                    ? <AmountInput initial={has ? String(e.months[month]) : isPast ? '' : String(Math.round(valueOf(e, month)))} label={`${e.name}, ${mLong(month)}`} onDone={v => v === null ? setEditing(null) : saveOne(e, v)} />
                    : <button type="button" onClick={() => setEditing(e.id)} aria-label={`Change ${e.name} for ${mLong(month)}`}
                        className="font-medium px-2.5 py-1.5 rounded-lg text-right sm:min-w-[120px] min-h-[40px] border border-transparent hover:border-[#D0D5DD] hover:bg-white tabular-nums">
                        {isPast && !has ? <span className="text-[#D98A00]">Not entered</span> : rs(valueOf(e, month))}
                      </button>}
                  <IconBtn label={`Edit ${e.name}`} className="hidden sm:grid" onClick={() => open({ kind: 'expense', expense: e })}><Pencil className="w-[17px] h-[17px]" /></IconBtn>
                </div>
              );
            })}
          </Card>
        );
      })}
    </>
  );
}

function AmountInput({ initial, label, onDone }: { initial: string; label: string; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(initial);
  const done = useRef(false);
  const finish = (val: string | null) => { if (done.current) return; done.current = true; onDone(val); };
  return (
    <input autoFocus inputMode="numeric" aria-label={label} value={v} onChange={e => setV(e.target.value)} onFocus={e => e.target.select()}
      onKeyDown={e => { if (e.key === 'Enter') finish(v); if (e.key === 'Escape') finish(null); }} onBlur={() => finish(v)}
      className="w-[140px] text-right font-medium px-2.5 py-1.5 rounded-lg border border-[#2F54EB] ring-[3px] ring-[#EEF2FF] outline-none tabular-nums min-h-[40px]" />
  );
}

// ================================================================= INCOME (products)

export function Income({ rw, open }: ViewProps) {
  const { data, summary } = rw;
  const cur = summary.current_month;
  const [sel, setSel] = useState<number | null>(data.products[0]?.id ?? null);
  useEffect(() => { if (!data.products.some(p => p.id === sel)) setSel(data.products[0]?.id ?? null); }, [data.products, sel]);
  const ps = (id: number) => summary.products.find(x => x.id === id);
  const thisMonth = (p: Product) => {
    if (p.tracking === 'fixed') return cur >= p.start && (!p.end || cur <= p.end) ? (p.months[cur]?.revenue ?? p.amount) : 0;
    return ps(p.id)?.current?.value ?? ps(p.id)?.expected_this_month ?? 0;
  };
  const total = data.products.reduce((a, p) => a + thisMonth(p), 0);
  const p = data.products.find(x => x.id === sel) || null;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-.015em]">Income</h2>
        <div className="flex gap-2"><Btn onClick={() => open({ kind: 'import' })}><Upload className="w-[17px] h-[17px]" />Import</Btn><Btn onClick={() => open({ kind: 'product', product: null })}><Plus className="w-[18px] h-[18px]" />Product</Btn></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-[18px] mb-[22px]">
        <span className="text-[28px] sm:text-[34px] font-semibold tracking-[-.025em] tabular-nums">{L(total)}</span>
        <span className="text-[14.5px] text-[#526070]">expected in {mName(cur)} from {data.products.length} product{data.products.length === 1 ? '' : 's'}</span>
      </div>
      {data.products.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Products">
          {data.products.map(x => (
            <button key={x.id} role="tab" aria-selected={x.id === sel} onClick={() => setSel(x.id)}
              className={cn('px-3.5 py-2 rounded-xl border text-[14px] font-medium min-h-[40px]', x.id === sel ? 'border-[#0E1726] bg-white text-[#0E1726]' : 'border-[#E4E7EC] bg-white text-[#526070] hover:border-[#D0D5DD]')}>
              {x.name} <span className="text-[#8A94A3] font-normal tabular-nums">{x.start > cur ? `from ${mShort(x.start)}` : L(thisMonth(x))}</span>
            </button>
          ))}
        </div>
      )}
      {!p ? (
        <div className="bg-white border border-dashed border-[#D0D5DD] rounded-[20px] px-6 py-9 text-center">
          <h3 className="text-[17px] font-semibold mb-1.5">No products yet</h3>
          <p className="text-[#526070] max-w-[46ch] mx-auto mb-4">Add each thing the company earns from. Its income then counts in the forecast.</p>
          <Btn kind="primary" onClick={() => open({ kind: 'product', product: null })}><Plus className="w-[18px] h-[18px]" />Add product</Btn>
        </div>
      ) : p.tracking === 'fixed' ? <FixedProduct rw={rw} p={p} open={open} /> : <FiguresProduct rw={rw} p={p} open={open} />}
    </>
  );
}

function ProductHead({ p, open, right }: { p: Product; open: ViewProps['open']; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-1"><h3 className="text-[17px] font-semibold">{p.name}</h3><IconBtn label={`Edit ${p.name}`} onClick={() => open({ kind: 'product', product: p })}><Pencil className="w-4 h-4" /></IconBtn></div>
      {right}
    </div>
  );
}

function FixedProduct({ rw, p, open }: { rw: Runway; p: Product; open: ViewProps['open'] }) {
  return (
    <>
      <ProductHead p={p} open={open} />
      <Card className="p-6">
        <p className="text-[14.5px] text-[#526070]">Same amount every month</p>
        <div className="text-[34px] font-semibold tracking-[-.025em] tabular-nums">{rs(p.amount)}</div>
        <p className="mt-2 text-[14px] text-[#526070]">From {mLong(p.start)}{p.end ? ` until ${mLong(p.end)}` : ', with no end date'}. Edit the product to change the amount or end it.</p>
      </Card>
    </>
  );
}

function FiguresProduct({ rw, p, open }: { rw: Runway; p: Product; open: ViewProps['open'] }) {
  const s = rw.summary, cur = s.current_month;
  const sum = s.products.find(x => x.id === p.id);
  const pc = sum?.current;
  const figs = [...p.figures].sort((a, b) => (a.day < b.day ? 1 : -1));
  const est = (sum?.months || []).filter(m => m.how === 'estimated');
  return (
    <>
      <ProductHead p={p} open={open} right={<Btn onClick={() => open({ kind: 'figure', productId: p.id, figureId: null })}><Plus className="w-[18px] h-[18px]" />{p.name} figure</Btn>} />
      <Card className="p-6">
        {pc ? (
          <>
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div><p className="text-[14.5px] text-[#526070]">{mName(cur)} so far, as of {dShort(pc.as_of)}</p><div className="text-[34px] font-semibold tracking-[-.025em] tabular-nums">{rs(pc.so_far)}</div></div>
              <div className="text-right"><p className="text-[14.5px] text-[#526070]">Expected by {daysIn(cur)} {mShort(cur).slice(0, 3)}</p><div className="text-[22px] font-semibold tracking-[-.02em] mt-2 tabular-nums">{L(pc.value)}</div></div>
            </div>
            <div className="h-2 rounded bg-[#E8F7F0] overflow-hidden mt-3.5 mb-2" role="img" aria-label={`${Math.round(pc.so_far / pc.value * 100)}% of the expected month total`}>
              <i className="block h-full rounded" style={{ width: `${Math.min(pc.so_far / pc.value * 100, 100)}%`, background: C.in }} />
            </div>
            <p className="text-[13.5px] text-[#526070]">Day {pc.day} of {pc.days}. {p.name} is bringing in about {L(pc.rate)} a day{pc.product_forecast ? `, and its own forecast says ${L(pc.product_forecast)}` : ''}, so the month should end near {L(pc.value)}.</p>
          </>
        ) : (
          <><h3 className="text-[17px] font-semibold">No {p.name} figure for {mName(cur)} yet</h3><p className="mt-1 text-[14.5px] text-[#526070]">Add one from its dashboard. Until then this month follows the trend.</p></>
        )}
      </Card>
      {est.map(m => (
        <div key={m.month} className="mt-4"><Banner><span>{mName(m.month)}’s total was never entered, so it is estimated at <b>{L(m.revenue || 0)}</b>.</span><Btn onClick={() => open({ kind: 'month', productId: p.id, month: m.month })}>Enter {mName(m.month)}’s total</Btn></Banner></div>
      ))}
      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E4E7EC]"><h3 className="text-[15.5px] font-semibold">Figures you added</h3><span className="text-[13px] text-[#8A94A3]">Tap one to change or delete it</span></div>
        {figs.length ? <Table head={['Date', 'Revenue so far', ...(p.cost_label ? [`${p.cost_label} so far`] : [])]}
          rows={figs.map(f => ({ key: f.id, onClick: () => open({ kind: 'figure', productId: p.id, figureId: f.id }), cells: [dLong(f.day), rs(f.revenue), ...(p.cost_label ? [f.cost != null ? rs(f.cost) : '—'] : [])] }))} />
          : <p className="px-5 py-4 text-[14.5px] text-[#526070]">No figures yet.</p>}
      </Card>
      <Card className="mt-3.5 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E4E7EC]"><h3 className="text-[15.5px] font-semibold">Month totals</h3><span className="text-[13px] text-[#8A94A3]">Revenue before GST</span></div>
        {sum?.months.length ? <Table head={['Month', 'Revenue', ...(p.cost_label ? [p.cost_label, 'Company keeps'] : []), '']}
          rows={sum.months.map(m => ({ key: m.month, onClick: () => open({ kind: 'month', productId: p.id, month: m.month }),
            cells: [mLong(m.month), m.revenue != null ? rs(m.revenue) : '—', ...(p.cost_label ? [m.cost != null ? rs(m.cost) : '—', m.revenue != null ? rs(m.revenue - (m.cost || 0)) : '—'] : []),
              <Pill key="p" tone={m.how === 'final' ? 'ok' : m.how === 'estimated' ? 'est' : 'gray'}>{m.how === 'final' ? 'Final' : m.how === 'estimated' ? 'Estimated' : 'Missing'}</Pill>] }))} />
          : <p className="px-5 py-4 text-[14.5px] text-[#526070]">Totals appear here once a month closes.</p>}
        <div className="px-5 py-3 border-t border-[#E4E7EC]"><Btn kind="text" className="!px-0" onClick={() => open({ kind: 'month', productId: p.id, month: addM(cur, -1) })}><Plus className="w-4 h-4" />Enter a month total</Btn></div>
      </Card>
    </>
  );
}

function Table({ head, rows }: { head: string[]; rows: { key: React.Key; onClick: () => void; cells: React.ReactNode[] }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14.5px]">
        <thead><tr>{head.map((h, i) => <th key={i} className={cn('text-[13px] font-medium text-[#8A94A3] px-5 py-2.5 border-b border-[#E4E7EC] whitespace-nowrap', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.key} tabIndex={0} onClick={r.onClick} onKeyDown={e => e.key === 'Enter' && r.onClick()} className="cursor-pointer hover:bg-[#FAFBFC] focus:outline-none focus-visible:bg-[#EEF2FF]">
              {r.cells.map((c, i) => <td key={i} className={cn('px-5 py-3 whitespace-nowrap tabular-nums', ri && 'border-t border-[#E4E7EC]', i ? 'text-right' : 'text-left')}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================= CAPITAL

export function CapitalView({ rw, open }: ViewProps) {
  const { data, summary } = rw;
  const total = data.capital.reduce((a, c) => a + c.amount, 0);
  const b = summary.bank;
  const off = b ? Math.abs(b.diff) > Math.abs(b.calc) * .03 : false;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-.015em]">Money put in</h2>
        <Btn onClick={() => open({ kind: 'capital', id: null })}><Plus className="w-[18px] h-[18px]" />Money put in</Btn>
      </div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-[18px] mb-[22px]">
        <span className="text-[28px] sm:text-[34px] font-semibold tracking-[-.025em] tabular-nums">{L(total)}</span>
        <span className="text-[14.5px] text-[#526070]">put into the company since {mLong(data.settings.start_month)}</span>
      </div>
      <Card className="overflow-hidden">
        {data.capital.length ? <Table head={['Date', 'Note', 'Amount']}
          rows={[...data.capital].sort((a, c) => (a.day < c.day ? 1 : -1)).map(c => ({ key: c.id, onClick: () => open({ kind: 'capital', id: c.id }),
            cells: [<span key="d">{dLong(c.day)} {c.day > summary.today && <Pill tone="plan">Planned</Pill>}</span>, <span key="n" className="text-[#526070]">{c.note || ''}</span>, rs(c.amount)] }))} />
          : <p className="px-5 py-4 text-[14.5px] text-[#526070]">Nothing yet. Add the capital put in since {mLong(data.settings.start_month)} so the page knows how much there is.</p>}
      </Card>
      <Card className="p-6 mt-5">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div><h2 className="text-[17px] font-semibold">Check against the bank</h2><p className="mt-1 text-[14.5px] text-[#526070] max-w-[64ch]">Once a month, type what the bank statement says. If it doesn’t match, something was not entered.</p></div>
          <Btn onClick={() => open({ kind: 'bank' })}>Update balance</Btn>
        </div>
        {b ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 border border-[#E4E7EC] rounded-[20px] mt-[18px]">
              <Fact icon={null} k={`Bank statement, ${dShort(b.day)}`} v={L(b.amount)} s="" />
              <Fact icon={null} k="Worked out here" v={L(b.calc)} s="" border />
              <div className="px-6 py-[22px] border-t sm:border-t-0 sm:border-l border-[#E4E7EC]">
                <div className="text-[14px] text-[#526070]">Difference</div>
                <div className="text-[22px] font-semibold mt-1.5 tabular-nums" style={{ color: off ? C.watch : C.in }}>{Math.abs(b.diff) < 1000 ? 'None' : `${b.diff > 0 ? '+' : '−'}${L(Math.abs(b.diff))}`}</div>
              </div>
            </div>
            <p className="mt-3.5 text-[14.5px] text-[#526070]">{off ? (b.diff < 0 ? `The bank has ${L(-b.diff)} less than expected. Usually a payment that was not entered, such as GST or a one-off bill.` : `The bank has ${L(b.diff)} more than expected. Usually income or capital that was not entered.`) : 'The books match the bank, so the forecast starts from the right amount.'}</p>
          </>
        ) : <p className="mt-3 text-[14.5px] text-[#526070]">No balance entered yet.</p>}
      </Card>
      <p className="text-[13.5px] text-[#8A94A3] text-center mt-5">An entry with a future date counts as a planned top-up and is included in the forecast.</p>
    </>
  );
}
