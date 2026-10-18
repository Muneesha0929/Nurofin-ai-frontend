'use client';

// Every add / edit form on the Runway page. Each one saves through the API, swaps in the
// fresh picture the API returns, and says what happened in a toast (with Undo after a delete).
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { runwayService as api, Capital, Expense, Figure, How, Product, Runway, Tracking } from '@/services/runway';
import { Choice, Field, IconBtn, MoneyInput, MonthSelect, Sheet, TextInput, inputCls, moneyText, useToast } from './ui';
import { addM, dShort, mLong, mName, parseRs, range, rs } from './story';

type Apply = (r: Runway) => void;
const need = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };
const P = ({ children }: { children: React.ReactNode }) => <p className="m-0 text-[14.5px] text-[#526070]">{children}</p>;

// ----------------------------------------------------------------- expense

export function ExpenseSheet({ rw, expense, month, apply, onClose }: { rw: Runway; expense: Expense | null; month: string; apply: Apply; onClose: () => void }) {
  const toast = useToast();
  const { data, summary } = rw;
  const cur = summary.current_month, start = data.settings.start_month;
  const isNew = !expense;
  const onceMonths = expense ? Object.keys(expense.months).sort() : [];
  const onceMonth = onceMonths.find(m => m >= cur) || onceMonths[onceMonths.length - 1] || month;
  const [name, setName] = useState(expense?.name || '');
  const [cat, setCat] = useState<string>(String(expense?.category_id ?? data.categories[0]?.id ?? 'new'));
  const [newCat, setNewCat] = useState('');
  const [how, setHow] = useState<How>(expense?.how || 'monthly');
  const [amount, setAmount] = useState(moneyText(expense && expense.how !== 'once' ? expense.amount : null));
  const [from, setFrom] = useState(expense?.start || (month >= cur ? month : cur));
  const [to, setTo] = useState(expense?.end || '');
  const [raise, setRaise] = useState(String(expense?.raise ?? 0));
  const [oAmt, setOAmt] = useState(moneyText(expense?.how === 'once' ? expense.months[onceMonth] : null));
  const [oMonth, setOMonth] = useState(onceMonth);

  const save = async () => {
    need(!!name.trim(), 'Give it a name.');
    need(cat !== 'new' || !!newCat.trim(), 'Name the new category.');
    const body: any = { name: name.trim(), how, ...(cat === 'new' ? { new_category: newCat.trim() } : { category_id: +cat }) };
    if (how === 'once') {
      const a = parseRs(oAmt); need(!isNaN(a) && a > 0, 'Enter the amount.');
      Object.assign(body, { once_month: oMonth, once_amount: a });
    } else {
      const a = parseRs(amount); need(!isNaN(a) && a >= 0, 'Enter the amount per month.');
      need(!to || to >= from, 'The end month is before the start month.');
      Object.assign(body, { amount: a, start_month: from, end_month: to || null, raise_pct: how === 'monthly' ? +raise : 0 });
    }
    apply(isNew ? await api.addExpense(body) : await api.updateExpense(expense!.id, body));
    toast(isNew ? `Added ${body.name}` : `Saved ${body.name}`);
  };
  const del = async () => {
    apply(await api.deleteExpense(expense!.id));
    toast(`Deleted ${expense!.name}`, async () => apply(await api.restore('expense', expense!.id)));
  };
  return (
    <Sheet title={isNew ? 'Add expense' : 'Edit expense'} onClose={onClose} onSave={save} saveLabel={isNew ? 'Add expense' : 'Save changes'} onDelete={isNew ? undefined : del}>
      <Field label="What is it?" htmlFor="eName"><TextInput id="eName" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Android developer salary" /></Field>
      <Field label="Category" htmlFor="eCat">
        <select id="eCat" className={inputCls} value={cat} onChange={e => setCat(e.target.value)}>
          {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="new">New category…</option>
        </select>
      </Field>
      {cat === 'new' && <Field label="New category name" htmlFor="eNewCat"><TextInput id="eNewCat" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Marketing" /></Field>}
      <Field label="How often is it paid?">
        <Choice name="eHow" value={how} onChange={setHow} options={[
          { value: 'monthly', title: 'Every month, same amount', hint: 'Salaries, rent, subscriptions' },
          { value: 'varies', title: 'Every month, amount changes', hint: 'AWS, travel, electricity' },
          { value: 'once', title: 'Just once', hint: 'Laptops, an audit, a registration' },
        ]} />
      </Field>
      {how === 'once' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Amount" htmlFor="eOAmt"><MoneyInput id="eOAmt" value={oAmt} onChange={setOAmt} /></Field>
          <Field label="Month" htmlFor="eOM"><MonthSelect id="eOM" value={oMonth} onChange={setOMonth} months={range(start, addM(cur, 24))} /></Field>
        </div>
      ) : (
        <>
          <Field label={how === 'varies' ? 'Usual amount per month' : 'Amount per month'} htmlFor="eAmt"
            help={how === 'varies' ? 'Used until there are three months of real figures; after that it follows them.' : undefined}>
            <MoneyInput id="eAmt" value={amount} onChange={setAmount} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Starts" htmlFor="eStart"><MonthSelect id="eStart" value={from} onChange={setFrom} months={range(start, addM(cur, 24))} /></Field>
            <Field label="Ends" htmlFor="eEnd"><MonthSelect id="eEnd" value={to} onChange={setTo} months={range(start, addM(cur, 36))} blank="No end date" /></Field>
          </div>
          {how === 'monthly' && (
            <Field label="Yearly raise" htmlFor="eRaise">
              <select id="eRaise" className={inputCls} value={raise} onChange={e => setRaise(e.target.value)}>
                {[0, 3, 5, 8, 10, 12, 15].map(r => <option key={r} value={r}>{r ? `${r}% every April` : 'No raise'}</option>)}
              </select>
            </Field>
          )}
        </>
      )}
      {!isNew && <p className="m-0 text-[13.5px] text-[#8A94A3]">A new amount applies from {mName(cur)} onwards. Months already entered keep their figures.</p>}
    </Sheet>
  );
}

// ----------------------------------------------------------------- categories

export function CategoriesSheet({ rw, apply, onClose }: { rw: Runway; apply: Apply; onClose: () => void }) {
  const toast = useToast();
  const [names, setNames] = useState<Record<number, string>>(Object.fromEntries(rw.data.categories.map(c => [c.id, c.name])));
  const [added, setAdded] = useState('');
  const counts = (id: number) => rw.data.expenses.filter(e => e.category_id === id).length;
  const save = async () => {
    let last: Runway | null = null;
    for (const c of rw.data.categories) if (names[c.id]?.trim() && names[c.id].trim() !== c.name) last = await api.renameCategory(c.id, names[c.id].trim());
    if (added.trim()) last = await api.addCategory(added.trim());
    if (last) apply(last);
    toast('Categories saved');
  };
  const remove = async (id: number) => {
    if (counts(id)) { toast('Move or delete its expenses first'); return; }
    const r = await api.deleteCategory(id); apply(r);
    toast('Category deleted', async () => apply(await api.restore('category', id)));
  };
  return (
    <Sheet title="Categories" onClose={onClose} onSave={save}>
      <P>Type over a name to rename it. A category can be deleted once it has no expenses.</P>
      <div className="flex flex-col gap-2">
        {rw.data.categories.map(c => (
          <div key={c.id} className="flex gap-2 items-center">
            <TextInput aria-label="Category name" value={names[c.id] ?? ''} onChange={e => setNames({ ...names, [c.id]: e.target.value })} />
            <IconBtn label={counts(c.id) ? `${c.name} has ${counts(c.id)} expenses` : `Delete ${c.name}`} onClick={() => remove(c.id)} className={counts(c.id) ? 'opacity-35' : ''}><X className="w-[18px] h-[18px]" /></IconBtn>
          </div>
        ))}
      </div>
      <Field label="New category" htmlFor="catNew"><TextInput id="catNew" value={added} onChange={e => setAdded(e.target.value)} placeholder="e.g. Marketing" /></Field>
    </Sheet>
  );
}

// ----------------------------------------------------------------- products

export function ProductSheet({ rw, product, apply, onClose, onCreated }: { rw: Runway; product: Product | null; apply: Apply; onClose: () => void; onCreated?: (id: number) => void }) {
  const toast = useToast();
  const cur = rw.summary.current_month, start = rw.data.settings.start_month;
  const isNew = !product;
  const [name, setName] = useState(product?.name || '');
  const [tracking, setTracking] = useState<Tracking>(product?.tracking || 'figures');
  const [costLabel, setCostLabel] = useState(product?.cost_label || '');
  const [amount, setAmount] = useState(moneyText(product?.tracking === 'fixed' ? product.amount : null));
  const [from, setFrom] = useState(product?.start || cur);
  const [to, setTo] = useState(product?.end || '');
  const save = async () => {
    need(!!name.trim(), 'Give it a name.');
    need(!to || to >= from, 'The end month is before the start month.');
    const a = parseRs(amount);
    if (tracking === 'fixed') need(!isNaN(a) && a >= 0, 'Enter the amount per month.');
    const body = { name: name.trim(), tracking, cost_label: tracking === 'figures' ? costLabel.trim() || null : null, amount: tracking === 'fixed' ? a : 0, start_month: from, end_month: to || null };
    if (isNew) { const r = await api.addProduct(body); apply(r); onCreated?.(r.id); } else apply(await api.updateProduct(product!.id, body));
    toast(isNew ? `Added ${body.name}` : `Saved ${body.name}`);
  };
  const del = async () => {
    apply(await api.deleteProduct(product!.id));
    toast(`Deleted ${product!.name}`, async () => apply(await api.restore('product', product!.id)));
  };
  return (
    <Sheet title={isNew ? 'Add product' : 'Edit product'} onClose={onClose} onSave={save} saveLabel={isNew ? 'Add product' : 'Save changes'} onDelete={isNew ? undefined : del}>
      <P>A product is anything the company earns from. Add each one once; its income then counts in the forecast.</P>
      <Field label="Name" htmlFor="pName"><TextInput id="pName" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Build-Track" /></Field>
      <Field label="How does its income come in?">
        <Choice name="pTrack" value={tracking} onChange={setTracking} options={[
          { value: 'figures', title: 'Changes every month', hint: 'You copy "revenue so far" from its dashboard now and then, like GMDI' },
          { value: 'fixed', title: 'Same amount every month', hint: 'A retainer, a subscription, a fixed contract' },
        ]} />
      </Field>
      {tracking === 'figures'
        ? <Field label="Cost that grows with its revenue (optional)" htmlFor="pCost" help='For GMDI this is "Bank charges". Leave empty if there is none.'>
            <TextInput id="pCost" value={costLabel} onChange={e => setCostLabel(e.target.value)} placeholder="e.g. Bank charges" />
          </Field>
        : <Field label="Amount per month" htmlFor="pAmt"><MoneyInput id="pAmt" value={amount} onChange={setAmount} /></Field>}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Earning from" htmlFor="pStart"><MonthSelect id="pStart" value={from} onChange={setFrom} months={range(start, addM(cur, 24))} /></Field>
        <Field label="Until" htmlFor="pEnd"><MonthSelect id="pEnd" value={to} onChange={setTo} months={range(start, addM(cur, 36))} blank="No end date" /></Field>
      </div>
    </Sheet>
  );
}

export function FigureSheet({ rw, productId, figure, apply, onClose }: { rw: Runway; productId: number | null; figure: Figure | null; apply: Apply; onClose: () => void }) {
  const toast = useToast();
  const products = rw.data.products.filter(p => p.tracking === 'figures');
  const isNew = !figure;
  const [pid, setPid] = useState<number>(productId ?? products[0]?.id);
  const p = products.find(x => x.id === pid);
  const [day, setDay] = useState(figure?.day || rw.summary.today);
  const [rev, setRev] = useState(moneyText(figure?.revenue));
  const [cost, setCost] = useState(moneyText(figure?.cost));
  const [fc, setFc] = useState(moneyText(figure?.forecast));
  if (!products.length) return (
    <Sheet title="Add a figure" onClose={onClose} onSave={() => {}} saveLabel="Close" hideCancel>
      <P>None of the products takes figures yet. Add a product whose income changes every month first.</P>
    </Sheet>
  );
  const save = async () => {
    need(!!day && day <= rw.summary.today, 'Pick a date up to today.');
    const r = parseRs(rev); need(!isNaN(r) && r >= 0, 'Enter the revenue so far.');
    const c = parseRs(cost), f = parseRs(fc);
    const body = { day, revenue: r, cost: isNaN(c) ? null : c, forecast: isNaN(f) ? null : f };
    apply(isNew ? await api.addFigure(pid, body) : await api.updateFigure(pid, figure!.id, body));
    toast(isNew ? `${p?.name} figure added` : `${p?.name} figure saved`);
  };
  const del = async () => {
    apply(await api.deleteFigure(pid, figure!.id));
    toast('Figure deleted', async () => apply(await api.restore('figure', figure!.id)));
  };
  return (
    <Sheet title={isNew ? `Add ${products.length === 1 ? products[0].name + ' ' : ''}figure` : `Edit ${p?.name} figure`} onClose={onClose} onSave={save} saveLabel={isNew ? 'Add figure' : 'Save changes'} onDelete={isNew ? undefined : del}>
      <P>Copy these from the product’s dashboard whenever you check it. Every 10 days or every 15, any gap works.</P>
      {isNew && products.length > 1 && (
        <Field label="Product" htmlFor="fP">
          <select id="fP" className={inputCls} value={pid} onChange={e => setPid(+e.target.value)}>{products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </Field>
      )}
      <Field label="Date of the figures" htmlFor="fDay"><input id="fDay" type="date" className={inputCls} value={day} max={rw.summary.today} min={`${rw.data.settings.start_month}-01`} onChange={e => setDay(e.target.value)} /></Field>
      <Field label="Revenue so far this month" htmlFor="fRev" help={p?.name === 'GMDI' ? 'Before GST. On the GMDI dashboard, Profit Outlook, month to date.' : 'Before GST, from the start of the month to this date.'}>
        <MoneyInput id="fRev" value={rev} onChange={setRev} autoFocus />
      </Field>
      {p?.cost_label && (
        <Field label={`${p.cost_label} so far this month`} htmlFor="fCost" help="Leave empty to use the usual share of revenue.">
          <MoneyInput id="fCost" value={cost} onChange={setCost} />
        </Field>
      )}
      <Field label="Its own month-end forecast (optional)" htmlFor="fFc" help="If the dashboard shows one. Makes the month-end estimate more accurate.">
        <MoneyInput id="fFc" value={fc} onChange={setFc} />
      </Field>
    </Sheet>
  );
}

export function MonthTotalSheet({ rw, product, month, apply, onClose }: { rw: Runway; product: Product; month: string; apply: Apply; onClose: () => void }) {
  const toast = useToast();
  const final = product.months[month];
  const row = rw.summary.products.find(x => x.id === product.id)?.months.find(x => x.month === month);
  const [rev, setRev] = useState(moneyText(final?.revenue ?? row?.revenue));
  const [cost, setCost] = useState(moneyText(final?.cost ?? row?.cost));
  const save = async () => {
    const r = parseRs(rev); need(!isNaN(r) && r >= 0, 'Enter the revenue.');
    const c = parseRs(cost);
    apply(await api.setProductMonth(product.id, month, r, isNaN(c) ? null : c));
    toast(`${product.name}, ${mName(month)} total saved`);
  };
  const del = async () => {
    apply(await api.deleteProductMonth(product.id, month));
    toast(`${mName(month)} total removed`, async () => apply(await api.setProductMonth(product.id, month, final.revenue, final.cost)));
  };
  return (
    <Sheet title={`${product.name} total for ${mLong(month)}`} onClose={onClose} onSave={save} saveLabel="Save total" onDelete={final ? del : undefined}>
      <P>From {product.name}’s reports for {mLong(month)}.{!final && row?.revenue != null ? ` Right now it is estimated at ${rs(row.revenue)}.` : ''}</P>
      <Field label="Revenue for the month" htmlFor="tRev" help="Before GST"><MoneyInput id="tRev" value={rev} onChange={setRev} autoFocus /></Field>
      {product.cost_label && <Field label={`${product.cost_label} for the month`} htmlFor="tCost"><MoneyInput id="tCost" value={cost} onChange={setCost} /></Field>}
    </Sheet>
  );
}

// ----------------------------------------------------------------- capital and bank

export function CapitalSheet({ rw, entry, apply, onClose }: { rw: Runway; entry: Capital | null; apply: Apply; onClose: () => void }) {
  const toast = useToast();
  const isNew = !entry;
  const [amount, setAmount] = useState(moneyText(entry?.amount));
  const [day, setDay] = useState(entry?.day || rw.summary.today);
  const [note, setNote] = useState(entry?.note || '');
  const save = async () => {
    const a = parseRs(amount); need(!isNaN(a) && a > 0, 'Enter the amount.');
    need(!!day, 'Pick a date.');
    const n = note.trim() || (day > rw.summary.today ? 'Planned top-up' : 'Capital');
    apply(isNew ? await api.addCapital(day, a, n) : await api.updateCapital(entry!.id, day, a, n));
    toast(isNew ? 'Money put in added' : 'Saved');
  };
  const del = async () => {
    apply(await api.deleteCapital(entry!.id));
    toast('Deleted', async () => apply(await api.restore('capital', entry!.id)));
  };
  return (
    <Sheet title={isNew ? 'Add money put in' : 'Edit money put in'} onClose={onClose} onSave={save} saveLabel={isNew ? 'Add' : 'Save changes'} onDelete={isNew ? undefined : del}>
      <Field label="Amount" htmlFor="cAmt"><MoneyInput id="cAmt" value={amount} onChange={setAmount} autoFocus /></Field>
      <Field label="Date" htmlFor="cDay" help="A future date counts as a planned top-up."><input id="cDay" type="date" className={inputCls} value={day} onChange={e => setDay(e.target.value)} /></Field>
      <Field label="Note (optional)" htmlFor="cNote"><TextInput id="cNote" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Third top-up" /></Field>
    </Sheet>
  );
}

export function BankSheet({ rw, apply, onClose }: { rw: Runway; apply: Apply; onClose: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState(moneyText(rw.data.bank?.amount));
  const [day, setDay] = useState(rw.data.bank?.day || rw.summary.today);
  const save = async () => {
    const a = parseRs(amount); need(!isNaN(a), 'Enter the balance.');
    apply(await api.setBank(day, a)); toast('Balance saved');
  };
  return (
    <Sheet title="Bank balance" onClose={onClose} onSave={save}>
      <Field label="Balance on the statement" htmlFor="bAmt"><MoneyInput id="bAmt" value={amount} onChange={setAmount} autoFocus /></Field>
      <Field label="Statement date" htmlFor="bDay"><input id="bDay" type="date" className={inputCls} value={day} max={rw.summary.today} onChange={e => setDay(e.target.value)} /></Field>
    </Sheet>
  );
}

// ----------------------------------------------------------------- how it works + settings

export function HowSheet({ rw, apply, onClose }: { rw: Runway; apply: Apply; onClose: () => void }) {
  const toast = useToast();
  const s = rw.data.settings;
  const [buffer, setBuffer] = useState(String(s.buffer_pct));
  const [green, setGreen] = useState(String(s.green_months));
  const [amber, setAmber] = useState(String(s.amber_months));
  const [startM, setStartM] = useState(s.start_month);
  const save = async () => {
    const b = +buffer, g = +green, a = +amber;
    need(b >= 0 && b <= 50, 'The buffer should be between 0 and 50%.');
    need(a < g, 'The "within reach" limit must be lower than the "on track" one.');
    if (b !== s.buffer_pct || g !== s.green_months || a !== s.amber_months || startM !== s.start_month) {
      apply(await api.updateSettings({ buffer_pct: b, green_months: g, amber_months: a, start_month: startM })); toast('Settings saved');
    }
  };
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-[15px] font-semibold mt-1 mb-1">{children}</h3>;
  return (
    <Sheet title="How these numbers are worked out" onClose={onClose} onSave={save} saveLabel="Done" hideCancel>
      <div className="flex flex-col gap-3 text-[14.5px] text-[#526070]">
        <div><H>Going out</H>Your expenses as you entered them. Salaries and rent stay the same and go up each April by the raise you set. Costs that change, like AWS, follow their own trend. {s.buffer_pct}% is added on top for things nobody remembers to plan.</div>
        <div><H>Coming in</H>Each product on its own. A fixed product counts its monthly amount. A product whose income changes follows its recent growth, and the growth slowly levels off so one good month is not stretched forever. Its linked cost, like GMDI’s bank charges, counts as going out at the same share of revenue as its last three months.</div>
        <div><H>This month</H>From your figures: money so far divided by the days it took, carried to the month end. If you also typed the product’s own forecast, the two are averaged. Any number of days between figures works.</div>
        <div><H>Break-even</H>The first month income pays for all costs, and keeps doing it three months in a row.</div>
        <div><H>All money back</H>The month when everything earned since {mLong(s.start_month)} catches up with everything spent.</div>
        <div><H>On track</H>Checked against a slower-growth case, on purpose. On track if the money lasts {s.green_months} months or more even then; within reach from {s.amber_months} to {s.green_months}; needs a plan below {s.amber_months}.</div>
      </div>
      <div className="border-t border-[#E4E7EC] pt-4 grid sm:grid-cols-2 gap-3">
        <Field label="Safety buffer" htmlFor="sBuf"><select id="sBuf" className={inputCls} value={buffer} onChange={e => setBuffer(e.target.value)}>{[0, 3, 5, 7, 10, 15].map(v => <option key={v} value={v}>{v}%</option>)}</select></Field>
        <Field label="Books start" htmlFor="sStart"><MonthSelect id="sStart" value={startM} onChange={setStartM} months={range('2024-01', rw.summary.current_month)} /></Field>
        <Field label="On track from (months)" htmlFor="sGreen"><select id="sGreen" className={inputCls} value={green} onChange={e => setGreen(e.target.value)}>{[6, 9, 12, 18, 24].map(v => <option key={v} value={v}>{v} months</option>)}</select></Field>
        <Field label="Within reach from (months)" htmlFor="sAmber"><select id="sAmber" className={inputCls} value={amber} onChange={e => setAmber(e.target.value)}>{[3, 4, 6, 9].map(v => <option key={v} value={v}>{v} months</option>)}</select></Field>
      </div>
      {rw.summary.last_figure_day && <p className="m-0 text-[13px] text-[#8A94A3]">Last figure entered {dShort(rw.summary.last_figure_day)}.</p>}
    </Sheet>
  );
}
