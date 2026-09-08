import { Task } from '../types';

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

export const tasksService = {
  getTasks: async (): Promise<Task[]> => {
    const res = await fetch('/api/v1/tasks?limit=1000', { headers: getHeaders() });
    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to fetch tasks:', res.status, text);
      throw new Error(`Failed to load tasks: ${res.status} ${text.substring(0, 50)}`);
    }
    const json = await res.json();
    return (json.data || []).filter((t: any) => t && t.id).map((t: any) => ({
      id: t.id.toString(),
      title: t.title || 'Untitled',
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      dueDate: t.deadline || '',
      assignedTo: {
        id: t.assigned_to_id?.toString() || t.assigned_to?.id?.toString() || '',
        name: t.assigned_to?.name || 'Unassigned',
        avatar: t.assigned_to?.avatar || ''
      },
      projectId: t.project_id?.toString(),
      start_date: t.start_date || undefined,
      scheduledDate: t.scheduled_date || undefined,
      scheduledStartTime: t.scheduled_start_time || undefined,
      scheduledEndTime: t.scheduled_end_time || undefined,
      extended_time: t.extended_time,
      pushed_to_next_day: t.pushed_to_next_day,
      actual_completion_date: t.actual_completion_date || undefined,
      parentId: t.parent_id?.toString() || undefined,
      has_subtasks: t.has_subtasks || false,
      source: t.source,
      is_issue: t.is_issue
    }));
  },
  
  createTask: async (task: Partial<Task>): Promise<Task> => {
    const payload = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.dueDate,
      assigned_to_id: (task as any).assigneeId ? parseInt((task as any).assigneeId, 10) : ((task as any).assigneeId === "" ? null : undefined),
      project_id: task.projectId ? parseInt(task.projectId, 10) : (task.projectId === "" ? null : undefined),
      start_date: (task as any).start_date || (task as any).startDate || undefined,
      scheduled_date: task.scheduledDate,
      scheduled_start_time: task.scheduledStartTime,
      scheduled_end_time: task.scheduledEndTime,
      parent_id: (task as any).parentId ? parseInt((task as any).parentId, 10) : undefined
    };
    const res = await fetch('/api/v1/tasks', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create task');
    const json = await res.json();
    const t = json.data;
    return {
      id: t.id.toString(),
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      dueDate: t.deadline || '',
      assignedTo: {
        name: t.assigned_to?.name || 'Unassigned',
        avatar: t.assigned_to?.avatar || ''
      },
      projectId: t.project_id?.toString(),
      scheduledDate: t.scheduled_date || undefined,
      scheduledStartTime: t.scheduled_start_time || undefined,
      scheduledEndTime: t.scheduled_end_time || undefined,
      extended_time: t.extended_time,
      pushed_to_next_day: t.pushed_to_next_day
    };
  },
  
  updateTask: async (id: number | string, task: Partial<Task>): Promise<Task> => {
    const payload = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.dueDate,
      assigned_to_id: (task as any).assigneeId ? parseInt((task as any).assigneeId, 10) : ((task as any).assigneeId === "" ? null : undefined),
      project_id: task.projectId ? parseInt(task.projectId, 10) : (task.projectId === "" ? null : undefined),
      start_date: (task as any).start_date || undefined,
      scheduled_date: task.scheduledDate,
      scheduled_start_time: task.scheduledStartTime,
      scheduled_end_time: task.scheduledEndTime,
      extended_time: task.extended_time,
      pushed_to_next_day: task.pushed_to_next_day,
      actual_completion_date: task.actual_completion_date,
      parent_id: (task as any).parentId ? parseInt((task as any).parentId, 10) : undefined
    };
    // Remove undefined values
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    
    const res = await fetch(`/api/v1/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update task');
    const json = await res.json();
    const t = json.data;
    return {
      id: t.id.toString(),
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      dueDate: t.deadline || '',
      assignedTo: {
        name: t.assigned_to?.name || 'Unassigned',
        avatar: t.assigned_to?.avatar || ''
      },
      projectId: t.project_id?.toString(),
      scheduledDate: t.scheduled_date || undefined,
      scheduledStartTime: t.scheduled_start_time || undefined,
      scheduledEndTime: t.scheduled_end_time || undefined,
      extended_time: t.extended_time,
      pushed_to_next_day: t.pushed_to_next_day
    };
  },
  
  deleteTask: async (id: number | string): Promise<void> => {
    const res = await fetch(`/api/v1/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete task');
  }
};
