import { Meeting, MeetingParticipant, MeetingTimelineEvent, MeetingExtractedTask } from '../types';

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

function parseJsonArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapMeeting(m: any): Meeting {
  return {
    id: m.id.toString(),
    title: m.title,
    date: m.date || 'N/A',
    time: m.start_time || '00:00',
    duration: m.end_time ? `${m.start_time} - ${m.end_time}` : '1h',
    attendees: m.participants?.map((p: any) => p.user_name).filter(Boolean) || [],
    notes: m.description || '',
    momText: m.mom_summary || '',
    type: m.type || 'meeting',
    status: m.status || 'scheduled',
    owner_id: m.owner_id?.toString(),
    owner_name: m.owner_name,
    owner_avatar: m.owner_avatar,
    participants: m.participants?.map((p: any) => ({
      id: p.id?.toString() || '',
      user_id: p.user_id?.toString() || '',
      user_name: p.user_name || 'Unknown',
      user_avatar: p.user_avatar,
      status: p.status || 'pending',
    })) || [],
    participants_count: m.participants_count || 0,
    mom_summary: m.mom_summary,
    mom_file_path: m.mom_file_path,
    created_at: m.created_at,
    agenda: m.agenda,
    meeting_link: m.meeting_link,
    location: m.location,
    timezone: m.timezone,
    is_recurring: m.is_recurring,
    recurrence_rule: m.recurrence_rule,
    mom_executive_summary: m.mom_executive_summary,
    mom_decisions: parseJsonArray(m.mom_decisions),
    mom_action_items: parseJsonArray(m.mom_action_items),
    mom_risks: parseJsonArray(m.mom_risks),
    mom_blockers: parseJsonArray(m.mom_blockers),
    mom_followups: parseJsonArray(m.mom_followups),
    mom_deadlines: parseJsonArray(m.mom_deadlines),
    mom_important_dates: parseJsonArray(m.mom_important_dates),
    transcript: m.transcript,
    ai_summary: m.ai_summary,
    minutes_of_meeting: m.minutes_of_meeting,
    analysis_status: m.analysis_status,
    metadata_json: m.metadata_json,
    document_file_path: m.document_file_path,
    document_filename: m.document_filename,
    mom_questions: parseJsonArray(m.mom_questions),
    timeline: m.timeline?.map((t: any) => ({
      id: t.id?.toString() || '',
      meeting_id: t.meeting_id?.toString() || '',
      action: t.action || '',
      description: t.description || '',
      user_id: t.user_id?.toString(),
      user_name: t.user_name,
      metadata: (() => {
        if (!t.metadata_json) return undefined;
        if (typeof t.metadata_json !== 'string') return t.metadata_json;
        try { return JSON.parse(t.metadata_json); } catch { return undefined; }
      })(),
      created_at: t.created_at,
    })) || [],
    extracted_tasks: m.extracted_tasks?.map((t: any) => ({
      id: t.id?.toString() || '',
      meeting_id: t.meeting_id?.toString() || '',
      title: t.title || '',
      description: t.description,
      priority: t.priority || 'medium',
      suggested_owner: t.suggested_owner,
      deadline: t.deadline,
      dependencies: t.dependencies || [],
      confidence: t.confidence || 0,
      status: t.status || 'pending',
      real_task_id: t.real_task_id?.toString(),
    })) || [],
  };
}

export interface BulkApproveRequest {
  task_ids: number[];
}

export interface ExtractedTaskUpdate {
  title?: string;
  description?: string;
  priority?: string;
  suggested_owner?: string;
  deadline?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const meetingsService = {
  getMeetings: async (
    filter?: 'today' | 'weekly' | 'monthly',
    search?: string,
    sort?: string,
    status?: string,
    targetUserId?: number | string
  ): Promise<Meeting[]> => {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (status) params.set('status', status);
    if (targetUserId) params.set('target_user_id', String(targetUserId));
    const qs = params.toString();
    const url = `/api/v1/meetings/${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch events');
    const json = await res.json();
    return (json.data || []).map(mapMeeting);
  },

  getMeeting: async (id: number | string): Promise<Meeting> => {
    const res = await fetch(`/api/v1/meetings/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch meeting');
    const json = await res.json();
    return mapMeeting(json.data);
  },

  createMeeting: async (meeting: Partial<Meeting> & { participant_ids?: number[], end_time?: string }): Promise<Meeting> => {
    let computed_end_time = undefined;
    if (meeting.time) {
      try {
        const parts = meeting.time.split(':');
        const endH = (parseInt(parts[0]) + 1).toString().padStart(2, '0');
        computed_end_time = `${endH}:${parts[1] || '00'}`;
      } catch(e) {}
    }
    const payload = {
      title: meeting.title,
      description: meeting.notes,
      date: meeting.date,
      start_time: meeting.time,
      end_time: meeting.end_time || computed_end_time,
      type: meeting.type || 'meeting',
      agenda: meeting.agenda,
      meeting_link: meeting.meeting_link,
      location: meeting.location,
      timezone: meeting.timezone,
      is_recurring: meeting.is_recurring,
      recurrence_rule: meeting.recurrence_rule,
      participant_ids: meeting.participant_ids || [],
      project_id: meeting.project_id,
      task_id: meeting.task_id,
    };
    const res = await fetch('/api/v1/meetings', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
        throw json;
    }
    return mapMeeting(json.data);
  },

  updateMeeting: async (id: number | string, meeting: Partial<Meeting>): Promise<Meeting> => {
    const payload: Record<string, any> = {};
    if (meeting.title !== undefined) payload.title = meeting.title;
    if (meeting.notes !== undefined) payload.description = meeting.notes;
    if (meeting.date !== undefined) payload.date = meeting.date;
    if (meeting.time !== undefined) payload.start_time = meeting.time;
    if (meeting.type !== undefined) payload.type = meeting.type;
    if ((meeting as any).status !== undefined) payload.status = (meeting as any).status;
    if (meeting.agenda !== undefined) payload.agenda = meeting.agenda;
    if (meeting.meeting_link !== undefined) payload.meeting_link = meeting.meeting_link;
    if (meeting.location !== undefined) payload.location = meeting.location;
    if (meeting.timezone !== undefined) payload.timezone = meeting.timezone;
    if (meeting.is_recurring !== undefined) payload.is_recurring = meeting.is_recurring;
    if (meeting.recurrence_rule !== undefined) payload.recurrence_rule = meeting.recurrence_rule;
    const res = await fetch(`/api/v1/meetings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update event');
    const json = await res.json();
    return mapMeeting(json.data);
  },

  deleteMeeting: async (id: number | string): Promise<void> => {
    const res = await fetch(`/api/v1/meetings/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete event');
  },

  acceptMeeting: async (id: number | string): Promise<void> => {
    const res = await fetch(`/api/v1/meetings/${id}/accept`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to accept meeting');
  },

  declineMeeting: async (id: number | string): Promise<void> => {
    const res = await fetch(`/api/v1/meetings/${id}/decline`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to decline meeting');
  },

  uploadMOM: async (id: number | string, summary: string): Promise<Meeting> => {
    const res = await fetch(`/api/v1/meetings/${id}/mom`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ summary })
    });
    if (!res.ok) throw new Error('Failed to upload MOM');
    const json = await res.json();
    return mapMeeting(json.data);
  },

  analyzeMOM: async (id: number | string): Promise<Meeting> => {
    const res = await fetch(`/api/v1/meetings/${id}/mom/analyze`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to analyze MOM');
    const json = await res.json();
    return mapMeeting(json.data);
  },

  getTimeline: async (id: number | string): Promise<MeetingTimelineEvent[]> => {
    const res = await fetch(`/api/v1/meetings/${id}/timeline`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch timeline');
    const json = await res.json();
    return (json.data || []).map((t: any) => ({
      id: t.id?.toString() || '',
      meeting_id: t.meeting_id?.toString() || '',
      action: t.action || '',
      description: t.description || '',
      user_id: t.user_id?.toString(),
      user_name: t.user_name,
      metadata: (() => {
        if (!t.metadata_json) return undefined;
        if (typeof t.metadata_json !== 'string') return t.metadata_json;
        try { return JSON.parse(t.metadata_json); } catch { return undefined; }
      })(),
      created_at: t.created_at,
    }));
  },

  getExtractedTasks: async (id: number | string): Promise<MeetingExtractedTask[]> => {
    const res = await fetch(`/api/v1/meetings/${id}/extracted-tasks`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch extracted tasks');
    const json = await res.json();
    return (json.data || []).map((t: any) => ({
      id: t.id?.toString() || '',
      meeting_id: t.meeting_id?.toString() || '',
      title: t.title || '',
      description: t.description,
      priority: t.priority || 'medium',
      suggested_owner: t.suggested_owner,
      deadline: t.deadline,
      dependencies: t.dependencies || [],
      confidence: t.confidence || 0,
      status: t.status || 'pending',
      real_task_id: t.real_task_id?.toString(),
    }));
  },

  updateExtractedTask: async (
    meetingId: number | string,
    taskId: number | string,
    update: ExtractedTaskUpdate
  ): Promise<MeetingExtractedTask> => {
    const res = await fetch(`/api/v1/meetings/${meetingId}/extracted-tasks/${taskId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Failed to update extracted task');
    const json = await res.json();
    const t = json.data;
    return {
      id: t.id?.toString() || '',
      meeting_id: t.meeting_id?.toString() || '',
      title: t.title || '',
      description: t.description,
      priority: t.priority || 'medium',
      suggested_owner: t.suggested_owner,
      deadline: t.deadline,
      dependencies: t.dependencies || [],
      confidence: t.confidence || 0,
      status: t.status || 'pending',
      real_task_id: t.real_task_id?.toString(),
    };
  },

  approveExtractedTasks: async (id: number | string, taskIds: number[]): Promise<void> => {
    const res = await fetch(`/api/v1/meetings/${id}/extracted-tasks/bulk-approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ task_ids: taskIds })
    });
    if (!res.ok) throw new Error('Failed to approve extracted tasks');
  },

  rejectExtractedTasks: async (id: number | string, taskIds: number[]): Promise<void> => {
    const res = await fetch(`/api/v1/meetings/${id}/extracted-tasks/bulk-reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ task_ids: taskIds })
    });
    if (!res.ok) throw new Error('Failed to reject extracted tasks');
  },

  bulkApprove: async (id: number | string): Promise<void> => {
    const tasks = await meetingsService.getExtractedTasks(id);
    const pendingIds = tasks.filter(t => t.status === 'pending').map(t => parseInt(t.id));
    if (pendingIds.length === 0) return;
    const res = await fetch(`/api/v1/meetings/${id}/extracted-tasks/bulk-approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ task_ids: pendingIds })
    });
    if (!res.ok) throw new Error('Failed to bulk approve');
  },

  bulkReject: async (id: number | string): Promise<void> => {
    const tasks = await meetingsService.getExtractedTasks(id);
    const pendingIds = tasks.filter(t => t.status === 'pending').map(t => parseInt(t.id));
    if (pendingIds.length === 0) return;
    const res = await fetch(`/api/v1/meetings/${id}/extracted-tasks/bulk-reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ task_ids: pendingIds })
    });
    if (!res.ok) throw new Error('Failed to bulk reject');
  },

  addParticipant: async (meetingId: number | string, userId: number | string): Promise<void> => {
    const res = await fetch(`/api/v1/meetings/${meetingId}/participants?user_id=${userId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to add participant');
  },

  removeParticipant: async (meetingId: number | string, userId: number | string): Promise<void> => {
    const res = await fetch(`/api/v1/meetings/${meetingId}/participants/remove?user_id=${userId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove participant');
  },

  uploadTranscript: async (id: number | string, transcript: string): Promise<Meeting> => {
    const res = await fetch(`/api/v1/meetings/${id}/transcript`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ transcript })
    });
    if (!res.ok) throw new Error('Failed to upload transcript');
    const json = await res.json();
    return mapMeeting(json.data);
  },

  analyzeMeeting: async (id: number | string): Promise<Meeting> => {
    const res = await fetch(`/api/v1/meetings/${id}/analyze`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to analyze meeting');
    const json = await res.json();
    return mapMeeting(json.data);
  },

  getMeetingSummary: async (id: number | string): Promise<{ summary: string | null; analysis_status: string | null }> => {
    const res = await fetch(`/api/v1/meetings/${id}/summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch meeting summary');
    const json = await res.json();
    return json.data;
  },

  getMeetingMoM: async (id: number | string): Promise<{ mom: any; mom_summary: string | null; analysis_status: string | null }> => {
    const res = await fetch(`/api/v1/meetings/${id}/mom`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch meeting MoM');
    const json = await res.json();
    return json.data;
  },

  uploadDocument: async (id: number | string, file: File): Promise<Meeting> => {
    let token = '';
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token') || '';
    }
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/v1/meetings/${id}/upload-document`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Failed to upload document');
    }
    const json = await res.json();
    return mapMeeting(json.data);
  },

  analyzeMeetingEnhanced: async (id: number | string): Promise<Meeting> => {
    const res = await fetch(`/api/v1/meetings/${id}/analyze-enhanced`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to analyze meeting');
    const json = await res.json();
    return mapMeeting(json.data);
  },

  confirmTasks: async (id: number | string, tasks: { extracted_task_id: number; title?: string; description?: string; priority?: string; deadline?: string; assigned_to_id?: number }[]): Promise<{ count: number; tasks: any[] }> => {
    const res = await fetch(`/api/v1/meetings/${id}/confirm-tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tasks }),
    });
    if (!res.ok) throw new Error('Failed to confirm tasks');
    const json = await res.json();
    return json.data;
  },

  getStructuredData: async (id: number | string): Promise<{ decisions: any[]; risks: any[]; blockers: any[]; followups: any[]; questions: any[]; deadlines: any[]; important_dates: any[] }> => {
    const res = await fetch(`/api/v1/meetings/${id}/structured-data`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch structured data');
    const json = await res.json();
    return json.data;
  },
};
