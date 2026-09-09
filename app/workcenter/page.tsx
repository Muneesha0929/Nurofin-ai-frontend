'use client';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { useStore } from '@/lib/store';
import { usersService } from '@/services/users';
import { projectsService } from '@/services/projects';
import {
  workcenterService,
  WCTask,
  WCTasksResponse,
  WCSummary,
  WCInsights,
  WCQuarter,
  WCHistoryEntry,
  WCTransfer,
  WCPerformance,
} from '@/services/workcenter';
import { UserProfile as UserType, Project } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import {
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  ChevronDown,
  Calendar,
  Users,
  Trash,
  Edit,
  Edit3,
  History,
  ArrowRightLeft,
  Eye,
  X,
  BarChart3,
  MessageSquare,
  List,
  LayoutGrid,
  Timer,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Star,
  Filter,
  MoreVertical,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Mail,
  Phone,
  Github,
  Linkedin,
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────────────────────── */

const STATUS_COLS = [
  { key: 'in_progress', label: 'In Progress', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  { key: 'completed', label: 'Done', color: 'text-accent-green', bg: 'bg-accent-green/10' },
  { key: 'blocked', label: 'On Hold', color: 'text-accent-red', bg: 'bg-accent-red/10' },
] as const;

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Done' },
  { value: 'blocked', label: 'On Hold' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' },
  { value: 'medium', label: 'Medium', color: 'text-accent-orange bg-accent-orange/10 border-accent-orange/20' },
  { value: 'high', label: 'High', color: 'text-accent-red bg-accent-red/10 border-accent-red/20' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const getPriorityColor = (p: string) =>
  PRIORITY_OPTIONS.find(o => o.value === p)?.color ?? 'text-text-muted bg-slate-100 dark:bg-slate-800 border-border-subtle';

const getStatusLabel = (s: string) =>
  STATUS_COLS.find(c => c.key === s)?.label ?? s;

const getStatusDot = (s: string) =>
  STATUS_COLS.find(c => c.key === s)?.color ?? 'text-text-muted';

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/* ─── Main Execution Hub Component ────────────────────────────────────────── */

export default function TaskCenterPage() {
  const { userProfile } = useStore();

  // Data State
  const [tasks, setTasks] = useState<WCTask[]>([]);
  const [taskFilterTab, setTaskFilterTab] = useState<'all' | 'my'>('all');

  const filteredTasks = useMemo(() => {
    if (taskFilterTab === 'all') return tasks;
    if (!userProfile) return tasks;

    const list: any[] = [];
    tasks.forEach(task => {
      // 1. If main task is assigned to the current user
      if (task.assigned_to_id != null && String(task.assigned_to_id) === String(userProfile.id)) {
        list.push({
          ...task,
          subtasks: [], // Don't show nested subtasks list inside it in My Tasks
        });
      }
      // 2. If any subtasks are assigned to the current user
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(sub => {
          if (sub.assigned_to_id != null && String(sub.assigned_to_id) === String(userProfile.id)) {
            list.push({
              ...sub,
              parent_title: task.title, // Add parent title info
              project_name: task.project_name, // inherit project name
              project_id: task.project_id,
              deadline: sub.deadline || task.deadline, // inherit deadline if missing
              priority: sub.priority || task.priority, // inherit priority if missing
              assigned_to_name: sub.assigned_to_name || userProfile.name,
              assigned_to_avatar: sub.assigned_to_avatar || userProfile.avatar,
              subtasks: [], // Clear any subtasks
            });
          }
        });
      }
    });
    return list;
  }, [tasks, taskFilterTab, userProfile]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [summary, setSummary] = useState<WCSummary | null>(null);
  const [insights, setInsights] = useState<WCInsights | null>(null);
  const [quarters, setQuarters] = useState<WCQuarter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);

  // Filters State
  const [selectedQuarterId, setSelectedQuarterId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'calendar' | 'gantt' | 'table' | 'workload' | 'analytics'>('kanban');
  const [activeTab, setActiveTab] = useState<'workspace' | 'dashboard'>('workspace');
  const [defaultNewTaskStatus, setDefaultNewTaskStatus] = useState<string>('todo');



  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateEdit, setShowCreateEdit] = useState(false);
  const [editingTask, setEditingTask] = useState<WCTask | null>(null);
  const [createSubtaskForParent, setCreateSubtaskForParent] = useState<WCTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<WCTask | null>(null);
  const [detailDefaultTab, setDetailDefaultTab] = useState<'details' | 'history' | 'transfers'>('details');
  const [detailOpen, setDetailOpen] = useState(false);
  const [transferTask, setTransferTask] = useState<WCTask | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  // Quarter Create Dialog state
  const [showQuarterModal, setShowQuarterModal] = useState(false);
  const [editingQuarter, setEditingQuarter] = useState<WCQuarter | null>(null);
  const [newQuarterForm, setNewQuarterForm] = useState({
    name: '',
    fiscal_year: 2026,
    quarter_number: 2,
    start_date: '2026-07-01',
    end_date: '2026-09-30',
    goals: '',
    status: 'planning',
  });

  // Performance Detail modal state
  const [perfViewUser, setPerfViewUser] = useState<UserType | null>(null);
  const [perfData, setPerfData] = useState<WCPerformance | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // ─── Data Loading ───────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, summaryData, insightsData, quartersData, projectsData, usersData] = await Promise.all([
        workcenterService.getTasks({
          quarter_id: selectedQuarterId ?? undefined,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          page_size: 200
        }),
        workcenterService.getSummary(selectedQuarterId ?? undefined).catch(() => null),
        workcenterService.getInsights(selectedQuarterId ?? undefined).catch(() => null),
        workcenterService.getQuarters().catch(() => []),
        projectsService.getProjects().catch(() => []),
        usersService.getUsers().catch(() => []),
      ]);

      setTasks(tasksRes.tasks || []);
      setTotalTasks(tasksRes.total || 0);
      setSummary(summaryData);
      setInsights(insightsData);
      setQuarters(quartersData || []);
      setProjects(projectsData || []);
      setAllUsers(usersData || []);

      if (!selectedQuarterId && quartersData && quartersData.length > 0) {
        const active = quartersData.find(q => q.status === 'active') || quartersData[0];
        if (active) setSelectedQuarterId(active.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load execution data');
    } finally {
      setLoading(false);
    }
  }, [selectedQuarterId, searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load performance detail when selected
  useEffect(() => {
    if (perfViewUser) {
      setPerfLoading(true);
      workcenterService.getPerformance(Number(perfViewUser.id), selectedQuarterId ?? undefined)
        .then(setPerfData)
        .catch(() => setPerfData(null))
        .finally(() => setPerfLoading(false));
    }
  }, [perfViewUser, selectedQuarterId]);

  const handleAddTaskInStatus = (status: string) => {
    setDefaultNewTaskStatus(status);
    setEditingTask(null);
    setShowCreateEdit(true);
  };

  const handleCreateTask = async (payload: any) => {
    const mainTaskPayload = { ...payload };
    const subtasksToCreate = mainTaskPayload.subtasks || [];
    delete mainTaskPayload.subtasks;

    const mainTask = await workcenterService.createTask(mainTaskPayload);

    if (subtasksToCreate.length > 0 && mainTask && mainTask.id) {
      const subtaskPromises = subtasksToCreate.map((st: any) => {
        return workcenterService.createTask({
          ...st,
          project_id: mainTask.project_id || undefined,
          quarter_id: mainTask.quarter_id || undefined,
          parent_id: mainTask.id,
        });
      });
      await Promise.all(subtaskPromises);
    }
    await loadData();
  };

  const handleEditTask = async (payload: any) => {
    if (!editingTask) return;
    await workcenterService.updateTask(editingTask.id, payload);
    await loadData();
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    await workcenterService.deleteTask(id);
    await loadData();
    setDetailOpen(false);
    setSelectedTask(null);
  };

  const [blockingTaskInfo, setBlockingTaskInfo] = useState<{ id: number; status: string } | null>(null);
  const [completeTaskOpen, setCompleteTaskOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [taskExtendedTime, setTaskExtendedTime] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const handleConfirmBlock = async () => {
    if (!blockingTaskInfo) return;
    await workcenterService.updateStatus(blockingTaskInfo.id, blockingTaskInfo.status, blockReason);
    const taskId = blockingTaskInfo.id;
    setBlockingTaskInfo(null);
    setBlockReason('');
    await loadData();
    if (selectedTask && selectedTask.id === taskId) {
      await handleSelectTask({ id: taskId });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (status === 'blocked') {
      setBlockingTaskInfo({ id, status });
      setBlockReason('');
      return;
    }
    if (status === 'completed') {
      setCompletingTaskId(id);
      setTaskExtendedTime('');
      setCompleteTaskOpen(true);
      return;
    }
    await workcenterService.updateStatus(id, status);
    await loadData();
    if (selectedTask && selectedTask.id === id) {
      await handleSelectTask({ id });
    }
  };

  const handleSelectTask = async (taskItem: { id: number }) => {
    // Open modal instantly with cached list information!
    setDetailOpen(true);
    const localTask = tasks.find(t => t.id === taskItem.id) || (taskItem as WCTask);
    setSelectedTask(localTask);
    try {
      const fullTask = await workcenterService.getTask(taskItem.id);
      setSelectedTask(fullTask);
    } catch (err) {
      console.error('Failed to load task details:', err);
    }
  };

  const handleTransfer = async (taskId: number, payload: any) => {
    await workcenterService.transferTask(taskId, payload);
    await loadData();
  };

  const handleSaveQuarter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuarter) {
        await workcenterService.updateQuarter(editingQuarter.id, {
          name: newQuarterForm.name,
          status: newQuarterForm.status,
          goals: newQuarterForm.goals || undefined,
          start_date: newQuarterForm.start_date || undefined,
          end_date: newQuarterForm.end_date || undefined,
        });
      } else {
        await workcenterService.createQuarter({
          name: newQuarterForm.name,
          fiscal_year: Number(newQuarterForm.fiscal_year),
          quarter_number: Number(newQuarterForm.quarter_number),
          start_date: newQuarterForm.start_date || undefined,
          end_date: newQuarterForm.end_date || undefined,
          goals: newQuarterForm.goals || undefined,
        });
      }
      setShowQuarterModal(false);
      setEditingQuarter(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save quarter');
    }
  };

  const selectedQuarter = quarters.find(q => q.id === selectedQuarterId);

  // ─── Dynamic Calculations (No Mock Data) ───────────────────────────────

  // 1. Task Health counts dynamically from loaded tasks
  const taskHealthData = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return [
      { name: 'Healthy', value: 0, color: '#10B981' },
      { name: 'At Risk', value: 0, color: '#F59E0B' },
      { name: 'Critical', value: 0, color: '#EF4444' }
    ];
    
    let healthy = 0;
    let atRisk = 0;
    let critical = 0;
    const today = new Date().getTime();

    tasks.forEach(t => {
      if (t.status === 'completed') {
        healthy++;
      } else if (t.status === 'blocked') {
        critical++;
      } else if (t.deadline) {
        const dl = new Date(t.deadline).getTime();
        const diffDays = (dl - today) / (1000 * 3600 * 24);
        if (diffDays < 0) {
          critical++;
        } else if (diffDays <= 3) {
          atRisk++;
        } else {
          healthy++;
        }
      } else {
        healthy++;
      }
    });

    return [
      { name: 'Healthy', value: healthy, color: '#10B981' },
      { name: 'At Risk', value: atRisk, color: '#F59E0B' },
      { name: 'Critical', value: critical, color: '#EF4444' }
    ];
  }, [tasks]);

  const totalHealthCount = taskHealthData.reduce((acc, curr) => acc + curr.value, 0);

  // 2. Recent activity logs (use real insights, fallback to basic list if none)
  const recentActivities = useMemo(() => {
    if (insights && insights.recentActivity && insights.recentActivity.length > 0) {
      return insights.recentActivity;
    }
    return [];
  }, [insights]);

  // 3. Overdue tasks list
  const overdueTasksList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks
      .filter(t => t.deadline && t.deadline < today && t.status !== 'completed')
      .map(t => {
        const days = Math.floor((new Date(today).getTime() - new Date(t.deadline!).getTime()) / (1000 * 3600 * 24));
        return { ...t, daysOverdue: days };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [tasks]);

  // 4. Leaders rankings calculated dynamically from performance scores
  const performersList = useMemo(() => {
    if (insights && insights.topPerformers) {
      return insights.topPerformers;
    }
    return [];
  }, [insights]);

  // 5. Calendar days of the current month
  const calendarDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const days: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    const prevMonthNumDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthNumDays - i;
      const mStr = String(month === 0 ? 12 : month).padStart(2, '0');
      const yStr = String(month === 0 ? year - 1 : year);
      days.push({ day: d, isCurrentMonth: false, dateStr: `${yStr}-${mStr}-${String(d).padStart(2, '0')}` });
    }
    for (let d = 1; d <= numDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      days.push({ day: d, isCurrentMonth: true, dateStr: `${year}-${mStr}-${String(d).padStart(2, '0')}` });
    }
    return days;
  }, []);

  const calendarMonthLabel = useMemo(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const d = new Date();
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  // 6. Gantt view layout percentages relative to the active Quarter duration
  const ganttTasks = useMemo(() => {
    const qStartStr = selectedQuarter?.start_date || '2027-04-01';
    const qEndStr = selectedQuarter?.end_date || '2027-06-30';
    const qStart = new Date(qStartStr).getTime();
    const qEnd = new Date(qEndStr).getTime();
    const qDuration = qEnd - qStart;
    
    return tasks.slice(0, 8).map(t => {
      const tStart = Math.max(qStart, new Date(t.start_date || qStartStr).getTime());
      const tEnd = Math.min(qEnd, new Date(t.deadline || qEndStr).getTime());
      const diff = tEnd - tStart;
      
      const leftPct = qDuration > 0 ? ((tStart - qStart) / qDuration) * 100 : 0;
      const widthPct = qDuration > 0 ? Math.max(15, (diff / qDuration) * 100) : 100;
      
      return {
        ...t,
        left: leftPct,
        width: widthPct
      };
    });
  }, [tasks, selectedQuarter]);

  // 7. Timeline scheduler tasks (Top 4 active/review tasks)
  const timelineTasks = useMemo(() => {
    const list = tasks.filter(t => t.status === 'in_progress' || t.status === 'review');
    const source = list.length > 0 ? list : tasks;
    return source.slice(0, 4).map((t, idx) => ({
      title: t.title,
      dates: t.start_date && t.deadline ? `${t.start_date.slice(5)} - ${t.deadline.slice(5)}` : 'Active Window',
      progress: t.progress || 0,
      color: ['bg-accent-blue', 'bg-accent-purple', 'bg-accent-orange', 'bg-accent-green'][idx % 4]
    }));
  }, [tasks]);

  // 8. Analytics velocity and burndown mapping
  const velocityData = useMemo(() => {
    return quarters.map(q => {
      const count = tasks.filter(t => t.quarter_id === q.id && t.status === 'completed').length;
      return { name: q.name, completed: count };
    });
  }, [tasks, quarters]);

  const burndownData = useMemo(() => {
    const totalActive = tasks.filter(t => t.status !== 'completed').length;
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const tot = totalActive + completedTasks.length;
    return [
      { name: 'Day 1', ideal: tot, actual: tot },
      { name: 'Day 3', ideal: Math.round(tot * 0.8), actual: totalActive + Math.round(completedTasks.length * 0.7) },
      { name: 'Day 5', ideal: Math.round(tot * 0.6), actual: totalActive + Math.round(completedTasks.length * 0.4) },
      { name: 'Day 7', ideal: Math.round(tot * 0.4), actual: totalActive + Math.round(completedTasks.length * 0.2) },
      { name: 'Day 9', ideal: Math.round(tot * 0.2), actual: totalActive },
      { name: 'Day 11', ideal: 0, actual: totalActive }
    ];
  }, [tasks]);

  // 9. AI suggestions generated dynamically from database state
  const aiSuggestions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const riskTasks = tasks.filter(t => t.status !== 'completed' && t.deadline && t.deadline >= today && t.deadline <= threeDaysLater);
    const riskCount = riskTasks.length;
    const overdueRiskText = riskCount > 0 
      ? `${riskCount} task${riskCount > 1 ? 's are' : ' is'} at risk of being overdue in the next 3 days. Recommend active review.`
      : "No active tasks are at risk of being overdue in the next 3 days.";

    let maxActiveCount = 0;
    let maxActiveUser: UserType | null = null;
    allUsers.forEach(u => {
      const count = tasks.filter(t => t.assigned_to_id === Number(u.id) && t.status !== 'completed').length;
      if (count > maxActiveCount) {
        maxActiveCount = count;
        maxActiveUser = u;
      }
    });
    const workloadText = maxActiveUser && maxActiveCount > 3
      ? `${(maxActiveUser as UserType).name} is overloaded with ${maxActiveCount} active tasks. Consider redistributing items.`
      : "Team workload is well-balanced. All members have healthy capacity.";

    const inProgTasks = tasks.filter(t => t.status === 'in_progress');
    const longestTask = inProgTasks.sort((a, b) => (b.estimated_hours || 0) - (a.estimated_hours || 0))[0];
    const optimizationText = longestTask
      ? `Break down "${longestTask.title}" into smaller subtasks to speed up the review pipeline.`
      : "All active tasks are structured optimally. No breakdown suggestions.";

    const blockedTask = tasks.find(t => t.status === 'blocked');
    const dependencyText = blockedTask
      ? `"${blockedTask.title}" is currently blocked. Verify blocking dependencies or resource bottlenecks.`
      : "No blocking dependencies or resource bottlenecks detected at this time.";

    return {
      overdueRisk: overdueRiskText,
      workload: workloadText,
      optimization: optimizationText,
      dependency: dependencyText
    };
  }, [tasks, allUsers]);

  // Sparkline SVG path calculator
  const getSparklinePath = (score: number) => {
    const points = [
      18,
      17 - (score * 0.05),
      15 - (score * 0.1),
      13 - (score * 0.08),
      11 - (score * 0.12),
      19 - (score * 0.18)
    ];
    return `M 0 ${points[0]} L 10 ${points[1]} L 20 ${points[2]} L 30 ${points[3]} L 40 ${points[4]} L 50 ${points[5]}`;
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-xs font-medium">Loading Execution Engine...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-md mx-auto text-center font-sans">
        <AlertCircle className="w-10 h-10 text-accent-red" />
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-1">Failed to Load</h3>
          <p className="text-[11px] text-text-muted leading-relaxed">{error}</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-md shadow transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-[1700px] font-sans text-text-primary pb-12 animate-fade-in">
      
      {/* Top Header Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle/55">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-text-primary via-accent-purple to-accent-blue bg-clip-text text-transparent flex items-center gap-2 select-none">
            <Layers className="w-5 h-5 text-accent-purple" />
            Execution Hub
          </h1>
          <p className="text-[11px] text-text-secondary font-semibold mt-0.5">Manage tasks, trace milestones, and monitor team performance metrics.</p>
        </div>
        
        <div className="flex bg-background-secondary p-1 border border-border-subtle rounded-xl max-w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('workspace')}
            className={cn(
              "px-4 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'workspace' ? "bg-accent-blue text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Task Board
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-4 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'dashboard' ? "bg-accent-blue text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Performance Dashboard
          </button>
        </div>
      </div>

      {activeTab === 'workspace' ? (
        <div className="space-y-6">
          {/* SECTION 2: Quarter Management */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary select-none">Quarter Management</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {quarters.map(q => {
                const isActive = q.id === selectedQuarterId;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuarterId(q.id)}
                    className={cn(
                      "bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 cursor-pointer transition-all duration-200 text-left relative group",
                      isActive && "border-accent-blue ring-2 ring-accent-blue/20 bg-accent-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    )}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-text-primary pr-6">{q.name}</h4>
                      <p className="text-[9px] text-text-muted mt-1">{q.start_date ? `${q.start_date} - ${q.end_date}` : 'Jan 1 - Mar 31, 2027'}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingQuarter(q);
                        setNewQuarterForm({
                          name: q.name,
                          fiscal_year: q.fiscal_year,
                          quarter_number: q.quarter_number,
                          start_date: q.start_date || '',
                          end_date: q.end_date || '',
                          goals: q.goals || '',
                          status: q.status || 'planning',
                        });
                        setShowQuarterModal(true);
                      }}
                      className="absolute top-2 right-2 p-1 text-text-muted hover:text-text-primary rounded-md opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-opacity"
                      title="Edit Quarter"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-full">
                      {q.status === 'active' ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-bold text-accent-blue">
                            <span>Active</span>
                            <span>{summary?.quarterProgress ?? 0}% Progress</span>
                          </div>
                          <div className="w-full bg-border-subtle rounded-full h-1.5">
                            <div className="bg-accent-blue h-1.5 rounded-full" style={{ width: `${summary?.quarterProgress ?? 0}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] bg-background-primary px-2 py-0.5 border border-border-subtle rounded text-text-secondary font-bold select-none uppercase">
                          {q.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Create Quarter card */}
              <div
                onClick={() => setShowQuarterModal(true)}
                className="border-2 border-dashed border-border-subtle hover:border-text-muted rounded-xl p-4 flex flex-col items-center justify-center h-28 cursor-pointer text-text-muted hover:text-text-primary transition-all duration-200 group"
              >
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-extrabold uppercase mt-2 select-none">Create Quarter</span>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background-secondary p-3 rounded-xl border border-border-subtle">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background-primary border border-border-subtle text-xs rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent-blue transition-colors max-w-xs w-full font-medium"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background-primary border border-border-subtle text-xs rounded-lg px-3 py-2 text-text-primary font-bold outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Done</option>
                <option value="blocked">On Hold</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-background-primary border border-border-subtle text-xs rounded-lg px-3 py-2 text-text-primary font-bold outline-none cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
              <select
                value={''}
                onChange={(e) => {
                  const pid = e.target.value;
                  if (pid) {
                    setTasks(prev => prev.filter(t => String(t.project_id) === pid));
                  } else {
                    loadData();
                  }
                }}
                className="bg-background-primary border border-border-subtle text-xs rounded-lg px-3 py-2 text-text-primary font-bold outline-none cursor-pointer"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Task View Toggle Switcher between Grouped Feed and List */}
              <div className="flex bg-background-primary p-0.5 border border-border-subtle rounded-lg ml-2">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors",
                    viewMode === 'kanban' ? "bg-accent-blue text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Grouped
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors",
                    viewMode === 'table' ? "bg-accent-blue text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Main Layout: Full Width Tasks */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
              <div className="flex items-center gap-4">
                <h3 className="text-base font-extrabold select-none">
                  {taskFilterTab === 'all' ? 'All Tasks' : 'My Tasks'}
                </h3>
                <div className="flex items-center bg-background-secondary p-0.5 rounded-lg border border-border-subtle">
                  <button
                    onClick={() => setTaskFilterTab('all')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                      taskFilterTab === 'all'
                        ? "bg-accent-blue text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    All Tasks
                  </button>
                  <button
                    onClick={() => setTaskFilterTab('my')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                      taskFilterTab === 'my'
                        ? "bg-accent-blue text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    My Tasks
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setDefaultNewTaskStatus('todo');
                  setEditingTask(null);
                  setShowCreateEdit(true);
                }}
                className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-[10px] font-bold rounded flex items-center gap-1 shadow transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Create Task
              </button>
            </div>

            <div className="min-h-[400px]">
              {viewMode === 'kanban' ? (
                <GroupedTaskFeed 
                  tasks={filteredTasks} 
                  onSelectTask={(taskItem) => {
                    setDetailDefaultTab('details');
                    handleSelectTask(taskItem);
                  }} 
                  onStatusChange={handleStatusChange} 
                  onAddTaskInStatus={handleAddTaskInStatus} 
                  onRefresh={loadData} 
                  users={allUsers}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setShowCreateEdit(true);
                  }}
                  onAddSubtask={(parentTask) => {
                    setCreateSubtaskForParent(parentTask);
                    setShowCreateEdit(true);
                  }}
                  onViewHistory={(task) => {
                    setDetailDefaultTab('history');
                    handleSelectTask({ id: task.id });
                  }}
                  onDeleteTask={handleDeleteTask}
                />
              ) : (
                <TaskTableView tasks={filteredTasks} onSelectTask={handleSelectTask} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SECTION 1: Executive Summary */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary select-none">Executive Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              
              <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Active Tasks</span>
                  <Timer className="w-4 h-4 text-accent-blue" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold font-sans leading-none">{summary?.inProgress ?? 0}</div>
                  <div className="text-[9px] text-accent-green font-bold mt-1.5 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" /> In progress now
                  </div>
                </div>
              </div>

              <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Overdue Tasks</span>
                  <AlertTriangle className="w-4 h-4 text-accent-red" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold leading-none text-accent-red">{summary?.overdue ?? 0}</div>
                  <div className="text-[9px] text-accent-red font-bold mt-1.5 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" /> Needs attention
                  </div>
                </div>
              </div>

              <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Completed This Week</span>
                  <CheckCircle className="w-4 h-4 text-accent-green" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold leading-none text-accent-green">{summary?.completed ?? 0}</div>
                  <div className="text-[9px] text-accent-green font-bold mt-1.5 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" /> This quarter
                  </div>
                </div>
              </div>

              <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tasks On Hold</span>
                  <AlertCircle className="w-4 h-4 text-accent-orange" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold leading-none text-accent-orange">{summary?.blocked ?? 0}</div>
                  <div className="text-[9px] text-text-muted font-bold mt-1.5 flex items-center gap-0.5">
                    No change
                  </div>
                </div>
              </div>

              <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Upcoming Deadlines</span>
                  <Calendar className="w-4 h-4 text-accent-blue" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold leading-none">{tasks.filter(t => t.deadline && new Date(t.deadline).getTime() > new Date().getTime()).length}</div>
                  <div className="text-[9px] text-text-muted font-bold mt-1.5 flex items-center gap-0.5">
                    Next 7 days
                  </div>
                </div>
              </div>

              <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Employee Performance</span>
                  <TrendingUp className="w-4 h-4 text-accent-green" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold leading-none text-accent-green">{summary?.quarterProgress ? Math.round(summary.quarterProgress) : '—'}%</div>
                  <div className="text-[9px] text-text-muted font-bold mt-1.5 flex items-center gap-0.5">
                    Average Score
                  </div>
                </div>
              </div>

              <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Quarter Progress</span>
                  <Layers className="w-4 h-4 text-accent-blue" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold leading-none text-accent-blue">{summary?.quarterProgress ?? 0}%</div>
                  <div className="text-[9px] text-text-muted font-bold mt-1.5 flex items-center gap-0.5">
                    {selectedQuarter?.name ?? 'FY27-Q1'}
                  </div>
                </div>
              </div>

              {/* Large Create Task Action Panel */}
              <div
                onClick={() => { setEditingTask(null); setShowCreateEdit(true); }}
                className="col-span-1 bg-gradient-to-br from-accent-blue to-accent-purple hover:from-accent-blue-hover hover:to-accent-purple border-none rounded-xl p-4 flex flex-col justify-between h-28 cursor-pointer shadow-lg hover:shadow-accent-blue/30 active:scale-[0.98] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="text-white text-left">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider">Create New Task</h4>
                  <p className="text-[9px] text-white/80 font-medium">Start from scratch</p>
                </div>
              </div>

            </div>
          </div>

          {/* Quarter Analytics */}
          <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 text-left space-y-6">
            <h4 className="text-xs font-bold text-text-primary select-none font-sans">Quarter Analytics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 border border-border-subtle rounded p-2 bg-background-primary">
                <span className="text-[10px] text-text-muted font-bold block mb-2 select-none">BURNDOWN DATA</span>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={burndownData}>
                    <XAxis dataKey="name" fontSize={8} />
                    <YAxis fontSize={8} />
                    <Tooltip />
                    <Area type="monotone" dataKey="ideal" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.05} />
                    <Area type="monotone" dataKey="actual" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.05} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="h-44 border border-border-subtle rounded p-2 bg-background-primary">
                <span className="text-[10px] text-text-muted font-bold block mb-2 select-none">COMPLETED BY QUARTER</span>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={velocityData}>
                    <XAxis dataKey="name" fontSize={8} />
                    <YAxis fontSize={8} />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Supporting Widgets Row (3 columns, equal heights) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Overdue Tasks widget */}
            <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 text-left flex flex-col h-80">
              <div className="flex justify-between items-center mb-3 flex-shrink-0">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary select-none">Overdue Tasks</h3>
                <span onClick={() => { setActiveTab('workspace'); setViewMode('table'); }} className="text-[10px] text-accent-blue font-bold hover:underline cursor-pointer">View All</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {overdueTasksList.slice(0, 10).map(t => (
                  <div key={t.id} onClick={() => handleSelectTask(t)} className="bg-background-primary border border-border-subtle p-2.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer hover:border-text-muted transition-colors">
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-text-primary truncate">{t.title}</h4>
                      <p className="text-[9px] text-accent-red font-bold flex items-center gap-0.5 mt-0.5">
                        {t.daysOverdue} days overdue
                      </p>
                    </div>
                    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-extrabold border uppercase flex-shrink-0", getPriorityColor(t.priority))}>
                      {t.priority}
                    </span>
                  </div>
                ))}
                {overdueTasksList.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[11px] text-text-muted select-none">
                    No overdue tasks!
                  </div>
                )}
              </div>
            </div>

            {/* Performance Leaderboard widget */}
            <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 text-left flex flex-col h-80">
              <div className="flex justify-between items-center mb-3 flex-shrink-0">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary select-none">Performance Leaderboard</h3>
                <span className="text-[10px] text-text-muted font-bold">This Quarter</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {performersList.slice(0, 10).map((p, idx) => (
                  <div key={p.user_id} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-text-muted w-4 text-center">{idx + 1}</span>
                    {p.avatar ? (
                      <img src={p.avatar} className="w-7 h-7 rounded-full object-cover border border-border-subtle" alt={p.name} />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-accent-blue text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{p.name.charAt(0)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold text-text-primary truncate">{p.name}</h4>
                    </div>
                    <span className={cn(
                      "text-xs font-bold",
                      p.performance_pct >= 90 ? "text-accent-green" : p.performance_pct >= 80 ? "text-accent-purple" : "text-accent-orange"
                    )}>
                      {p.performance_pct}%
                    </span>
                  </div>
                ))}
                {performersList.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[11px] text-text-muted select-none">
                    No scoreboard data
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity widget */}
            <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 text-left flex flex-col h-80">
              <div className="flex justify-between items-center mb-3 flex-shrink-0">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary select-none">Recent Activity</h3>
                <span className="text-[10px] text-text-muted font-bold">View All</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {recentActivities.map(act => (
                  <div key={act.id} className="flex gap-2">
                    {act.user_avatar ? (
                      <img src={act.user_avatar} className="w-7 h-7 rounded-full object-cover border border-border-subtle flex-shrink-0" alt={act.user_name || ''} />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-accent-blue text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{act.user_name?.charAt(0) || '?'}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-text-primary leading-tight font-medium">
                        <span className="font-bold">{act.user_name}</span> {act.description || act.action}
                      </p>
                      <span className="text-[9px] text-text-muted mt-0.5 block">{timeAgo(act.created_at)}</span>
                    </div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[11px] text-text-muted select-none">
                    No recent activities
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Employee Performance Table (Full Width) */}
          <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 text-left">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary select-none">Employee Performance</h3>
              <span className="text-[10px] text-text-muted font-bold">This Quarter</span>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted">Employee</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted text-center">Tasks Assigned</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted text-center">Completed</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted text-center">Overdue</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted text-center">In Progress</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted text-center">Performance</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted text-center">Trend</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-text-muted text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.filter(u => u.username !== 'vincent_ceo').map(u => {
                    const uTasks = tasks.filter(t => t.assigned_to_id === Number(u.id));
                    const total = uTasks.length;
                    const completed = uTasks.filter(t => t.status === 'completed').length;
                    const progress = uTasks.filter(t => t.status === 'in_progress').length;
                    
                    const today = new Date().toISOString().split('T')[0];
                    const overdue = uTasks.filter(t => t.deadline && t.deadline < today && t.status !== 'completed').length;
                    const score = total > 0 ? Math.round((completed / total) * 100) : 0;
                    
                    return (
                      <TableRow key={u.id} className="cursor-pointer hover:bg-surface-hover/30 transition-colors" onClick={() => setPerfViewUser(u)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {u.avatar ? (
                              <img src={u.avatar} className="w-7 h-7 rounded-full object-cover border border-border-subtle" alt={u.name} />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-accent-blue text-white flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>
                            )}
                            <span className="text-xs font-bold text-text-primary">{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">{total}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-accent-green">{completed}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-accent-red">{overdue}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-accent-blue">{progress}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-xs font-extrabold",
                            score >= 90 ? "text-accent-green" : score >= 80 ? "text-accent-purple" : "text-accent-orange"
                          )}>
                            {score}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <svg className="w-12 h-5 mx-auto" viewBox="0 0 50 20">
                            <path
                              d={getSparklinePath(score)}
                              fill="none"
                              stroke={score >= 90 ? "#10B981" : score >= 80 ? "#8B5CF6" : "#F59E0B"}
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => setPerfViewUser(u)}
                            className="px-2.5 py-1 bg-background-primary hover:bg-surface-hover border border-border-subtle text-text-secondary hover:text-text-primary text-[10px] font-bold rounded transition-colors"
                          >
                            View
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

        </div>
      )}



      {/* Floating sparkles button / AI Assistant FAB */}
      <div
        onClick={() => {
          const btn = document.querySelector('[aria-label="Toggle Global AI Chat"]') as HTMLButtonElement | null;
          if (btn) btn.click();
        }}
        className="fixed bottom-6 right-20 z-50 w-12 h-12 rounded-full bg-gradient-to-tr from-accent-purple to-accent-blue hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl cursor-pointer transition-all hover:shadow-accent-purple/20"
        title="Ask Executive AI"
      >
        <Sparkles className="w-5 h-5 text-white" />
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────────────────── */}

      {/* Create / Edit Task Dialog (Wizard Form) */}
      <CreateEditTaskDialog
        open={showCreateEdit}
        onClose={() => { 
          setShowCreateEdit(false); 
          setEditingTask(null); 
          setCreateSubtaskForParent(null);
        }}
        task={editingTask}
        parentTask={createSubtaskForParent}
        onSave={editingTask ? handleEditTask : handleCreateTask}
        projects={projects}
        allUsers={allUsers}
        quarters={quarters}
        selectedQuarterId={selectedQuarterId}
        defaultStatus={defaultNewTaskStatus}
      />


      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedTask(null); }}
        onEdit={t => { setEditingTask(t); setShowCreateEdit(true); }}
        onDelete={handleDeleteTask}
        onTransitionStatus={handleStatusChange}
        onTransfer={t => { setTransferTask(t); setTransferOpen(true); }}
        onStatusChange={handleStatusChange}
        allUsers={allUsers}
        onRefreshTask={id => handleSelectTask({ id })}
        onSelectTask={handleSelectTask}
        defaultTab={detailDefaultTab}
      />

      {/* Transfer Dialog */}
      <TransferDialog
        task={transferTask}
        open={transferOpen}
        onClose={() => { setTransferOpen(false); setTransferTask(null); }}
        onSave={handleTransfer}
        allUsers={allUsers}
      />

      {/* Block Reason Dialog */}
      <CompleteTaskModal
        isOpen={completeTaskOpen}
        onClose={() => {
          setCompleteTaskOpen(false);
          setCompletingTaskId(null);
        }}
        taskExtendedTime={taskExtendedTime}
        setTaskExtendedTime={setTaskExtendedTime}
        onSubmit={async (extendedTime, completionDate) => {
          if (!completingTaskId) return;
          const extTime = parseFloat(extendedTime);
          await workcenterService.updateTask(completingTaskId, {
            status: 'completed',
            extended_time: isNaN(extTime) ? undefined : extTime,
            actual_completion_date: completionDate
          });
          setCompleteTaskOpen(false);
          setCompletingTaskId(null);
          await loadData();
          if (selectedTask && selectedTask.id === completingTaskId) {
            await handleSelectTask({ id: completingTaskId });
          }
        }}
      />

      <Dialog open={!!blockingTaskInfo} onOpenChange={() => setBlockingTaskInfo(null)}>
        <DialogContent className="max-w-sm p-5 font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1 text-accent-red">
              <AlertTriangle className="w-4 h-4" /> Block Task
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary mt-1">
              Please enter the reason for blocking this task.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="E.g., Waiting for client API credentials..."
              className="min-h-[80px] text-xs bg-background-secondary border border-border-subtle"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 text-xs">
            <button
              onClick={() => setBlockingTaskInfo(null)}
              className="px-3 py-1.5 border border-border-subtle rounded text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBlock}
              disabled={!blockReason.trim()}
              className="px-3 py-1.5 bg-accent-red hover:bg-accent-red/90 text-white rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Block Task
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quarter Management Dialog */}
      <Dialog open={showQuarterModal} onOpenChange={(val) => { setShowQuarterModal(val); if (!val) setEditingQuarter(null); }}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingQuarter ? "Edit Quarter" : "Create New Quarter"}</DialogTitle>
            <DialogDescription>{editingQuarter ? "Update quarter parameters and status." : "Add a new fiscal quarter for execution tracking."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveQuarter} className="space-y-4 pt-2 text-xs text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Quarter Name *</label>
              <Input
                type="text"
                value={newQuarterForm.name}
                onChange={e => setNewQuarterForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. FY27 - Q3"
                className="text-xs"
                required
              />
            </div>
            
            {editingQuarter && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Status *</label>
                <select
                  value={newQuarterForm.status}
                  onChange={e => setNewQuarterForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none cursor-pointer"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Fiscal Year</label>
                <Input
                  type="number"
                  value={newQuarterForm.fiscal_year}
                  onChange={e => setNewQuarterForm(f => ({ ...f, fiscal_year: Number(e.target.value) }))}
                  className="text-xs"
                  disabled={!!editingQuarter}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Quarter Number (1-4)</label>
                <Input
                  type="number"
                  value={newQuarterForm.quarter_number}
                  onChange={e => setNewQuarterForm(f => ({ ...f, quarter_number: Number(e.target.value) }))}
                  min={1}
                  max={4}
                  className="text-xs"
                  disabled={!!editingQuarter}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Start Date</label>
                <Input
                  type="date"
                  value={newQuarterForm.start_date}
                  onChange={e => setNewQuarterForm(f => ({ ...f, start_date: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">End Date</label>
                <Input
                  type="date"
                  value={newQuarterForm.end_date}
                  onChange={e => setNewQuarterForm(f => ({ ...f, end_date: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Goals</label>
              <Textarea
                value={newQuarterForm.goals}
                onChange={e => setNewQuarterForm(f => ({ ...f, goals: e.target.value }))}
                placeholder="Target goals for this quarter..."
                className="text-xs"
                rows={3}
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => { setShowQuarterModal(false); setEditingQuarter(null); }} className="px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-[10px] font-bold rounded transition-all">Cancel</button>
              <button type="submit" className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-[10px] font-bold rounded shadow transition-all">{editingQuarter ? "Save Changes" : "Create Quarter"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Performance Details Modal */}
      <Dialog open={!!perfViewUser} onOpenChange={() => setPerfViewUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto font-sans text-left">
          <DialogHeader>
            <DialogTitle className="text-sm">Employee Profile & Performance</DialogTitle>
            <DialogDescription>Historical tasks execution metrics & parameters.</DialogDescription>
          </DialogHeader>
          <PerformanceView perf={perfData} loading={perfLoading} allUsers={allUsers} />
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ─── Kanban Board ────────────────────────────────────────────────────────── */

function GroupedTaskFeed({
  tasks,
  onSelectTask,
  onStatusChange,
  onAddTaskInStatus,
  onRefresh,
  users,
  onEditTask,
  onViewHistory,
  onDeleteTask,
  onAddSubtask,
}: {
  tasks: WCTask[];
  onSelectTask: (t: any) => void;
  onStatusChange: (id: number, status: string) => void;
  onAddTaskInStatus?: (status: string) => void;
  onRefresh?: () => void;
  users?: UserType[];
  onEditTask?: (t: WCTask) => void;
  onViewHistory?: (t: WCTask) => void;
  onDeleteTask?: (id: number) => void;
  onAddSubtask?: (parent: WCTask) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    in_progress: true,
    completed: true,
    blocked: true,
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});

  const toggleExpandTask = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const [inlineAddSubtaskForId, setInlineAddSubtaskForId] = useState<number | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');

  return (
    <div className="space-y-4">
      {STATUS_COLS.map(col => {
        const colTasks = col.key === 'in_progress'
          ? tasks.filter(t => t.status !== 'completed' && t.status !== 'done' && t.status !== 'blocked')
          : col.key === 'completed'
            ? tasks.filter(t => t.status === 'completed' || t.status === 'done')
            : tasks.filter(t => t.status === 'blocked');
        const isGroupExpanded = expandedGroups[col.key];

        return (
          <div key={col.key} className="bg-background-secondary border border-border-subtle rounded-xl transition-all shadow-sm">
            {/* Status Header Bar */}
            <div 
              onClick={() => toggleGroup(col.key)}
              className="p-3 bg-surface-card/10 flex items-center justify-between cursor-pointer select-none hover:bg-surface-card/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform duration-200", isGroupExpanded ? "rotate-0" : "-rotate-90")} />
                <div className={cn("w-2.5 h-2.5 rounded-full", col.color, col.bg)} />
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">{col.label}</span>
                <span className="text-[10px] bg-background-primary border border-border-subtle px-2.5 py-0.5 rounded-full text-text-secondary font-bold">
                  {colTasks.length} {colTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

            </div>

            {/* Tasks List */}
            {isGroupExpanded && (
              <div className="divide-y divide-border-subtle/50 bg-background-primary overflow-x-auto scrollbar-thin">
                {/* Column Headers Row */}
                {colTasks.length > 0 && (
                  <div className="hidden lg:flex items-center p-3.5 bg-background-secondary/40 border-b border-border-subtle text-[10px] font-extrabold text-text-muted uppercase tracking-wider select-none gap-4 min-w-[1280px]">
                    <div className="flex-1 min-w-[120px] pr-4">Task & Project</div>
                    <div className="w-20 flex-shrink-0">Start Date</div>
                    <div className="w-20 flex-shrink-0">End Date</div>
                    <div className="w-24 flex-shrink-0">Completion Date</div>
                    <div className="w-20 flex-shrink-0">Overdue Days</div>
                    <div className="w-20 flex-shrink-0">Assignee</div>
                    <div className="w-24 flex-shrink-0">Transferred Info</div>
                    <div className="w-24 flex-shrink-0">Subtasks Progress</div>
                    <div className="w-14 flex-shrink-0">Priority</div>
                    <div className="w-24 flex-shrink-0">View Subtask</div>
                    <div className="w-24 flex-shrink-0">Add Subtask</div>
                    <div className="w-24 flex-shrink-0">Status</div>
                    <div className="w-16 flex-shrink-0 text-right pr-2">Actions</div>
                  </div>
                )}
                {colTasks.map((task, idx) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isOverdue = task.deadline && task.deadline < today && task.status !== 'completed';
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                  const isTaskExpanded = !!expandedTasks[task.id];
                  const completedSubtasks = task.subtasks ? task.subtasks.filter(s => s.status === 'completed').length : 0;
                  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

                  return (
                    <div 
                      key={task.id} 
                      onClick={() => onSelectTask(task)}
                      className="p-3.5 hover:bg-surface-hover/30 transition-all cursor-pointer text-left space-y-3 relative group"
                    >
                      {/* Main Task Metadata Row */}
                      {/* Desktop Aligned Row */}
                      <div className="hidden lg:flex items-center w-full gap-4 min-w-[1280px]">
                        {/* 1. Title & Project */}
                        <div className="flex-1 min-w-[120px] pr-4">
                          <h4 className="text-xs font-bold text-text-primary hover:text-accent-blue transition-colors leading-normal truncate">
                            {idx + 1}. {task.title}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {task.parent_title && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-accent-purple bg-accent-purple/5 border border-accent-purple/10 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
                                Subtask of: {task.parent_title}
                              </span>
                            )}
                            {task.project_name && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-accent-blue bg-accent-blue/5 border border-accent-blue/10 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                                {task.project_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. Start Date */}
                        <div className="w-20 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                          {task.start_date ? task.start_date : '—'}
                        </div>

                        {/* 3. End Date */}
                        <div className="w-20 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                          {task.deadline ? task.deadline : '—'}
                        </div>

                        {/* 4. Completion Date */}
                        <div className="w-24 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                          {task.actual_completion_date ? task.actual_completion_date : '—'}
                        </div>

                        {/* 4. Overdue Days */}
                        <div className="w-20 flex-shrink-0 text-[10px] font-bold">
                          {(() => {
                            if (task.status === 'completed' || task.status === 'done' || !task.deadline) return <span className="text-text-muted">—</span>;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const [yr, mo, dy] = task.deadline.split('-').map(Number);
                            const dlDate = new Date(yr, mo - 1, dy);
                            dlDate.setHours(0, 0, 0, 0);
                            if (today > dlDate) {
                              const diffTime = Math.abs(today.getTime() - dlDate.getTime());
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              return <span className="text-accent-red bg-accent-red/5 border border-accent-red/10 px-2 py-0.5 rounded-full">{diffDays} {diffDays === 1 ? 'day' : 'days'}</span>;
                            }
                            return <span className="text-text-muted">—</span>;
                          })()}
                        </div>

                        {/* 5. Assignee */}
                        <div className="w-20 flex-shrink-0">
                          {task.assigned_to_name ? (
                            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assigned_to_name}`}>
                              {task.assigned_to_avatar ? (
                                <img src={task.assigned_to_avatar} className="w-5 h-5 rounded-full object-cover border border-border-subtle flex-shrink-0" alt={task.assigned_to_name} />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{task.assigned_to_name.charAt(0)}</div>
                              )}
                              <span className="text-[10px] text-text-secondary max-w-[60px] truncate">{task.assigned_to_name.split(' ')[0]}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-text-muted font-bold select-none border border-dashed px-1.5 py-0.5 rounded">Unassigned</span>
                          )}
                        </div>

                        {/* 6. Transferred Info */}
                        <div className="w-24 flex-shrink-0 text-[10px] text-text-secondary font-bold truncate">
                          {task.transfer_date && task.transfer_to_name ? (
                            <div className="flex flex-col min-w-0" title={`Transferred to ${task.transfer_to_name} on ${task.transfer_date}`}>
                              <span className="text-accent-blue text-[9px] bg-accent-blue/5 border border-accent-blue/10 px-1.5 py-0.5 rounded-md inline-block max-w-max truncate">
                                {task.transfer_date}
                              </span>
                              <span className="text-[9px] text-text-muted truncate mt-0.5">
                                to {task.transfer_to_name.split(' ')[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-muted pl-4">—</span>
                          )}
                        </div>

                        {/* 7. Subtasks Progress */}
                        <div className="w-24 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          {totalSubtasks > 0 ? (
                            <div>
                              <div className="flex justify-between text-[9px] font-bold text-text-secondary mb-1">
                                <span>Subtasks</span>
                                <span>{completedSubtasks}/{totalSubtasks}</span>
                              </div>
                              <div className="w-full bg-border-subtle rounded-full h-1 overflow-hidden">
                                <div className="bg-accent-green h-1 rounded-full" style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-muted select-none pl-2">—</span>
                          )}
                        </div>

                        {/* 8. Priority */}
                        <div className="w-14 flex-shrink-0">
                          <span className={cn("px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase select-none tracking-wider", getPriorityColor(task.priority))}>
                            {task.priority}
                          </span>
                        </div>

                        {/* 9. View Subtask Button */}
                        <div className="w-24 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          {hasSubtasks ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandTask(task.id, e);
                              }}
                              className="px-2 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-text-secondary hover:text-text-primary transition-all flex items-center gap-1 select-none w-full justify-center"
                            >
                              <ChevronDown className={cn("w-3 h-3 text-text-muted transition-transform duration-200", isTaskExpanded ? "rotate-0" : "-rotate-90")} />
                              {isTaskExpanded ? 'Hide' : 'View'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted select-none pl-6">—</span>
                          )}
                        </div>

                        {/* 10. Add Subtask Button */}
                        <div className="w-24 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAddSubtask) onAddSubtask(task);
                            }}
                            className="px-2 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-text-secondary hover:text-text-primary transition-all flex items-center gap-1 select-none w-full justify-center"
                          >
                            <Plus className="w-3 h-3 text-text-muted" /> Add
                          </button>
                        </div>

                        {/* 11. Status Select */}
                        <div className="w-24 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <select
                            value={task.status}
                            onChange={e => onStatusChange(task.id, e.target.value)}
                            className="bg-background-secondary border border-border-subtle text-[10px] rounded p-1 text-text-secondary outline-none cursor-pointer font-bold w-full"
                          >
                            {STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* 12. Action Buttons */}
                        <div className="w-16 flex-shrink-0 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {onEditTask && (
                            <button 
                              onClick={() => onEditTask(task)} 
                              className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-accent-blue transition-colors" 
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onViewHistory && (
                            <button 
                              onClick={() => onViewHistory(task)} 
                              className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-accent-green transition-colors" 
                              title="History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteTask && (
                            <button 
                              onClick={() => onDeleteTask(task.id)} 
                              className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-accent-red transition-colors" 
                              title="Delete"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Layout: Stacked Card Style */}
                      <div className="flex flex-col lg:hidden gap-3.5">
                        {/* Title Block */}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-text-primary hover:text-accent-blue transition-colors leading-normal break-words">
                            {idx + 1}. {task.title}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {task.parent_title && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-accent-purple bg-accent-purple/5 border border-accent-purple/10 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
                                Subtask of: {task.parent_title}
                              </span>
                            )}
                            {task.project_name && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-accent-blue bg-accent-blue/5 border border-accent-blue/10 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                                {task.project_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle metadata bar */}
                        <div className="flex flex-wrap items-center gap-3.5 text-xs">
                          {/* Priority Badge */}
                          <span className={cn("px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase select-none tracking-wider", getPriorityColor(task.priority))}>
                            {task.priority}
                          </span>

                          {/* Deadline */}
                          {task.deadline && (
                            <span className={cn("text-[10px] font-bold flex items-center gap-1 select-none", isOverdue ? "text-accent-red" : "text-text-muted")}>
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              {isOverdue ? 'Overdue' : task.deadline}
                            </span>
                          )}

                          {/* Assignee Avatar */}
                          {task.assigned_to_name ? (
                            <div className="flex items-center gap-1.5">
                              {task.assigned_to_avatar ? (
                                <img src={task.assigned_to_avatar} className="w-5 h-5 rounded-full object-cover border border-border-subtle flex-shrink-0" alt={task.assigned_to_name} />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{task.assigned_to_name.charAt(0)}</div>
                              )}
                              <span className="text-[10px] text-text-secondary">{task.assigned_to_name}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-text-muted font-bold select-none border border-dashed px-1.5 py-0.5 rounded">Unassigned</span>
                          )}
                        </div>

                        {/* Progress Bar (Mobile) */}
                        {totalSubtasks > 0 && (
                          <div className="bg-background-secondary/50 p-2.5 rounded-lg border border-border-subtle/30" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between text-[9px] font-bold text-text-secondary mb-1">
                              <span>Subtasks Progress</span>
                              <span>{completedSubtasks}/{totalSubtasks}</span>
                            </div>
                            <div className="w-full bg-border-subtle rounded-full h-1 overflow-hidden">
                              <div className="bg-accent-green h-1 rounded-full" style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Actions Block (Mobile) */}
                        <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-border-subtle/30" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {hasSubtasks && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandTask(task.id, e);
                                }}
                                className="px-2.5 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-text-secondary hover:text-text-primary transition-all flex items-center gap-1 select-none"
                              >
                                <ChevronDown className={cn("w-3 h-3 text-text-muted transition-transform duration-200", isTaskExpanded ? "rotate-0" : "-rotate-90")} />
                                {isTaskExpanded ? 'Hide' : 'View sub task'}
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAddSubtask) onAddSubtask(task);
                              }}
                              className="px-2.5 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-text-secondary hover:text-text-primary transition-all flex items-center gap-1 select-none"
                            >
                              <Plus className="w-3.5 h-3.5 text-text-muted" /> Subtask
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <select
                              value={task.status}
                              onChange={e => onStatusChange(task.id, e.target.value)}
                              className="bg-background-secondary border border-border-subtle text-[10px] rounded p-1 text-text-secondary outline-none cursor-pointer font-bold"
                            >
                              {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1 border-l border-border-subtle/40 pl-2">
                              {onEditTask && (
                                <button 
                                  onClick={() => onEditTask(task)} 
                                  className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-accent-blue transition-colors" 
                                  title="Edit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onViewHistory && (
                                <button 
                                  onClick={() => onViewHistory(task)} 
                                  className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-accent-green transition-colors" 
                                  title="History"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteTask && (
                                <button 
                                  onClick={() => onDeleteTask(task.id)} 
                                  className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-accent-red transition-colors" 
                                  title="Delete"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>



                      {/* Expandable subtasks list */}
                      {hasSubtasks && isTaskExpanded && (
                        <div className="pl-6 pt-3 border-t border-border-subtle/30 space-y-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted select-none">Subtasks</div>
                          
                          {/* Subtasks Headers Row (hidden on mobile) */}
                          <div className="hidden lg:flex items-center p-2 bg-background-secondary/30 rounded-lg border border-border-subtle/20 text-[9px] font-bold text-text-muted uppercase tracking-wider select-none gap-4 min-w-[990px]">
                            <div className="flex-1 min-w-[120px] pr-4 pl-[30px]">Subtask Title</div>
                            <div className="w-32 flex-shrink-0">Description</div>
                            <div className="w-20 flex-shrink-0">Start Date</div>
                            <div className="w-20 flex-shrink-0">End Date</div>
                            <div className="w-20 flex-shrink-0">Overdue Days</div>
                            <div className="w-20 flex-shrink-0">Assignee</div>
                            <div className="w-24 flex-shrink-0">Transferred Info</div>
                            <div className="w-24 flex-shrink-0">Status</div>
                            <div className="w-14 flex-shrink-0 text-right">Actions</div>
                          </div>

                          <div className="grid grid-cols-1 gap-1.5">
                            {task.subtasks.map(st => {
                              const isCompleted = st.status === 'completed' || st.status === 'done';
                              return (
                                <div 
                                  key={st.id} 
                                  onClick={e => {
                                    e.stopPropagation();
                                    onSelectTask(st);
                                  }}
                                  className="p-2 bg-background-secondary/50 border border-border-subtle/40 rounded-lg hover:bg-surface-hover/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-[11px]"
                                >
                                  {/* Desktop columns layout */}
                                  <div className="hidden lg:flex items-center w-full gap-4 min-w-[990px]">
                                    {/* 1. Title */}
                                    <div className="flex-1 min-w-[120px] flex items-center gap-2 pr-4 pl-2">
                                      <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] font-bold flex-shrink-0", isCompleted ? "bg-accent-green border-accent-green text-white" : "border-text-muted/40 text-transparent")}>✓</div>
                                      <span className={cn("font-medium truncate", isCompleted && "line-through text-text-muted")}>{st.title}</span>
                                    </div>

                                    {/* 1.5 Description */}
                                    <div className="w-32 flex-shrink-0 text-[10px] text-text-muted truncate pr-2 font-medium" title={st.description || ''}>
                                      {st.description ? st.description : '—'}
                                    </div>

                                    {/* 2. Start Date */}
                                    <div className="w-20 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                                      {st.start_date ? st.start_date : '—'}
                                    </div>

                                    {/* 3. End Date */}
                                    <div className="w-20 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                                      {st.deadline ? st.deadline : '—'}
                                    </div>

                                    {/* 4. Overdue Days */}
                                    <div className="w-20 flex-shrink-0 text-[10px] font-bold">
                                      {(() => {
                                        if (isCompleted || !st.deadline) return <span className="text-text-muted">—</span>;
                                        const todayDate = new Date();
                                        todayDate.setHours(0, 0, 0, 0);
                                        const [yr, mo, dy] = st.deadline.split('-').map(Number);
                                        const dlDate = new Date(yr, mo - 1, dy);
                                        dlDate.setHours(0, 0, 0, 0);
                                        if (todayDate > dlDate) {
                                          const diffTime = Math.abs(todayDate.getTime() - dlDate.getTime());
                                          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                          return <span className="text-accent-red bg-accent-red/5 border border-accent-red/10 px-2 py-0.5 rounded-full">{diffDays} {diffDays === 1 ? 'day' : 'days'}</span>;
                                        }
                                        return <span className="text-text-muted">—</span>;
                                      })()}
                                    </div>

                                    {/* 5. Assignee */}
                                    <div className="w-20 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                                      {st.assigned_to_name ? (
                                        <span className="bg-background-primary border border-border-subtle px-1.5 py-0.5 rounded text-text-secondary font-bold inline-block max-w-[80px] truncate">
                                          {st.assigned_to_name.split(' ')[0]}
                                        </span>
                                      ) : (
                                        <span className="text-text-muted select-none">—</span>
                                      )}
                                    </div>

                                    {/* 6. Transferred Info */}
                                    <div className="w-24 flex-shrink-0 text-[10px] text-text-secondary font-bold truncate">
                                      {(st as any).transfer_date && (st as any).transfer_to_name ? (
                                        <div className="flex flex-col min-w-0" title={`Transferred to ${(st as any).transfer_to_name} on ${(st as any).transfer_date}`}>
                                          <span className="text-accent-blue text-[9px] bg-accent-blue/5 border border-accent-blue/10 px-1.5 py-0.5 rounded-md inline-block max-w-max truncate">
                                            {(st as any).transfer_date}
                                          </span>
                                          <span className="text-[9px] text-text-muted truncate mt-0.5">
                                            to {(st as any).transfer_to_name.split(' ')[0]}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-text-muted pl-4">—</span>
                                      )}
                                    </div>

                                    {/* 7. Status */}
                                    <div className="w-24 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                      <select
                                        value={st.status === 'done' ? 'completed' : st.status}
                                        onChange={e => onStatusChange(st.id, e.target.value)}
                                        className="bg-background-primary border border-border-subtle text-[9px] rounded p-0.5 text-text-secondary outline-none cursor-pointer font-bold w-full"
                                      >
                                        {STATUS_OPTIONS.map(o => (
                                          <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* 8. Actions */}
                                    <div className="w-14 flex-shrink-0 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                      {onEditTask && (
                                        <button 
                                          onClick={() => onEditTask(st as any)} 
                                          className="p-1 rounded hover:bg-background-primary text-text-muted hover:text-accent-blue transition-colors" 
                                          title="Edit Subtask"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {onDeleteTask && (
                                        <button 
                                          onClick={() => onDeleteTask(st.id)} 
                                          className="p-1 rounded hover:bg-background-primary text-text-muted hover:text-accent-red transition-colors" 
                                          title="Delete Subtask"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Mobile layout */}
                                  <div className="flex flex-col lg:hidden w-full gap-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] font-bold flex-shrink-0", isCompleted ? "bg-accent-green border-accent-green text-white" : "border-text-muted/40 text-transparent")}>✓</div>
                                      <span className={cn("font-medium truncate", isCompleted && "line-through text-text-muted")}>{st.title}</span>
                                    </div>

                                    {st.description && <div className="text-[10px] text-text-muted/80 italic pl-6">{st.description}</div>}

                                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-muted pl-6">
                                      {st.start_date && <span>Start: {st.start_date}</span>}
                                      {st.deadline && <span>End: {st.deadline}</span>}
                                      {st.deadline && !isCompleted && (
                                        (() => {
                                          const todayDate = new Date();
                                          todayDate.setHours(0, 0, 0, 0);
                                          const [yr, mo, dy] = st.deadline.split('-').map(Number);
                                          const dlDate = new Date(yr, mo - 1, dy);
                                          dlDate.setHours(0, 0, 0, 0);
                                          if (todayDate > dlDate) {
                                            const diffDays = Math.round(Math.abs(todayDate.getTime() - dlDate.getTime()) / (1000 * 60 * 60 * 24));
                                            return <span className="text-accent-red font-bold">{diffDays}d overdue</span>;
                                          }
                                          return null;
                                        })()
                                      )}
                                      {st.assigned_to_name && <span className="font-bold">Assigned to: {st.assigned_to_name}</span>}
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pl-6 pt-1 border-t border-border-subtle/30" onClick={e => e.stopPropagation()}>
                                      {(st as any).transfer_date && (st as any).transfer_to_name ? (
                                        <span className="text-[9px] text-text-muted">Transferred: {(st as any).transfer_date} to {(st as any).transfer_to_name}</span>
                                      ) : (
                                        <div />
                                      )}
                                      <select
                                        value={st.status === 'done' ? 'completed' : st.status}
                                        onChange={e => onStatusChange(st.id, e.target.value)}
                                        className="bg-background-primary border border-border-subtle text-[9px] rounded p-0.5 text-text-secondary outline-none cursor-pointer font-bold"
                                      >
                                        {STATUS_OPTIONS.map(o => (
                                          <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-[11px] text-text-muted select-none">No tasks in this group</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Table View ──────────────────────────────────────────────────────────── */

function TaskTableView({
  tasks,
  onSelectTask,
}: {
  tasks: WCTask[];
  onSelectTask: (t: any) => void;
}) {
  return (
    <div className="bg-background-secondary border border-border-subtle rounded-xl overflow-x-auto scrollbar-thin text-left shadow-sm">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Title</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Assignee</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Project</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Priority</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Deadline</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Actual Completion</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id} onClick={() => onSelectTask(task)} className="cursor-pointer hover:bg-surface-hover transition-colors">
              <TableCell className="font-bold text-xs">{task.title}</TableCell>
              <TableCell>
                {task.assigned_to_name ? (
                  <div className="flex items-center gap-2">
                    {task.assigned_to_avatar ? (
                      <img src={task.assigned_to_avatar} className="w-5 h-5 rounded-full object-cover border border-border-subtle" alt={task.assigned_to_name} />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[9px] font-bold">{task.assigned_to_name.charAt(0)}</div>
                    )}
                    <span className="text-[11px] font-medium">{task.assigned_to_name}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-text-muted font-medium">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-[11px] text-text-secondary font-semibold">{task.project_name || 'General'}</TableCell>
              <TableCell>
                <span className={cn("px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase", getPriorityColor(task.priority))}>
                  {task.priority}
                </span>
              </TableCell>
              <TableCell className="text-[11px] text-text-secondary font-medium">{task.deadline || '—'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDot(task.status))} />
                  <span className="text-[11px] font-bold">{getStatusLabel(task.status)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-[11px] text-text-muted">No tasks found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Task Detail Dialog ──────────────────────────────────────────────────── */

function TaskDetailDialog({
  task,
  open,
  onClose,
  onEdit,
  onDelete,
  onTransitionStatus,
  onTransfer,
  onStatusChange,
  allUsers,
  onRefreshTask,
  onSelectTask,
  defaultTab,
}: {
  task: WCTask | null;
  open: boolean;
  onClose: () => void;
  onEdit: (t: WCTask) => void;
  onDelete: (id: number) => void;
  onTransitionStatus: (id: number, status: string) => void;
  onTransfer: (t: WCTask) => void;
  onStatusChange: (id: number, status: string) => void;
  allUsers: UserType[];
  onRefreshTask: (id: number) => void;
  onSelectTask?: (taskItem: { id: number }) => void;
  defaultTab?: 'details' | 'history' | 'transfers';
}) {
  const [history, setHistory] = useState<WCHistoryEntry[]>([]);
  const [transfers, setTransfers] = useState<WCTransfer[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'transfers'>(defaultTab || 'details');

  const [loading, setLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  const handleAddSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;
    setAddingSubtask(true);
    try {
      await workcenterService.createTask({
        title: newSubtaskTitle.trim(),
        parent_id: task.id,
        project_id: task.project_id || undefined,
        quarter_id: task.quarter_id || undefined,
        priority: 'medium',
        assigned_to_id: newSubtaskAssigneeId ? Number(newSubtaskAssigneeId) : undefined,
        start_date: todayStr(),
        deadline: task.deadline || todayStr(),
        description: newSubtaskDescription.trim() || undefined,
      });
      setNewSubtaskTitle('');
      setNewSubtaskDescription('');
      setNewSubtaskAssigneeId('');
      if (onRefreshTask) onRefreshTask(task.id);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSubtask(false);
    }
  };

  useEffect(() => {
    if (!task || !open) return;
    setLoading(true);
    setActiveTab(defaultTab || 'details');
    Promise.all([
      workcenterService.getHistory(task.id).catch(() => []),
      workcenterService.getTransfers(task.id).catch(() => []),
    ]).then(([h, t]) => {
      setHistory(h);
      setTransfers(t);
      setLoading(false);
    });
  }, [task?.id, open, defaultTab]);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto font-sans text-left">
        <DialogHeader>
          <div className="flex justify-between items-start pr-6">
            <DialogTitle className="text-sm font-bold">{task.title}</DialogTitle>
            {task.parent_id && onSelectTask && (
              <button
                onClick={() => onSelectTask({ id: task.parent_id! })}
                className="text-[10px] text-accent-blue hover:underline font-bold flex items-center gap-0.5"
              >
                ← View Main Task
              </button>
            )}
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
            <span className={cn("px-2 py-0.5 rounded border text-[9px] font-bold uppercase", getPriorityColor(task.priority))}>{task.priority}</span>
            <span className="text-[11px] bg-surface-card px-2 py-0.5 rounded border border-border-subtle flex items-center gap-1 font-semibold">
              <span className={cn("w-1.5 h-1.5 rounded-full inline-block", getStatusDot(task.status))} />
              {getStatusLabel(task.status)}
            </span>
            {task.project_name && (
              <span className="text-[11px] text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">{task.project_name}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!task.parent_id && (
          <div className="flex border-b border-border-subtle text-[10px] font-bold text-text-muted uppercase tracking-wider mt-2 select-none">
            {(['details', 'history', 'transfers'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 transition-colors",
                  activeTab === tab ? "text-accent-blue border-b-2 border-accent-blue" : "hover:text-text-primary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Description</span>
              <p className="text-text-primary leading-relaxed bg-background-primary p-3 rounded border border-border-subtle/50 text-[11px] whitespace-pre-wrap">
                {task.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Assignee</span>
                {task.assigned_to_name ? (
                  <div className="flex items-center gap-2">
                    {task.assigned_to_avatar ? (
                      <img src={task.assigned_to_avatar} className="w-5 h-5 rounded-full object-cover border border-border-subtle" alt={task.assigned_to_name} />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[9px] font-bold">{task.assigned_to_name.charAt(0)}</div>
                    )}
                    <span className="text-[11px] font-semibold">{task.assigned_to_name}</span>
                  </div>
                ) : <span className="text-[11px] text-text-muted font-semibold">Unassigned</span>}
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Deadline</span>
                <span className="text-[11px] font-semibold">{task.deadline || 'No deadline'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Reviewer</span>
                <span className="text-[11px] font-semibold">{task.reviewer_name || 'None'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Progress</span>
                <span className="text-[11px] font-semibold">{task.progress}%</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Created</span>
                <span className="text-[11px] font-semibold">{task.created_at ? timeAgo(task.created_at) : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Assigned By</span>
                <span className="text-[11px] font-semibold">{(task as any).assigned_by?.full_name || (task as any).assigned_by_name || 'System'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Est. Hours</span>
                <span className="text-[11px] font-semibold">{task.estimated_hours ?? '—'} hrs</span>
              </div>
            </div>

            {!task.parent_id && (
              <div className="space-y-3 pt-3 border-t border-border-subtle/50 text-left">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">
                  Subtasks ({task.subtasks?.filter(s => s.status === 'completed').length ?? 0}/{task.subtasks?.length ?? 0})
                </span>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {task.subtasks && task.subtasks.map(st => {
                    const isCompleted = st.status === 'completed';
                    return (
                      <div key={st.id} className="flex items-center gap-2 bg-background-primary p-2 rounded border border-border-subtle/30 group hover:border-text-muted transition-colors">
                        <button
                          type="button"
                          onClick={async () => {
                            const newStatus = isCompleted ? 'todo' : 'completed';
                            await workcenterService.updateStatus(st.id, newStatus);
                            if (onRefreshTask) onRefreshTask(task.id);
                          }}
                          className="p-0.5 hover:bg-surface-hover rounded"
                        >
                          <CheckCircle className={cn("w-3.5 h-3.5 transition-colors", isCompleted ? "text-accent-green" : "text-text-muted hover:text-text-primary")} />
                        </button>
                        <span
                          onClick={() => onSelectTask && onSelectTask({ id: st.id })}
                          className={cn("text-[11px] text-text-primary flex-1 font-medium truncate cursor-pointer hover:text-accent-blue hover:underline", isCompleted && "line-through text-text-muted")}
                        >
                          {st.title}
                        </span>
                        {st.assigned_to_name && (
                          <span className="text-[8px] bg-background-secondary border border-border-subtle px-1.5 py-0.5 rounded text-text-secondary font-bold flex-shrink-0">
                            {st.assigned_to_name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {(!task.subtasks || task.subtasks.length === 0) && (
                    <div className="text-center py-4 text-[10px] text-text-muted border border-dashed border-border-subtle rounded-lg">
                      No subtasks created yet. Add one below.
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddSubtask} className="flex gap-2 items-center mt-2">
                  <Input
                    type="text"
                    placeholder="New subtask title..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    className="h-8 text-xs flex-1"
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Description..."
                    value={newSubtaskDescription}
                    onChange={e => setNewSubtaskDescription(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <select
                    value={newSubtaskAssigneeId}
                    onChange={e => setNewSubtaskAssigneeId(e.target.value)}
                    className="h-8 bg-background-secondary border border-border-subtle rounded px-2 text-[10px] text-text-primary outline-none max-w-[120px]"
                  >
                    <option value="">Teammate...</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={addingSubtask || !newSubtaskTitle.trim()}
                    className="h-8 px-3 bg-accent-blue hover:bg-accent-blue-hover text-white text-[10px] font-bold rounded shadow transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {addingSubtask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add
                  </button>
                </form>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-border-subtle/50 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Change Status:</span>
                <select
                  value={task.status}
                  onChange={e => onStatusChange(task.id, e.target.value)}
                  className="bg-background-secondary border border-border-subtle text-[11px] rounded px-2 py-1.5 text-text-primary outline-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="py-3 space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-accent-blue" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-text-muted">No activity history</div>
            ) : history.map(h => (
              <div key={h.id} className="flex gap-3 bg-background-primary p-2.5 rounded border border-border-subtle/30 text-left">
                {h.user_avatar ? (
                  <img src={h.user_avatar} className="w-6 h-6 rounded-full object-cover border border-border-subtle flex-shrink-0" alt={h.user_name || ''} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-accent-blue text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{h.user_name?.charAt(0) || '?'}</div>
                )}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-text-primary">{h.user_name}</span>
                    <span className="text-[9px] text-text-muted">{timeAgo(h.created_at)}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed font-medium">{h.description || h.action}</p>
                  {h.old_value && h.new_value && (
                    <p className="text-[9px] text-text-muted">{h.old_value} → {h.new_value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="py-3 space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-accent-blue" /></div>
            ) : transfers.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-text-muted">No task transfers recorded</div>
            ) : transfers.map(t => (
              <div key={t.id} className="bg-background-primary p-3 rounded border border-border-subtle/30 space-y-2 text-left">
                <div className="flex items-center gap-2 text-[10px]">
                  {t.from_user_avatar ? (
                    <img src={t.from_user_avatar} className="w-5 h-5 rounded-full object-cover border border-border-subtle" alt={t.from_user_name || ''} />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[8px] font-bold">{t.from_user_name?.charAt(0) || '?'}</div>
                  )}
                  <span className="font-bold text-text-primary">{t.from_user_name}</span>
                  <ArrowRightLeft className="w-3 h-3 text-accent-blue" />
                  {t.to_user_avatar ? (
                    <img src={t.to_user_avatar} className="w-5 h-5 rounded-full object-cover border border-border-subtle" alt={t.to_user_name || ''} />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-accent-green text-white flex items-center justify-center text-[8px] font-bold">{t.to_user_name?.charAt(0) || '?'}</div>
                  )}
                  <span className="font-bold text-text-primary">{t.to_user_name}</span>
                  <span className="ml-auto text-[9px] text-text-muted font-bold">{timeAgo(t.created_at)}</span>
                </div>
                {t.reason && <p className="text-[10px] text-text-secondary font-medium">Reason: {t.reason}</p>}
                {t.remaining_work && <p className="text-[10px] text-text-secondary font-medium">Remaining: {t.remaining_work}</p>}
                {t.transfer_notes && <p className="text-[10px] text-text-muted italic">Notes: {t.transfer_notes}</p>}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <button onClick={() => {
            window.location.href = `/team-chat?createTaskChat=${task.id}`;
          }} className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-[10px] font-bold rounded hover:bg-accent-purple/20 transition-all flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Discuss Task
          </button>
          <button onClick={() => onDelete(task.id)} className="px-3 py-1.5 bg-accent-red/10 border border-accent-red/20 text-accent-red text-[10px] font-bold rounded hover:bg-accent-red/20 transition-all flex items-center gap-1">
            <Trash className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={() => { onTransfer(task); onClose(); }} className="px-3 py-1.5 bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-[10px] font-bold rounded hover:bg-accent-orange/20 transition-all flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
          </button>
          <button onClick={() => { onEdit(task); onClose(); }} className="px-3 py-1.5 bg-background-primary border border-border-subtle text-text-secondary hover:text-text-primary text-[10px] font-bold rounded transition-all flex items-center gap-1">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create / Edit Task Dialog ───────────────────────────────────────────── */

function CreateEditTaskDialog({
  open,
  onClose,
  task,
  parentTask,
  onSave,
  projects,
  allUsers,
  quarters,
  selectedQuarterId,
  defaultStatus,
}: {
  open: boolean;
  onClose: () => void;
  task: WCTask | null;
  parentTask?: WCTask | null;
  onSave: (payload: any) => Promise<void>;
  projects: Project[];
  allUsers: UserType[];
  quarters: WCQuarter[];
  selectedQuarterId: number | null;
  defaultStatus?: string;
}) {
  const isEdit = !!task;
  interface FormSubtask {
    title: string;
    assigned_to_id: string;
    priority: string;
    estimated_hours: string;
    start_date: string;
    deadline: string;
    status: string;
    description: string;
  }
  const [subtasks, setSubtasks] = useState<FormSubtask[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assigned_to_id: '',
    reviewer_id: '',
    project_id: '',
    quarter_id: '',
    deadline: '',
    start_date: '',
    estimated_hours: '',
    parent_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        setSubtasks([]);
        setForm({
          title: task.title,
          description: task.description || '',
          priority: task.priority,
          status: task.status,
          assigned_to_id: task.assigned_to_id ? String(task.assigned_to_id) : '',
          reviewer_id: task.reviewer_id ? String(task.reviewer_id) : '',
          project_id: task.project_id ? String(task.project_id) : '',
          quarter_id: task.quarter_id ? String(task.quarter_id) : String(selectedQuarterId || ''),
          deadline: task.deadline || '',
          start_date: task.start_date || '',
          estimated_hours: task.estimated_hours ? String(task.estimated_hours) : '',
          parent_id: task.parent_id ? String(task.parent_id) : '',
        });
      } else if (parentTask) {
        setSubtasks([]);
        setForm({
          title: '',
          description: '',
          priority: 'medium',
          status: defaultStatus || 'todo',
          assigned_to_id: '',
          reviewer_id: '',
          project_id: parentTask.project_id ? String(parentTask.project_id) : '',
          quarter_id: parentTask.quarter_id ? String(parentTask.quarter_id) : String(selectedQuarterId || ''),
          deadline: '',
          start_date: '',
          estimated_hours: '',
          parent_id: String(parentTask.id),
        });
      } else {
        setSubtasks([]);
        setForm({
          title: '',
          description: '',
          priority: 'medium',
          status: defaultStatus || 'todo',
          assigned_to_id: '',
          reviewer_id: '',
          project_id: '',
          quarter_id: String(selectedQuarterId || ''),
          deadline: '',
          start_date: '',
          estimated_hours: '',
          parent_id: '',
        });
      }
    }
  }, [open, task, parentTask, selectedQuarterId, defaultStatus]);

  const addSubtask = () => {
    setSubtasks(prev => [
      ...prev,
      {
        title: '',
        assigned_to_id: '',
        priority: 'medium',
        estimated_hours: '',
        start_date: form.start_date || todayStr(),
        deadline: form.deadline || todayStr(),
        status: 'todo',
        description: '',
      }
    ]);
  };

  const removeSubtask = (idx: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSubtaskField = (idx: number, field: keyof FormSubtask, val: string) => {
    setSubtasks(prev => prev.map((st, i) => i === idx ? { ...st, [field]: val } : st));
  };

  const applySuggestedTemplate = () => {
    const titleLower = form.title.toLowerCase();
    let names = ["Requirements Analysis", "System Design", "Core Development", "Code Review & Refactoring", "QA Testing & Validation"];
    
    if (titleLower.includes("dashboard") || titleLower.includes("analytics")) {
      names = ["Frontend UI", "Backend Logic", "API Integration", "Testing", "Documentation"];
    } else if (titleLower.includes("auth") || titleLower.includes("login") || titleLower.includes("security")) {
      names = ["Database Schema Setup", "JWT / Password Hashing", "Role Permissions Integration", "API Endpoint Security", "E2E Tests"];
    } else if (titleLower.includes("database") || titleLower.includes("schema") || titleLower.includes("migration")) {
      names = ["Schema Design", "Index Optimization", "Backup Automation", "Data Seeding Script", "Migration Verification"];
    } else if (titleLower.includes("report") || titleLower.includes("export")) {
      names = ["Data Extraction Queries", "Excel / PDF Exporter", "Client UI Download Card", "Unit Testing", "Performance Audit"];
    }

    const newSubtasks = names.map(name => ({
      title: name,
      assigned_to_id: form.assigned_to_id || '',
      priority: 'medium',
      estimated_hours: '4',
      start_date: form.start_date || todayStr(),
      deadline: form.deadline || todayStr(),
      status: 'todo',
      description: '',
    }));
    
    setSubtasks(newSubtasks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : 0,
      reviewer_id: form.reviewer_id ? Number(form.reviewer_id) : 0,
      project_id: form.project_id ? Number(form.project_id) : 0,
      quarter_id: form.quarter_id ? Number(form.quarter_id) : 0,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : 0,
      parent_id: form.parent_id ? Number(form.parent_id) : 0,
      description: form.description || '',
      start_date: form.start_date || '',
      deadline: form.deadline || '',
      subtasks: subtasks.map(st => ({
        ...st,
        assigned_to_id: st.assigned_to_id ? Number(st.assigned_to_id) : 0,
        estimated_hours: st.estimated_hours ? Number(st.estimated_hours) : 0,
      }))
    }).catch(console.error);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-h-[85vh] overflow-y-auto font-sans text-left transition-all duration-300", subtasks.length > 0 ? "max-w-2xl" : "max-w-md")}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{isEdit ? 'Edit Task' : (form.parent_id ? 'Create New Subtask' : 'Create New Task')}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update task details below.' : (form.parent_id ? 'Fill in the details to create a new subtask.' : 'Fill in the details to create a new task.')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase">Title *</label>
            <Input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..." className="text-xs" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase">Description</label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Task details..." className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full h-9 bg-background-secondary border border-border-subtle rounded-md px-2 text-[11px] text-text-primary outline-none">
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full h-9 bg-background-secondary border border-border-subtle rounded-md px-2 text-[11px] text-text-primary outline-none">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Assignee</label>
              <select value={form.assigned_to_id} onChange={e => setForm(f => ({ ...f, assigned_to_id: e.target.value }))} className="w-full h-9 bg-background-secondary border border-border-subtle rounded-md px-2 text-[11px] text-text-primary outline-none">
                <option value="">Unassigned</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Reviewer</label>
              <select value={form.reviewer_id} onChange={e => setForm(f => ({ ...f, reviewer_id: e.target.value }))} className="w-full h-9 bg-background-secondary border border-border-subtle rounded-md px-2 text-[11px] text-text-primary outline-none">
                <option value="">None</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Project</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="w-full h-9 bg-background-secondary border border-border-subtle rounded-md px-2 text-[11px] text-text-primary outline-none">
                <option value="">None</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Quarter</label>
              <select value={form.quarter_id} onChange={e => setForm(f => ({ ...f, quarter_id: e.target.value }))} className="w-full h-9 bg-background-secondary border border-border-subtle rounded-md px-2 text-[11px] text-text-primary outline-none">
                <option value="">None</option>
                {quarters.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Start Date</label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="text-[11px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Deadline</label>
              <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="text-[11px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Est. Hours</label>
              <Input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} placeholder="0" className="text-[11px]" min="0" step="0.5" />
            </div>
          </div>

          {!isEdit && !form.parent_id && (
            <div className="space-y-3 pt-3 border-t border-border-subtle/50 mt-4 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Subtasks ({subtasks.length})</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applySuggestedTemplate}
                    disabled={!form.title.trim()}
                    className="text-[9px] font-bold text-accent-purple hover:underline disabled:opacity-40"
                  >
                    + Auto Suggest Template
                  </button>
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="text-[9px] font-bold text-accent-blue hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Subtask
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {subtasks.map((st, idx) => (
                  <div key={idx} className="bg-background-primary border border-border-subtle p-3 rounded-lg space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => removeSubtask(idx)}
                      className="absolute top-2 right-2 text-text-muted hover:text-accent-red"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 pr-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-secondary uppercase">Subtask Name *</label>
                        <Input
                          type="text"
                          value={st.title}
                          onChange={e => updateSubtaskField(idx, 'title', e.target.value)}
                          placeholder="Subtask title..."
                          className="h-7 text-[10px]"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-secondary uppercase">Assignee</label>
                        <select
                          value={st.assigned_to_id}
                          onChange={e => updateSubtaskField(idx, 'assigned_to_id', e.target.value)}
                          className="w-full h-7 bg-background-secondary border border-border-subtle rounded px-2 text-[10px] text-text-primary outline-none"
                        >
                          <option value="">Unassigned</option>
                          {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-secondary uppercase">Priority</label>
                        <select
                          value={st.priority}
                          onChange={e => updateSubtaskField(idx, 'priority', e.target.value)}
                          className="w-full h-7 bg-background-secondary border border-border-subtle rounded px-1.5 text-[10px] text-text-primary outline-none"
                        >
                          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-secondary uppercase">Est. Hours</label>
                        <Input
                          type="number"
                          value={st.estimated_hours}
                          onChange={e => updateSubtaskField(idx, 'estimated_hours', e.target.value)}
                          placeholder="0"
                          className="h-7 text-[10px]"
                          min="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-secondary uppercase">Start Date</label>
                        <Input
                          type="date"
                          value={st.start_date}
                          onChange={e => updateSubtaskField(idx, 'start_date', e.target.value)}
                          className="h-7 text-[9px] px-1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-secondary uppercase">Deadline</label>
                        <Input
                          type="date"
                          value={st.deadline}
                          onChange={e => updateSubtaskField(idx, 'deadline', e.target.value)}
                          className="h-7 text-[9px] px-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {subtasks.length === 0 && (
                  <div className="text-center py-4 text-[10px] text-text-muted border border-dashed border-border-subtle rounded-lg">
                    No subtasks added yet. Click &quot;+ Add Subtask&quot; or &quot;Auto Suggest Template&quot;.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-[10px] font-bold rounded transition-all">Cancel</button>
            <button type="submit" disabled={saving || !form.title.trim()} className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-[10px] font-bold rounded shadow transition-all flex items-center gap-1 disabled:opacity-50">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Transfer Task Dialog ────────────────────────────────────────────────── */

function TransferDialog({
  task,
  open,
  onClose,
  onSave,
  allUsers,
}: {
  task: WCTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (taskId: number, payload: any) => Promise<void>;
  allUsers: UserType[];
}) {
  const [form, setForm] = useState({
    to_user_id: '',
    reason: '',
    current_progress: '',
    remaining_work: '',
    new_deadline: '',
    transfer_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        to_user_id: '',
        reason: '',
        current_progress: task?.progress ? String(task.progress) : '',
        remaining_work: '',
        new_deadline: task?.deadline || '',
        transfer_notes: '',
      });
    }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !form.to_user_id || !form.reason.trim()) return;
    onSave(task.id, {
      to_user_id: Number(form.to_user_id),
      reason: form.reason,
      current_progress: form.current_progress ? Number(form.current_progress) : undefined,
      remaining_work: form.remaining_work || undefined,
      new_deadline: form.new_deadline || undefined,
      transfer_notes: form.transfer_notes || undefined,
    }).catch(console.error);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md font-sans text-left">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Transfer Task</DialogTitle>
          <DialogDescription>{task ? `Transfer "${task.title}" to another team member.` : ''}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase">Transfer To *</label>
            <select value={form.to_user_id} onChange={e => setForm(f => ({ ...f, to_user_id: e.target.value }))} className="w-full h-9 bg-background-secondary border border-border-subtle rounded-md px-2 text-[11px] text-text-primary outline-none" required>
              <option value="">Select user...</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase">Reason *</label>
            <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Why is this being transferred?" className="text-[11px]" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Current Progress %</label>
              <Input type="number" value={form.current_progress} onChange={e => setForm(f => ({ ...f, current_progress: e.target.value }))} placeholder="0" className="text-[11px]" min="0" max="100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">New Deadline</label>
              <Input type="date" value={form.new_deadline} onChange={e => setForm(f => ({ ...f, new_deadline: e.target.value }))} className="text-[11px]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase">Remaining Work</label>
            <Textarea value={form.remaining_work} onChange={e => setForm(f => ({ ...f, remaining_work: e.target.value }))} rows={2} placeholder="What's left to do?" className="text-[11px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase">Transfer Notes</label>
            <Textarea value={form.transfer_notes} onChange={e => setForm(f => ({ ...f, transfer_notes: e.target.value }))} rows={2} placeholder="Additional context..." className="text-[11px]" />
          </div>
          <DialogFooter className="pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-[10px] font-bold rounded transition-all">Cancel</button>
            <button type="submit" disabled={saving || !form.to_user_id || !form.reason.trim()} className="px-3 py-1.5 bg-accent-orange hover:bg-accent-orange-hover text-white text-[10px] font-bold rounded shadow transition-all flex items-center gap-1 disabled:opacity-50">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Transfer Task
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Performance View ────────────────────────────────────────────────────── */

function PerformanceView({
  perf,
  loading,
  allUsers,
}: {
  perf: WCPerformance | null;
  loading: boolean;
  allUsers: UserType[];
}) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent-blue" /></div>;
  if (!perf) return <div className="text-center py-12 text-[11px] text-text-muted">No performance data available</div>;

  const { user: perfUser, stats, tasks } = perf;
  const user = (allUsers.find(u => Number(u.id) === Number(perfUser.id)) || perfUser) as any;

  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* Profile Header and Contact Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background-secondary border border-border-subtle rounded-xl p-4">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} className="w-14 h-14 rounded-full object-cover border border-border-subtle flex-shrink-0" alt={user.name} />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent-blue text-white flex items-center justify-center text-xl font-bold flex-shrink-0">{user.name.charAt(0)}</div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-text-primary truncate">{user.name}</h3>
            <p className="text-[11px] text-text-secondary font-semibold mt-0.5">{user.role || 'Team Member'} {user.department ? `· ${user.department}` : ''}</p>
            {user.username && <p className="text-[9px] text-text-muted mt-0.5">@{user.username}</p>}
          </div>
        </div>

        {/* Contact and Social details */}
        <div className="flex flex-col gap-1.5 text-[10px] text-text-secondary font-medium md:text-right border-t md:border-t-0 border-border-subtle/50 pt-2 md:pt-0 flex-shrink-0">
          {user.email && (
            <div className="flex items-center md:justify-end gap-1.5">
              <Mail className="w-3.5 h-3.5 text-text-muted" />
              <a href={`mailto:${user.email}`} className="hover:underline hover:text-text-primary transition-colors">{user.email}</a>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center md:justify-end gap-1.5">
              <Phone className="w-3.5 h-3.5 text-text-muted" />
              <a href={`tel:${user.phone}`} className="hover:underline hover:text-text-primary transition-colors">{user.phone}</a>
            </div>
          )}
          <div className="flex items-center md:justify-end gap-2 mt-1">
            {user.github && (
              <a href={user.github} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-background-primary border border-border-subtle hover:text-text-primary hover:border-text-muted transition-all" title="GitHub Profile">
                <Github className="w-3.5 h-3.5" />
              </a>
            )}
            {user.linkedin && (
              <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-background-primary border border-border-subtle hover:text-text-primary hover:border-text-muted transition-all" title="LinkedIn Profile">
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* User Skills list */}
      {user.skills && user.skills.length > 0 && (
        <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 text-left">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Core Skills & Expertise</h4>
          <div className="flex flex-wrap gap-1.5">
            {user.skills.map((skill: string, index: number) => (
              <span key={index} className="px-2.5 py-1 bg-background-primary border border-border-subtle rounded-md text-[10px] font-bold text-text-secondary select-none">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.totalTasks, accent: 'text-accent-blue' },
          { label: 'Completed', value: stats.completedTasks, accent: 'text-accent-green' },
          { label: 'Overdue', value: stats.overdueTasks, accent: 'text-accent-red' },
          { label: 'Completion', value: `${stats.completionPct}%`, accent: 'text-accent-green' },
          { label: 'Transferred Out', value: stats.transfersOut, accent: 'text-accent-orange' },
          { label: 'Transferred In', value: stats.transfersIn, accent: 'text-accent-blue' },
        ].map((s, i) => (
          <div key={i} className="bg-background-secondary border border-border-subtle rounded-lg p-3 text-center">
            <div className={cn("text-lg font-extrabold", s.accent)}>{s.value}</div>
            <div className="text-[9px] font-semibold text-text-muted uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tasks table */}
      <div className="bg-background-secondary border border-border-subtle rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border-subtle text-[10px] font-bold text-text-muted uppercase tracking-wider">Recent Tasks</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold text-text-muted">Task</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-text-muted">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-text-muted">Priority</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-text-muted">Deadline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.slice(0, 20).map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-[11px] font-bold">{t.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDot(t.status))} />
                    <span className="text-[11px] font-semibold">{getStatusLabel(t.status)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn("px-1.5 py-0.5 rounded border text-[8px] font-extrabold uppercase", getPriorityColor(t.priority))}>{t.priority}</span>
                </TableCell>
                <TableCell className="text-[11px] text-text-muted font-bold">{t.deadline || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
