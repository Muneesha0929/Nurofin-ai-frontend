// Director-set quarter targets per department, and the objectives HODs set from them.
// Backend: /api/v1/department-targets

export interface PersonBrief {
  id: number;
  name: string;
  avatar?: string | null;
}

export interface QuarterInfo {
  fiscal_year: number;
  quarter_number: number;
  label: string;   // "Q3 FY 2026-27"
  short: string;   // "Q3"
  range: string;   // "Oct – Dec 2026"
  start: string;
  end: string;
  status: 'past' | 'current' | 'upcoming';
}

export type Outcome = 'achieved' | 'met_partly' | 'not_met';
export type ObjectiveStatus = 'not_started' | 'in_progress' | 'done';

export interface ObjectiveNode {
  id: number;
  parent_id: number | null;
  title: string;
  description?: string | null;
  owner: PersonBrief | null;
  deadline: string | null;
  status: ObjectiveStatus;
  progress: number;
  overdue: boolean;
  health?: Health;
  children: ObjectiveNode[];
}

export type Health = 'on' | 'risk' | 'off' | 'done';

export interface QuarterStats {
  progress: number | null;
  objectives: number;
  items: number;
  done: number;
  overdue: number;
  health: Record<Health, number>;
}

export interface TargetFields {
  message: string | null;
  message_updated_at: string | null;
  outcome: Outcome | null;
  outcome_label: string | null;
  outcome_note: string | null;
}

export interface TargetDepartment {
  id: number;
  name: string;
  hod: PersonBrief | null;
  members: PersonBrief[];
}

export interface OverviewDepartment extends TargetDepartment, TargetFields, QuarterStats {
  new_for_me: boolean;
}

export type WidgetKind = 'number' | 'money' | 'percent' | 'milestone';

export interface CompanyWidget {
  id: number;
  title: string;
  kind: WidgetKind;
  unit: string | null;
  base: number;
  current: number;
  target: number;
  lower_is_better: boolean;
  note: string | null;
  progress: number;
  department: { id: number; name: string | null } | null;
}

export type WidgetInput = Omit<CompanyWidget, 'id' | 'progress' | 'department'> & { department_id: number | null };

export interface MonthlyTarget {
  id: number;
  title: string;
  kind: WidgetKind;
  unit: string | null;
  target: number;
  current: number;
  due_date: string;
  note: string | null;
  progress: number;
  overdue: boolean;
  department: { id: number; name: string | null } | null;
  can_update: boolean;
}

export type MonthlyTargetInput = { title: string; kind: WidgetKind; unit: string | null; target: number; current: number; due_date: string; department_id: number | null; note: string | null };

export interface QuarterOverview {
  quarter: QuarterInfo;
  headline: string | null;
  widgets: CompanyWidget[];
  monthly_targets: MonthlyTarget[];
  department_count: number;
  progress: number | null;
  totals: { objectives: number; items: number; done: number; overdue: number };
  departments: OverviewDepartment[];
  new_targets_for_me: { department_id: number; department_name: string; objectives: number }[];
  can_edit: boolean;
}

export interface DepartmentQuarter extends QuarterInfo, TargetFields, QuarterStats {
  objectives_tree: ObjectiveNode[];
  new_for_me: boolean;
}

export interface DepartmentDetail extends TargetDepartment {
  fiscal_year: number;
  fy_label: string;
  current: { fiscal_year: number; quarter_number: number };
  quarters: DepartmentQuarter[];
  permissions: { is_director: boolean; is_hod: boolean; can_plan: boolean };
}

export interface ObjectiveUpdateEntry {
  id: number;
  user: PersonBrief | null;
  text: string;
  created_at: string | null;
}

export interface ObjectiveDetail extends ObjectiveNode {
  level: 'objective' | 'sub_objective';
  department: { id: number; name: string; hod: PersonBrief | null };
  quarter: QuarterInfo;
  director_message: string | null;
  parent: { id: number; title: string } | null;
  updates: ObjectiveUpdateEntry[];
  permissions: { can_plan: boolean; can_update_progress: boolean; can_post: boolean };
}

export interface DeadlineItem {
  id: number;
  title: string;
  deadline: string;
  level: 'objective' | 'sub_objective';
  department: { id: number; name: string | null };
  owner: PersonBrief | null;
  progress: number;
  status: ObjectiveStatus;
  overdue: boolean;
  mine: boolean;
}

const BASE = '/api/v1/department-targets';

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

export const departmentTargetsService = {
  overview: (fy?: number, q?: number) =>
    call<QuarterOverview>(`/overview${fy && q ? `?fiscal_year=${fy}&quarter=${q}` : ''}`),
  setHeadline: (fy: number, q: number, headline: string) =>
    call<{ headline: string | null }>(`/company/${fy}/${q}`, json('PUT', { headline })),

  listDepartments: () => call<TargetDepartment[]>('/departments'),
  getDepartment: (id: number, fy?: number) =>
    call<DepartmentDetail>(`/departments/${id}${fy ? `?fiscal_year=${fy}` : ''}`),
  createDepartment: (data: { name: string; hod_id?: number | null; member_ids?: number[] }) =>
    call<TargetDepartment>('/departments', json('POST', data)),
  updateDepartment: (id: number, data: { name?: string; hod_id?: number | null; member_ids?: number[] }) =>
    call<TargetDepartment>(`/departments/${id}`, json('PUT', data)),
  deleteDepartment: (id: number) => call<null>(`/departments/${id}`, json('DELETE')),
  createWidget: (fy: number, q: number, w: WidgetInput) => call<CompanyWidget>('/widgets', json('POST', { fiscal_year: fy, quarter_number: q, ...w })),
  updateWidget: (id: number, w: Partial<WidgetInput>) => call<CompanyWidget>(`/widgets/${id}`, json('PUT', w)),
  deleteWidget: (id: number) => call<null>(`/widgets/${id}`, json('DELETE')),
  reorderWidgets: (ids: number[]) => call<null>('/widgets/order', json('PUT', { ids })),
  selfCheck: () => call<any>('/self-check'),
  createMonthly: (m: MonthlyTargetInput) => call<MonthlyTarget>('/monthly-targets', json('POST', m)),
  updateMonthly: (id: number, m: Partial<MonthlyTargetInput>) => call<MonthlyTarget>(`/monthly-targets/${id}`, json('PUT', m)),
  deleteMonthly: (id: number) => call<null>(`/monthly-targets/${id}`, json('DELETE')),
  restoreDepartment: (id: number) => call<TargetDepartment>(`/departments/${id}/restore`, json('POST')),

  updateQuarter: (id: number, fy: number, q: number, data: { message?: string; outcome?: Outcome | null; outcome_note?: string }) =>
    call<TargetFields>(`/departments/${id}/quarters/${fy}/${q}`, json('PUT', data)),
  markSeen: (id: number, fy: number, q: number) =>
    call<null>(`/departments/${id}/quarters/${fy}/${q}/seen`, json('POST')),

  createObjective: (data: { department_id: number; fiscal_year: number; quarter_number: number; parent_id?: number | null; title: string; description?: string; owner_id?: number | null; deadline?: string | null }) =>
    call<{ id: number }>('/objectives', json('POST', data)),
  updateObjective: (id: number, data: Partial<{ title: string; description: string; owner_id: number | null; deadline: string | null; status: ObjectiveStatus; progress: number }>) =>
    call<{ id: number }>(`/objectives/${id}`, json('PUT', data)),
  deleteObjective: (id: number) => call<null>(`/objectives/${id}`, json('DELETE')),
  getObjective: (id: number) => call<ObjectiveDetail>(`/objectives/${id}`),
  postUpdate: (id: number, text: string) => call<{ id: number }>(`/objectives/${id}/updates`, json('POST', { text })),
  deadlines: (start: string, end: string, everyone = false) =>
    call<DeadlineItem[]>(`/deadlines?start=${start}&end=${end}${everyone ? '&everyone=true' : ''}`),
};

export const OUTCOME_LABEL: Record<Outcome, string> = { achieved: 'Achieved', met_partly: 'Met partly', not_met: 'Not met' };
