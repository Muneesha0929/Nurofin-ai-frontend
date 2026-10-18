'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { DailyCheckinModal } from '@/components/DailyCheckinModal';
import { NewTargetBanners, QuarterHero } from '@/components/QuarterGoalHero';
import { Greeting } from '@/components/dashboard/Greeting';
import { Entry, EntryRow, MyWork, QuickNotes, fromObjective, fromTask, isoDay, today } from '@/components/dashboard/Widgets';
import { DeptCard, Panel, QuarterPills } from '@/components/targets/ui';
import { CompanyTargets } from '@/components/targets/CompanyTargets';
import { MonthlyTargets } from '@/components/targets/MonthlyTargets';
import { RunwayCard } from '@/components/runway/RunwayCard';
import { ObjectivePanel, TaskPanel } from '@/components/SidePanel';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';
import { workcenterService, WCTask } from '@/services/workcenter';
import { meetingsService } from '@/services/meetings';
import { projectsService } from '@/services/projects';
import { departmentTargetsService, QuarterOverview } from '@/services/departmentTargets';
import { Meeting, Project } from '@/types';

/**
 * Overview, laid out like the approved design: quarter pills + greeting, the quarter target,
 * the tiles from the old dashboard, departments, coming up / needs attention, my work, quick notes.
 */
export default function DashboardPage() {
  const { userProfile, issues } = useStore();
  const isDirector = ['ceo', 'super_admin'].includes((userProfile?.role || '').toLowerCase());
  const me = String(userProfile?.id || '');

  const [overview, setOverview] = useState<QuarterOverview | null>(null);
  const [tasks, setTasks] = useState<WCTask[]>([]);
  const [objectives, setObjectives] = useState<Entry[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [panel, setPanel] = useState<{ kind: 'task'; task: WCTask } | { kind: 'objective'; id: number } | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [extended, setExtended] = useState('');

  const loadOverview = useCallback(() => { departmentTargetsService.overview().then(setOverview).catch(() => setOverview(null)); }, []);
  const loadTasks = useCallback(() => { workcenterService.getTasks({ page_size: 200 }).then(r => setTasks(r.tasks || [])).catch(() => setTasks([])); }, []);
  const loadObjectives = useCallback(() => {
    const start = isoDay(new Date(Date.now() - 120 * 86400000)), end = isoDay(new Date(Date.now() + 120 * 86400000));
    departmentTargetsService.deadlines(start, end, isDirector).then(items => setObjectives(items.map(fromObjective))).catch(() => setObjectives([]));
  }, [isDirector]);

  useEffect(() => {
    loadOverview(); loadTasks(); setCheckinOpen(true);
    meetingsService.getMeetings().then(m => setMeetings(m || [])).catch(() => {});
    projectsService.getProjects().then(p => setProjects(p || [])).catch(() => {});
  }, [loadOverview, loadTasks]);
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  // The Director sees everyone's deadlines; everybody else sees their own.
  const entries = useMemo(() => [
    ...objectives,
    ...tasks.map(t => fromTask(t, me)).filter((e): e is Entry => !!e).filter(e => isDirector || e.mine),
  ], [objectives, tasks, me, isDirector]);

  const now = today(), soon = isoDay(new Date(Date.now() + 14 * 86400000));
  const comingUp = entries.filter(e => !e.done && e.date >= now && e.date <= soon).sort((a, b) => a.date.localeCompare(b.date));
  const late = entries.filter(e => e.overdue).sort((a, b) => a.date.localeCompare(b.date));
  const myOpenTasks = tasks.filter(t => t.status !== 'completed' && (isDirector || String(t.assigned_to_id) === me));
  const todaysMeetings = meetings.filter(m => m.date === now && (isDirector || m.attendees?.includes(userProfile?.name) || m.owner_name === userProfile?.name));
  const activeProjects = projects.filter(p => ['active', 'in progress'].includes((p.status || '').toLowerCase()) && (isDirector || p.members?.some(m => m.name === userProfile?.name)));
  const openIssues = (issues || []).filter(i => i.status !== 'closed' && (isDirector || i.assigneeName === userProfile?.name || i.reporterName === userProfile?.name));

  const refresh = () => { loadOverview(); loadTasks(); loadObjectives(); };
  const open = (e: Entry) => setPanel(e.kind === 'task' && e.task ? { kind: 'task', task: e.task } : { kind: 'objective', id: e.id });
  const taskStatus = async (e: Entry, status: string) => {
    if (status === 'completed') { setCompleting(e.id); return; }
    try { await workcenterService.updateStatus(e.id, status); } finally { loadTasks(); }
  };
  const objectiveProgress = async (e: Entry, p: number) => {
    try { await departmentTargetsService.updateObjective(e.id, { progress: p }); } finally { refresh(); }
  };

  const tiles = [
    { label: isDirector ? 'Open tasks' : 'My open tasks', value: myOpenTasks.length, href: '/workcenter?status=pending', tone: 'blue' },
    { label: 'Overdue', value: late.length, href: '/deadlines', tone: 'red' },
    { label: 'Due in 14 days', value: comingUp.length, href: '/deadlines', tone: 'blue' },
    { label: 'Meetings today', value: todaysMeetings.length, href: '/meetings', tone: 'blue' },
    { label: 'Active projects', value: activeProjects.length, href: '/projects', tone: 'blue' },
    { label: 'Pending issues', value: openIssues.length, href: '/issues', tone: 'orange' },
  ];

  return (
    <div className="p-6 flex flex-col gap-6 bg-background-primary min-h-screen text-text-primary normal-case">
      <DailyCheckinModal isOpen={checkinOpen} onClose={() => setCheckinOpen(false)} overdueTasks={tasks.filter((t: any) => t.status === 'overdue')} yesterdayMeetings={[]} onTasksUpdate={() => {}} />

      <div className="flex flex-col gap-3">
        {overview && <QuarterPills quarter={overview.quarter} />}
        <Greeting name={userProfile?.name} />
      </div>

      {overview && <NewTargetBanners data={overview} />}
      {overview && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
          <div className="xl:col-span-2"><QuarterHero data={overview} onChange={headline => setOverview({ ...overview, headline })} /></div>
          <MonthlyTargets data={overview} onChange={loadOverview} />
        </div>
      )}

      {(userProfile?.role || '').toLowerCase() === 'ceo' && <RunwayCard />}

      <section>
        <SectionHead title="From the current dashboard" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {tiles.map(t => (
            <Link key={t.label} href={t.href} className="flex items-center gap-3 px-3.5 py-3 bg-background-secondary border border-border-subtle rounded-xl hover:border-border-active transition-colors">
              <span className={cn('w-2 h-8 rounded shrink-0', t.tone === 'red' ? 'bg-accent-red' : t.tone === 'orange' ? 'bg-accent-orange' : 'bg-accent-blue/20')} />
              <span><b className="block text-[22px] leading-none font-extrabold">{t.value}</b><span className="text-[12px] text-text-secondary">{t.label}</span></span>
            </Link>
          ))}
        </div>
      </section>

      {overview && <CompanyTargets data={overview} onChange={loadOverview} />}

      {overview && (
        <section>
          <SectionHead title={`Departments · ${overview.quarter.short}`} right={<span className="text-[12.5px] text-text-secondary">Click a department for its targets, objectives and past quarters</span>} />
          {overview.departments.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {overview.departments.map(d => <DeptCard key={d.id} d={d} quarter={overview.quarter} />)}
            </div>
          ) : (
            <Panel className="p-8 text-center text-[13.5px] text-text-secondary">
              {isDirector ? <>No departments yet. <Link href="/departments" className="text-accent-blue font-semibold">Create the first one</Link>.</> : 'You are not part of a department yet. The Director adds people to departments.'}
            </Panel>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ListCard title="Coming up" right={<Link href="/deadlines" className="text-[12.5px] font-semibold text-accent-blue">Open calendar →</Link>}
          empty="Nothing due in the next 14 days." items={comingUp.slice(0, 7)} onOpen={open} />
        <ListCard title="Needs attention" right={<span className="text-[12.5px] text-text-secondary">{late.length} overdue</span>}
          empty="Nothing overdue." items={late.slice(0, 7)} onOpen={open} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <MyWork entries={entries} onOpen={open} onTaskStatus={taskStatus} onObjectiveProgress={objectiveProgress} />
        <QuickNotes userId={me} />
      </div>

      {panel?.kind === 'objective' && <ObjectivePanel id={panel.id} onClose={() => setPanel(null)} onChanged={refresh} onOpen={id => setPanel({ kind: 'objective', id })} />}
      {panel?.kind === 'task' && <TaskPanel task={panel.task} canChange={isDirector || String(panel.task.assigned_to_id) === me} onClose={() => setPanel(null)} onChanged={loadTasks} />}

      <CompleteTaskModal
        isOpen={completing !== null}
        onClose={() => setCompleting(null)}
        taskExtendedTime={extended}
        setTaskExtendedTime={setExtended}
        onSubmit={async (extendedTime, completionDate) => {
          if (completing === null) return;
          const ext = parseFloat(extendedTime);
          try { await workcenterService.updateTask(completing, { status: 'completed', extended_time: isNaN(ext) ? undefined : ext, actual_completion_date: completionDate }); }
          finally { setCompleting(null); loadTasks(); }
        }}
      />
    </div>
  );
}

const SectionHead = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
    <h2 className="text-[18px] font-extrabold text-text-primary">{title}</h2>{right}
  </div>
);

function ListCard({ title, right, items, empty, onOpen }: { title: string; right: React.ReactNode; items: Entry[]; empty: string; onOpen: (e: Entry) => void }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2"><h2 className="text-[18px] font-extrabold">{title}</h2>{right}</div>
      <div className="px-4 pb-2">{items.length ? items.map(e => <EntryRow key={e.key} e={e} onOpen={onOpen} />) : <div className="py-3 text-[13px] text-text-secondary">{empty}</div>}</div>
    </Panel>
  );
}
