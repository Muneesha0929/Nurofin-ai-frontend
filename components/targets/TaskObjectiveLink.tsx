'use client';

// Small pieces the Task Center uses to link a task to a quarter objective.
// Everything here is optional: if the department-targets API is unavailable they render nothing.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { departmentTargetsService as api, LinkableObjective, TaskLinkInfo } from '@/services/departmentTargets';

/** Objectives the signed-in user may link tasks to (their departments; all for the Director). */
export function useLinkableObjectives() {
  const [list, setList] = useState<LinkableObjective[]>([]);
  const [label, setLabel] = useState('');
  useEffect(() => {
    api.linkableObjectives().then(r => { setList(r.objectives); setLabel(r.quarter.short); }).catch(() => setList([]));
  }, []);
  return { objectives: list, quarterShort: label };
}

/** After the Task Center creates or edits a task, attach / move / remove its objective link. */
export async function syncTaskObjective(taskId: number | undefined, next: string, prev: string) {
  if (!taskId || next === prev) return;
  if (next) await api.linkTask(Number(next), taskId);
  else if (prev) await api.unlinkTask(taskId);
}

export async function currentObjectiveOf(taskId: number): Promise<string> {
  try { const r = await api.taskLinks([taskId]); return r[String(taskId)] ? String(r[String(taskId)].objective_id) : ''; } catch { return ''; }
}

/** <select> for the create / edit task dialog. Hidden when the user has no objectives to link to. */
export function ObjectiveSelect({ objectives, quarterShort, value, onChange, className }: {
  objectives: LinkableObjective[]; quarterShort: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  if (!objectives.length) return null;
  const byDept = objectives.reduce<Record<string, LinkableObjective[]>>((m, o) => ((m[o.department.name] = m[o.department.name] || []).push(o), m), {});
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-text-secondary uppercase">{quarterShort} objective (optional)</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={className}>
        <option value="">Not linked</option>
        {Object.entries(byDept).map(([dept, list]) => (
          <optgroup key={dept} label={dept}>
            {list.map(o => <option key={o.id} value={o.id}>{o.level === 'sub_objective' ? `↳ ${o.title}` : o.title}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

/** One line in the task detail dialog: which objective this task counts towards. */
export function TaskObjectiveBadge({ taskId }: { taskId: number }) {
  const [info, setInfo] = useState<TaskLinkInfo | null>(null);
  useEffect(() => {
    let alive = true;
    api.taskLinks([taskId]).then(r => alive && setInfo(r[String(taskId)] || null)).catch(() => alive && setInfo(null));
    return () => { alive = false; };
  }, [taskId]);
  if (!info) return null;
  return (
    <Link href={`/departments?id=${info.department.id}`} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent-blue/10 text-accent-blue px-2 py-1 text-[11px] font-semibold normal-case hover:bg-accent-blue/15">
      <Target size={12} /> {info.quarter} · {info.department.name}: {info.title}
    </Link>
  );
}
