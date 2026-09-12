export interface Target {
  id: number;
  title: string;
  description?: string;
  month: string;
  is_global: boolean;
  user_id: number;
  created_by_id: number;
  is_completed: boolean;
  completed_at?: string;
  average_score?: number;
  score_count?: number;
  my_score?: number;
  reviewer_scores?: {reviewer_id: number, score: number}[];
}

export interface TargetCreate {
  title: string;
  description?: string;
  month: string;
  is_global: boolean;
  user_id: number;
}

export interface TargetUpdate {
  title?: string;
  description?: string;
  is_completed?: boolean;
}

export interface TargetScoreUpdate {
  score: number;
}

export interface TargetPermission {
  id: number;
  grantee_id: number;
  target_user_id: number;
  can_score: boolean;
  can_add_targets: boolean;
  granted_by_id: number;
}

export interface TargetPermissionCreate {
  grantee_id: number;
  target_user_id: number;
  can_score: boolean;
  can_add_targets: boolean;
}

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

const targetService = {
  createTarget: async (data: TargetCreate): Promise<Target> => {
    const res = await fetch('/api/v1/targets', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create target' }));
      throw new Error(err.detail || 'Failed to create target');
    }
    return res.json();
  },

  getMyTargets: async (): Promise<Target[]> => {
    const res = await fetch('/api/v1/targets/my', { headers: getHeaders() });
    if (!res.ok) {
      throw new Error('Failed to fetch targets');
    }
    return res.json();
  },

  getUserTargets: async (userId: number): Promise<Target[]> => {
    const res = await fetch(`/api/v1/targets/user/${userId}`, { headers: getHeaders() });
    if (!res.ok) {
      throw new Error('Failed to fetch user targets');
    }
    return res.json();
  },

  updateTarget: async (targetId: number, data: TargetUpdate): Promise<Target> => {
    const res = await fetch(`/api/v1/targets/${targetId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update target' }));
      throw new Error(err.detail || 'Failed to update target');
    }
    return res.json();
  },

  scoreTarget: async (targetId: number, data: TargetScoreUpdate): Promise<Target> => {
    const res = await fetch(`/api/v1/targets/${targetId}/scores/me`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to score target' }));
      throw new Error(err.detail || 'Failed to score target');
    }
    return res.json();
  },


  deleteTarget: async (targetId: number): Promise<{success: boolean}> => {
    const res = await fetch(`/api/v1/targets/${targetId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete target' }));
      throw new Error(err.detail || 'Failed to delete target');
    }
    return res.json();
  },

  createPermission: async (data: TargetPermissionCreate): Promise<TargetPermission> => {
    const res = await fetch('/api/v1/targets/permissions', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create permission' }));
      throw new Error(err.detail || 'Failed to create permission');
    }
    return res.json();
  },

  getPermissions: async (): Promise<TargetPermission[]> => {
    const res = await fetch('/api/v1/targets/permissions', { headers: getHeaders() });
    if (!res.ok) {
      throw new Error('Failed to fetch permissions');
    }
    return res.json();
  }
};

export default targetService;
