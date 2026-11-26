// Universal codes, deadline timeline and P1–P3 priorities.
// Contract: Chief of Staff/design/contract-codes-timeline-priorities.md

export type Priority = 'P1' | 'P2' | 'P3';
export type TimelineEntity = 'task' | 'objective';
export type TimelineKind = 'date_change' | 'update' | 'handover' | 'status' | 'transfer' | 'completion_date';

export interface TimelineEntry {
  id: string | number;
  kind: TimelineKind;
  at: string;
  by: { id: number; name: string } | null;
  old_date?: string | null;
  new_date?: string | null;
  text?: string | null;
  person?: { id: number; name: string } | null;
  old_value?: string | null;
  new_value?: string | null;
}

export interface Timeline {
  original_deadline: string | null;
  current_deadline: string | null;
  changes: number;
  entries: TimelineEntry[];
}

export interface Breadcrumb { kind: 'department' | 'objective' | 'task'; code?: string; full_code?: string; title: string; id: number }

export interface ResolvedCode {
  kind: 'department' | 'objective' | 'task';
  full_code: string;
  title: string;
  status?: string | null;
  progress?: number | null;
  deadline?: string | null;
  original_deadline?: string | null;
  priority?: Priority | null;
  department: { id: number; name: string; short_code: string };
  objective_id?: number | null;
  task_id?: number | null;
  breadcrumb: Breadcrumb[];
  link: string;
  can_edit: boolean;
}

export interface PriorityItem {
  objective_id: number;
  full_code: string;
  title: string;
  priority: Priority;
  department: { id: number; name: string; short_code: string };
  deadline: string | null;
  progress: number;
  status: string;
  owner: { id: number; name: string } | null;
  link: string;
  set_at: string | null;
  show_popup: boolean;
}

const headers = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, { ...init, headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body?.detail) ? body.detail.map((d: any) => d.msg).join(', ') : body?.detail;
    const err = new Error(detail || body?.message || 'Something went wrong. Please try again.') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body.data as T;
}
const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

/** Strip #, ## and spaces; upper-case. "##prod 1.2" -> "PROD-1.2". */
export function normalizeCode(raw: string): string {
  const s = raw.trim().replace(/^#+/, '').replace(/\s+/g, '-').toUpperCase();
  return s.replace(/-+/g, '-');
}
/** Looks like a universal code: letters/digits, optionally -1.2.3 */
export const CODE_RE = /^#{0,2}([A-Za-z][A-Za-z0-9]{0,9})(?:[-\s](\d+(?:\.\d+)*))?$/;

export const timelineService = {
  get: (entity: TimelineEntity, id: number) => call<Timeline>(`/timeline/${entity}/${id}`),
  post: (entity: TimelineEntity, id: number, data: { kind: 'update' | 'handover'; text: string; person_id?: number }) =>
    call<TimelineEntry>(`/timeline/${entity}/${id}`, json('POST', data)),
  extendTask: (id: number, new_date: string, reason: string) =>
    call<any>(`/workcenter/${id}/deadline`, json('POST', { new_date, reason })),
  extendTasks: (task_ids: number[], reason: string, opts: { new_date?: string; shift_days?: number }) =>
    call<{ updated: number[]; previous: Record<string, string | null> }>(`/workcenter/bulk/deadline`, json('POST', { task_ids, reason, ...opts })),
  extendObjective: (id: number, new_date: string, reason: string) =>
    call<any>(`/department-targets/objectives/${id}/deadline`, json('POST', { new_date, reason })),
};

export const codesService = {
  resolve: (code: string) => call<ResolvedCode>(`/department-targets/resolve?code=${encodeURIComponent(normalizeCode(code))}`),
};

export const prioritiesService = {
  mine: () => call<{ today: string; items: PriorityItem[] }>(`/priorities/mine`),
  seen: (objective_ids: number[]) => call<null>(`/priorities/seen`, json('POST', { objective_ids })),
  set: (objective_id: number, priority: Priority | null) =>
    call<any>(`/department-targets/objectives/${objective_id}`, json('PUT', { priority })),
};

// ---- date helpers shared by the timeline UI
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso: string | null | undefined, n: number) => {
  const base = iso ? new Date(iso.slice(0, 10) + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + n);
  return isoDay(base);
};
export const fmtDay = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};
export const fmtWhen = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
