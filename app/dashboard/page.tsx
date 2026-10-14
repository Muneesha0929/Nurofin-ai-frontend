'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { DailyCheckinModal } from '@/components/DailyCheckinModal';
import { QuarterGoalHero } from '@/components/QuarterGoalHero';
import { Greeting } from '@/components/dashboard/Greeting';
import { DeadlineCalendar, Entry, MyWork, QuickNotes, Upcoming, fromObjective, fromTask, isoDay } from '@/components/dashboard/Widgets';
import { ObjectivePanel, TaskPanel } from '@/components/SidePanel';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';
import { workcenterService, WCTask } from '@/services/workcenter';
import { departmentTargetsService } from '@/services/departmentTargets';

/**
 * Overview: greeting, the quarter target, departments, a deadlines calendar, my work and quick notes.
 * Deadlines come from two places: Task Center tasks and department objectives.
 */
export default function DashboardPage() {
  const { userProfile } = useStore();
  const isDirector = ['ceo', 'super_admin'].includes((userProfile?.role || '').toLowerCase());
  const me = String(userProfile?.id || '');

  const [tasks, setTasks] = useState<WCTask[]>([]);
  const [objectiveEntries, setObjectiveEntries] = useState<Entry[]>([]);
  const [everyone, setEveryone] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ kind: 'task'; task: WCTask } | { kind: 'objective'; id: number } | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [extended, setExtended] = useState('');
  const [heroKey, setHeroKey] = useState(0);

  const showEveryone = isDirector && everyone;

  const loadTasks = useCallback(() => {
    workcenterService.getTasks({ page_size: 200 }).then(r => setTasks(r.tasks || [])).catch(() => setTasks([]));
  }, []);

  // Objectives for the visible month and roughly a quarter either side of today (for "My work" and "Upcoming").
  const loadObjectives = useCallback(() => {
    const start = isoDay(new Date(Math.min(new Date(month.getFullYear(), month.getMonth(), 1).getTime(), Date.now() - 120 * 86400000)));
    const end = isoDay(new Date(Math.max(new Date(month.getFullYear(), month.getMonth() + 1, 0).getTime(), Date.now() + 120 * 86400000)));
    departmentTargetsService.deadlines(start, end, showEveryone)
      .then(items => setObjectiveEntries(items.map(fromObjective)))
      .catch(() => setObjectiveEntries([]));
  }, [month, showEveryone]);

  useEffect(() => { loadTasks(); setCheckinOpen(true); }, [loadTasks]);
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const entries = useMemo(() => {
    const t = tasks.map(x => fromTask(x, me)).filter((e): e is Entry => !!e).filter(e => showEveryone || e.mine);
    return [...objectiveEntries, ...t];
  }, [tasks, objectiveEntries, me, showEveryone]);

  const refresh = () => { loadTasks(); loadObjectives(); setHeroKey(k => k + 1); };
  const open = (e: Entry) => setPanel(e.kind === 'task' && e.task ? { kind: 'task', task: e.task } : { kind: 'objective', id: e.id });

  const taskStatus = async (e: Entry, status: string) => {
    if (status === 'completed') { setCompleting(e.id); return; }
    try { await workcenterService.updateStatus(e.id, status); } finally { loadTasks(); }
  };
  const objectiveProgress = async (e: Entry, p: number) => {
    try { await departmentTargetsService.updateObjective(e.id, { progress: p }); } finally { refresh(); }
  };

  const scope = isDirector ? (
    <div className="flex rounded-lg border border-border-subtle overflow-hidden text-[11.5px] font-semibold">
      {[['Everyone', true], ['Mine', false]].map(([label, v]) => (
        <button key={String(label)} onClick={() => setEveryone(v as boolean)}
          className={cn('px-2.5 py-1', everyone === v ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-primary')}>{label}</button>
      ))}
    </div>
  ) : undefined;

  return (
    <div className="p-6 flex flex-col gap-5 bg-background-primary min-h-screen text-text-primary">
      <DailyCheckinModal
        isOpen={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        overdueTasks={tasks.filter((t: any) => t.status === 'overdue')}
        yesterdayMeetings={[]}
        onTasksUpdate={() => {}}
      />

      <Greeting name={userProfile?.name} />
      <QuarterGoalHero key={heroKey} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DeadlineCalendar entries={entries} month={month} setMonth={setMonth} selected={selected} setSelected={setSelected} scope={scope} />
        <Upcoming entries={entries} onOpen={open} day={selected} clearDay={() => setSelected(null)} />
        <MyWork entries={entries} onOpen={open} onTaskStatus={taskStatus} onObjectiveProgress={objectiveProgress} />
        <QuickNotes userId={me} />
      </div>

      {panel?.kind === 'objective' && (
        <ObjectivePanel id={panel.id} onClose={() => setPanel(null)} onChanged={refresh} onOpen={id => setPanel({ kind: 'objective', id })} />
      )}
      {panel?.kind === 'task' && (
        <TaskPanel task={panel.task} canChange={isDirector || String(panel.task.assigned_to_id) === me} onClose={() => setPanel(null)} onChanged={loadTasks} />
      )}

      <CompleteTaskModal
        isOpen={completing !== null}
        onClose={() => setCompleting(null)}
        taskExtendedTime={extended}
        setTaskExtendedTime={setExtended}
        onSubmit={async (extendedTime, completionDate) => {
          if (completing === null) return;
          const ext = parseFloat(extendedTime);
          try {
            await workcenterService.updateTask(completing, { status: 'completed', extended_time: isNaN(ext) ? undefined : ext, actual_completion_date: completionDate });
          } finally {
            setCompleting(null);
            loadTasks();
          }
        }}
      />
    </div>
  );
}
