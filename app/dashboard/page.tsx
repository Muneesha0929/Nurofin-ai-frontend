'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
  Sun, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  TrendingUp, 
  Building2, 
  Target,
  LayoutDashboard,
  CheckCircle2,
  CalendarDays,
  IndianRupee,
  Layers
} from 'lucide-react';
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
import { NextMeeting, UpcomingMeetings } from '@/components/meetings/MeetingWidgets';
import { leftToday, useMyMeetings } from '@/components/meetings/useMyMeetings';
import { ObjectivePanel, TaskPanel } from '@/components/SidePanel';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';
import { workcenterService, WCTask } from '@/services/workcenter';
import { tasksService } from '@/services/tasks';
import { meetingsService } from '@/services/meetings';
import { projectsService } from '@/services/projects';
import { usersService } from '@/services/users';
import { departmentTargetsService, QuarterOverview } from '@/services/departmentTargets';
import { Meeting, Project, Task } from '@/types';

// Dashboard Components
import { TeammateUser } from '@/components/dashboard/QuickAddTaskInput';
import { QuickAddMeetingModal } from '@/components/dashboard/QuickAddMeetingModal';
import { MyDayView } from '@/components/dashboard/MyDayView';
import { SmartSuggestionsDrawer } from '@/components/dashboard/SmartSuggestionsDrawer';
import { CeoTeamPulse } from '@/components/dashboard/CeoTeamPulse';
import { PlanMyDayModal } from '@/components/dashboard/PlanMyDayModal';

export default function DashboardPage() {
  const { userProfile, issues } = useStore();
  const isDirector = ['ceo', 'super_admin'].includes((userProfile?.role || '').toLowerCase());
  const me = String(userProfile?.id || '');
  const myName = userProfile?.name || 'Executive';

  // State
  const [overview, setOverview] = useState<QuarterOverview | null>(null);
  const [tasks, setTasks] = useState<WCTask[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<Entry[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teammates, setTeammates] = useState<TeammateUser[]>([]);
  
  // CEO View Mode: 'focus' (My Day) vs 'pulse' (Team Pulse)
  const [viewMode, setViewMode] = useState<'focus' | 'pulse'>('focus');

  // Modals & Panels
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [planMyDayOpen, setPlanMyDayOpen] = useState(false);
  const [panel, setPanel] = useState<{ kind: 'task'; task: WCTask } | { kind: 'objective'; id: number } | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [extended, setExtended] = useState('');
  const [prefillAssignee, setPrefillAssignee] = useState<TeammateUser | null>(null);

  // Strategic performance collapsible drawer & tabs
  const [strategicOpen, setStrategicOpen] = useState(false);
  const [strategicTab, setStrategicTab] = useState<'targets' | 'departments' | 'runway'>('targets');

  // Data Loading
  const loadOverview = useCallback(() => { 
    departmentTargetsService.overview().then(setOverview).catch(() => setOverview(null)); 
  }, []);

  const loadTasks = useCallback(() => { 
    workcenterService.getTasks({ page_size: 300 }).then(r => setTasks(r.tasks || [])).catch(() => setTasks([])); 
  }, []);

  const loadPlannerTasks = useCallback(() => {
    tasksService.getTasks().then(setPlannerTasks).catch(() => setPlannerTasks([]));
  }, []);

  const loadMeetings = useCallback(() => {
    meetingsService.getMeetings().then(m => setMeetings(m || [])).catch(() => {});
  }, []);

  const loadProjects = useCallback(() => {
    projectsService.getProjects().then(p => setProjects(p || [])).catch(() => {});
  }, []);

  const loadTeammates = useCallback(() => {
    usersService.getUsers().then(users => {
      setTeammates(users.map(u => ({
        id: Number(u.id),
        name: u.name,
        avatar: u.avatar,
        role: u.role,
        department: u.department
      })));
    }).catch(() => {});
  }, []);

  const loadObjectives = useCallback(() => {
    const start = isoDay(new Date(Date.now() - 120 * 86400000)), end = isoDay(new Date(Date.now() + 120 * 86400000));
    departmentTargetsService.deadlines(start, end, isDirector).then(items => setObjectives(items.map(fromObjective))).catch(() => setObjectives([]));
  }, [isDirector]);

  useEffect(() => {
    loadOverview(); 
    loadTasks(); 
    loadPlannerTasks();
    loadMeetings();
    loadProjects();
    loadTeammates();
  }, [loadOverview, loadTasks, loadPlannerTasks, loadMeetings, loadProjects, loadTeammates]);

  useEffect(() => { 
    loadObjectives(); 
  }, [loadObjectives]);

  const refreshAll = () => {
    loadOverview();
    loadTasks();
    loadPlannerTasks();
    loadMeetings();
    loadObjectives();
  };

  useEffect(() => {
    const handleTaskCreated = () => {
      refreshAll();
    };
    window.addEventListener('task:created', handleTaskCreated);
    return () => window.removeEventListener('task:created', handleTaskCreated);
  }, []);

  // Open Complete Task modal with Extended Time options
  const handleTaskComplete = (taskId: number) => {
    setExtended('');
    setCompleting(taskId);
  };

  // CEO Assign Task handler: switch to Focus mode and prefill assignee in quick add
  const handleAssignToTeammate = (user: TeammateUser) => {
    setPrefillAssignee(user);
    setViewMode('focus');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Flatten tasks and subtasks into a unified structure so subtasks created under parents reflect everywhere!
  const allFlattenedTasks = useMemo(() => {
    const map = new Map<number, WCTask>();

    const traverseWCTask = (t: any, parentTitle?: string) => {
      if (!t || !t.id) return;
      const idNum = Number(t.id);
      if (!map.has(idNum)) {
        map.set(idNum, {
          ...t,
          id: idNum,
          parent_title: t.parent_title || parentTitle,
          deadline: t.deadline || t.scheduled_date || null,
          scheduled_date: t.scheduled_date || t.scheduledDate || (t.deadline ? t.deadline.slice(0, 10) : null),
          scheduled_start_time: t.scheduled_start_time || t.scheduledStartTime || t.start_time || null,
          scheduled_end_time: t.scheduled_end_time || t.scheduledEndTime || t.end_time || null,
        });
      }
      if (t.subtasks && Array.isArray(t.subtasks)) {
        t.subtasks.forEach((st: any) => {
          traverseWCTask({
            ...st,
            project_id: st.project_id || t.project_id,
            project_name: st.project_name || t.project_name,
            deadline: st.deadline || t.deadline,
            scheduled_date: st.scheduled_date || t.scheduled_date,
            scheduled_start_time: st.scheduled_start_time || t.scheduled_start_time,
            scheduled_end_time: st.scheduled_end_time || t.scheduled_end_time,
          }, t.title);
        });
      }
    };

    tasks.forEach(root => traverseWCTask(root));

    // Also incorporate plannerTasks to guarantee 100% coverage across flat & hierarchical tasks
    if (plannerTasks && Array.isArray(plannerTasks)) {
      plannerTasks.forEach((pt: any) => {
        if (!pt || !pt.id) return;
        const idNum = Number(pt.id);
        if (!map.has(idNum)) {
          map.set(idNum, {
            id: idNum,
            title: pt.title || 'Untitled',
            description: pt.description || null,
            status: pt.status || 'todo',
            priority: pt.priority || 'medium',
            deadline: pt.dueDate || pt.deadline || pt.scheduledDate || null,
            scheduled_date: pt.scheduledDate || pt.scheduled_date || null,
            scheduled_start_time: pt.scheduledStartTime || pt.scheduled_start_time || pt.start_time || null,
            scheduled_end_time: pt.scheduledEndTime || pt.scheduled_end_time || pt.end_time || null,
            start_date: pt.start_date || null,
            estimated_hours: pt.extended_time || null,
            progress: 0,
            assigned_to_id: pt.assignedTo?.id ? Number(pt.assignedTo.id) : (pt.assigneeId ? Number(pt.assigneeId) : null),
            assigned_to_name: pt.assignedTo?.name || null,
            assigned_to_avatar: pt.assignedTo?.avatar || null,
            assigned_by_id: null,
            assigned_by_name: null,
            reviewer_id: null,
            reviewer_name: null,
            project_id: pt.projectId ? Number(pt.projectId) : null,
            project_name: null,
            parent_id: pt.parentId ? Number(pt.parentId) : null,
            quarter_id: null,
            meeting_id: pt.meetingId ? Number(pt.meetingId) : null,
            subtasks: [],
            created_at: pt.createdAt || null
          });
        } else {
          const existing = map.get(idNum)!;
          if (pt.scheduledDate && !existing.scheduled_date) existing.scheduled_date = pt.scheduledDate;
          if (pt.dueDate && !existing.deadline) existing.deadline = pt.dueDate;
          const sTime = pt.scheduledStartTime || pt.scheduled_start_time || pt.start_time;
          const eTime = pt.scheduledEndTime || pt.scheduled_end_time || pt.end_time;
          if (sTime) existing.scheduled_start_time = sTime;
          if (eTime) existing.scheduled_end_time = eTime;
        }
      });
    }

    return Array.from(map.values());
  }, [tasks, plannerTasks]);

  const now = today();
  const getTaskDueDate = (t: any): string | null => {
    const raw = t.deadline || t.scheduled_date || null;
    return raw ? raw.slice(0, 10) : null;
  };
  const myOverdueTasks = allFlattenedTasks.filter(t => {
    const isMine = String(t.assigned_to_id) === me;
    const dDate = getTaskDueDate(t);
    return isMine && Boolean(dDate && dDate < now) && t.status !== 'completed' && t.status !== 'done';
  });
  const overdueTasks = isDirector
    ? allFlattenedTasks.filter(t => {
        const dDate = getTaskDueDate(t);
        return Boolean(dDate && dDate < now) && t.status !== 'completed' && t.status !== 'done';
      })
    : myOverdueTasks;
  const todayTasks = allFlattenedTasks.filter(t => {
    const isMine = String(t.assigned_to_id) === me;
    const dDate = getTaskDueDate(t);
    return isMine && dDate === now;
  });
  const todayMeetings = meetings.filter(m => m.date === now && (isDirector || m.attendees?.includes(myName) || String(m.owner_id) === me));

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-6 bg-background-primary text-text-primary normal-case">
      {/* 1. TOP EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <Greeting name={userProfile?.name} />
          <p className="text-xs text-text-secondary mt-0.5">
            Plan your day, execute your top priorities, and stay aligned with the team.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* CEO Mode Switcher (Focus vs Team Pulse) */}
          {isDirector && (
            <div className="flex items-center bg-background-secondary p-1 rounded-2xl border border-border-subtle shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                  viewMode === 'focus' 
                    ? 'bg-accent-blue text-white shadow-xs' 
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Sun size={13} />
                <span>My Focus</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('pulse')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                  viewMode === 'pulse' 
                    ? 'bg-accent-blue text-white shadow-xs' 
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Users size={13} />
                <span>Team Pulse</span>
              </button>
            </div>
          )}

          {/* Plan My Day Morning Ritual Button */}
          <button
            type="button"
            onClick={() => setPlanMyDayOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-background-secondary hover:bg-background-secondary/80 border border-border-subtle hover:border-accent-blue text-text-primary text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Sparkles size={13} className="text-accent-blue" />
            <span>Plan My Day</span>
            {overdueTasks.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center">
                {overdueTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. CORE WORKSPACE: 2-Column Canvas OR CEO Team Pulse */}
      {viewMode === 'pulse' && isDirector ? (
        <CeoTeamPulse
          teammates={teammates}
          tasks={allFlattenedTasks}
          meetings={meetings}
          onOpenTaskPanel={t => setPanel({ kind: 'task', task: t })}
          onAssignToTeammate={handleAssignToTeammate}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: "My Day" Agenda & Smart Quick-Add */}
          <div className="lg:col-span-8 space-y-6">
            <MyDayView
              tasks={allFlattenedTasks}
              allTasks={allFlattenedTasks}
              meetings={meetings}
              currentUserId={me}
              currentUserName={myName}
              isDirector={isDirector}
              projects={projects}
              teammates={teammates}
              onOpenTaskPanel={t => setPanel({ kind: 'task', task: t })}
              onRefresh={refreshAll}
              onOpenMeetingModal={() => setMeetingModalOpen(true)}
              onCompleteTask={handleTaskComplete}
              prefillAssignee={prefillAssignee}
            />
          </div>

          {/* RIGHT: Smart Suggestions & Overdue Drawer */}
          <div className="lg:col-span-4 space-y-4">
            <SmartSuggestionsDrawer
              tasks={allFlattenedTasks}
              currentUserId={me}
              isDirector={isDirector}
              onOpenTaskPanel={t => setPanel({ kind: 'task', task: t })}
              onRefresh={refreshAll}
              onCompleteTask={handleTaskComplete}
            />
          </div>
        </div>
      )}

      {/* 3. STRATEGIC OVERVIEW & QUARTERLY PERFORMANCE (Compact Drawer) */}
      <div className="mt-4 pt-3 border-t border-border-subtle/70">
        <button
          type="button"
          onClick={() => setStrategicOpen(!strategicOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-background-secondary border border-border-subtle hover:border-accent-blue/40 rounded-xl transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center shrink-0">
              <TrendingUp size={13} />
            </span>
            <div className="text-left">
              <h3 className="text-xs font-bold text-text-primary group-hover:text-accent-blue transition-colors">
                Strategic Performance & Company Targets {overview ? `(${overview.quarter.short})` : ''}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-text-secondary group-hover:text-text-primary">
            <span>{strategicOpen ? 'Collapse' : 'Expand Strategic View'}</span>
            {strategicOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {strategicOpen && (
          <div className="mt-3 p-4 bg-background-secondary/40 border border-border-subtle rounded-2xl space-y-4 animate-in fade-in duration-150">
            {/* Compact Sub-Tab Switcher */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border-subtle/50 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStrategicTab('targets')}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    strategicTab === 'targets' 
                      ? 'bg-accent-blue text-white shadow-2xs' 
                      : 'hover:bg-background-primary text-text-secondary'
                  )}
                >
                  <Target size={12} />
                  <span>Targets & Objectives</span>
                </button>

                {overview && overview.departments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStrategicTab('departments')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      strategicTab === 'departments' 
                        ? 'bg-accent-blue text-white shadow-2xs' 
                        : 'hover:bg-background-primary text-text-secondary'
                    )}
                  >
                    <Building2 size={12} />
                    <span>Departments ({overview.departments.length})</span>
                  </button>
                )}

                {(userProfile?.role || '').toLowerCase() === 'ceo' && (
                  <button
                    type="button"
                    onClick={() => setStrategicTab('runway')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      strategicTab === 'runway' 
                        ? 'bg-accent-blue text-white shadow-2xs' 
                        : 'hover:bg-background-primary text-text-secondary'
                    )}
                  >
                    <IndianRupee size={12} />
                    <span>Runway</span>
                  </button>
                )}
              </div>

              {overview && <QuarterPills quarter={overview.quarter} />}
            </div>

            {/* TAB 1: Targets & Objectives (Compact View) */}
            {strategicTab === 'targets' && (
              <div className="space-y-4">
                {overview && <NewTargetBanners data={overview} />}
                {overview && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-stretch">
                    <div className="xl:col-span-2">
                      <QuarterHero data={overview} onChange={headline => setOverview({ ...overview, headline })} />
                    </div>
                    <MonthlyTargets data={overview} onChange={loadOverview} />
                  </div>
                )}
                {overview && <CompanyTargets data={overview} onChange={loadOverview} />}
              </div>
            )}

            {/* TAB 2: Departments Grid */}
            {strategicTab === 'departments' && overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {overview.departments.map(d => <DeptCard key={d.id} d={d} quarter={overview.quarter} />)}
              </div>
            )}

            {/* TAB 3: Runway */}
            {strategicTab === 'runway' && (userProfile?.role || '').toLowerCase() === 'ceo' && (
              <div className="max-w-xl">
                <RunwayCard />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. MODALS & SLIDE PANELS */}
      <QuickAddMeetingModal
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        onCreated={refreshAll}
        teammates={teammates}
        currentUserId={me}
      />

      <PlanMyDayModal
        isOpen={planMyDayOpen}
        onClose={() => setPlanMyDayOpen(false)}
        overdueTasks={myOverdueTasks}
        currentUserId={me}
        todayTasks={todayTasks}
        todayMeetings={todayMeetings}
        onRefresh={refreshAll}
      />

      <DailyCheckinModal 
        isOpen={checkinOpen} 
        onClose={() => setCheckinOpen(false)} 
        overdueTasks={tasks.filter((t: any) => t.status === 'overdue')} 
        yesterdayMeetings={[]} 
        onTasksUpdate={() => {}} 
      />

      {panel?.kind === 'objective' && (
        <ObjectivePanel 
          id={panel.id} 
          onClose={() => setPanel(null)} 
          onChanged={refreshAll} 
          onOpen={id => setPanel({ kind: 'objective', id })} 
        />
      )}

      {panel?.kind === 'task' && (
        <TaskPanel 
          task={panel.task} 
          canChange={true} 
          onClose={() => setPanel(null)} 
          onChanged={loadTasks} 
        />
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
            await workcenterService.updateTask(completing, { 
              status: 'completed', 
              extended_time: isNaN(ext) ? undefined : ext, 
              actual_completion_date: completionDate 
            }); 
          } finally { 
            setCompleting(null); 
            loadTasks(); 
            loadPlannerTasks();
          }
        }}
      />
    </div>
  );
}
