// Runway: the CEO's view of money in, money out and break-even.
// Backend: /api/v1/runway (CEO only; everyone else gets 403).
// Every change returns the whole picture again, so the page never has to recompute anything.

export type How = 'monthly' | 'varies' | 'once';
export type Tracking = 'figures' | 'fixed' | 'billed' | 'once';
export type RunwayState = 'self_funding' | 'good' | 'watch' | 'risk';

export interface RunwaySettings { start_month: string; buffer_pct: number; green_months: number; amber_months: number }
export interface Category { id: number; name: string; sort_order: number }
export interface Expense {
  id: number; category_id: number; name: string; how: How; amount: number;
  start: string; end: string | null; raise: number;
  months: Record<string, number>;      // entered figures: past = paid, current/future = this month only
}
export interface Figure { id: number; day: string; revenue: number; cost: number | null; forecast: number | null }
export interface Client { id: number; name: string; minimum: number; fixed: number; start: string; end: string | null }
export interface Product {
  id: number; name: string; tracking: Tracking; cost_label: string | null; amount: number;
  start: string; end: string | null;
  pay_delay: number;          // months between a month's bill and the money arriving
  clients: Client[];          // billed products: each client's minimum monthly bill
  received?: Record<string, number>;   // what actually came in, by month (typed in the Sheet)
  figures: Figure[];
  months: Record<string, { revenue: number; cost: number }>;
}
export interface Capital { id: number; day: string; amount: number; note: string | null }

export interface RunwayData {
  settings: RunwaySettings;
  categories: Category[];
  expenses: Expense[];
  products: Product[];
  capital: Capital[];
  bank: { day: string; amount: number } | null;
}

export interface Pace {
  value: number; lo: number; hi: number; run?: number; rate?: number;
  day: number; days: number; so_far: number; as_of: string; product_forecast: number | null; cost_ratio: number | null;
  source?: 'product' | 'usage';   // billed products: the product's own expected bill, or usage lifted to the minimums
  committed?: number; expected_cost?: number | null;
}
export interface ProductSummary {
  id: number;
  current: Pace | null;
  expected_this_month?: number | null;
  months: { month: string; revenue: number | null; cost: number | null; how: 'final' | 'estimated' | 'missing' }[];
  cost_ratio: number;
  pay_delay: number;
  paid_this_month: number;       // money arriving this month (an earlier month's bill when paid later)
  billed_this_month: number;
  committed?: number; committed_next?: number; clients_live?: number;
  history_months?: number; trend?: boolean;
  /** Per month (billing month): the line's value and where it comes from. */
  grid: Record<string, { v: number; cost: number; how: CellHow }>;
  /** money reaching the bank: expected (the bill pay_delay back), what was typed as received, and what is still owed after */
  cash?: Record<string, { expected: number; received: number | null; cash: number; owed_after: number }>;
  owed_now?: number;
}
/** typed = entered by hand; rule = follows the line's "every month" amount or repeats the last figure;
 *  forecast = worked out from past months; minimum = clients' minimums; estimated / so_far = from figures. */
export type CellHow = 'typed' | 'rule' | 'forecast' | 'minimum' | 'estimated' | 'so_far';
export interface Confidence {
  score: number; label: 'low' | 'medium' | 'high';
  parts: Record<'history' | 'steady' | 'committed' | 'expenses' | 'fresh', number>;
  weights: Record<'history' | 'steady' | 'committed' | 'expenses' | 'fresh', number>;
  be_range: { early: string | null; expected: string | null; late: string | null };
  out_range: { early: string | null; expected: string | null; late: string | null };
  gaps: { key: string; text: string; fix: string }[];
}
export interface SheetGrid {
  expenses: Record<string, Record<string, { v: number; how: 'typed' | 'rule' }>>;
  capital: Record<string, number>;
  buffer: Record<string, number>;
  income_total: Record<string, number>;
  cost_total: Record<string, number>;
  cash: Record<string, number>;
}
export type Todo =
  | { kind: 'expenses_missing'; month: string; names: string[] }
  | { kind: 'product_month_estimated'; product_id: number; product: string; month: string; revenue: number }
  | { kind: 'product_figure_due'; product_id: number; product: string; days: number | null };

export interface Outlook { out: string | null; be: string | null; back: string | null; low?: string; low_cash?: number; runway: number | null }
export interface RunwaySummary {
  today: string; current_month: string; last_month: string; start_month: string;
  state: RunwayState;
  cash_now: number;
  now: { inc: number; cost: number; gap: number };
  expected: Outlook & { low: string; low_cash: number };
  slower: Outlook;
  faster: Outlook;
  confidence: Confidence;
  grid: SheetGrid;
  need: number;
  share_now: number | null;
  first_income_month: string | null;
  share_first: number | null;
  gap_change_3m: number | null;
  months: { month: string; inc: number; cost: number; cash: number; actual: boolean }[];
  where: { name: string; amount: number }[];
  products: ProductSummary[];
  planned: Record<string, Record<string, number>>;
  todo: Todo[];
  bank: { day: string; amount: number; calc: number; diff: number } | null;
  last_figure_day: string | null;
  settings: RunwaySettings;
}
export interface Runway { data: RunwayData; summary: RunwaySummary }
export type Glance = Pick<RunwaySummary, 'state' | 'current_month' | 'cash_now' | 'now' | 'expected' | 'slower' | 'need' | 'last_figure_day' | 'today' | 'todo'>;

export interface ExpenseInput {
  category_id?: number | null; new_category?: string | null; name: string; how: How; amount?: number;
  start_month?: string | null; end_month?: string | null; raise_pct?: number; once_month?: string | null; once_amount?: number | null;
}
export interface ProductInput { name: string; tracking: Tracking; cost_label?: string | null; amount?: number; start_month: string; end_month?: string | null; pay_delay?: number }
export interface ClientInput { name: string; minimum: number; fixed: number; start_month: string; end_month?: string | null }
export interface FigureInput { day: string; revenue: number; cost?: number | null; forecast?: number | null }

const BASE = '/api/v1/runway';
const headers = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export interface ImportProblem { row: number | null; column: string | null; message: string }
export interface ImportPreview {
  kind: 'monthly' | 'figures' | null;
  errors: ImportProblem[];
  warnings: string[];
  categories: string[];
  expenses: { row: number; name: string; category: string; how: How; start_month: string | null; end_month: string | null }[];
  products: { row: number; name: string; cost_label: string | null; start_month: string }[];
  summary?: {
    new_categories: number; new_expenses: number; new_products: number;
    new_values: number; changed_values: number; unchanged_values: number;
    by_target: Record<'expense' | 'product_month' | 'capital' | 'figure', number>;
    first_month: string | null; last_month: string | null;
    changes: { row: number; name: string; month: string; day: string | null; old: number; new: number; target: string }[];
  };
}

export class RunwayError extends Error { constructor(message: string, public status: number) { super(message); } }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body?.detail) ? body.detail.map((d: any) => d.msg).join(', ') : body?.detail;
    throw new RunwayError(detail || body?.message || 'Something went wrong. Please try again.', res.status);
  }
  return body.data as T;
}
const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });
type WithId = Runway & { id: number };

export const runwayService = {
  get: () => call<Runway>(''),
  glance: () => call<Glance>('/glance'),

  addCategory: (name: string) => call<Runway>('/categories', json('POST', { name })),
  renameCategory: (id: number, name: string) => call<Runway>(`/categories/${id}`, json('PUT', { name })),
  deleteCategory: (id: number) => call<Runway>(`/categories/${id}`, json('DELETE')),

  addExpense: (e: ExpenseInput) => call<WithId>('/expenses', json('POST', e)),
  updateExpense: (id: number, e: ExpenseInput) => call<Runway>(`/expenses/${id}`, json('PUT', e)),
  deleteExpense: (id: number) => call<Runway>(`/expenses/${id}`, json('DELETE')),
  setExpenseMonth: (id: number, month: string, amount: number | null) => call<Runway>(`/expenses/${id}/months/${month}`, json('PUT', { amount })),
  fillMonth: (month: string, onlyMissing = true) => call<Runway & { filled: number }>('/expenses/fill-month', json('POST', { month, only_missing: onlyMissing })),

  addProduct: (p: ProductInput) => call<WithId>('/products', json('POST', p)),
  updateProduct: (id: number, p: ProductInput) => call<Runway>(`/products/${id}`, json('PUT', p)),
  deleteProduct: (id: number) => call<Runway>(`/products/${id}`, json('DELETE')),
  addFigure: (pid: number, f: FigureInput) => call<WithId>(`/products/${pid}/figures`, json('POST', f)),
  updateFigure: (pid: number, fid: number, f: FigureInput) => call<Runway>(`/products/${pid}/figures/${fid}`, json('PUT', f)),
  deleteFigure: (pid: number, fid: number) => call<Runway>(`/products/${pid}/figures/${fid}`, json('DELETE')),
  setProductMonth: (pid: number, month: string, revenue: number, cost?: number | null) => call<Runway>(`/products/${pid}/months/${month}`, json('PUT', { revenue, cost: cost ?? null })),
  deleteProductMonth: (pid: number, month: string) => call<Runway>(`/products/${pid}/months/${month}`, json('DELETE')),

  addClient: (pid: number, c: ClientInput) => call<WithId>(`/products/${pid}/clients`, json('POST', c)),
  updateClient: (pid: number, cid: number, c: ClientInput) => call<Runway>(`/products/${pid}/clients/${cid}`, json('PUT', c)),
  deleteClient: (pid: number, cid: number) => call<Runway>(`/products/${pid}/clients/${cid}`, json('DELETE')),

  addCapital: (day: string, amount: number, note?: string) => call<WithId>('/capital', json('POST', { day, amount, note })),
  updateCapital: (id: number, day: string, amount: number, note?: string) => call<Runway>(`/capital/${id}`, json('PUT', { day, amount, note })),
  deleteCapital: (id: number) => call<Runway>(`/capital/${id}`, json('DELETE')),
  setBank: (day: string, amount: number) => call<Runway>('/bank', json('PUT', { day, amount })),
  updateSettings: (s: Partial<RunwaySettings>) => call<Runway>('/settings', json('PUT', s)),
  /** Saves the pre-filled CSV template to the computer. */
  downloadTemplate: async (kind: 'monthly' | 'figures') => {
    const res = await fetch(`${BASE}/template/${kind}`, { headers: headers() });
    if (!res.ok) throw new RunwayError('Could not download the template.', res.status);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = kind === 'monthly' ? 'runway-monthly-history.csv' : 'runway-product-figures.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  previewImport: (csv: string) => call<ImportPreview>('/import/preview', json('POST', { csv })),
  applyImport: (csv: string, replace: boolean) => call<Runway & { imported: { added: number; changed: number; kept: number; categories: number; expenses: number; products: number } }>('/import/apply', json('POST', { csv, replace })),
  /** The spreadsheet: many cells at once (typed, a filled range, a pasted block, an undo). null clears. */
  saveCells: (changes: { row: string; month: string; amount: number | null }[]) => call<Runway>('/cells', json('POST', { changes })),
  expenseFrom: (id: number, month: string, amount: number) => call<Runway>(`/expenses/${id}/from`, json('POST', { month, amount })),
  editRow: (kind: 'expense' | 'product', id: number, body: { name?: string; category_id?: number }) => call<Runway>(`/rows/${kind}/${id}`, json('PATCH', body)),
  restore: (kind: 'expense' | 'product' | 'figure' | 'capital' | 'category' | 'client', id: number) => call<Runway>(`/restore/${kind}/${id}`, json('POST')),
};
