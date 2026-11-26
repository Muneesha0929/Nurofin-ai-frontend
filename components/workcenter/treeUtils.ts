// Small helpers for the Task Center's nested task tree (task -> subtasks -> sub-subtasks).
import type { WCTask } from '@/services/workcenter';

export type AnyTask = WCTask & { subtasks?: any[] };

/** 'done' and 'completed' are the same thing. */
export const normStatus = (s?: string | null) => (s === 'done' ? 'completed' : s || 'todo');

export function flattenTasks(list: any[], out: any[] = []): any[] {
  for (const t of list || []) {
    out.push(t);
    if (t.subtasks?.length) flattenTasks(t.subtasks, out);
  }
  return out;
}

/** Apply `patch(task)` to every task (at any depth) whose id is in `ids`. Returns a new tree. */
export function patchTasks<T extends { id: number; subtasks?: any[] }>(list: T[], ids: Set<number>, patch: (t: any) => any): T[] {
  return (list || []).map(t => {
    const hit = ids.has(t.id);
    const subtasks = t.subtasks?.length ? patchTasks(t.subtasks, ids, patch) : t.subtasks;
    const next: any = subtasks === t.subtasks ? t : { ...t, subtasks };
    return hit ? { ...next, ...patch(next) } : next;
  });
}

/** Ids of the ancestors of `id` (root first), or null if the task is not in the tree. */
export function pathTo(list: any[], id: number, trail: number[] = []): number[] | null {
  for (const t of list || []) {
    if (t.id === id) return trail;
    const sub = t.subtasks?.length ? pathTo(t.subtasks, id, [...trail, t.id]) : null;
    if (sub) return sub;
  }
  return null;
}
