// Product Features: ideas the team raises, the Director's decision and why, and the tasks that built them.
// Backend: /api/v1/product-features

import type { PersonBrief } from './departmentTargets';

export type FeatureStatus = 'suggested' | 'planned' | 'building' | 'shipped' | 'not_doing';
export type FeatureSource = 'team' | 'customer' | 'director' | 'other';

export const STATUS_ORDER: FeatureStatus[] = ['suggested', 'planned', 'building', 'shipped', 'not_doing'];
export const STATUS_LABEL: Record<FeatureStatus, string> = {
  suggested: 'Suggested', planned: 'Planned', building: 'Building', shipped: 'Shipped', not_doing: 'Not doing',
};
export const SOURCE_LABEL: Record<FeatureSource, string> = {
  team: 'A teammate', customer: 'A customer', director: 'Sir', other: 'Someone else',
};
export const NEEDS_REASON: FeatureStatus[] = ['planned', 'not_doing'];

export interface FeatureSummary {
  id: number;
  code: string;            // "F-12"
  title: string;
  problem: string;
  idea: string | null;
  area: string | null;
  source: FeatureSource;
  source_note: string | null;
  status: FeatureStatus;
  status_label: string;
  decision_note: string | null;
  decided_by: PersonBrief | null;
  decided_at: string | null;
  shipped_at: string | null;
  created_by: PersonBrief | null;
  created_at: string | null;
  updated_at: string | null;
  tasks_total: number;
  tasks_done: number;
  me_too: number;
  me_too_mine: boolean;
  comments: number;
  solutions: number;
  chosen_solution: { id: number; text: string; by: PersonBrief | null } | null;
  products?: AppProduct[];
  money?: MoneyTotals | null;
}

export interface AppProduct { id: number; name: string }
export interface MoneyTotals {
  one_time_cost: number; monthly_cost: number; one_time_benefit: number; monthly_benefit: number;
  net_monthly: number; payback_months: number | null; net_first_year: number; return_first_year: number | null; has_benefit: boolean;
}
export interface CostLine { id?: number; side: 'cost' | 'benefit'; label: string; kind: 'one_time' | 'monthly'; amount: number | null; days: number | null; rate: number | null; note?: string | null }
export interface FeatureAttachment { id: number; filename: string; content_type: string; size: number; solution_id: number | null; is_image: boolean; by: PersonBrief | null; created_at: string | null; can_remove: boolean }

export interface FeatureSolution {
  id: number;
  text: string;
  by: PersonBrief | null;
  created_at: string | null;
  votes: number;
  voted: boolean;
  voters: PersonBrief[];
  chosen: boolean;
  mine: boolean;
  replies?: FeatureEvent[];
}

/** What the Task Center shows on a task: the feature it builds. */
export interface TaskFeatureLink { id: number; code: string; title: string; status: FeatureStatus; status_label: string }

export interface FeatureTask {
  id: number;
  title: string;
  status: string;
  done: boolean;
  deadline: string | null;
  assignee: PersonBrief | null;
  can_unlink?: boolean;
}

export type FeatureEventKind = 'created' | 'edited' | 'status' | 'comment' | 'me_too' | 'task_linked' | 'task_unlinked'
  | 'solution_added' | 'solution_edited' | 'solution_chosen' | 'attachment' | 'attachment_removed' | 'costs';

export interface FeatureEvent {
  id: number;
  kind: FeatureEventKind;
  user: PersonBrief | null;
  text: string | null;
  data: any;
  created_at: string | null;
}

export interface FeatureDetail extends FeatureSummary {
  tasks: FeatureTask[];
  solutions_list: FeatureSolution[];
  me_too_people: PersonBrief[];
  events: FeatureEvent[];
  permissions: { can_edit: boolean; can_decide: boolean; can_link: boolean; can_set_status?: boolean; can_cost?: boolean };
  products: AppProduct[];
  all_products: AppProduct[];
  attachments: FeatureAttachment[];
  costs: { lines: CostLine[]; totals: MoneyTotals | null };
}

export interface FeatureList {
  features: FeatureSummary[];
  counts: Record<FeatureStatus, number>;
  total: number;
  areas: string[];
  products?: AppProduct[];
  is_director: boolean;
  me: number;
}

export interface FeatureInput {
  title: string;
  problem: string;
  idea?: string | null;
  area?: string | null;
  source?: FeatureSource;
  source_note?: string | null;
}

const BASE = '/api/v1/product-features';

const headers = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body?.detail) ? body.detail.map((d: any) => d.msg).join(', ') : body?.detail;
    throw new Error(detail || body?.message || 'Something went wrong. Please try again.');
  }
  return body.data as T;
}

const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

export const productFeaturesService = {
  list: (p: { q?: string; status?: FeatureStatus | ''; area?: string; mine?: boolean; product?: number } = {}) => {
    const qs = new URLSearchParams();
    if (p.q?.trim()) qs.set('q', p.q.trim());
    if (p.status) qs.set('status', p.status);
    if (p.area) qs.set('area', p.area);
    if (p.mine) qs.set('mine', 'true');
    if (p.product) qs.set('product', String(p.product));
    const s = qs.toString();
    return call<FeatureList>(s ? `?${s}` : '');
  },
  get: (id: number) => call<FeatureDetail>(`/${id}`),
  create: (f: FeatureInput) => call<FeatureDetail>('', json('POST', f)),
  edit: (id: number, f: Partial<FeatureInput>) => call<FeatureDetail>(`/${id}`, json('PUT', f)),
  setStatus: (id: number, status: FeatureStatus, note?: string) => call<FeatureDetail>(`/${id}/status`, json('POST', { status, note })),
  comment: (id: number, text: string, solutionId?: number) => call<FeatureDetail>(`/${id}/comments`, json('POST', { text, solution_id: solutionId ?? null })),
  setProducts: (id: number, productIds: number[]) => call<FeatureDetail>(`/${id}/products`, json('PUT', { product_ids: productIds })),
  addProduct: (name: string) => call<AppProduct[]>('/products', json('POST', { name })),
  setCosts: (id: number, lines: CostLine[]) => call<FeatureDetail>(`/${id}/costs`, json('PUT', { lines })),
  removeAttachment: (id: number, aid: number) => call<FeatureDetail>(`/${id}/attachments/${aid}`, json('DELETE')),
  /** Upload with the sign-in token (multipart, so no JSON content type). */
  addAttachment: async (id: number, file: File, solutionId?: number): Promise<FeatureDetail> => {
    const fd = new FormData();
    fd.append('file', file, file.name || 'screenshot.png');
    if (solutionId) fd.append('solution_id', String(solutionId));
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
    const res = await fetch(`${BASE}/${id}/attachments`, { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.detail || 'Could not attach that file.');
    return body.data as FeatureDetail;
  },
  /** The file as a local object URL (images need the sign-in token, so a plain <img src> can't load them). */
  attachmentUrl: async (id: number, aid: number): Promise<string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
    const res = await fetch(`${BASE}/${id}/attachments/${aid}/file`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Could not open that file.');
    return URL.createObjectURL(await res.blob());
  },
  meToo: (id: number, text?: string) => call<FeatureDetail>(`/${id}/me-too`, json('POST', { text })),
  addSolution: (id: number, text: string) => call<FeatureDetail>(`/${id}/solutions`, json('POST', { text })),
  editSolution: (id: number, sid: number, text: string) => call<FeatureDetail>(`/${id}/solutions/${sid}`, json('PUT', { text })),
  voteSolution: (id: number, sid: number) => call<FeatureDetail>(`/${id}/solutions/${sid}/vote`, json('POST')),
  chooseSolution: (id: number, sid: number, note?: string) => call<FeatureDetail>(`/${id}/solutions/${sid}/choose`, json('POST', { note })),
  taskLinks: (taskIds: number[]) => taskIds.length
    ? call<Record<string, TaskFeatureLink[]>>(`/task-links?task_ids=${taskIds.join(',')}`)
    : Promise.resolve({} as Record<string, TaskFeatureLink[]>),
  linkableTasks: (id: number, q?: string) =>
    call<{ id: number; title: string; status: string; assignee: PersonBrief | null }[]>(`/${id}/linkable-tasks${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`),
  linkTask: (id: number, taskId: number) => call<FeatureDetail>(`/${id}/tasks`, json('POST', { task_id: taskId })),
  unlinkTask: (id: number, taskId: number) => call<FeatureDetail>(`/${id}/tasks/${taskId}`, json('DELETE')),
};
