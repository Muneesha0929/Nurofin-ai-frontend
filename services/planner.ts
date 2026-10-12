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

export interface PlannerUser {
  id: number;
  full_name: string;
  email: string;
  role: string | null;
  department: string | null;
  profile_picture: string | null;
  google_connected: boolean;
  outlook_connected?: boolean;
}

export interface ScheduleEvent {
  source: 'nurofin' | 'google_calendar' | 'google_error' | 'outlook_calendar' | 'outlook_error';
  title: string;
  description?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
  type: string;
  status: string;
  read_only: boolean;
  hangout_link?: string;
  event_link?: string;
  location?: string;
  error?: string;
}

export interface ScheduleResponse {
  user: {
    id: number;
    full_name: string;
    google_connected: boolean;
  outlook_connected?: boolean;
  };
  schedule: ScheduleEvent[];
}

export interface BusyBlock {
  user_id: number;
  user_name: string;
  source: string;
  title: string;
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
}

export const plannerService = {
  getUsers: async (): Promise<PlannerUser[]> => {
    const res = await fetch('/api/v1/planner/users', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch planner users');
    const json = await res.json();
    return json.data || [];
  },

  getSchedule: async (userId: number, startDate?: string, endDate?: string): Promise<ScheduleResponse> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/v1/planner/schedule/${userId}${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch schedule');
    const json = await res.json();
    return json.data;
  },

  getGoogleLoginUrl: async (redirectUri?: string): Promise<string> => {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
    const res = await fetch(`/api/v1/planner/google/login${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get Google login URL');
    const json = await res.json();
    return json.data.auth_url;
  },

  googleCallback: async (code: string, redirectUri?: string): Promise<void> => {
    const params = new URLSearchParams({ code });
    if (redirectUri) params.append('redirect_uri', redirectUri);
    const res = await fetch(`/api/v1/planner/google/callback?${params.toString()}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to connect Google Calendar');
  },

  disconnectGoogle: async (): Promise<void> => {
    const res = await fetch('/api/v1/planner/google/disconnect', {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to disconnect Google Calendar');
  },

  
  getOutlookLoginUrl: async (redirectUri?: string): Promise<string> => {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
    const res = await fetch(`/api/v1/planner/outlook/login${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get Outlook login URL');
    const json = await res.json();
    return json.data.auth_url;
  },

  outlookCallback: async (code: string, redirectUri?: string): Promise<void> => {
    const params = new URLSearchParams({ code });
    if (redirectUri) params.append('redirect_uri', redirectUri);
    const res = await fetch(`/api/v1/planner/outlook/callback?${params.toString()}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to connect Outlook Calendar');
  },

  disconnectOutlook: async (): Promise<void> => {
    const res = await fetch('/api/v1/planner/outlook/disconnect', {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to disconnect Outlook Calendar');
  },

  checkAvailability: async (userIds: number[], date: string): Promise<BusyBlock[]> => {
    const params = new URLSearchParams({
      user_ids: userIds.join(','),
      date
    });
    const res = await fetch(`/api/v1/planner/check-availability?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to check availability');
    const json = await res.json();
    return json.data?.busy_blocks || [];
  }
};
