'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { DeadlineCalendar, Entry, Upcoming, fromObjective, fromTask, isoDay } from '@/components/dashboard/Widgets';
import { ObjectivePanel, TaskPanel } from '@/components/SidePanel';
import { workcenterService, WCTask } from '@/services/workcenter';
import { departmentTargetsService, TargetDepartment } from '@/services/departmentTargets';

// One colour per department, in a fixed order so a department keeps its colour.
const DEPT_COLOURS = ['#2563EB', '#DB2777', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626', '#65A30D'];

/** Deadlines: every objective, sub-objective and task with a date, by month. */
export default function DeadlinesPage() {
  const { userProfile } = useStore();
  const isDirector = ['ceo', 'super_admin'].includes((userProfile?.role || '').toLowerCase());
  const me = String(userProfile?.id || '');

  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [everyone, setEveryone] = useState(true);
  const [dept, setDept] = useState<number | 'all'>('all');
  const [departments, setDepartments] = useState<TargetDepartment[]>([]);
  const [tasks, setTasks] = useState<WCTask[]>([]);
  const [objectives, setObjectives] = useState<Entry[]>([]);
  const [panel, setPanel] = useState<{ kind: 'task'; task: WCTask } | { kind: 'objective'; id: number } | null>(null);
  const showEveryone = isDirector && everyone;

  const loadTasks = useCallback(() => { workcenterService.getTasks({ page_size: 200 }).then(r => setTasks(r.tasks || [])).catch(() => setTasks([])); }, []);
  const loadObjectives = useCallback(() => {
    const start = isoDay(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    const end = isoDay(new Date(Math.max(new Date(month.getFullYear(), month.getMonth() + 2, 0).getTime(), Date.now() + 14 * 86400000)));
    departmentTargetsService.deadlines(start, end, showEveryone).then(i => setObjectives(i.map(fromObjective))).catch(() => setObjectives([]));
  }, [month, showEveryone]);

  useEffect(() => { loadTasks(); departmentTargetsService.listDepartments().then(setDepartments).catch(() => {}); }, [loadTasks]);
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const colourOf = useCallback((id?: number) => {
    const i = departments.findIndex(d => d.id === id);
    return i < 0 ? undefined : DEPT_COLOURS[i % DEPT_COLOURS.length];
  }, [departments]);

  const entries = useMemo(() => {
    const t = tasks.map(x => fromTask(x, me)).filter((e): e is Entry => !!e).filter(e => showEveryone || e.mine);
    const all = [...objectives, ...t];
    // A department filter shows only that department's objectives (tasks have no department).
    return dept === 'all' ? all : all.filter(e => e.deptId === dept);
  }, [tasks, objectives, me, showEveryone, dept]);

  const open = (e: Entry) => setPanel(e.kind === 'task' && e.task ? { kind: 'task', task: e.task } : { kind: 'objective', id: e.id });
  const refresh = () => { loadTasks(); loadObjectives(); };

  const chip = (active: boolean) => cn('px-3 py-1.5 text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors', active ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary');

  return (
    <div className="p-6 flex flex-col gap-5 bg-background-primary min-h-screen text-text-primary normal-case">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[26px] font-extrabold">Deadlines</div>
          <div className="text-[13.5px] text-text-secondary mt-1">Every objective, sub-objective and task with a date{showEveryone ? ', for everyone' : ', for you'}. Red = overdue. Click a day, then an item.</div>
        </div>
        {isDirector && (
          <div className="flex rounded-lg border border-border-subtle overflow-hidden bg-background-secondary">
            <button onClick={() => setEveryone(true)} className={chip(everyone)}>Everyone</button>
            <button onClick={() => setEveryone(false)} className={chip(!everyone)}>Mine</button>
          </div>
        )}
      </div>

      {departments.length > 0 && (
        <div className="flex flex-wrap rounded-lg border border-border-subtle overflow-hidden bg-background-secondary w-fit max-w-full" role="group" aria-label="Department filter">
          <button onClick={() => setDept('all')} className={chip(dept === 'all')}>All</button>
          {departments.map(d => (
            <button key={d.id} onClick={() => setDept(d.id)} className={chip(dept === d.id)}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colourOf(d.id) }} />{d.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <DeadlineCalendar entries={entries} month={month} setMonth={setMonth} selected={selected} setSelected={setSelected} colorOf={colourOf} />
        <Upcoming entries={entries} onOpen={open} day={selected} clearDay={() => setSelected(null)} />
      </div>

      {panel?.kind === 'objective' && <ObjectivePanel id={panel.id} onClose={() => setPanel(null)} onChanged={refresh} onOpen={id => setPanel({ kind: 'objective', id })} />}
      {panel?.kind === 'task' && <TaskPanel task={panel.task} canChange={isDirector || String(panel.task.assigned_to_id) === me} onClose={() => setPanel(null)} onChanged={loadTasks} />}
    </div>
  );
}
