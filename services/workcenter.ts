const getHeaders = () => {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token') || '';
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const BASE = '/api/v1/workcenter';

async function api<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: getHeaders(), ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || err.message || 'Request failed');
  }
  const json = await res.json();
  return json.data ?? json;
}

export interface WCTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  progress: number;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  assigned_to_avatar: string | null;
  assigned_by_id: number | null;
  assigned_by_name: string | null;
  reviewer_id: number | null;
  reviewer_name: string | null;
  project_id: number | null;
  project_name: string | null;
  parent_id: number | null;
  quarter_id: number | null;
  meeting_id: number | null;
  actual_completion_date?: string | null;
  extended_time?: number | null;
  subtasks: {
    id: number;
    title: string;
    status: string;
    assigned_to_id: number | null;
    assigned_to_name: string | null;
    priority?: string;
    deadline?: string | null;
    start_date?: string | null;
    assigned_to_avatar?: string | null;
    description?: string | null;
  }[];
  parent_title?: string | null;
  created_at: string | null;
  transfer_date?: string | null;
  transfer_to_name?: string | null;
}

export interface WCTasksResponse {
  tasks: WCTask[];
  total: number;
  page: number;
  page_size: number;
}

export interface WCSummary {
  totalTasks: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
  blocked: number;
  review: number;
  quarterProgress: number;
}

export interface WCUpcoming {
  id: number;
  title: string;
  deadline: string;
  priority: string;
  assignee: string | null;
  assignee_avatar: string | null;
  days_remaining: number | null;
}

export interface WCActivity {
  id: number;
  action: string;
  description: string | null;
  task_id: number;
  task_title: string | null;
  user_name: string | null;
  user_avatar: string | null;
  created_at: string | null;
}

export interface WCPerformer {
  user_id: number;
  name: string;
  avatar: string | null;
  total_tasks: number;
  completed: number;
  performance_pct: number;
}

export interface WCInsights {
  upcomingDeadlines: WCUpcoming[];
  recentActivity: WCActivity[];
  topPerformers: WCPerformer[];
}

export interface WCQuarter {
  id: number;
  name: string;
  label: string | null;
  fiscal_year: number;
  quarter_number: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  goals: string | null;
}

export interface WCHistoryEntry {
  id: number;
  action: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  user_name: string | null;
  user_avatar: string | null;
  created_at: string | null;
}

export interface WCTransfer {
  id: number;
  from_user_name: string | null;
  from_user_avatar: string | null;
  to_user_name: string | null;
  to_user_avatar: string | null;
  reason: string | null;
  current_progress: number | null;
  remaining_work: string | null;
  new_deadline: string | null;
  transfer_notes: string | null;
  status: string;
  created_at: string | null;
}

export interface WCPerfUser {
  id: number;
  name: string;
  avatar: string | null;
  department: string | null;
  role: string | null;
}

export interface WCPerfStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionPct: number;
  transfersOut: number;
  transfersIn: number;
}

export interface WCPerformance {
  user: WCPerfUser;
  stats: WCPerfStats;
  tasks: WCTask[];
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: string;
  project_id?: number;
  quarter_id?: number;
  assigned_to_id?: number;
  reviewer_id?: number;
  parent_id?: number;
  deadline?: string;
  start_date?: string;
  estimated_hours?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  start_date?: string;
  estimated_hours?: number;
  assigned_to_id?: number;
  reviewer_id?: number;
  progress?: number;
  actual_completion_date?: string | null;
  extended_time?: number;
}

export const workcenterService = {
  getTasks: (params?: {
    quarter_id?: number;
    project_id?: number;
    status?: string;
    priority?: string;
    assignee_id?: number;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const q = qs.toString();
    return api<WCTasksResponse>(`${BASE}${q ? `?${q}` : ''}`);
  },

  getTask: (taskId: number) => api<WCTask>(`${BASE}/${taskId}`),

  getSummary: (quarterId?: number) => {
    const qs = quarterId ? `?quarter_id=${quarterId}` : '';
    return api<WCSummary>(`${BASE}/summary${qs}`);
  },

  getInsights: (quarterId?: number) => {
    const qs = quarterId ? `?quarter_id=${quarterId}` : '';
    return api<WCInsights>(`${BASE}/insights${qs}`);
  },

  createTask: (payload: CreateTaskPayload) => {
    const qs = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    return api<WCTask>(`${BASE}?${qs.toString()}`, { method: 'POST' });
  },

  updateTask: (taskId: number, payload: UpdateTaskPayload) => {
    const qs = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    return api<WCTask>(`${BASE}/${taskId}?${qs.toString()}`, { method: 'PUT' });
  },

  deleteTask: (taskId: number) =>
    api(`${BASE}/${taskId}`, { method: 'DELETE' }),

  updateStatus: (taskId: number, status: string, reason?: string) => {
    const qs = new URLSearchParams();
    qs.append('status', status);
    if (reason) qs.append('reason', reason);
    return api(`${BASE}/${taskId}/status?${qs.toString()}`, { method: 'PUT' });
  },

  bulkUpdateStatus: (taskIds: number[], status: string) => {
    const qs = new URLSearchParams();
    qs.append('status', status);
    taskIds.forEach(id => qs.append('task_ids', String(id)));
    return api(`${BASE}/bulk/status?${qs.toString()}`, { method: 'PUT' });
  },

  getHistory: (taskId: number) =>
    api<WCHistoryEntry[]>(`${BASE}/${taskId}/history`),

  transferTask: (
    taskId: number,
    payload: {
      to_user_id: number;
      reason: string;
      current_progress?: number;
      remaining_work?: string;
      new_deadline?: string;
      transfer_notes?: string;
    }
  ) => {
    const qs = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    return api(`${BASE}/${taskId}/transfer?${qs.toString()}`, { method: 'POST' });
  },

  getTransfers: (taskId: number) =>
    api<WCTransfer[]>(`${BASE}/${taskId}/transfers`),

  getQuarters: () => api<WCQuarter[]>(`${BASE}/quarters/list`),

  createQuarter: (payload: {
    name: string;
    fiscal_year: number;
    quarter_number: number;
    start_date?: string;
    end_date?: string;
    goals?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    return api<WCQuarter>(`${BASE}/quarters?${qs.toString()}`, { method: 'POST' });
  },

  updateQuarter: (quarterId: number, payload: {
    name?: string;
    status?: string;
    goals?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    return api<WCQuarter>(`${BASE}/quarters/${quarterId}?${qs.toString()}`, { method: 'PUT' });
  },

  getPerformance: (userId: number, quarterId?: number) => {
    const qs = quarterId ? `?quarter_id=${quarterId}` : '';
    return api<WCPerformance>(`${BASE}/performance/${userId}${qs}`);
  },
};
