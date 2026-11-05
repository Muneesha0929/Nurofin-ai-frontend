import { NotificationItem } from '../types';

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

const CATEGORY_MAP: Record<string, NotificationItem['category']> = {
  task_assigned: 'tasks',
  deadline: 'tasks',
  meeting_reminder: 'meetings',
  meeting_invitation: 'meetings',
  meeting_update: 'meetings',
  meeting_cancellation: 'meetings',
  meeting_acceptance: 'meetings',
  meeting_decline: 'meetings',
  meeting_mom_uploaded: 'meetings',
  meeting_tasks_extracted: 'meetings',
  meeting_task_assigned: 'tasks',
  project_update: 'general',
  finance_reminder: 'finance',
  issue_assigned: 'tasks',
  issue_followup: 'general',
  issue_status_changed: 'alerts',
  performance_reviewed: 'finance',
};

function mapNotification(backendNotif: any): NotificationItem {
  const rawType = backendNotif.type || 'info';
  const category = CATEGORY_MAP[rawType] || 'general';

  let displayType: NotificationItem['type'] = 'info';
  if (rawType.includes('deadline') || rawType.includes('reminder')) displayType = 'warning';
  if (rawType.includes('cancellation') || rawType.includes('decline')) displayType = 'error';
  if (rawType.includes('acceptance') || rawType.includes('assigned')) displayType = 'success';

  const rawTime = backendNotif.created_at;
  let timeStr = '';
  if (rawTime) {
    try {
      const d = new Date(rawTime);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) timeStr = 'Just now';
      else if (diffMin < 60) timeStr = `${diffMin}m ago`;
      else if (diffMin < 1440) timeStr = `${Math.floor(diffMin / 60)}h ago`;
      else timeStr = d.toLocaleDateString();
    } catch { timeStr = ''; }
  }

  return {
    id: String(backendNotif.id),
    title: backendNotif.title || 'Notification',
    description: backendNotif.message || '',
    time: timeStr,
    type: displayType,
    read: backendNotif.is_read || false,
    category,
    link: backendNotif.link || undefined,
    notification_type: rawType,
  };
}

export const notificationsService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await fetch('/api/v1/notifications', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const json = await res.json();
    const rawList = json.data || [];
    return rawList.map(mapNotification);
  },

  markAsRead: async (id: number | string): Promise<void> => {
    await fetch(`/api/v1/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
  },

  markAllAsRead: async (unreadIds?: (string | number)[]): Promise<void> => {
    try {
      const res = await fetch('/api/v1/notifications/read-all', {
        method: 'PUT',
        headers: getHeaders()
      });
      if (res.ok) return;
    } catch {}

    if (unreadIds && unreadIds.length > 0) {
      await Promise.all(
        unreadIds.map(id =>
          fetch(`/api/v1/notifications/${id}/read`, {
            method: 'PUT',
            headers: getHeaders()
          }).catch(() => {})
        )
      );
    }
  },

  clearAll: async (): Promise<void> => {
    await fetch('/api/v1/notifications/clear-all', {
      method: 'DELETE',
      headers: getHeaders()
    });
  }
};
