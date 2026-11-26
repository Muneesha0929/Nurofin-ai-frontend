'use client';

// Small pieces the Task Center uses to link a task to a quarter objective.
// Everything here is optional: if the department-targets API is unavailable they render nothing.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { departmentTargetsService as api, LinkableObjective, TaskLinkInfo } from '@/services/departmentTargets';
import { CodeChip } from '@/components/timeline/CodeChip';
import { deptPrefix } from '@/components/targets/ui';

/** The code a new task or sub-objective will get under this objective, straight from the API (never guessed). */
export async function fetchNextCode(objectiveId: number): Promise<string | null> {
  try {
    const r = await api.linkableObjectives();
    const o = r.objectives.find(x => x.id === objectiveId);
    return o?.next_full_code || o?.next_task_code || null;
  } catch { return null; }
}

/** The code of one task (e.g. PROD-1.2.3) when it is linked to an objective. */
export const taskCodeOf = (info?: TaskLinkInfo | null) =>
  !info ? '' : info.full_code || info.project_code || (info.task_code ? `${deptPrefix(info.department)}-${info.task_code}` : '');

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
  const byDept = objectives.reduce<Record<string, { shortCode?: string | null; list: LinkableObjective[] }>>((m, o) => {
    const key = o.department.name;
    if (!m[key]) m[key] = { shortCode: o.department.short_code, list: [] };
    m[key].list.push(o);
    return m;
  }, {});
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-text-secondary uppercase">{quarterShort} department objective (optional)</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={className}>
        <option value="">Not linked</option>
        {Object.entries(byDept).map(([dept, group]) => (
          <optgroup key={dept} label={group.shortCode ? `##${group.shortCode} · ${dept}` : dept}>
            {group.list.map(o => {
              const code = o.full_code || (o.code ? `${deptPrefix(o.department)}-${o.code}` : '');
              return <option key={o.id} value={o.id}>{code ? `${code} ` : (o.level === 'sub_objective' ? '↳ ' : '')}{o.title}</option>;
            })}
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
  const objCode = info.objective_full_code || (info.objective_code ? `${deptPrefix(info.department)}-${info.objective_code}` : '');
  return (
    <Link href={`/departments?id=${info.department.id}&objective=${info.objective_id}`} className="mt-1 inline-flex flex-wrap items-center gap-1.5 rounded-md bg-accent-blue/10 text-accent-blue px-2 py-1 text-[11px] font-semibold normal-case hover:bg-accent-blue/15 max-w-full">
      <Target size={12} className="shrink-0" />
      {objCode && <CodeChip code={objCode} size="xs" />}
      <span className="min-w-0 truncate">{info.quarter} · {info.department.name}: {info.title}</span>
    </Link>
  );
}

/** The task's own code as a chip. Renders nothing when the task is not linked to an objective. */
export function TaskCodeChip({ taskId, className }: { taskId: number; className?: string }) {
  const [code, setCode] = useState('');
  useEffect(() => {
    let alive = true;
    api.taskLinks([taskId]).then(r => alive && setCode(taskCodeOf(r[String(taskId)]))).catch(() => alive && setCode(''));
    return () => { alive = false; };
  }, [taskId]);
  return code ? <CodeChip code={code} className={className} /> : null;
}
