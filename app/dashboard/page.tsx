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
  Layers,
  PanelRight,
  Flag,
  MessageSquare,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { formatISTDate, formatISTTime } from '@/utils/date';
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
import { issuesService } from '@/services/issues';
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
  const { userProfile, issues, searchQuery, inspectMode, setInspectMode } = useStore();
  const isDirector = ['ceo', 'super_admin'].includes((userProfile?.role || '').toLowerCase()) || Number(userProfile?.id) === 1;
  const me = String(userProfile?.id || '');
  const myName = userProfile?.name || 'Executive';
  const [expandedPriorityKey, setExpandedPriorityKey] = useState<string | null>(null);
  const [expandedPriorityDetail, setExpandedPriorityDetail] = useState<any | null>(null);

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
    const handleRefresh = () => {
      refreshAll();
    };
    window.addEventListener('task:created', handleRefresh);
    window.addEventListener('issue:updated', handleRefresh);
    window.addEventListener('issue:created', handleRefresh);
    window.addEventListener('objective:updated', handleRefresh);
    window.addEventListener('app:refresh', handleRefresh);
    return () => {
      window.removeEventListener('task:created', handleRefresh);
      window.removeEventListener('issue:updated', handleRefresh);
      window.removeEventListener('issue:created', handleRefresh);
      window.removeEventListener('objective:updated', handleRefresh);
      window.removeEventListener('app:refresh', handleRefresh);
    };
  }, [loadOverview, loadTasks, loadPlannerTasks, loadMeetings, loadObjectives]);

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

    const getProjectName = (projId?: number | null, fallbackName?: string | null) => {
      if (fallbackName) return fallbackName;
      if (!projId) return null;
      const found = projects.find(p => Number(p.id) === Number(projId));
      return found?.name || null;
    };

    const getAssigneeName = (uid?: number | null, fallbackName?: string | null) => {
      if (fallbackName) return fallbackName;
      if (!uid) return null;
      const found = teammates.find(u => Number(u.id) === Number(uid));
      return found?.name || null;
    };

    const traverseWCTask = (t: any, parentTitle?: string, parentProjId?: number | null, parentProjName?: string | null) => {
      if (!t || !t.id) return;
      const idNum = Number(t.id);
      const projId = t.project_id || parentProjId || null;
      const projName = getProjectName(projId, t.project_name || parentProjName);
      const assName = getAssigneeName(t.assigned_to_id, t.assigned_to_name);

      if (!map.has(idNum)) {
        map.set(idNum, {
          ...t,
          id: idNum,
          project_id: projId,
          project_name: projName,
          parent_title: t.parent_title || parentTitle || null,
          assigned_to_name: assName,
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
            project_id: st.project_id || projId,
            project_name: st.project_name || projName,
            deadline: st.deadline || t.deadline,
            scheduled_date: st.scheduled_date || t.scheduled_date,
            scheduled_start_time: st.scheduled_start_time || t.scheduled_start_time,
            scheduled_end_time: st.scheduled_end_time || t.scheduled_end_time,
          }, t.title, projId, projName);
        });
      }
    };

    tasks.forEach(root => traverseWCTask(root));

    // Also incorporate plannerTasks to guarantee 100% coverage across flat & hierarchical tasks
    if (plannerTasks && Array.isArray(plannerTasks)) {
      plannerTasks.forEach((pt: any) => {
        if (!pt || !pt.id) return;
        const idNum = Number(pt.id);
        const pId = pt.projectId ? Number(pt.projectId) : (pt.project_id ? Number(pt.project_id) : null);
        const pName = getProjectName(pId, pt.project_name);
        const assId = pt.assignedTo?.id ? Number(pt.assignedTo.id) : (pt.assigneeId ? Number(pt.assigneeId) : null);
        const assName = pt.assignedTo?.name || getAssigneeName(assId, null);

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
            assigned_to_id: assId,
            assigned_to_name: assName,
            assigned_to_avatar: pt.assignedTo?.avatar || null,
            assigned_by_id: null,
            assigned_by_name: null,
            reviewer_id: null,
            reviewer_name: null,
            project_id: pId,
            project_name: pName,
            parent_id: pt.parentId ? Number(pt.parentId) : null,
            quarter_id: null,
            meeting_id: pt.meetingId ? Number(pt.meetingId) : null,
            subtasks: [],
            created_at: pt.createdAt || null
          });
        } else {
          const existing = map.get(idNum)!;
          if (pName && !existing.project_name) existing.project_name = pName;
          if (assName && !existing.assigned_to_name) existing.assigned_to_name = assName;
          if (pt.scheduledDate && !existing.scheduled_date) existing.scheduled_date = pt.scheduledDate;
          if (pt.dueDate && !existing.deadline) existing.deadline = pt.dueDate;
          const sTime = pt.scheduledStartTime || pt.scheduled_start_time || pt.start_time;
          const eTime = pt.scheduledEndTime || pt.scheduled_end_time || pt.end_time;
          if (sTime) existing.scheduled_start_time = sTime;
          if (eTime) existing.scheduled_end_time = eTime;
        }
      });
    }

    // Second pass to resolve parent_title for any subtask that didn't have it
    map.forEach(item => {
      if (item.parent_id && !item.parent_title) {
        const parent = map.get(Number(item.parent_id));
        if (parent) {
          item.parent_title = parent.title;
          if (!item.project_id && parent.project_id) {
            item.project_id = parent.project_id;
            item.project_name = parent.project_name;
          }
        }
      }
    });

    return Array.from(map.values());
  }, [tasks, plannerTasks, projects, teammates]);

  const now = today();
  const isTaskDone = (status?: string) => ['completed', 'done', 'resolved', 'closed'].includes(String(status || '').toLowerCase());
  const getTaskDueDate = (t: any): string | null => {
    const raw = t.deadline || t.scheduled_date || null;
    return raw ? raw.slice(0, 10) : null;
  };

  // Global Topbar Search Filter across Overview (department, assigned person, date, or title)
  const qLower = (searchQuery || '').trim().toLowerCase();
  const searchedTasks = useMemo(() => {
    if (!qLower) return allFlattenedTasks;
    return allFlattenedTasks.filter(t => {
      const hay = [
        t.title,
        t.description,
        t.project_name,
        t.assigned_to_name,
        t.assigned_by_name,
        t.deadline,
        t.scheduled_date,
        t.parent_title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(qLower);
    });
  }, [allFlattenedTasks, qLower]);

  // Priorities (P1, P2, P3...) built from Department Objectives + High Priority Tasks
  const prioritiesList = useMemo(() => {
    const items: Array<{
      key: string;
      rank: number;
      kind: 'objective' | 'task';
      id: number;
      title: string;
      departmentName: string;
      ownerName: string;
      date: string | null;
      status: string;
      updatesCount: number;
      task?: WCTask;
      objectiveNode?: any;
    }> = [];

    if (overview?.departments) {
      for (const dept of overview.departments) {
        for (const obj of dept.objectives_tree || []) {
          if (obj.status === 'done') continue;
          const isOverdue = Boolean(obj.overdue);
          items.push({
            key: `obj-${obj.id}`,
            rank: isOverdue ? 1 : 2,
            kind: 'objective',
            id: obj.id,
            title: obj.code ? `${obj.code} ${obj.title}` : obj.title,
            departmentName: dept.name,
            ownerName: obj.owner?.name || dept.hod?.name || 'Unassigned',
            date: obj.deadline || null,
            status: obj.status,
            updatesCount: obj.update_count ?? (obj.updates?.length || 0),
            objectiveNode: obj,
          });
        }
      }
    }

    for (const t of allFlattenedTasks) {
      if (isTaskDone(t.status)) continue;
      const pr = String(t.priority || '').toLowerCase();
      if (!['critical', 'high', 'medium'].includes(pr)) continue;
      if (!isDirector && String(t.assigned_to_id) !== me) continue;
      items.push({
        key: `task-${t.id}`,
        rank: pr === 'critical' ? 1 : pr === 'high' ? 2 : 3,
        kind: 'task',
        id: t.id,
        title: t.title,
        departmentName: t.project_name || 'General',
        ownerName: t.assigned_to_name || 'Unassigned',
        date: getTaskDueDate(t),
        status: t.status,
        updatesCount: t.comments_count || 0,
        task: t,
      });
    }

    items.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return String(a.date || '9999').localeCompare(String(b.date || '9999'));
    });

    const filtered = !qLower
      ? items
      : items.filter(it =>
          `${it.title} ${it.departmentName} ${it.ownerName} ${it.date || ''}`.toLowerCase().includes(qLower)
        );

    return filtered.slice(0, 8).map((it, idx) => ({ ...it, pLabel: `P${idx + 1}` }));
  }, [overview, allFlattenedTasks, isDirector, me, qLower]);

  // Daily once-per-day automatic "Plan Your Day Today" popup
  useEffect(() => {
    if (!me || typeof window === 'undefined') return;
    if (allFlattenedTasks.length === 0) return;
    const key = `nurofin-pmd-seen:${me}:${now}`;
    if (localStorage.getItem(key)) return;
    const hasMyOpenTasks = allFlattenedTasks.some(
      t => String(t.assigned_to_id) === me && !isTaskDone(t.status)
    );
    if (hasMyOpenTasks) {
      localStorage.setItem(key, '1');
      setPlanMyDayOpen(true);
    }
  }, [me, now, allFlattenedTasks]);

  const handleOpenPriority = async (item: (typeof prioritiesList)[number]) => {
    if (inspectMode === 'drawer') {
      if (item.kind === 'objective') setPanel({ kind: 'objective', id: item.id });
      else if (item.task) setPanel({ kind: 'task', task: item.task });
      return;
    }
    if (expandedPriorityKey === item.key) {
      setExpandedPriorityKey(null);
      setExpandedPriorityDetail(null);
      return;
    }
    setExpandedPriorityKey(item.key);
    setExpandedPriorityDetail(null);
    if (item.kind === 'objective') {
      departmentTargetsService.getObjective(item.id).then(setExpandedPriorityDetail).catch(() => {});
    } else {
      workcenterService.getComments(item.id).then(comments => setExpandedPriorityDetail({ comments })).catch(() => {});
    }
  };

  const myOverdueTasks = searchedTasks.filter(t => {
    const isMine = String(t.assigned_to_id) === me;
    const dDate = getTaskDueDate(t);
    return isMine && Boolean(dDate && dDate < now) && !isTaskDone(t.status);
  });
  const overdueTasks = isDirector
    ? searchedTasks.filter(t => {
        const dDate = getTaskDueDate(t);
        return Boolean(dDate && dDate < now) && !isTaskDone(t.status);
      })
    : myOverdueTasks;
  const todayTasks = searchedTasks.filter(t => {
    const isMine = String(t.assigned_to_id) === me;
    const dDate = getTaskDueDate(t);
    return isMine && dDate === now;
  });
  const todayMeetings = meetings.filter(m => m.date === now && (isDirector || m.attendees?.includes(myName) || String(m.owner_id) === me));

  return (
    <div className="w-full flex flex-col gap-5 bg-background-primary text-text-primary normal-case">
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

      {/* 2. CORE WORKSPACE: Priorities (P1, P2, P3) + My Day OR CEO Team Pulse */}
      {viewMode === 'pulse' && isDirector ? (
        <CeoTeamPulse
          teammates={teammates}
          tasks={searchedTasks}
          meetings={meetings}
          onOpenTaskPanel={t => setPanel({ kind: 'task', task: t })}
          onAssignToTeammate={handleAssignToTeammate}
          onRefresh={refreshAll}
        />
      ) : (
        <div className="space-y-5">
          {/* PRIORITIES (P1, P2, P3...) with right-side Dates & Drawer/Dropdown Toggle */}
          {prioritiesList.length > 0 && (
            <div className="bg-background-secondary border border-border-subtle rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flag size={14} className="text-accent-red" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-text-primary">
                    Priorities ({prioritiesList.length})
                  </h2>
                </div>
                <div className="inline-flex items-center bg-background-primary border border-border-subtle rounded-lg p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setInspectMode('drawer')}
                    className={cn('px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer', inspectMode === 'drawer' ? 'bg-accent-blue text-white' : 'text-text-secondary')}
                  >
                    <PanelRight size={11} /> Drawer
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectMode('dropdown')}
                    className={cn('px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer', inspectMode === 'dropdown' ? 'bg-accent-blue text-white' : 'text-text-secondary')}
                  >
                    <ChevronDown size={11} /> Dropdown
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {prioritiesList.map(item => {
                  const isExpanded = inspectMode === 'dropdown' && expandedPriorityKey === item.key;
                  const pCls = item.pLabel === 'P1'
                    ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                    : item.pLabel === 'P2'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-accent-blue/10 text-accent-blue border-accent-blue/25';
                  return (
                    <div key={item.key} className="rounded-xl border border-border-subtle bg-background-primary overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleOpenPriority(item)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-surface-hover text-left cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={cn('font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md border shrink-0', pCls)}>
                            {item.pLabel}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold text-text-primary truncate">{item.title}</div>
                            <div className="text-[11px] text-text-secondary truncate">
                              {item.departmentName} · {item.ownerName}
                              {item.updatesCount > 0 && ` · ${item.updatesCount} updates`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          {item.date && (
                            <span className={cn('text-[11.5px] font-semibold', item.date < now ? 'text-accent-red' : 'text-text-secondary')}>
                              {formatISTDate(item.date)}
                            </span>
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-border-subtle bg-background-secondary/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-secondary uppercase text-[10.5px]">
                              {item.kind === 'objective' ? 'Objectives & Updates' : 'Task Follow-ups'}
                            </span>
                            <button
                              type="button"
                              onClick={() => item.kind === 'objective' ? setPanel({ kind: 'objective', id: item.id }) : item.task && setPanel({ kind: 'task', task: item.task })}
                              className="text-accent-blue font-semibold hover:underline cursor-pointer"
                            >
                              Open Full Drawer
                            </button>
                          </div>

                          {item.kind === 'objective' && expandedPriorityDetail?.children?.length > 0 && (
                            <div className="space-y-1">
                              {expandedPriorityDetail.children.map((sub: any) => (
                                <div key={sub.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background-primary border border-border-subtle">
                                  <span className="font-medium truncate">{sub.code} {sub.title}</span>
                                  <span className="text-[11px] text-text-secondary shrink-0">{sub.deadline ? formatISTDate(sub.deadline) : '—'}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                            {item.kind === 'objective' ? (
                              (expandedPriorityDetail?.updates || item.objectiveNode?.updates || []).length > 0 ? (
                                (expandedPriorityDetail?.updates || item.objectiveNode?.updates || []).map((u: any) => (
                                  <div key={u.id} className="p-2 rounded-lg bg-background-primary border border-border-subtle">
                                    <div className="text-[10.5px] text-text-secondary">
                                      <b className="text-text-primary">{formatISTDate(u.created_at)}</b> · <span className="font-mono">{formatISTTime(u.created_at, { withTimezone: false })}</span> · <b className="text-accent-blue">{u.user?.name || 'Teammate'}</b>
                                    </div>
                                    <div className="text-[12px] text-text-primary mt-0.5">{u.text}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-text-secondary italic">No updates yet.</div>
                              )
                            ) : (
                              (expandedPriorityDetail?.comments || []).length > 0 ? (
                                (expandedPriorityDetail?.comments || []).map((c: any) => (
                                  <div key={c.id} className="p-2 rounded-lg bg-background-primary border border-border-subtle">
                                    <div className="text-[10.5px] text-text-secondary">
                                      <b className="text-text-primary">{formatISTDate(c.created_at)}</b> · <span className="font-mono">{formatISTTime(c.created_at, { withTimezone: false })}</span> · <b className="text-accent-blue">{c.user_name || 'Teammate'}</b>
                                    </div>
                                    <div className="text-[12px] text-text-primary mt-0.5">{c.content}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-text-secondary italic">No follow-ups yet.</div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT: "My Day" Agenda & Smart Quick-Add */}
            <div className="lg:col-span-8 space-y-5">
              <MyDayView
                tasks={searchedTasks}
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
                tasks={searchedTasks}
                currentUserId={me}
                isDirector={isDirector}
                onOpenTaskPanel={t => setPanel({ kind: 'task', task: t })}
                onRefresh={refreshAll}
                onCompleteTask={handleTaskComplete}
              />
            </div>
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
        allAssignedTasks={allFlattenedTasks}
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

      {(() => {
        const completingTask = completing ? allFlattenedTasks.find(t => Number(t.id) === Number(completing)) : null;
        const isIssue = Boolean(completingTask && ((completingTask as any).source === 'issue' || (completingTask as any).source?.startsWith('issue:') || (completingTask as any).is_issue || completingTask.title.startsWith('[Issue]')));
        return (
          <CompleteTaskModal
            isOpen={completing !== null}
            onClose={() => setCompleting(null)}
            taskExtendedTime={extended}
            setTaskExtendedTime={setExtended}
            isIssue={isIssue}
            onSubmit={async (extendedTime, completionDate) => {
              if (completing === null) return;
              const ext = parseFloat(extendedTime);
              try { 
                await workcenterService.updateTask(completing, { 
                  status: 'completed', 
                  extended_time: isNaN(ext) ? undefined : ext, 
                  actual_completion_date: completionDate 
                }); 

                // Two-way sync: update corresponding Issue to resolved!
                if (completingTask) {
                  let issueId: number | null = null;
                  const src = (completingTask as any).source;
                  if (typeof src === 'string' && src.startsWith('issue:')) {
                    issueId = parseInt(src.split(':')[1], 10);
                  }
                  if (!issueId && isIssue) {
                    const cleanTitle = completingTask.title.replace(/^\[Issue\]\s*/i, '').trim().toLowerCase();
                    const allIssues = issues?.length ? issues : ((await issuesService.getIssues().catch(() => ({ issues: [] }))).issues || []);
                    const matched = allIssues.find((i: any) => i.title.trim().toLowerCase() === cleanTitle);
                    if (matched) issueId = parseInt(matched.id, 10);
                  }
                  if (issueId && !isNaN(issueId)) {
                    await issuesService.updateStatus(issueId, 'resolved').catch(err => console.error('Failed to sync resolved status to issue:', err));
                  }
                }
              } finally { 
                setCompleting(null); 
                refreshAll();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('issue:updated'));
                  window.dispatchEvent(new CustomEvent('task:created'));
                }
              }
            }}
          />
        );
      })()}
    </div>
  );
}
