import { Issue, IssueFollowup } from '../types';

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

const BASE = '/api/v1/issues';

function mapIssue(raw: any): Issue {
  return {
    id: String(raw.id),
    title: raw.title || '',
    description: raw.description || '',
    status: raw.status || 'open',
    severity: raw.priority || raw.severity || 'medium',
    createdAt: raw.created_at ? String(raw.created_at) : '',
    assignedTo: raw.assigned_user?.name || 'Unassigned',
    category: raw.category || undefined,
    deadline: raw.deadline || undefined,
    projectId: raw.project_id ? String(raw.project_id) : undefined,
    projectName: raw.project?.name,
    assigneeId: raw.assigned_user ? String(raw.assigned_user.id) : undefined,
    assigneeName: raw.assigned_user?.name,
    assigneeAvatar: raw.assigned_user?.avatar || undefined,
    reporterId: raw.reported_by ? String(raw.reported_by.id) : undefined,
    // Build-Track reports have no CoS user as reporter: show the person (and company) who sent it.
    reporterName: raw.reported_by?.name ?? (raw.external?.reporter_name ? `${raw.external.reporter_name}${raw.external.company ? ` (${raw.external.company})` : ''}` : undefined),
    reporterAvatar: raw.reported_by?.avatar || undefined,
    followupCount: raw.followup_count || 0,
    followups: (raw.followups || []).map(mapFollowup),
    assignmentStatus: raw.assignment_status || undefined,
    assignedUserId: raw.assigned_user_id ? String(raw.assigned_user_id) : undefined,
    attachments: raw.attachments || [],
    external: raw.external || null,
  };
}

function mapFollowup(raw: any): IssueFollowup {
  return {
    id: String(raw.id),
    issue_id: String(raw.issue_id),
    user_id: String(raw.user_id),
    user_name: raw.user_name || '',
    user_avatar: raw.user_avatar || undefined,
    message: raw.message || '',
    created_at: raw.created_at ? String(raw.created_at) : '',
  };
}

export interface CreateIssuePayload {
  title: string;
  description: string;
  priority?: string;
  category?: string;
  deadline?: string;
  project_id?: number;
  assigned_user_id?: number;
  attachments?: string[];
}

export const issuesService = {
  getIssues: async (params?: {
    status?: string;
    priority?: string;
    project_id?: number;
    assigned_user_id?: number;
    reported_by_id?: number;
    mine?: boolean;
    search?: string;
  }): Promise<{ issues: Issue[]; total: number }> => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const q = qs.toString();
    const res = await fetch(`${BASE}${q ? `?${q}` : ''}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch issues');
    const json = await res.json();
    const data = json.data || { issues: [] };
    return {
      issues: (data.issues || []).map(mapIssue),
      total: data.total || 0,
    };
  },

  getIssue: async (issueId: number): Promise<Issue> => {
    const res = await fetch(`${BASE}/${issueId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch issue');
    const json = await res.json();
    return mapIssue(json.data);
  },

  createIssue: async (payload: CreateIssuePayload): Promise<Issue> => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to report issue' }));
      throw new Error(err.detail || err.message || 'Failed to report issue');
    }
    const json = await res.json();
    return mapIssue(json.data);
  },

  updateIssue: async (issueId: number, payload: Partial<CreateIssuePayload> & { status?: string }): Promise<Issue> => {
    const res = await fetch(`${BASE}/${issueId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update issue' }));
      throw new Error(err.detail || err.message || 'Failed to update issue');
    }
    const json = await res.json();
    return mapIssue(json.data);
  },

  updateStatus: async (issueId: number, status: string): Promise<Issue> => {
    const res = await fetch(`${BASE}/${issueId}/status?status=${status}`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update status' }));
      throw new Error(err.detail || err.message || 'Failed to update status');
    }
    const json = await res.json();
    return mapIssue(json.data);
  },

  updateIssueStatus: async (issueId: number, status: string): Promise<Issue> => {
    const res = await fetch(`${BASE}/${issueId}/status?status=${status}`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to update issue status');
    const json = await res.json();
    return mapIssue(json.data);
  },

  acceptIssue: async (issueId: number): Promise<Issue> => {
    const res = await fetch(`${BASE}/${issueId}/accept`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to accept issue');
    const json = await res.json();
    return mapIssue(json.data);
  },

  declineIssue: async (issueId: number): Promise<Issue> => {
    const res = await fetch(`${BASE}/${issueId}/decline`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to decline issue');
    const json = await res.json();
    return mapIssue(json.data);
  },

  transferIssue: async (issueId: number, userId: number, reason?: string): Promise<Issue> => {
    const res = await fetch(`${BASE}/${issueId}/transfer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ user_id: userId, reason: reason || '' })
    });
    if (!res.ok) throw new Error('Failed to transfer issue');
    const json = await res.json();
    return mapIssue(json.data);
  },

  deleteIssue: async (issueId: number): Promise<void> => {
    const res = await fetch(`${BASE}/${issueId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete issue');
  },

  getFollowups: async (issueId: number): Promise<IssueFollowup[]> => {
    const res = await fetch(`${BASE}/${issueId}/followups`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch followups');
    const json = await res.json();
    return (json.data || []).map(mapFollowup);
  },

  addFollowup: async (issueId: number, message: string): Promise<IssueFollowup> => {
    const res = await fetch(`${BASE}/${issueId}/followups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add follow-up' }));
      throw new Error(err.detail || err.message || 'Failed to add follow-up');
    }
    const json = await res.json();
    return mapFollowup(json.data);
  },
};
