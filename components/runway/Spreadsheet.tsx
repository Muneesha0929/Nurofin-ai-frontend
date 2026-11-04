'use client';

/**
 * Runway as a spreadsheet: every line is a row, every month a column, like the Excel sheet Sir keeps.
 *
 * - Click a cell and type. Enter or Tab saves. Typed figures are blue; worked-out ones are grey.
 * - Select many cells (drag, or Shift + click / arrows) and type once: every selected cell gets it.
 * - Paste a block straight from Excel or Google Sheets (Ctrl/Cmd + V).
 * - Drag the small square at the corner of a selection to copy it right or down. Ctrl/Cmd + R / D too.
 * - Delete clears cells (they go back to the line's rule or the forecast). Ctrl/Cmd + Z undoes.
 * - Amounts can be typed as 150000, 1,50,000, 1.5L, 50k, 2cr or =150000*1.1.
 * - Each line's ⋯ menu: rename, "from a month on", how future months are worked out, delete.
 *
 * Every save goes to /runway/cells and returns the whole picture, so totals, cash and the forecast
 * on the Overview always agree with the sheet.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MoreHorizontal, Plus, Undo2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Runway, runwayService as api, Expense, Product, CellHow } from '@/services/runway';
import { useToast } from './ui';
import { addM, mIdx, mLong, range } from './story';

/* ------------------------------------------------------------ amounts */

const UNIT: Record<string, number> = { k: 1e3, l: 1e5, lac: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7, crores: 1e7 };

/** "1,50,000" "1.5L" "50k" "2 cr" "=150000*1.1" -> number; '' -> null (clear); bad -> NaN */
export function parseAmount(raw: string): number | null {
  let t = String(raw ?? '').trim().toLowerCase().replace(/[₹,\s]/g, '');
  if (t === '') return null;
  const formula = t.startsWith('=');
  if (formula) t = t.slice(1);
  // numbers with an optional unit, e.g. 1.5l -> (1.5*100000)
  t = t.replace(/(\d+(?:\.\d+)?)(crores|crore|cr|lakhs|lakh|lac|l|k)/g, (_, n, u) => `(${n}*${UNIT[u]})`);
  if (!formula && !/^\(?[\d.]+(\*\d+)?\)?$/.test(t)) return NaN;
  const v = evaluate(t);
  return isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}

/** + - * / and brackets over plain numbers. A tiny parser, so nothing typed is ever run as code. */
function evaluate(src: string): number {
  let i = 0;
  const num = (): number => {
    if (src[i] === '(') { i++; const v = sum(); if (src[i] !== ')') return NaN; i++; return v; }
    if (src[i] === '-') { i++; return -num(); }
    const m = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(i));
    if (!m) return NaN;
    i += m[0].length;
    return +m[0];
  };
  const product = (): number => {
    let v = num();
    while (src[i] === '*' || src[i] === '/') { const op = src[i++]; const r = num(); v = op === '*' ? v * r : v / r; }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (src[i] === '+' || src[i] === '-') { const op = src[i++]; const r = product(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  const v = sum();
  return i === src.length ? v : NaN;
}
const fmt = (v: number | null | undefined) => (v == null ? '' : (v < 0 ? '−' : '') + Math.round(Math.abs(v)).toLocaleString('en-IN'));
const MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const head = (m: string) => `${MS[+m.slice(5) - 1]} ${m.slice(2, 4)}`;

/* ------------------------------------------------------------ rows */

type Cell = { v: number; how?: CellHow | 'total' };
type RowKind = 'section' | 'cat' | 'line' | 'total' | 'add' | 'calc';
interface Row {
  key: string; kind: RowKind; label: string; sub?: string;
  ref?: string;                       // e:<id> | p:<id> | r:<id> (received) | cap  (editable rows only)
  values: Record<string, Cell>;
  expense?: Expense; product?: Product; catId?: number; addKind?: 'income' | 'expense' | 'category';
  strong?: boolean; tone?: 'cash';
}
const editable = (r?: Row) => !!r && r.kind === 'line' && !!r.ref;

const PRODUCT_SUB: Record<string, string> = { billed: 'billed monthly, clients’ minimums', figures: 'changes month to month', fixed: 'same every month', once: 'only months typed in' };
const EXPENSE_SUB: Record<string, string> = { monthly: 'same every month', varies: 'repeats the last figure', once: 'one-off' };

function buildRows(rw: Runway, months: string[]): Row[] {
  const { data, summary: s } = rw;
  const g = s.grid;
  const rows: Row[] = [];
  const sum = (list: Row[]) => Object.fromEntries(months.map(m => [m, { v: list.reduce((a, r) => a + (r.values[m]?.v || 0), 0), how: 'total' as const }]));

  rows.push({ key: 'h-inc', kind: 'section', label: 'Money coming in', values: {} });
  const inc: Row[] = data.products.map(p => {
    const ps = s.products.find(x => x.id === p.id);
    return { key: `p${p.id}`, kind: 'line', label: p.name, sub: PRODUCT_SUB[p.tracking] + (p.pay_delay ? ', paid the month after' : ''), ref: `p:${p.id}`, product: p,
      values: Object.fromEntries(Object.entries(ps?.grid || {}).map(([m, c]) => [m, { v: c.v, how: c.how }])) };
  });
  rows.push(...inc);
  // under each income line: what actually came in, and what is still owed (or was paid ahead)
  for (const r of inc) {
    const ps = s.products.find(x => x.id === r.product!.id);
    if (!ps?.cash) continue;
    rows.splice(rows.indexOf(r) + 1, 0,
      { key: `r${r.product!.id}`, kind: 'line', label: 'Received', sub: 'what came in; blank = as expected', ref: `r:${r.product!.id}`, product: r.product,
        values: Object.fromEntries(Object.entries(ps.cash).map(([m, c]) => [m, { v: c.received ?? c.cash, how: (c.received != null ? 'typed' : m < s.current_month ? 'rule' : 'forecast') as CellHow }])) });
    const owed = Object.entries(ps.cash).filter(([, c]) => Math.abs(c.owed_after) >= 1);
    if (owed.length) rows.splice(rows.indexOf(r) + 2, 0,
      { key: `o${r.product!.id}`, kind: 'calc', label: 'Still owed', sub: 'minus = paid ahead',
        values: Object.fromEntries(Object.entries(ps.cash).map(([m, c]) => [m, { v: c.owed_after, how: 'total' as const }])) });
  }
  rows.push({ key: 'add-inc', kind: 'add', label: 'Add an income line', sub: 'e.g. onboarding fees, set-up fees', addKind: 'income', values: {} });
  rows.push({ key: 't-inc', kind: 'total', label: 'Total billed', values: sum(inc), strong: true });   // inc = bill lines only
  if (data.products.some(p => p.pay_delay)) {
    rows.push({ key: 'c-recv', kind: 'calc', label: 'Money received that month', sub: 'bills paid the month after arrive then',
      values: Object.fromEntries(months.map(m => [m, { v: g.income_total[m] || 0, how: 'total' as const }])) });
  }

  rows.push({ key: 'h-exp', kind: 'section', label: 'Money going out', values: {} });
  const allExp: Row[] = [];
  for (const c of data.categories) {
    const lines: Row[] = data.expenses.filter(e => e.category_id === c.id).map(e => ({
      key: `e${e.id}`, kind: 'line', label: e.name, ref: `e:${e.id}`, expense: e, catId: c.id,
      sub: e.how === 'monthly' ? `same every month${e.raise ? `, +${e.raise}% each April` : ''}` : EXPENSE_SUB[e.how],
      values: Object.fromEntries(Object.entries(g.expenses[String(e.id)] || {}).map(([m, x]) => [m, { v: x.v, how: x.how }])),
    }));
    rows.push({ key: `c${c.id}`, kind: 'cat', label: c.name, catId: c.id, values: sum(lines) });
    rows.push(...lines);
    rows.push({ key: `add-e${c.id}`, kind: 'add', label: `Add a line to ${c.name}`, addKind: 'expense', catId: c.id, values: {} });
    allExp.push(...lines);
  }
  const linked: Row[] = data.products.filter(p => p.cost_label).map(p => {
    const ps = s.products.find(x => x.id === p.id);
    return { key: `lc${p.id}`, kind: 'calc', label: `${p.name} ${p.cost_label!.toLowerCase()}`, sub: 'grows with its income',
      values: Object.fromEntries(Object.entries(ps?.grid || {}).map(([m, c]) => [m, { v: c.cost, how: 'forecast' as CellHow }])) };
  });
  rows.push(...linked);
  const buffer: Row = { key: 'buf', kind: 'calc', label: `Safety buffer (${data.settings.buffer_pct}%)`, sub: 'added to months ahead',
    values: Object.fromEntries(Object.entries(g.buffer).map(([m, v]) => [m, { v, how: 'forecast' as CellHow }])) };
  rows.push(buffer);
  rows.push({ key: 'add-cat', kind: 'add', label: 'Add a category', addKind: 'category', values: {} });
  rows.push({ key: 't-exp', kind: 'total', label: 'Total going out', strong: true,
    values: Object.fromEntries(months.map(m => [m, { v: g.cost_total[m] || 0, how: 'total' as const }])) });

  rows.push({ key: 'net', kind: 'total', label: 'In minus out',
    values: Object.fromEntries(months.map(m => [m, { v: (g.income_total[m] || 0) - (g.cost_total[m] || 0), how: 'total' as const }])) });
  rows.push({ key: 'h-cap', kind: 'section', label: 'Money put in', values: {} });
  rows.push({ key: 'cap', kind: 'line', label: 'Capital', sub: 'type an amount into its month', ref: 'cap',
    values: Object.fromEntries(Object.entries(g.capital).filter(([, v]) => v).map(([m, v]) => [m, { v, how: 'typed' as CellHow }])) });
  rows.push({ key: 'cash', kind: 'total', label: 'Cash at the end of the month', strong: true, tone: 'cash',
    values: Object.fromEntries(months.map(m => [m, { v: g.cash[m] ?? 0, how: 'total' as const }])) });
  return rows;
}

/* ------------------------------------------------------------ the sheet */

type Pos = { r: number; c: number };
type Change = { row: string; month: string; amount: number | null };

export function Spreadsheet({ rw, apply, go }: { rw: Runway; apply: (r: Runway) => void; go: (t: string) => void }) {
  const toast = useToast();
  const s = rw.summary;
  const cur = s.current_month;
  const [ahead, setAhead] = useState(12);
  const months = useMemo(() => range(s.start_month <= cur ? s.start_month : cur, addM(cur, ahead - 1)), [s.start_month, cur, ahead]);
  const rows = useMemo(() => buildRows(rw, months), [rw, months]);

  const [active, setActive] = useState<Pos>(() => ({ r: Math.max(rows.findIndex(editable), 0), c: Math.max(months.indexOf(cur), 0) }));
  const [anchor, setAnchor] = useState<Pos>(active);
  const [editing, setEditing] = useState<{ text: string; fromBar?: boolean } | null>(null);
  const [fill, setFill] = useState<Pos | null>(null);       // fill-handle drag target
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ row: Row; x: number; y: number } | null>(null);
  const [adding, setAdding] = useState<{ key: string; name: string; kind?: 'once' | 'figures' } | null>(null);
  const undo = useRef<Change[][]>([]);
  const dragging = useRef(false);
  const filling = useRef<Pos | null>(null);   // the fill drag, readable at once (state lags a render)
  const gridRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const sel = useMemo(() => ({
    r1: Math.min(active.r, anchor.r), r2: Math.max(active.r, anchor.r),
    c1: Math.min(active.c, anchor.c), c2: Math.max(active.c, anchor.c),
  }), [active, anchor]);
  const inSel = (r: number, c: number) => r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2;
  const selCells = () => {
    const out: { row: Row; m: string }[] = [];
    for (let r = sel.r1; r <= sel.r2; r++) if (editable(rows[r])) for (let c = sel.c1; c <= sel.c2; c++) out.push({ row: rows[r], m: months[c] });
    return out;
  };

  // open on the current month
  useEffect(() => {
    const el = scroller.current;
    const ci = months.indexOf(cur);
    if (el && ci > 2) el.scrollLeft = Math.max(0, (ci - 3) * 104);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { // keep the active cell in view
    const el = scroller.current?.querySelector<HTMLElement>(`[data-cell="${active.r}-${active.c}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  /* ---------- saving */

  const typedNow = useCallback((ref: string, m: string): number | null => {
    if (ref === 'cap') return rw.summary.grid.capital[m] || null;
    const [k, id] = ref.split(':');
    if (k === 'e') return rw.data.expenses.find(e => e.id === +id)?.months[m] ?? null;
    if (k === 'r') return rw.data.products.find(p => p.id === +id)?.received?.[m] ?? null;
    return rw.data.products.find(p => p.id === +id)?.months[m]?.revenue ?? null;
  }, [rw]);

  const save = useCallback(async (changes: Change[], note?: string, isUndo = false) => {
    if (!changes.length) return;
    if (!isUndo) undo.current.push(changes.map(c => ({ ...c, amount: typedNow(c.row, c.month) })));
    setBusy(true);
    try {
      apply(await api.saveCells(changes));
      if (note) toast(note);
    } catch (e: any) {
      if (!isUndo) undo.current.pop();
      toast(e.message || 'Could not save.');
    } finally { setBusy(false); }
  }, [apply, toast, typedNow]);

  // Enter commits and moves focus; the input then blurs and would commit the same cell again.
  const lastCommit = useRef(0);
  const commit = (text: string, move?: 'down' | 'right' | 'none') => {
    if (Date.now() - lastCommit.current < 250) return true;
    lastCommit.current = Date.now();
    const v = parseAmount(text);
    if (v !== null && (isNaN(v) || v < 0)) { toast('That is not an amount. Try 150000, 1.5L, 50k or =150000*1.1'); return false; }
    const targets = (sel.r1 !== sel.r2 || sel.c1 !== sel.c2) ? selCells() : (editable(rows[active.r]) ? [{ row: rows[active.r], m: months[active.c] }] : []);
    setEditing(null);
    if (!targets.length) return true;
    save(targets.map(t => ({ row: t.row.ref!, month: t.m, amount: v })), targets.length > 1 ? `Filled ${targets.length} cells` : undefined);
    if (move === 'down') moveTo({ r: nextRow(active.r, 1), c: active.c });
    if (move === 'right') moveTo({ r: active.r, c: Math.min(active.c + 1, months.length - 1) });
    gridRef.current?.focus();
    return true;
  };

  /* ---------- moving */

  const nextRow = (r: number, d: number) => {
    let i = r + d;
    while (i >= 0 && i < rows.length && (rows[i].kind === 'section' || rows[i].kind === 'add')) i += d;
    return i < 0 || i >= rows.length ? r : i;
  };
  const moveTo = (p: Pos, extend = false) => { setActive(p); if (!extend) setAnchor(p); };

  const fillFrom = (dir: 'right' | 'down', target?: { r2: number; c2: number }) => {
    const changes: Change[] = [];
    const r2 = target?.r2 ?? sel.r2, c2 = target?.c2 ?? sel.c2;
    if (dir === 'right') {
      const srcCols = target ? range(months[sel.c1], months[sel.c2]).map(m => months.indexOf(m)) : [sel.c1];
      for (let r = sel.r1; r <= sel.r2; r++) {
        if (!editable(rows[r])) continue;
        for (let c = (target ? sel.c2 + 1 : sel.c1 + 1), k = 0; c <= c2; c++, k++) {
          const src = srcCols[k % srcCols.length];
          changes.push({ row: rows[r].ref!, month: months[c], amount: rows[r].values[months[src]]?.v ?? null });
        }
      }
    } else {
      for (let c = sel.c1; c <= sel.c2; c++) {
        const srcRows = target ? Array.from({ length: sel.r2 - sel.r1 + 1 }, (_, i) => sel.r1 + i) : [sel.r1];
        for (let r = (target ? sel.r2 + 1 : sel.r1 + 1), k = 0; r <= r2; r++, k++) {
          if (!editable(rows[r])) continue;
          const src = srcRows[k % srcRows.length];
          changes.push({ row: rows[r].ref!, month: months[c], amount: rows[src].values[months[c]]?.v ?? null });
        }
      }
    }
    if (changes.length) save(changes, `Filled ${changes.length} cell${changes.length > 1 ? 's' : ''}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (editing) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); const last = undo.current.pop(); if (last) save(last, 'Undone', true); return; }
    if (mod && k.toLowerCase() === 'r') { e.preventDefault(); fillFrom('right'); return; }
    if (mod && k.toLowerCase() === 'd') { e.preventDefault(); fillFrom('down'); return; }
    if (mod && k.toLowerCase() === 'c') { e.preventDefault(); copy(); return; }
    if (mod && k.toLowerCase() === 'a') { e.preventDefault(); setAnchor({ r: 0, c: 0 }); setActive({ r: rows.length - 1, c: months.length - 1 }); return; }
    if (mod) return;
    const ext = e.shiftKey;
    const step: Record<string, Pos> = { ArrowDown: { r: nextRow(active.r, 1), c: active.c }, ArrowUp: { r: nextRow(active.r, -1), c: active.c },
      ArrowRight: { r: active.r, c: Math.min(active.c + 1, months.length - 1) }, ArrowLeft: { r: active.r, c: Math.max(active.c - 1, 0) } };
    if (step[k]) { e.preventDefault(); moveTo(step[k], ext); return; }
    if (k === 'Tab') { e.preventDefault(); moveTo({ r: active.r, c: Math.min(Math.max(active.c + (e.shiftKey ? -1 : 1), 0), months.length - 1) }); return; }
    if (k === 'Enter') { e.preventDefault(); moveTo({ r: nextRow(active.r, e.shiftKey ? -1 : 1), c: active.c }); return; }
    if (k === 'F2') { e.preventDefault(); startEdit(); return; }
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      const t = selCells();
      if (t.length) save(t.map(x => ({ row: x.row.ref!, month: x.m, amount: null })), t.length > 1 ? `Cleared ${t.length} cells` : 'Cleared');
      return;
    }
    if (k.length === 1 && /[\d.=₹]/.test(k)) { e.preventDefault(); startEdit(k); }
  };

  const startEdit = (first?: string) => {
    const row = rows[active.r];
    if (!editable(row)) { if (row?.kind === 'calc' || row?.kind === 'total') toast('This row is worked out from the lines above it.'); return; }
    const v = row.values[months[active.c]];
    setEditing({ text: first ?? (v && v.how === 'typed' ? String(Math.round(v.v)) : '') });
  };

  /* ---------- clipboard */

  const copy = () => {
    const lines: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      if (rows[r].kind === 'section' || rows[r].kind === 'add') continue;
      const cells = [];
      for (let c = sel.c1; c <= sel.c2; c++) { const v = rows[r].values[months[c]]?.v; cells.push(v == null ? '' : String(Math.round(v))); }
      lines.push(cells.join('\t'));
    }
    navigator.clipboard?.writeText(lines.join('\n')).then(() => toast('Copied. Paste it into Excel or back here.')).catch(() => {});
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editing || !gridRef.current?.contains(document.activeElement)) return;
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      const block = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t'));
      const changes: Change[] = [];
      let bad = 0, r = active.r;
      for (const line of block) {
        while (r < rows.length && !editable(rows[r])) r++;
        if (r >= rows.length) break;
        line.forEach((raw, j) => {
          const c = active.c + j;
          if (c >= months.length || raw.trim() === '') return;
          const v = parseAmount(raw);
          if (v === null || isNaN(v) || v < 0) { bad++; return; }
          changes.push({ row: rows[r].ref!, month: months[c], amount: v });
        });
        r++;
      }
      if (changes.length) save(changes, `Pasted ${changes.length} cell${changes.length > 1 ? 's' : ''}${bad ? `, skipped ${bad} that were not amounts` : ''}`);
      else toast('Nothing to paste here. Paste onto a line, not a total.');
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [active, editing, rows, months, save, toast]);

  /* ---------- mouse */

  // While dragging the fill corner (or a selection), follow the pointer: works however fast it moves.
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!filling.current && !dragging.current) return;
      const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-cell]');
      if (!el) return;
      const [r, c] = el.dataset.cell!.split('-').map(Number);
      if (filling.current) { if (filling.current.r !== r || filling.current.c !== c) { filling.current = { r, c }; setFill({ r, c }); } }
      else if (active.r !== r || active.c !== c) setActive({ r, c });
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [active]);

  useEffect(() => {
    const up = (e: MouseEvent) => {
      dragging.current = false;
      const f = filling.current;
      if (f) {
        filling.current = null;
        // where the pointer was let go counts, even if no move event landed on that cell
        const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-cell]');
        const [r, c] = el ? el.dataset.cell!.split('-').map(Number) : [f.r, f.c];
        const right = c > sel.c2 && (c - sel.c2) >= (r - sel.r2);
        if (right) fillFrom('right', { r2: sel.r2, c2: c });
        else if (r > sel.r2) fillFrom('down', { r2: r, c2: sel.c2 });
        setFill(null);
      }
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  });

  const cellDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (editing) commit(editing.text, 'none');
    if (e.shiftKey) setActive({ r, c }); else moveTo({ r, c });
    dragging.current = true;
    gridRef.current?.focus();
  };
  const cellEnter = (r: number, c: number) => {
    if (filling.current) { filling.current = { r, c }; setFill({ r, c }); }
    else if (dragging.current) setActive({ r, c });
  };

  /* ---------- lines */

  const addLine = async () => {
    if (!adding || !adding.name.trim()) { setAdding(null); return; }
    const row = rows.find(r => r.key === adding.key)!;
    setBusy(true);
    try {
      if (row.addKind === 'category') {
        apply(await api.addCategory(adding.name.trim()));
      } else if (row.addKind === 'expense') {
        apply(await api.addExpense({ category_id: row.catId, name: adding.name.trim(), how: 'varies', amount: 0, start_month: s.start_month }));
        toast('Line added. Type its figures into the months.');
      } else {
        apply(await api.addProduct({ name: adding.name.trim(), tracking: adding.kind || 'once', start_month: cur }));
        toast('Line added. Type its amounts into the months.');
      }
      setAdding(null);
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };

  const activeRow = rows[active.r];
  const activeMonth = months[active.c];
  const activeCell = activeRow?.values[activeMonth];
  const count = (sel.r2 - sel.r1 + 1) * (sel.c2 - sel.c1 + 1);
  const editableCount = selCells().length;
  const curCol = months.indexOf(cur);

  const howText = (row?: Row, cell?: Cell) => {
    if (!row || row.kind === 'section' || row.kind === 'add') return '';
    if (row.kind !== 'line') return 'Worked out from the lines above';
    if (!cell) return activeMonth < cur ? 'Nothing for this month' : 'Nothing planned';
    return ({ typed: 'Typed in', rule: 'Follows the line’s rule', forecast: 'Forecast from past months', minimum: 'Clients’ minimums',
      estimated: 'Estimated from figures (no final total yet)', so_far: 'This month so far, carried to month end', total: '' } as Record<string, string>)[cell.how || 'typed'];
  };

  return (
    <div className="flex flex-col gap-3">
      {/* formula bar */}
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex-1 min-w-[280px] flex items-stretch bg-white border border-[#D0D5DD] rounded-[10px] overflow-hidden">
          <div className="px-3 flex items-center text-[13px] font-semibold text-[#344054] bg-[#F6F7F9] border-r border-[#E4E7EC] max-w-[46%] truncate" title={activeRow ? `${activeRow.label} · ${mLong(activeMonth)}` : ''}>
            {count > 1 ? `${editableCount} cells selected` : activeRow && activeRow.kind !== 'section' ? `${activeRow.label} · ${head(activeMonth)}` : '—'}
          </div>
          <span className="px-2 flex items-center text-[13px] italic text-[#8A94A3] select-none">fx</span>
          <input
            aria-label="Value of the selected cell"
            className="flex-1 min-w-0 px-2 py-2 text-[14px] tabular-nums outline-none"
            value={editing?.fromBar ? editing.text : (activeCell ? String(Math.round(activeCell.v)) : '')}
            placeholder={editable(activeRow) ? (count > 1 ? `Type once to fill all ${editableCount}` : 'Type an amount: 150000, 1.5L, 50k') : ''}
            readOnly={!editable(activeRow)}
            onFocus={() => editable(activeRow) && setEditing({ text: activeCell?.how === 'typed' ? String(Math.round(activeCell.v)) : '', fromBar: true })}
            onChange={e => setEditing({ text: e.target.value, fromBar: true })}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commit(editing?.text ?? '', 'none'); }
              if (e.key === 'Escape') { setEditing(null); gridRef.current?.focus(); }
            }}
            onBlur={() => editing?.fromBar && setEditing(null)}
          />
          <div className="px-3 hidden md:flex items-center text-[12px] text-[#8A94A3] border-l border-[#E4E7EC] whitespace-nowrap">{busy ? 'Saving…' : howText(activeRow, activeCell)}</div>
        </div>
        <button type="button" disabled={!undo.current.length || busy} onClick={() => { const last = undo.current.pop(); if (last) save(last, 'Undone', true); }}
          className="inline-flex items-center gap-1.5 px-3 rounded-[10px] border border-[#E4E7EC] bg-white text-[13.5px] font-medium disabled:opacity-40" title="Undo (Ctrl/Cmd + Z)">
          <Undo2 className="w-4 h-4" />Undo
        </button>
        <div className="inline-flex items-center rounded-[10px] border border-[#E4E7EC] bg-white overflow-hidden text-[13px]">
          <span className="px-2.5 text-[#8A94A3]">Ahead</span>
          {[6, 12, 24, 36].map(n => (
            <button key={n} type="button" onClick={() => setAhead(n)} className={cn('px-2.5 py-2 font-medium', ahead === n ? 'bg-[#0E1726] text-white' : 'text-[#526070] hover:bg-[#F0F2F5]')}>{n}m</button>
          ))}
        </div>
      </div>

      {/* grid */}
      <div ref={gridRef} tabIndex={0} onKeyDown={onKey} role="grid" aria-label="Runway sheet" aria-rowcount={rows.length} aria-colcount={months.length + 1}
        className="outline-none bg-white border border-[#D0D5DD] rounded-[12px] overflow-hidden select-none">
        {/* scroll padding keeps a cell scrolled into view clear of the pinned line names and month header */}
        <div ref={scroller} className="overflow-auto max-h-[72vh]" style={{ scrollPaddingLeft: 262, scrollPaddingTop: 54 }}>
          <table className="border-separate border-spacing-0 text-[13px] tabular-nums table-fixed" style={{ width: 260 + months.length * 104 + 96 }}>
            <colgroup>
              <col style={{ width: 260 }} />
              {months.map(m => <col key={m} style={{ width: 104 }} />)}
              <col style={{ width: 96 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 bg-[#F6F7F9] border-b border-r border-[#D0D5DD] text-left px-3 py-2 w-[260px] min-w-[260px] font-semibold text-[#344054]">Line</th>
                {months.map((m, c) => (
                  <th key={m} onMouseDown={e => { moveTo({ r: nextRow(-1, 1), c }); setAnchor({ r: nextRow(-1, 1), c }); setActive({ r: rows.length - 1, c }); e.preventDefault(); gridRef.current?.focus(); }}
                    className={cn('sticky top-0 z-20 border-b border-r border-[#E4E7EC] px-2 py-2 text-right w-[104px] min-w-[104px] font-semibold cursor-pointer',
                      m === cur ? 'bg-[#EEF2FF] text-[#2F54EB]' : m > cur ? 'bg-[#F6F7F9] text-[#526070]' : 'bg-[#F6F7F9] text-[#344054]',
                      c === curCol && 'border-l-2 border-l-[#2F54EB]')}>
                    <div>{head(m)}</div>
                    <div className="text-[10.5px] font-medium opacity-70">{m < cur ? 'actual' : m === cur ? 'now' : 'plan'}</div>
                  </th>
                ))}
                <th className="sticky top-0 z-20 bg-[#F6F7F9] border-b border-[#E4E7EC] px-2">
                  <button type="button" onClick={() => setAhead(a => Math.min(a + 1, 36))} disabled={ahead >= 36} title="Show one more month"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2F54EB] px-2 py-1 rounded-md hover:bg-[#EEF2FF] disabled:opacity-40 whitespace-nowrap"><Plus className="w-3.5 h-3.5" />Month</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => {
                if (row.kind === 'section') return (
                  <tr key={row.key}>
                    <td className="sticky left-0 z-10 bg-[#0E1726] text-white text-[12px] font-semibold uppercase tracking-[.06em] px-3 py-1.5 border-r border-[#0E1726]">{row.label}</td>
                    <td colSpan={months.length + 1} className="bg-[#0E1726]" />
                  </tr>
                );
                if (row.kind === 'add') {
                  const on = adding?.key === row.key;
                  return (
                    <tr key={row.key}>
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-[#E4E7EC] px-2 py-1">
                        {on ? (
                          <div className="flex flex-col gap-1 py-0.5">
                            <input autoFocus value={adding!.name} onChange={e => setAdding({ ...adding!, name: e.target.value })} maxLength={160}
                              onKeyDown={e => { if (e.key === 'Enter') addLine(); if (e.key === 'Escape') setAdding(null); e.stopPropagation(); }}
                              placeholder={row.addKind === 'category' ? 'Category name, e.g. Marketing' : row.addKind === 'income' ? 'e.g. Onboarding fees' : 'e.g. Priya salary'}
                              className="w-full border border-[#2F54EB] rounded-md px-2 py-1 text-[13px] outline-none" />
                            {row.addKind === 'income' && (
                              <select value={adding!.kind || 'once'} onChange={e => setAdding({ ...adding!, kind: e.target.value as 'once' | 'figures' })}
                                className="border border-[#D0D5DD] rounded-md px-1.5 py-1 text-[12px]">
                                <option value="once">Only the months I type (fees, one-offs)</option>
                                <option value="figures">Every month, forecast from past months</option>
                              </select>
                            )}
                            <div className="flex gap-1.5">
                              <button type="button" onClick={addLine} disabled={busy} className="px-2 py-0.5 rounded-md bg-[#0E1726] text-white text-[12px] font-medium">Add</button>
                              <button type="button" onClick={() => setAdding(null)} className="px-2 py-0.5 rounded-md text-[12px] text-[#526070]">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setAdding({ key: row.key, name: '' })} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#2F54EB] hover:underline py-0.5">
                            <Plus className="w-3.5 h-3.5" />{row.label}{row.sub && <span className="text-[#8A94A3] font-normal">· {row.sub}</span>}
                          </button>
                        )}
                      </td>
                      <td colSpan={months.length + 1} className="border-b border-[#E4E7EC]" />
                    </tr>
                  );
                }
                const isLine = row.kind === 'line';
                return (
                  <tr key={row.key} className="group">
                    <td className={cn('sticky left-0 z-10 border-b border-r border-[#D0D5DD] px-3 py-1 w-[260px] min-w-[260px]',
                      row.kind === 'cat' ? 'bg-[#F6F7F9]' : row.kind === 'total' ? 'bg-[#FAFAFB]' : 'bg-white')}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn('flex-1 min-w-0', isLine && 'pl-2')}>
                          <div className={cn('truncate', row.strong || row.kind === 'cat' ? 'font-semibold text-[#0E1726]' : 'text-[#0E1726]', row.kind === 'calc' && 'text-[#526070]')} title={row.label}>{row.label}</div>
                          {row.sub && <div className="text-[11px] text-[#8A94A3] truncate" title={row.sub}>{row.sub}</div>}
                        </div>
                        {isLine && row.ref !== 'cap' && !row.ref?.startsWith('r:') && (
                          <button type="button" aria-label={`Options for ${row.label}`} onClick={e => { const b = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ row, x: b.left, y: b.bottom + 4 }); }}
                            className="p-1 rounded text-[#8A94A3] hover:text-[#0E1726] hover:bg-[#F0F2F5] opacity-60 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                    {months.map((m, c) => {
                      const cell = row.values[m];
                      const on = active.r === r && active.c === c;
                      const selected = inSel(r, c);
                      const isFill = fill && r >= sel.r1 && c >= sel.c1 && r <= Math.max(fill.r, sel.r2) && c <= Math.max(fill.c, sel.c2) && !selected
                        && ((fill.c - sel.c2) >= (fill.r - sel.r2) ? r <= sel.r2 : c <= sel.c2);
                      const corner = r === sel.r2 && c === sel.c2 && !editing;
                      const v = cell?.v;
                      return (
                        <td key={m} data-cell={`${r}-${c}`}
                          onMouseDown={e => cellDown(r, c, e)} onMouseEnter={() => cellEnter(r, c)} onDoubleClick={() => startEdit()}
                          className={cn('relative border-b border-r border-[#EEF0F3] px-2 py-1 text-right h-[38px] cursor-cell',
                            m > cur && 'bg-[#FBFCFE]', m === cur && 'bg-[#F7F8FF]', c === curCol && 'border-l-2 border-l-[#C7D2FE]',
                            row.kind === 'cat' && 'bg-[#F6F7F9] font-semibold', row.kind === 'total' && 'bg-[#FAFAFB] font-semibold',
                            row.tone === 'cash' && v != null && v < 0 && 'text-[#D64545]',
                            selected && 'bg-[#EEF2FF]', isFill && 'bg-[#F5F7FF] outline outline-1 outline-dashed outline-[#2F54EB]',
                            on && 'outline outline-2 outline-[#2F54EB] -outline-offset-2 z-[5]')}>
                          {on && editing && !editing.fromBar ? (
                            <input autoFocus value={editing.text} onChange={e => setEditing({ text: e.target.value })}
                              onKeyDown={e => {
                                e.stopPropagation();
                                if (e.key === 'Enter') { e.preventDefault(); commit(editing.text, 'down'); }
                                else if (e.key === 'Tab') { e.preventDefault(); commit(editing.text, 'right'); }
                                else if (e.key === 'Escape') { setEditing(null); gridRef.current?.focus(); }
                              }}
                              onBlur={() => editing && commit(editing.text, 'none')}
                              className="absolute inset-0 w-full h-full px-2 text-right text-[13px] tabular-nums outline-none bg-white border-2 border-[#2F54EB]" />
                          ) : (
                            <span className={cn(
                              cell?.how === 'typed' && 'text-[#1D4ED8]',
                              (cell?.how === 'rule' || cell?.how === 'forecast' || cell?.how === 'minimum') && 'text-[#667085]',
                              (cell?.how === 'estimated' || cell?.how === 'so_far') && 'text-[#667085] italic',
                              cell?.how === 'total' && (row.tone === 'cash' && v != null && v < 0 ? 'text-[#D64545]' : 'text-[#0E1726]'))}>
                              {v == null || (Math.round(v) === 0 && cell?.how !== 'typed') ? (isLine ? '' : '–') : fmt(v)}
                            </span>
                          )}
                          {corner && editable(rows[sel.r2]) && (
                            <span onMouseDown={e => { e.stopPropagation(); e.preventDefault(); filling.current = { r: sel.r2, c: sel.c2 }; setFill({ r: sel.r2, c: sel.c2 }); }}
                              title="Drag to copy right or down"
                              className="absolute -right-[4px] -bottom-[4px] w-[8px] h-[8px] bg-[#2F54EB] border border-white cursor-crosshair z-[6]" />
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-[#EEF0F3]" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[#667085]">
        <span><b className="text-[#1D4ED8] font-semibold">Blue</b> = typed in</span>
        <span><b className="text-[#667085] font-semibold">Grey</b> = worked out (rule or forecast)</span>
        <span>Select many cells and type once to fill them all</span>
        <span>Paste from Excel with Ctrl/Cmd + V</span>
        <span>Drag the blue corner to copy right</span>
        <span>Delete clears · Ctrl/Cmd + Z undoes</span>
      </div>

      {menu && <RowMenu menu={menu} rw={rw} month={activeMonth} cur={cur} apply={apply} onClose={() => setMenu(null)} go={go} />}
    </div>
  );
}

/* ------------------------------------------------------------ ⋯ menu for a line */

function RowMenu({ menu, rw, month, cur, apply, onClose, go }: { menu: { row: Row; x: number; y: number }; rw: Runway; month: string; cur: string; apply: (r: Runway) => void; onClose: () => void; go: (t: string) => void }) {
  const toast = useToast();
  const { row } = menu;
  const e = row.expense, p = row.product;
  const [mode, setMode] = useState<'menu' | 'rename' | 'from'>('menu');
  const [name, setName] = useState(row.label);
  const [fromMonth, setFromMonth] = useState(month >= cur ? month : cur);
  const [amount, setAmount] = useState(String(Math.round(row.values[month]?.v || e?.amount || 0)));
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (ev: MouseEvent) => { if (!ref.current?.contains(ev.target as Node)) onClose(); };
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const run = async (fn: () => Promise<Runway>, note: string, undo?: () => Promise<Runway>) => {
    setBusy(true);
    try { apply(await fn()); toast(note, undo ? async () => apply(await undo()) : undefined); onClose(); }
    catch (err: any) { toast(err.message); } finally { setBusy(false); }
  };
  const setHow = (how: 'monthly' | 'varies') => e && run(() => api.updateExpense(e.id, {
    category_id: e.category_id, name: e.name, how, amount: how === 'monthly' ? Math.round(row.values[cur]?.v || e.amount) : e.amount,
    start_month: e.start, end_month: e.end, raise_pct: how === 'monthly' ? e.raise : 0,
  }), how === 'monthly' ? 'Now the same every month' : 'Now repeats the last figure');
  const months = range(rw.summary.start_month, addM(cur, 35));
  const item = 'w-full text-left px-3 py-2 rounded-lg text-[13.5px] hover:bg-[#F0F2F5] disabled:opacity-50';
  const input = 'w-full border border-[#D0D5DD] rounded-lg px-2.5 py-1.5 text-[13.5px] outline-none focus:border-[#2F54EB]';

  return (
    <div ref={ref} role="menu" style={{ left: Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300), top: menu.y }}
      className="fixed z-[60] w-[288px] bg-white border border-[#E4E7EC] rounded-[14px] shadow-[0_12px_32px_rgba(14,23,38,.14)] p-1.5 normal-case">
      <div className="px-3 pt-1.5 pb-1 text-[12px] font-semibold text-[#8A94A3] truncate">{row.label}</div>
      {mode === 'menu' && (<>
        <button type="button" role="menuitem" className={item} onClick={() => setMode('rename')}>Rename</button>
        {e && e.how !== 'once' && <button type="button" role="menuitem" className={item} onClick={() => setMode('from')}>From a month on, it is…</button>}
        {e && e.how !== 'once' && (
          <div className="px-3 py-2">
            <div className="text-[12px] text-[#8A94A3] mb-1">Months ahead</div>
            <div className="flex gap-1">
              {(['monthly', 'varies'] as const).map(h => (
                <button key={h} type="button" disabled={busy || e.how === h} onClick={() => setHow(h)}
                  className={cn('flex-1 px-2 py-1.5 rounded-lg text-[12.5px] border', e.how === h ? 'border-[#2F54EB] text-[#2F54EB] bg-[#EEF2FF]' : 'border-[#E4E7EC] hover:bg-[#F0F2F5]')}>
                  {h === 'monthly' ? 'Same every month' : 'Repeat last figure'}
                </button>
              ))}
            </div>
          </div>
        )}
        {e && rw.data.categories.length > 1 && (
          <div className="px-3 py-2">
            <div className="text-[12px] text-[#8A94A3] mb-1">Category</div>
            <select className={input} value={e.category_id} onChange={ev => run(() => api.editRow('expense', e.id, { category_id: +ev.target.value }), 'Moved')}>
              {rw.data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {p && <button type="button" role="menuitem" className={item} onClick={() => { onClose(); go('income'); }}>Clients, figures and settings…</button>}
        <button type="button" role="menuitem" disabled={busy} className={cn(item, 'text-[#D64545]')}
          onClick={() => e ? run(() => api.deleteExpense(e.id), `Deleted ${e.name}`, () => api.restore('expense', e.id))
            : p && run(() => api.deleteProduct(p.id), `Deleted ${p.name}`, () => api.restore('product', p.id))}>Delete line</button>
      </>)}
      {mode === 'rename' && (
        <form className="p-2 flex flex-col gap-2" onSubmit={ev => { ev.preventDefault(); if (name.trim()) run(() => api.editRow(e ? 'expense' : 'product', (e || p)!.id, { name: name.trim() }), 'Renamed'); }}>
          <input autoFocus className={input} value={name} onChange={ev => setName(ev.target.value)} maxLength={160} />
          <div className="flex justify-end gap-1.5"><button type="button" onClick={() => setMode('menu')} className="px-2.5 py-1 text-[13px] text-[#526070]">Back</button>
            <button type="submit" disabled={busy} className="px-3 py-1 rounded-lg bg-[#0E1726] text-white text-[13px]">Save</button></div>
        </form>
      )}
      {mode === 'from' && e && (
        <form className="p-2 flex flex-col gap-2" onSubmit={ev => {
          ev.preventDefault();
          const v = parseAmount(amount);
          if (v == null || isNaN(v) || v < 0) { toast('Type an amount, e.g. 90000 or 90k'); return; }
          run(() => api.expenseFrom(e.id, fromMonth, v), `${e.name}: ${Math.round(v).toLocaleString('en-IN')} a month from ${mLong(fromMonth)}`);
        }}>
          <div className="text-[12.5px] text-[#526070]">Every month from the month you pick, same amount. Earlier months stay as they are.</div>
          <select className={input} value={fromMonth} onChange={ev => setFromMonth(ev.target.value)} aria-label="From month">
            {months.map(m => <option key={m} value={m}>{mLong(m)}</option>)}
          </select>
          <input autoFocus className={cn(input, 'text-right tabular-nums')} value={amount} onChange={ev => setAmount(ev.target.value)} aria-label="Amount a month" />
          <div className="flex justify-end gap-1.5"><button type="button" onClick={() => setMode('menu')} className="px-2.5 py-1 text-[13px] text-[#526070]">Back</button>
            <button type="submit" disabled={busy} className="px-3 py-1 rounded-lg bg-[#0E1726] text-white text-[13px]">Save</button></div>
        </form>
      )}
    </div>
  );
}

export const _test = { parseAmount, mIdx };
