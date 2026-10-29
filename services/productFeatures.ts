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
}

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
  | 'solution_added' | 'solution_edited' | 'solution_chosen';

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
  permissions: { can_edit: boolean; can_decide: boolean; can_link: boolean };
}

export interface FeatureList {
  features: FeatureSummary[];
  counts: Record<FeatureStatus, number>;
  total: number;
  areas: string[];
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
  list: (p: { q?: string; status?: FeatureStatus | ''; area?: string; mine?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (p.q?.trim()) qs.set('q', p.q.trim());
    if (p.status) qs.set('status', p.status);
    if (p.area) qs.set('area', p.area);
    if (p.mine) qs.set('mine', 'true');
    const s = qs.toString();
    return call<FeatureList>(s ? `?${s}` : '');
  },
  get: (id: number) => call<FeatureDetail>(`/${id}`),
  create: (f: FeatureInput) => call<FeatureDetail>('', json('POST', f)),
  edit: (id: number, f: Partial<FeatureInput>) => call<FeatureDetail>(`/${id}`, json('PUT', f)),
  setStatus: (id: number, status: FeatureStatus, note?: string) => call<FeatureDetail>(`/${id}/status`, json('POST', { status, note })),
  comment: (id: number, text: string) => call<FeatureDetail>(`/${id}/comments`, json('POST', { text })),
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
