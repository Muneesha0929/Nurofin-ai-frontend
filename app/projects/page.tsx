'use client';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { projectsService } from '@/services/projects';
import { usersService } from '@/services/users';
import { workcenterService, WCTask, WCHistoryEntry, WCTransfer } from '@/services/workcenter';
import { UserProfile as User } from '@/types';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  Percent, 
  Activity, 
  Clock, 
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Plus,
  Loader2,
  Sparkles,
  CheckSquare,
  Trash,
  ChevronDown,
  ChevronRight,
  Edit3,
  ArrowRightLeft,
  History,
  X,
  Send,
  LinkIcon
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  budget: z.number().optional(),
  gitUrl: z.string().optional(),
  members: z.array(z.string()).optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const { projects, setProjects, addProject, userProfile } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'overview' | 'tasks' | 'team' | 'timeline' | 'finance' | 'activity'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isCEO = userProfile.role?.toLowerCase() === 'ceo';

  // Search and status filters for State 1
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Quick Task states
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState('medium');
  const [quickTaskDescription, setQuickTaskDescription] = useState('');
  const [quickTaskAssignee, setQuickTaskAssignee] = useState('');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskStatus, setQuickTaskStatus] = useState('in_progress');

  // Project Tasks from workcenter (Phase 3 — single source of truth)
  const [projectTasks, setProjectTasks] = useState<WCTask[]>([]);
  const [projectTasksLoading, setProjectTasksLoading] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [addSubtaskForId, setAddSubtaskForId] = useState<number | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState('medium');
  const [subtaskStartDate, setSubtaskStartDate] = useState('');
  const [subtaskDeadline, setSubtaskDeadline] = useState('');
  // Inline edit state
  const [editingWCTask, setEditingWCTask] = useState<WCTask | null>(null);
  const [editForm, setEditForm] = useState<{title: string; description: string; priority: string; status: string; deadline: string; assigned_to_id: string}>({title:'', description:'', priority:'medium', status:'in_progress', deadline:'', assigned_to_id:''});
  // Transfer state
  const [transferWCTask, setTransferWCTask] = useState<WCTask | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferReason, setTransferReason] = useState('');
  // History state
  const [historyTask, setHistoryTask] = useState<WCTask | null>(null);
  const [historyEntries, setHistoryEntries] = useState<WCHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Subtask detail card state
  const [selectedSubtask, setSelectedSubtask] = useState<WCTask | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { 
      status: 'planning', 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: '', 
      priority: 'medium',
      budget: 0,
      gitUrl: '',
      members: [] 
    }
  });

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [projectsData, usersData] = await Promise.all([
          projectsService.getProjects(),
          usersService.getUsers()
        ]);
        if (active) {
          setProjects(projectsData);
          setAvailableUsers(usersData);
          // Initially start in State 1 (Project Gallery)
          setSelectedProjectId('');
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load projects');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [setProjects]);

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      const { members, ...projectData } = data;
      if (editingProject && selectedProjectId) {
        await projectsService.updateProject(selectedProjectId, projectData);
        const refreshedProjects = await projectsService.getProjects();
        setProjects(refreshedProjects);
      } else {
        const created = await projectsService.createProject({
          ...projectData,
          progress: 0
        });
        if (members && members.length > 0) {
          for (const userId of members) {
            await projectsService.addMember(created.id, userId);
          }
          const refreshedProjects = await projectsService.getProjects();
          setProjects(refreshedProjects);
          setSelectedProjectId(created.id);
        } else {
          addProject(created);
          setSelectedProjectId(created.id);
        }
      }
      
      setModalOpen(false);
      setEditingProject(false);
      reset();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditProject = () => {
    if (!selectedProject) return;
    setEditingProject(true);
    const validStatuses = ['planning', 'active', 'completed'];
    const status = validStatuses.includes(selectedProject.status) ? selectedProject.status : 'planning';
    reset({
      name: selectedProject.name,
      description: selectedProject.description || '',
      status: status as 'planning' | 'active' | 'completed',
      startDate: selectedProject.startDate || '',
      endDate: selectedProject.endDate || '',
      priority: selectedProject.priority || 'medium',
      budget: selectedProject.budget || 0,
      gitUrl: selectedProject.gitUrl || '',
      members: [],
    });
    setModalOpen(true);
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedProjectId) return;
    try {
      await projectsService.addMember(selectedProjectId, userId);
      const data = await projectsService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedProjectId) return;
    try {
      await projectsService.removeMember(selectedProjectId, userId);
      const data = await projectsService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    setDeleting(true);
    try {
      await projectsService.deleteProject(selectedProjectId);
      const refreshed = await projectsService.getProjects();
      setProjects(refreshed);
      // Return to gallery
      setSelectedProjectId('');
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  // Load project tasks from workcenter API
  const loadProjectTasks = async (projId: string) => {
    if (!projId) return;
    setProjectTasksLoading(true);
    try {
      const res = await workcenterService.getTasks({ project_id: parseInt(projId), page_size: 200 });
      setProjectTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load project tasks:', err);
      setProjectTasks([]);
    } finally {
      setProjectTasksLoading(false);
    }
  };

  // Load tasks when entering workspace or switching to tasks tab
  useEffect(() => {
    if (selectedProjectId && activeWorkspaceTab === 'tasks') {
      loadProjectTasks(selectedProjectId);
    }
  }, [selectedProjectId, activeWorkspaceTab]);

  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !quickTaskTitle.trim()) return;
    try {
      await workcenterService.createTask({
        title: quickTaskTitle,
        description: quickTaskDescription || undefined,
        priority: quickTaskPriority,
        deadline: quickTaskDueDate || undefined,
        assigned_to_id: quickTaskAssignee ? parseInt(quickTaskAssignee) : undefined,
        project_id: parseInt(selectedProjectId),
      });
      setQuickTaskTitle('');
      setQuickTaskPriority('medium');
      setQuickTaskDescription('');
      setQuickTaskAssignee('');
      setQuickTaskDueDate('');
      setQuickTaskStatus('todo');
      setQuickTaskOpen(false);
      await loadProjectTasks(selectedProjectId);
      const refreshed = await projectsService.getProjects();
      setProjects(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubtask = async (parentId: number) => {
    if (!subtaskTitle.trim() || !selectedProjectId) return;
    try {
      await workcenterService.createTask({
        title: subtaskTitle,
        parent_id: parentId,
        project_id: parseInt(selectedProjectId),
        assigned_to_id: subtaskAssigneeId ? parseInt(subtaskAssigneeId) : undefined,
        description: subtaskDescription || undefined,
        priority: subtaskPriority || undefined,
        start_date: subtaskStartDate || undefined,
        deadline: subtaskDeadline || undefined,
      });
      setSubtaskTitle('');
      setSubtaskDescription('');
      setSubtaskAssigneeId('');
      setSubtaskPriority('medium');
      setSubtaskStartDate('');
      setSubtaskDeadline('');
      setAddSubtaskForId(null);
      await loadProjectTasks(selectedProjectId);
      const refreshed = await projectsService.getProjects();
      setProjects(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  const [blockingTaskInfo, setBlockingTaskInfo] = useState<{ id: number; status: string } | null>(null);
  const [completeTaskOpen, setCompleteTaskOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [taskExtendedTime, setTaskExtendedTime] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const handleConfirmBlock = async () => {
    if (!blockingTaskInfo) return;
    try {
      await workcenterService.updateStatus(blockingTaskInfo.id, blockingTaskInfo.status, blockReason);
      const taskId = blockingTaskInfo.id;
      setBlockingTaskInfo(null);
      setBlockReason('');
      await loadProjectTasks(selectedProjectId);
      const refreshed = await projectsService.getProjects();
      setProjects(refreshed);
      if (selectedSubtask && selectedSubtask.id === taskId) {
        const updated = await workcenterService.getTask(taskId);
        setSelectedSubtask(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWCStatusChange = async (taskId: number, newStatus: string) => {
    if (newStatus === 'blocked') {
      setBlockingTaskInfo({ id: taskId, status: newStatus });
      setBlockReason('');
      return;
    }
    if (newStatus === 'completed') {
      setCompletingTaskId(taskId);
      setTaskExtendedTime('');
      setCompleteTaskOpen(true);
      return;
    }
    if (false) {
      setBlockingTaskInfo({ id: taskId, status: newStatus });
      setBlockReason('');
      return;
    }
    try {
      await workcenterService.updateStatus(taskId, newStatus);
      await loadProjectTasks(selectedProjectId);
      const refreshed = await projectsService.getProjects();
      setProjects(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWCDeleteTask = async (taskId: number) => {
    if (!confirm('Delete this task?')) return;
    try {
      await workcenterService.deleteTask(taskId);
      await loadProjectTasks(selectedProjectId);
      const refreshed = await projectsService.getProjects();
      setProjects(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWCEditSave = async () => {
    if (!editingWCTask) return;
    const taskId = editingWCTask.id;
    // Close instantly!
    setEditingWCTask(null);
    try {
      await workcenterService.updateTask(taskId, {
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        priority: editForm.priority || undefined,
        status: editForm.status || undefined,
        deadline: editForm.deadline || undefined,
        assigned_to_id: editForm.assigned_to_id ? parseInt(editForm.assigned_to_id) : undefined,
      });
      await loadProjectTasks(selectedProjectId);
      const refreshed = await projectsService.getProjects();
      setProjects(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWCTransfer = async () => {
    if (!transferWCTask || !transferTo) return;
    const taskId = transferWCTask.id;
    // Close instantly!
    setTransferWCTask(null);
    setTransferTo('');
    setTransferReason('');
    try {
      await workcenterService.transferTask(taskId, {
        to_user_id: parseInt(transferTo),
        reason: transferReason || 'Transferred from Projects',
      });
      await loadProjectTasks(selectedProjectId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewHistory = async (task: WCTask) => {
    setHistoryTask(task);
    setHistoryLoading(true);
    try {
      const entries = await workcenterService.getHistory(task.id);
      setHistoryEntries(entries);
    } catch { setHistoryEntries([]); }
    finally { setHistoryLoading(false); }
  };

  const toggleExpand = (taskId: number) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const [gitCommits, setGitCommits] = useState<any[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  useEffect(() => {
    if (!selectedProject || !selectedProject.gitUrl) {
      setGitCommits([]);
      return;
    }

    const parseGithubUrl = (url: string) => {
      if (!url) return null;
      let cleanUrl = url.trim();
      if (cleanUrl.endsWith('.git')) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.length - 4);
      }
      
      const httpsMatch = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (httpsMatch) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
      }
      
      const sshMatch = cleanUrl.match(/git@github\.com:([^\/]+)\/([^\/]+)/);
      if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
      }
      
      return null;
    };

    const parsed = parseGithubUrl(selectedProject.gitUrl);
    if (!parsed) {
      setGitCommits([
        { hash: 'local', author: 'System', branch: 'main', msg: 'Local repository URL: ' + selectedProject.gitUrl, time: 'Now' }
      ]);
      return;
    }

    const { owner, repo } = parsed;

    let active = true;
    async function fetchCommits() {
      try {
        setLoadingCommits(true);
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`);
        if (!res.ok) throw new Error('Failed to fetch github commits');
        const data = await res.json();
        if (active) {
          const formatted = data.map((c: any) => {
            const dateStr = c.commit.author?.date || c.commit.committer?.date;
            let timeAgo = 'recently';
            if (dateStr) {
              const diffMs = new Date().getTime() - new Date(dateStr).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);
              if (diffDays > 0) {
                timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
              } else if (diffHours > 0) {
                timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
              } else if (diffMins > 0) {
                timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
              } else {
                timeAgo = 'just now';
              }
            }
            return {
              hash: c.sha.substring(0, 7),
              author: c.commit.author?.name || 'Unknown',
              branch: 'main',
              msg: c.commit.message?.split('\n')[0] || '',
              time: timeAgo
            };
          });
          setGitCommits(formatted);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setGitCommits([
            { hash: 'error', author: 'System', branch: 'main', msg: 'Failed to fetch commits from GitHub. Verify it is public.', time: 'Now' }
          ]);
        }
      } finally {
        if (active) {
          setLoadingCommits(false);
        }
      }
    }

    fetchCommits();
    return () => {
      active = false;
    };
  }, [selectedProject]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
      case 'planning': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      case 'completed': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
      default: return 'text-accent-red bg-accent-red/10 border-accent-red/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
      case 'high': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      case 'medium': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
      default: return 'text-text-muted bg-surface-card border-border-subtle/50';
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm font-medium">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-md mx-auto text-center">
        <AlertCircle className="w-10 h-10 text-accent-red" />
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-1">Failed to Load Projects</h3>
          <p className="text-xs text-text-muted leading-relaxed">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-md shadow transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto font-sans text-text-primary">
        {!selectedProject ? (
          /* ─── STATE 1: Project Gallery ─────────────────────────────────────── */
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background-secondary p-4 rounded-xl border border-border-subtle">
              <div>
                <h2 className="text-base font-bold font-sans">Projects & Initiatives</h2>
                <p className="text-2xs text-text-secondary mt-0.5">Select a project to enter its dedicated workspace or create a new one.</p>
              </div>
              <button
                onClick={() => { setEditingProject(false); reset(); setModalOpen(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background-secondary p-3 rounded-xl border border-border-subtle">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background-primary border border-border-subtle text-xs rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent-blue transition-colors max-w-xs w-full font-medium"
              />
              <div className="flex items-center gap-2">
                <span className="text-2xs text-text-secondary font-bold uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-background-primary border border-border-subtle text-xs rounded-lg px-3 py-2 text-text-primary font-bold outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="planning">📋 Planning</option>
                  <option value="active">⚡ Active</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div className="bg-background-secondary p-8 rounded-xl border border-border-subtle text-center text-text-muted italic font-medium">
                No projects match your search/filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProjects.map(proj => {
                  const taskCount = (proj.tasks || []).length;
                  const memberCount = proj.members.length;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setActiveWorkspaceTab('overview');
                      }}
                      className="group bg-surface-card border border-border-subtle hover:border-accent-blue/40 rounded-2xl p-5 flex flex-col justify-between h-56 cursor-pointer transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-md text-left relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-extrabold text-text-primary group-hover:text-accent-blue transition-colors line-clamp-1">
                            {proj.name}
                          </h3>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border", getStatusColor(proj.status))} style={{ height: 'fit-content' }}>
                            {proj.status}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 min-h-[32px]">
                          {proj.description || 'No description provided.'}
                        </p>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-text-secondary font-bold">
                            <span>Progress</span>
                            <span className="text-accent-blue">{Math.round(proj.progress || 0)}%</span>
                          </div>
                          <div className="h-1.5 bg-background-primary rounded-full overflow-hidden border border-border-subtle/30 shadow-inner">
                            <div 
                              className="h-full bg-accent-blue rounded-full transition-all duration-500" 
                              style={{ width: `${proj.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 pt-3 border-t border-border-subtle/50 flex items-center justify-between text-2xs text-text-secondary font-semibold">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-text-muted" /> {memberCount}</span>
                          <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5 text-text-muted" /> {taskCount}</span>
                        </div>
                        <span className="text-text-muted font-bold text-[10px]">{proj.endDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ─── STATE 2: Project Workspace ─────────────────────────────────────── */
          <div className="space-y-6 text-left">
            <button
              onClick={() => setSelectedProjectId('')}
              className="text-xs font-bold text-accent-blue hover:underline flex items-center gap-1"
            >
              ← Back to Projects
            </button>

            {/* Project Hero Header */}
            <div className="bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/50 pb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[9px] uppercase font-black tracking-wider border px-2.5 py-0.5 rounded-md", getStatusColor(selectedProject.status))}>
                      {selectedProject.status}
                    </span>
                    <span className={cn("text-[9px] uppercase font-black tracking-wider border px-2.5 py-0.5 rounded-md", getPriorityColor(selectedProject.priority || 'medium'))}>
                      {selectedProject.priority || 'medium'} Priority
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-text-primary tracking-tight mt-2">{selectedProject.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {isCEO && (
                    <>
                      <button
                        onClick={handleOpenEditProject}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-2xs font-extrabold rounded-lg hover:bg-accent-blue/20 transition-all uppercase tracking-wider"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Project
                      </button>
                      <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-red/10 border border-accent-red/20 text-accent-red text-2xs font-extrabold rounded-lg hover:bg-accent-red/20 transition-all uppercase tracking-wider"
                      >
                        <Trash className="w-3.5 h-3.5" /> Delete Project
                      </button>
                    </>
                  )}
                  <span className="text-xs font-black text-accent-blue bg-accent-blue/10 px-3.5 py-1.5 rounded-lg border border-accent-blue/20 shadow-inner">
                    {Math.round(selectedProject.progress || 0)}% Complete
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 relative z-10">
                <div className="space-y-1 md:col-span-2">
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Objectives & Scope</h4>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium">{selectedProject.description || 'No description provided.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-text-muted uppercase tracking-wider block font-bold">Start Date</span>
                    <span className="text-xs font-extrabold text-text-primary mt-1 block">{selectedProject.startDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-muted uppercase tracking-wider block font-bold">Target Release</span>
                    <span className="text-xs font-extrabold text-text-primary mt-1 block">{selectedProject.endDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-border-subtle text-xs font-bold text-text-secondary uppercase tracking-wider select-none bg-surface-card px-4 py-1.5 rounded-xl border">
              {([
                { key: 'overview', label: 'Overview' },
                { key: 'tasks', label: 'Tasks' },
                { key: 'team', label: 'Team' },
                { key: 'timeline', label: 'Timeline' },
                { key: 'finance', label: 'Finance' },
                { key: 'activity', label: 'Activity' },
              ] as const).map(tab => {
                const isActive = activeWorkspaceTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveWorkspaceTab(tab.key)}
                    className={cn(
                      "px-4 py-2 border-b-2 transition-all relative font-bold",
                      isActive 
                        ? "border-accent-blue text-accent-blue" 
                        : "border-transparent text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content panels */}
            <div className="space-y-6">
              {/* Overview Tab */}
              {activeWorkspaceTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="md:col-span-2 bg-surface-card p-6 rounded-2xl border border-border-subtle space-y-4">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Project Health</h3>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-2xs text-text-secondary font-bold">
                        <span>Milestone progress</span>
                        <span>{Math.round(selectedProject.progress || 0)}%</span>
                      </div>
                      <div className="h-2.5 bg-background-primary rounded-full overflow-hidden border border-border-subtle/50 shadow-inner">
                        <div 
                          className="h-full bg-accent-blue rounded-full transition-all duration-500" 
                          style={{ width: `${selectedProject.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                      <div className="bg-background-primary p-4 rounded-xl border border-border-subtle/40 shadow-sm">
                        <span className="text-[10px] text-text-secondary uppercase font-bold block mb-1">Members</span>
                        <span className="text-xl font-black text-text-primary">{selectedProject.members.length}</span>
                      </div>
                      <div className="bg-background-primary p-4 rounded-xl border border-border-subtle/40 shadow-sm">
                        <span className="text-[10px] text-text-secondary uppercase font-bold block mb-1">Tasks</span>
                        <span className="text-xl font-black text-text-primary">{(selectedProject.tasks || []).length}</span>
                      </div>
                      <div className="bg-background-primary p-4 rounded-xl border border-border-subtle/40 shadow-sm">
                        <span className="text-[10px] text-text-secondary uppercase font-bold block mb-1">Completed</span>
                        <span className="text-xl font-black text-accent-green">{(selectedProject.tasks || []).filter(t => t.status === 'done' || t.status === 'completed').length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-card p-6 rounded-2xl border border-border-subtle space-y-4">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Repository Link</h3>
                    {selectedProject.gitUrl ? (
                      <div className="space-y-2">
                        <p className="text-xs text-text-primary font-mono truncate bg-background-primary p-3 rounded-lg border border-border-subtle/50">
                          {selectedProject.gitUrl}
                        </p>
                        <span className="text-[9px] text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20 inline-block font-mono uppercase font-bold">
                          Connected
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="repo-link-input"
                          placeholder="https://github.com/..."
                          className="flex-1 text-xs font-mono bg-background-primary border border-border-subtle text-text-primary rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-all duration-200"
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById('repo-link-input') as HTMLInputElement;
                            const val = input?.value?.trim();
                            if (!val || !selectedProject) return;
                            try {
                              await projectsService.updateProject(selectedProject.id, { gitUrl: val });
                              const refreshed = await projectsService.getProjects();
                              setProjects(refreshed);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="px-3 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1"
                        >
                          <LinkIcon className="w-3.5 h-3.5" /> Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tasks Tab — powered by workcenter API (single source of truth) */}
              {activeWorkspaceTab === 'tasks' && (
                <div className="bg-surface-card p-6 rounded-2xl border border-border-subtle space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle/50">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                      Task Center — Project View ({projectTasks.length})
                    </h3>
                    <button
                      onClick={() => setQuickTaskOpen(!quickTaskOpen)}
                      className="text-2xs text-accent-blue hover:underline font-extrabold uppercase tracking-wider"
                    >
                      {quickTaskOpen ? 'Hide Form' : '+ Add Main Task'}
                    </button>
                  </div>

                  {/* Quick create main task form */}
                  {quickTaskOpen && (
                    <form onSubmit={handleQuickTaskSubmit} className="p-4 bg-background-primary rounded-xl border border-border-subtle space-y-3 shadow-inner max-w-lg">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Task Title</label>
                        <input type="text" placeholder="Main task title..." value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} className="w-full bg-background-secondary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue transition-colors" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Description</label>
                        <textarea placeholder="Detail task scope..." value={quickTaskDescription} onChange={(e) => setQuickTaskDescription(e.target.value)} rows={2} className="w-full bg-background-secondary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue transition-colors" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Assignee</label>
                          <select value={quickTaskAssignee} onChange={(e) => setQuickTaskAssignee(e.target.value)} className="w-full h-8 bg-background-secondary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue transition-colors cursor-pointer font-medium">
                            <option value="">Unassigned</option>
                            {availableUsers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Priority</label>
                          <select value={quickTaskPriority} onChange={(e) => setQuickTaskPriority(e.target.value)} className="w-full h-8 bg-background-secondary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue transition-colors cursor-pointer font-medium">
                            <option value="low">🟢 Low</option>
                            <option value="medium">🔵 Medium</option>
                            <option value="high">🔴 High</option>
                            <option value="critical">🔴 Critical</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Deadline</label>
                          <input type="date" value={quickTaskDueDate} onChange={(e) => setQuickTaskDueDate(e.target.value)} className="w-full h-8 bg-background-secondary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue transition-colors cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Status</label>
                          <select value={quickTaskStatus} onChange={(e) => setQuickTaskStatus(e.target.value)} className="w-full h-8 bg-background-secondary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue transition-colors cursor-pointer font-medium">
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Done</option>
                            <option value="blocked">On Hold</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-accent-blue hover:bg-accent-blue-hover text-white py-2 px-2.5 rounded font-bold text-xs transition-colors mt-2">Create Main Task</button>
                    </form>
                  )}

                  {/* Task Hierarchy List */}
                  {projectTasksLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-text-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Loading tasks...</span>
                    </div>
                  ) : projectTasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-text-muted">No tasks assigned to this project yet. Create one above.</div>
                  ) : (
                    <div className="space-y-3">
                      <GroupedTaskFeed
                        tasks={projectTasks}
                        onSelectTask={async (t) => {
                          try {
                            const full = await workcenterService.getTask(t.id);
                            setSelectedSubtask(full);
                          } catch {
                            setSelectedSubtask({
                              ...t,
                              description: null,
                              priority: 'medium',
                              deadline: null,
                              start_date: null,
                              estimated_hours: null,
                              progress: 0,
                              assigned_to_avatar: null,
                              assigned_by_id: null,
                              assigned_by_name: null,
                              reviewer_id: null,
                              reviewer_name: null,
                              project_id: null,
                              project_name: null,
                              parent_id: t.parent_id || null,
                              quarter_id: null,
                              meeting_id: null,
                              subtasks: [],
                              created_at: null,
                            } as WCTask);
                          }
                        }}
                        onStatusChange={handleWCStatusChange}
                        onAddTaskInStatus={(status) => {
                          setQuickTaskStatus(status);
                          setQuickTaskOpen(true);
                        }}
                        onEditTask={(task) => {
                          setEditingWCTask(task);
                          setEditForm({
                            title: task.title,
                            description: task.description || '',
                            priority: task.priority,
                            status: task.status,
                            deadline: task.deadline || '',
                            assigned_to_id: task.assigned_to_id ? String(task.assigned_to_id) : '',
                          });
                        }}
                        onDeleteTask={handleWCDeleteTask}
                        onTransferTask={(task) => {
                          setTransferWCTask(task);
                          setTransferTo('');
                          setTransferReason('');
                        }}
                        onViewHistory={handleViewHistory}
                        onAddSubtask={(id) => {
                          setAddSubtaskForId(id);
                          setSubtaskTitle('');
                          setSubtaskDescription('');
                          setSubtaskAssigneeId('');
                          setSubtaskPriority('medium');
                          setSubtaskStartDate('');
                          setSubtaskDeadline('');
                        }}
                        addSubtaskForId={addSubtaskForId}
                        setAddSubtaskForId={setAddSubtaskForId}
                        subtaskTitle={subtaskTitle}
                        setSubtaskTitle={setSubtaskTitle}
                        subtaskDescription={subtaskDescription}
                        setSubtaskDescription={setSubtaskDescription}
                        subtaskAssigneeId={subtaskAssigneeId}
                        setSubtaskAssigneeId={setSubtaskAssigneeId}
                        handleAddSubtaskSubmit={handleAddSubtask}
                        users={availableUsers}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Subtask Detail Card Dialog */}
              {selectedSubtask && (
                <Dialog open={!!selectedSubtask} onOpenChange={() => setSelectedSubtask(null)}>
                  <DialogContent className="max-w-lg bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl p-0 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-accent-blue/10 to-transparent p-5 border-b border-border-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-accent-blue" />
                          <span className="text-[9px] uppercase font-black tracking-widest text-accent-blue">Subtask Detail</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn("text-[8px] uppercase font-black tracking-wider px-2 py-1 rounded-full border",
                            selectedSubtask.status === 'completed' || selectedSubtask.status === 'done' ? 'text-accent-green bg-accent-green/10 border-accent-green/20' :
                            selectedSubtask.status === 'in_progress' ? 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' :
                            selectedSubtask.status === 'review' ? 'text-accent-orange bg-accent-orange/10 border-accent-orange/20' :
                            selectedSubtask.status === 'blocked' ? 'text-accent-red bg-accent-red/10 border-accent-red/20' :
                            'text-text-muted bg-surface-card border-border-subtle'
                          )}>{selectedSubtask.status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <h3 className="text-sm font-extrabold text-text-primary mt-3">{selectedSubtask.title}</h3>
                      {selectedSubtask.description && <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{selectedSubtask.description}</p>}
                    </div>

                    {/* Details Grid */}
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Assigned To</span>
                          <p className="text-xs font-semibold text-text-primary">{selectedSubtask.assigned_to_name || 'Unassigned'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Priority</span>
                          <p className="text-xs font-semibold text-text-primary capitalize">{selectedSubtask.priority || 'medium'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Deadline</span>
                          <p className="text-xs font-semibold text-text-primary">{selectedSubtask.deadline || 'No deadline'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Progress</span>
                          <p className="text-xs font-extrabold text-accent-blue">{Math.round(selectedSubtask.progress || 0)}%</p>
                        </div>
                      </div>

                      {/* Status Change */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Change Status</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {['in_progress', 'completed', 'blocked'].map(s => (
                            <button
                              key={s}
                              onClick={async () => {
                                await handleWCStatusChange(selectedSubtask.id, s);
                                const updated = await workcenterService.getTask(selectedSubtask.id);
                                setSelectedSubtask(updated);
                              }}
                              className={cn(
                                "px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all capitalize",
                                selectedSubtask.status === s
                                  ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                                  : 'bg-background-primary text-text-secondary border-border-subtle hover:border-text-muted'
                              )}
                            >
                              {s === 'completed' ? 'Done' : s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                        <button
                          onClick={() => {
                            const st = selectedSubtask;
                            setSelectedSubtask(null);
                            setEditingWCTask(st);
                            setEditForm({ title: st.title, description: st.description || '', priority: st.priority, status: st.status, deadline: st.deadline || '', assigned_to_id: st.assigned_to_id ? String(st.assigned_to_id) : '' });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-background-primary border border-border-subtle rounded-lg text-xs font-bold text-text-secondary hover:text-accent-blue hover:border-accent-blue/30 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            const st = selectedSubtask;
                            setSelectedSubtask(null);
                            setTransferWCTask(st);
                            setTransferTo('');
                            setTransferReason('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-background-primary border border-border-subtle rounded-lg text-xs font-bold text-text-secondary hover:text-accent-orange hover:border-accent-orange/30 transition-all"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                        </button>
                        <button
                          onClick={() => {
                            const st = selectedSubtask;
                            setSelectedSubtask(null);
                            handleViewHistory(st);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-background-primary border border-border-subtle rounded-lg text-xs font-bold text-text-secondary hover:text-accent-green hover:border-accent-green/30 transition-all"
                        >
                          <History className="w-3.5 h-3.5" /> History
                        </button>
                        <button
                          onClick={() => {
                            const id = selectedSubtask.id;
                            setSelectedSubtask(null);
                            handleWCDeleteTask(id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-background-primary border border-accent-red/20 rounded-lg text-xs font-bold text-accent-red hover:bg-accent-red/5 transition-all ml-auto"
                        >
                          <Trash className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Edit Task Dialog */}
              {editingWCTask && (
                <Dialog open={!!editingWCTask} onOpenChange={() => setEditingWCTask(null)}>
                  <DialogContent className="max-w-md bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl p-6">
                    <DialogHeader><DialogTitle className="text-sm font-extrabold">Edit Task</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2 text-xs">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Title</label><input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-background-primary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Description</label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={2} className="w-full bg-background-primary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Priority</label><select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer font-medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer font-medium"><option value="in_progress">In Progress</option><option value="completed">Done</option><option value="blocked">On Hold</option></select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Deadline</label><input type="date" value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Assignee</label><select value={editForm.assigned_to_id} onChange={e => setEditForm({...editForm, assigned_to_id: e.target.value})} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer font-medium"><option value="">Unassigned</option>{availableUsers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}</select></div>
                      </div>
                    </div>
                    <DialogFooter className="pt-3 flex gap-2 justify-end">
                      <button onClick={() => setEditingWCTask(null)} className="px-3 py-1.5 border border-border-subtle text-text-secondary text-xs font-semibold rounded-lg hover:bg-surface-hover transition-all">Cancel</button>
                      <button onClick={handleWCEditSave} className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-lg shadow transition-all">Save Changes</button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Add Subtask Dialog */}
              {addSubtaskForId && (
                <Dialog open={!!addSubtaskForId} onOpenChange={() => setAddSubtaskForId(null)}>
                  <DialogContent className="max-w-md bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl p-6">
                    <DialogHeader><DialogTitle className="text-sm font-extrabold">Add New Subtask</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2 text-xs">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Title *</label><input type="text" value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)} className="w-full bg-background-primary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue" placeholder="Subtask title..." required /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Description</label><textarea value={subtaskDescription} onChange={e => setSubtaskDescription(e.target.value)} rows={2} className="w-full bg-background-primary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue" placeholder="Subtask description..." /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Priority</label>
                          <select value={subtaskPriority} onChange={e => setSubtaskPriority(e.target.value)} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer font-medium">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Assignee</label>
                          <select value={subtaskAssigneeId} onChange={e => setSubtaskAssigneeId(e.target.value)} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer font-medium">
                            <option value="">Unassigned</option>
                            {availableUsers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Start Date</label>
                          <input type="date" value={subtaskStartDate} onChange={e => setSubtaskStartDate(e.target.value)} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Deadline</label>
                          <input type="date" value={subtaskDeadline} onChange={e => setSubtaskDeadline(e.target.value)} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="pt-3 flex gap-2 justify-end">
                      <button onClick={() => setAddSubtaskForId(null)} className="px-3 py-1.5 border border-border-subtle text-text-secondary text-xs font-semibold rounded-lg hover:bg-surface-hover transition-all">Cancel</button>
                      <button onClick={() => handleAddSubtask(addSubtaskForId!)} disabled={!subtaskTitle.trim()} className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-lg shadow transition-all disabled:opacity-50">Add Subtask</button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Transfer Task Dialog */}
              {transferWCTask && (
                <Dialog open={!!transferWCTask} onOpenChange={() => setTransferWCTask(null)}>
                  <DialogContent className="max-w-sm bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl p-6">
                    <DialogHeader><DialogTitle className="text-sm font-extrabold flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-accent-orange" /> Transfer Task</DialogTitle></DialogHeader>
                    <p className="text-xs text-text-secondary">Transferring: <strong>{transferWCTask.title}</strong></p>
                    <div className="space-y-3 pt-2 text-xs">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Transfer To</label><select value={transferTo} onChange={e => setTransferTo(e.target.value)} className="w-full h-8 bg-background-primary border border-border-subtle rounded px-2 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer font-medium"><option value="">Select user...</option>{availableUsers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}</select></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary uppercase">Reason</label><textarea value={transferReason} onChange={e => setTransferReason(e.target.value)} rows={2} placeholder="Why is this task being transferred?" className="w-full bg-background-primary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue" /></div>
                    </div>
                    <DialogFooter className="pt-3 flex gap-2 justify-end">
                      <button onClick={() => setTransferWCTask(null)} className="px-3 py-1.5 border border-border-subtle text-text-secondary text-xs font-semibold rounded-lg hover:bg-surface-hover transition-all">Cancel</button>
                      <button onClick={handleWCTransfer} disabled={!transferTo} className="px-3 py-1.5 bg-accent-orange hover:bg-orange-500 text-white text-xs font-semibold rounded-lg shadow transition-all disabled:opacity-50">Transfer</button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* History Dialog */}
              {historyTask && (
                <Dialog open={!!historyTask} onOpenChange={() => setHistoryTask(null)}>
                  <DialogContent className="max-w-md bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl p-6 max-h-[70vh] overflow-hidden flex flex-col">
                    <DialogHeader><DialogTitle className="text-sm font-extrabold flex items-center gap-2"><History className="w-4 h-4 text-accent-green" /> Task History</DialogTitle></DialogHeader>
                    <p className="text-xs text-text-secondary">History for: <strong>{historyTask.title}</strong></p>
                    <div className="flex-1 overflow-y-auto space-y-3 pt-2">
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-text-muted" /></div>
                      ) : historyEntries.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-6">No history entries found.</p>
                      ) : (
                        historyEntries.map(entry => (
                          <div key={entry.id} className="flex items-start gap-3 text-xs border-b border-border-subtle/30 pb-3 last:border-b-0">
                            <div className="w-2 h-2 rounded-full bg-accent-blue mt-1.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-text-primary font-medium">{entry.description || entry.action}</p>
                              <div className="flex items-center gap-2 text-[10px] text-text-muted mt-1">
                                {entry.user_name && <span className="font-semibold">{entry.user_name}</span>}
                                {entry.created_at && <span>{new Date(entry.created_at).toLocaleString()}</span>}
                              </div>
                              {entry.old_value && entry.new_value && (
                                <p className="text-[10px] text-text-muted mt-0.5"><span className="line-through">{entry.old_value}</span> → <span className="text-accent-blue font-bold">{entry.new_value}</span></p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

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
          await loadProjectTasks(selectedProjectId);
          const refreshed = await projectsService.getProjects();
          setProjects(refreshed);
          if (selectedSubtask && selectedSubtask.id === completingTaskId) {
            const updated = await workcenterService.getTask(completingTaskId);
            setSelectedSubtask(updated);
          }
        }}
      />

      <Dialog open={!!blockingTaskInfo} onOpenChange={() => setBlockingTaskInfo(null)}>
                <DialogContent className="max-w-sm bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl p-5 font-sans">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-extrabold flex items-center gap-1 text-accent-red">
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
                      className="min-h-[80px] text-xs bg-background-primary border border-border-subtle"
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
                      className="px-3 py-1.5 bg-accent-red hover:bg-accent-red/90 text-white rounded font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Block Task
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Team Tab */}
              {activeWorkspaceTab === 'team' && (
                <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-sm text-left">
                  <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                    <h3 className="text-xs font-bold flex items-center gap-2 text-text-secondary uppercase tracking-wider">
                      Team Members ({selectedProject.members.length})
                    </h3>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddMember(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-2xs bg-background-primary border border-border-subtle rounded-lg px-2 py-1 outline-none text-text-secondary cursor-pointer font-bold"
                    >
                      <option value="">+ Add Member</option>
                      {availableUsers
                        .filter(user => !selectedProject.members.some(m => m.id === user.id.toString()))
                        .map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {selectedProject.members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between bg-background-primary p-3 rounded-xl border border-border-subtle/30 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full bg-cover bg-center border border-border-subtle"
                            style={{ backgroundImage: `url(${member.avatar})` }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-extrabold text-text-primary">{member.name}</span>
                            <span className="text-[10px] text-text-muted font-bold mt-0.5">{member.role}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-[10px] text-accent-red hover:text-red-400 font-extrabold uppercase tracking-wider"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {selectedProject.members.length === 0 && (
                      <div className="text-center py-6 text-xs text-text-muted col-span-2">No team members assigned yet.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline Tab */}
              {activeWorkspaceTab === 'timeline' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="md:col-span-2 bg-surface-card p-6 rounded-2xl border border-border-subtle space-y-6">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Project Timeline</h3>
                    <div className="relative pl-6 border-l border-border-subtle/80 space-y-6">
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-accent-blue border-4 border-background-primary shadow-sm" />
                        <div className="space-y-1">
                          <span className="text-[9px] bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded font-black border border-accent-blue/20 uppercase tracking-widest">Start</span>
                          <h4 className="text-xs font-extrabold text-text-primary mt-1">Project Commenced</h4>
                          <p className="text-2xs text-text-secondary font-medium">{selectedProject.startDate}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-accent-orange border-4 border-background-primary shadow-sm" />
                        <div className="space-y-1">
                          <span className="text-[9px] bg-accent-orange/10 text-accent-orange px-2 py-0.5 rounded font-black border border-accent-orange/20 uppercase tracking-widest">Milestone</span>
                          <h4 className="text-xs font-extrabold text-text-primary mt-1">Midpoint Execution</h4>
                          <p className="text-2xs text-text-secondary font-medium">Sprint cycles ongoing</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-accent-green border-4 border-background-primary shadow-sm" />
                        <div className="space-y-1">
                          <span className="text-[9px] bg-accent-green/10 text-accent-green px-2 py-0.5 rounded font-black border border-accent-green/20 uppercase tracking-widest">End</span>
                          <h4 className="text-xs font-extrabold text-text-primary mt-1">Target Release Date</h4>
                          <p className="text-2xs text-text-secondary font-medium">{selectedProject.endDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-card p-6 rounded-2xl border border-border-subtle space-y-4">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Git Repository</h3>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Connect https://github.com/..." 
                        defaultValue={selectedProject.gitUrl || ''}
                        onBlur={async (e) => {
                          const val = e.target.value;
                          if (val !== selectedProject.gitUrl) {
                            try {
                              await projectsService.updateProject(selectedProject.id, { gitUrl: val });
                              const refreshed = await projectsService.getProjects();
                              setProjects(refreshed);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="text-xs bg-background-primary border border-border-subtle rounded-lg px-3 py-2 outline-none text-text-primary w-full focus:border-accent-blue transition-colors"
                      />
                      <p className="text-[10px] text-text-muted font-medium leading-relaxed">Provide a GitHub repository link to sync commits history.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Finance Tab */}
              {activeWorkspaceTab === 'finance' && (
                <div className="bg-surface-card p-6 rounded-2xl border border-border-subtle space-y-6 text-left max-w-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle/50">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Project Financials</h3>
                    <span className={cn(
                      "text-[9px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-md border",
                      (selectedProject.spending || 0) <= (selectedProject.budget || 0) 
                        ? "text-accent-green bg-accent-green/10 border-accent-green/20" 
                        : "text-accent-red bg-accent-red/10 border-accent-red/20"
                    )}>
                      {(selectedProject.spending || 0) <= (selectedProject.budget || 0) ? 'On Budget' : 'Over Budget'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-2xs text-text-secondary">
                    <div className="bg-background-primary p-4 rounded-xl border border-border-subtle/40">
                      <span>Allocated Budget</span>
                      <span className="block font-black text-text-primary text-base mt-1">₹{(selectedProject.budget || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-background-primary p-4 rounded-xl border border-border-subtle/40">
                      <span>Total Spending</span>
                      <span className="block font-black text-text-primary text-base mt-1">₹{(selectedProject.spending || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <div className="flex justify-between text-[10px] text-text-secondary font-bold">
                      <span>Budget Burn Rate</span>
                      <span>{selectedProject.budget ? Math.round(((selectedProject.spending || 0) / selectedProject.budget) * 100) : 0}%</span>
                    </div>
                    <div className="h-2.5 bg-background-primary rounded-full overflow-hidden border border-border-subtle/30 shadow-inner">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          (selectedProject.spending || 0) <= (selectedProject.budget || 0) ? 'bg-accent-green' : 'bg-accent-red'
                        )}
                        style={{ width: `${Math.min(selectedProject.budget ? ((selectedProject.spending || 0) / selectedProject.budget) * 100 : 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-border-subtle/30 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Edit Budget:</span>
                      <input 
                        type="number" 
                        defaultValue={selectedProject.budget || 0}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val !== selectedProject.budget) {
                            try {
                              await projectsService.updateProject(selectedProject.id, { budget: val });
                              const refreshed = await projectsService.getProjects();
                              setProjects(refreshed);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="w-24 bg-background-primary border border-border-subtle rounded-lg px-2.5 py-1 text-xs text-text-primary font-bold focus:border-accent-blue outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Edit Spending:</span>
                      <input 
                        type="number" 
                        defaultValue={selectedProject.spending || 0}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val !== selectedProject.spending) {
                            try {
                              await projectsService.updateProject(selectedProject.id, { spending: val });
                              const refreshed = await projectsService.getProjects();
                              setProjects(refreshed);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="w-24 bg-background-primary border border-border-subtle rounded-lg px-2.5 py-1 text-xs text-text-primary font-bold focus:border-accent-blue outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeWorkspaceTab === 'activity' && (
                <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-sm text-left">
                  <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-accent-orange" /> Git Commits & Project Activity
                    </h3>
                    {selectedProject.gitUrl && (
                      <span className="text-[9px] text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20 inline-block font-mono uppercase font-bold">
                        Connected
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                    {selectedProject.gitUrl ? (
                      loadingCommits ? (
                        <p className="text-xs text-text-muted">Loading commits from GitHub...</p>
                      ) : gitCommits.length > 0 ? (
                        gitCommits.map((commit, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-xs font-mono border-b border-border-subtle/30 pb-3 last:border-b-0 last:pb-0">
                            <span className="text-[9px] bg-background-primary border border-border-subtle rounded-lg px-2 py-0.5 text-text-muted font-bold">
                              {commit.hash}
                            </span>
                            <div className="flex-1 space-y-1 min-w-0">
                              <p className="text-text-primary text-[11px] font-sans truncate font-medium">
                                {commit.msg}
                              </p>
                              <div className="flex items-center gap-2 text-[9px] text-text-muted font-semibold">
                                <span className="text-accent-blue">{commit.author}</span>
                                <span>•</span>
                                <span className="text-accent-orange">[{commit.branch}]</span>
                                <span>•</span>
                                <span>{commit.time}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-text-muted">No commits found.</p>
                      )
                    ) : (
                      <p className="text-xs text-text-muted italic leading-relaxed">No repository connected. To view commits here, link a repository in the Timeline tab.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add New Project Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl p-6 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent" />
          
          <DialogHeader className="pb-2 border-b border-border-subtle/30">
            <DialogTitle className="text-lg font-extrabold tracking-wide text-text-primary flex items-center gap-2">
              {editingProject ? <Edit3 className="w-5 h-5 text-accent-blue" /> : <Sparkles className="w-5 h-5 text-accent-blue animate-pulse" />}
              <span>{editingProject ? 'Edit Project' : 'Create New Project'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted">
              {editingProject ? 'Update the parameters and details for this project.' : 'Establish the parameters, timeline, and team roster for the initiative.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Project Name</label>
              <Input
                type="text"
                placeholder="e.g. Project Delta"
                {...register('name')}
                className={cn(
                  "bg-background-primary border-border-subtle text-text-primary placeholder-text-muted focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:border-accent-blue transition-all duration-200",
                  errors.name ? 'border-accent-red focus-visible:ring-accent-red/20 focus-visible:border-accent-red' : ''
                )}
              />
              {errors.name && <span className="text-[10px] text-accent-red font-medium">{errors.name.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Description</label>
              <Textarea
                placeholder="Provide high-level project goals, deliverables, and scope..."
                rows={3}
                {...register('description')}
                className="bg-background-primary border-border-subtle text-text-primary placeholder-text-muted focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:border-accent-blue transition-all duration-200 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Status</label>
                <select
                  className="w-full h-10 bg-background-primary border border-border-subtle text-text-primary rounded-md px-3 text-xs outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-all duration-200 cursor-pointer font-semibold"
                  {...register('status')}
                >
                  <option value="planning">📋 Planning</option>
                  <option value="active">⚡ Active</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Priority</label>
                <select
                  className="w-full h-10 bg-background-primary border border-border-subtle text-text-primary rounded-md px-3 text-xs outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-all duration-200 cursor-pointer font-semibold"
                  {...register('priority')}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Start Date</label>
                <Input
                  type="date"
                  {...register('startDate')}
                  className={cn(
                    "bg-background-primary border-border-subtle text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:border-accent-blue transition-all duration-200",
                    errors.startDate ? 'border-accent-red focus-visible:ring-accent-red/20 focus-visible:border-accent-red' : ''
                  )}
                />
                {errors.startDate && <span className="text-[10px] text-accent-red font-medium">{errors.startDate.message}</span>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">End Date</label>
                <Input
                  type="date"
                  {...register('endDate')}
                  className={cn(
                    "bg-background-primary border-border-subtle text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:border-accent-blue transition-all duration-200",
                    errors.endDate ? 'border-accent-red focus-visible:ring-accent-red/20 focus-visible:border-accent-red' : ''
                  )}
                />
                {errors.endDate && <span className="text-[10px] text-accent-red font-medium">{errors.endDate.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Initial Budget (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  {...register('budget', { valueAsNumber: true })}
                  className="bg-background-primary border-border-subtle text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:border-accent-blue transition-all duration-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Initial Git Repo URL</label>
                <Input
                  type="text"
                  placeholder="https://github.com/..."
                  {...register('gitUrl')}
                  className="bg-background-primary border-border-subtle text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:border-accent-blue transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Initial Team Members</label>
              <div className="h-28 overflow-y-auto bg-background-primary border border-border-subtle rounded-lg p-2.5 space-y-2 max-h-[140px]">
                {availableUsers.map(user => {
                  const selectedMembers = watch('members') || [];
                  const isChecked = selectedMembers.includes(user.id.toString());
                  return (
                    <label 
                      key={user.id} 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all duration-200",
                        isChecked 
                          ? "border-accent-blue bg-accent-blue/5 shadow-[0_2px_8px_rgba(59,130,246,0.08)]" 
                          : "border-border-subtle bg-background-secondary hover:bg-background-secondary/80"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="w-6 h-6 rounded-full bg-cover bg-center border border-border-subtle flex-shrink-0"
                          style={{ backgroundImage: `url(${user.avatar})` }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-text-primary truncate">{user.name}</span>
                          <span className="text-[9px] text-text-muted truncate">{user.role}</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        value={user.id} 
                        {...register('members')}
                        className="rounded border-border-subtle text-accent-blue focus:ring-accent-blue w-4 h-4 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border-subtle/30 flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setModalOpen(false); setEditingProject(false); reset(); }}
                className="px-4 py-2 border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold rounded-lg hover:bg-surface-hover transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-accent-blue to-indigo-600 hover:from-accent-blue-hover hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
              >
                {editingProject ? (
                  <span>Save Changes</span>
                ) : (
                  <>
                    <span>Create Project</span>
                    <Sparkles className="w-3.5 h-3.5 text-white/90 animate-pulse" />
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Trash className="w-4 h-4 text-accent-red" /> Delete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedProject?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold rounded transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProject}
              disabled={deleting}
              className="px-3 py-1.5 bg-accent-red hover:bg-red-600 text-white text-xs font-semibold rounded shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
              Delete Project
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Grouped Task Feed for Projects ─── */
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

function RecursiveSubtaskList({ subtasks, onSelectTask, onStatusChange, onEditTask, onDeleteTask, depth = 1 }: any) {
  if (!subtasks || subtasks.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-1.5 w-full">
      {subtasks.map((st: any) => {
        const isCompleted = st.status === 'completed' || st.status === 'done';
        const hasChildren = st.subtasks && st.subtasks.length > 0;
        return (
          <div key={st.id} className="w-full">
            <div 
              onClick={e => {
                e.stopPropagation();
                onSelectTask(st);
              }}
              className="p-2 bg-background-secondary/50 border border-border-subtle/40 rounded-lg hover:bg-surface-hover/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-[11px] mb-1.5"
              style={{ marginLeft: `${(depth - 1) * 20}px` }}
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
                  {st.transfer_date && st.transfer_to_name ? (
                    <div className="flex flex-col min-w-0" title={`Transferred to ${st.transfer_to_name} on ${st.transfer_date}`}>
                      <span className="text-accent-blue text-[9px] bg-accent-blue/5 border border-accent-blue/10 px-1.5 py-0.5 rounded-md inline-block max-w-max truncate">
                        {st.transfer_date}
                      </span>
                      <span className="text-[9px] text-text-muted truncate mt-0.5">
                        to {st.transfer_to_name.split(' ')[0]}
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
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
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
              </div>
            </div>
            
            {hasChildren && (
              <RecursiveSubtaskList 
                subtasks={st.subtasks}
                onSelectTask={onSelectTask}
                onStatusChange={onStatusChange}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GroupedTaskFeed({
  tasks,
  onSelectTask,
  onStatusChange,
  onAddTaskInStatus,
  onEditTask,
  onDeleteTask,
  onTransferTask,
  onViewHistory,
  onAddSubtask,
  addSubtaskForId,
  setAddSubtaskForId,
  subtaskTitle,
  setSubtaskTitle,
  subtaskDescription,
  setSubtaskDescription,
  subtaskAssigneeId,
  setSubtaskAssigneeId,
  handleAddSubtaskSubmit,
  users,
}: {
  tasks: WCTask[];
  onSelectTask: (t: any) => void;
  onStatusChange: (id: number, status: string) => void;
  onAddTaskInStatus?: (status: string) => void;
  onEditTask?: (t: WCTask) => void;
  onDeleteTask?: (id: number) => void;
  onTransferTask?: (t: WCTask) => void;
  onViewHistory?: (t: WCTask) => void;
  onAddSubtask?: (id: number) => void;
  addSubtaskForId?: number | null;
  setAddSubtaskForId?: (id: number | null) => void;
  subtaskTitle?: string;
  setSubtaskTitle?: (title: string) => void;
  subtaskDescription?: string;
  setSubtaskDescription?: (desc: string) => void;
  subtaskAssigneeId?: string;
  setSubtaskAssigneeId?: (id: string) => void;
  handleAddSubtaskSubmit?: (parentId: number) => void;
  users?: { id: number | string; name: string }[];
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

  const getPriorityColorLocal = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
      case 'high': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      case 'medium': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
      default: return 'text-text-muted bg-surface-card border-border-subtle/50';
    }
  };

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
          <div key={col.key} className="bg-background-secondary border border-border-subtle rounded-xl overflow-hidden transition-all shadow-sm">
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
              <div className="divide-y divide-border-subtle/50 bg-background-primary overflow-x-auto">
                {/* Column Headers Row */}
                {colTasks.length > 0 && (
                  <div className="hidden lg:flex items-center p-3.5 bg-background-secondary/40 border-b border-border-subtle text-[10px] font-extrabold text-text-muted uppercase tracking-wider select-none gap-4 min-w-[1020px]">
                    <div className="flex-1 min-w-[120px] pr-4">Task & Project</div>
                    <div className="w-20 flex-shrink-0">Start Date</div>
                    <div className="w-20 flex-shrink-0">End Date</div>
                    <div className="w-20 flex-shrink-0">Overdue Days</div>
                    <div className="w-20 flex-shrink-0">Assignee</div>
                    <div className="w-24 flex-shrink-0">Transferred Info</div>
                    <div className="w-24 flex-shrink-0">Subtasks Progress</div>
                    <div className="w-14 flex-shrink-0">Priority</div>
                    <div className="w-24 flex-shrink-0">View Control</div>
                    <div className="w-24 flex-shrink-0">Quick Add</div>
                    <div className="w-24 flex-shrink-0">Status</div>
                    <div className="w-16 flex-shrink-0 text-right pr-2">Actions</div>
                  </div>
                )}
                {colTasks.map((task, idx) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isOverdue = task.deadline && task.deadline < today && task.status !== 'completed' && task.status !== 'done';
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                  const isTaskExpanded = !!expandedTasks[task.id];
                  const completedSubtasks = task.subtasks ? task.subtasks.filter(s => s.status === 'completed' || s.status === 'done').length : 0;
                  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

                  return (
                    <div 
                      key={task.id} 
                      onClick={() => onSelectTask(task)}
                      className="p-3.5 hover:bg-surface-hover/30 transition-all cursor-pointer text-left space-y-3 relative group"
                    >
                      {/* Main Task Metadata Row */}
                      {/* Desktop Aligned Row */}
                      <div className="hidden lg:flex items-center w-full gap-4 min-w-[1020px]">
                        {/* 1. Title & Project */}
                        <div className="flex-1 min-w-[120px] pr-4">
                          <h4 className="text-xs font-bold text-text-primary hover:text-accent-blue transition-colors leading-normal truncate">
                            {idx + 1}. {task.title}
                          </h4>
                        </div>

                        {/* 2. Start Date */}
                        <div className="w-20 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                          {task.start_date ? task.start_date : '—'}
                        </div>

                        {/* 3. End Date */}
                        <div className="w-20 flex-shrink-0 text-[10px] font-bold text-text-secondary">
                          {task.deadline ? task.deadline : '—'}
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
                        <div className="w-24 flex-shrink-0">
                          {task.assigned_to_name ? (
                            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assigned_to_name}`}>
                              {task.assigned_to_avatar ? (
                                <img src={task.assigned_to_avatar} className="w-5 h-5 rounded-full object-cover border border-border-subtle flex-shrink-0" alt={task.assigned_to_name} />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{task.assigned_to_name.charAt(0)}</div>
                              )}
                              <span className="text-[10px] text-text-secondary max-w-[70px] truncate">{task.assigned_to_name.split(' ')[0]}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-text-muted font-bold select-none border border-dashed px-1.5 py-0.5 rounded">Unassigned</span>
                          )}
                        </div>

                        {/* 6. Transferred Info */}
                        <div className="w-32 flex-shrink-0 text-[10px] text-text-secondary font-bold truncate">
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
                          <span className={cn("px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase select-none tracking-wider", getPriorityColorLocal(task.priority))}>
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
                          {onAddSubtask && (
                            <button
                              onClick={() => onAddSubtask(task.id)}
                              className="px-2 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-text-secondary hover:text-text-primary transition-all flex items-center gap-1 select-none w-full justify-center"
                            >
                              <Plus className="w-3.5 h-3.5 text-text-muted" /> Add
                            </button>
                          )}
                        </div>

                        {/* 11. Status Select */}
                        <div className="w-24 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <select
                            value={task.status === 'done' ? 'completed' : task.status}
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
                        </div>

                        {/* Middle metadata bar */}
                        <div className="flex flex-wrap items-center gap-3.5 text-xs">
                          {/* Priority Badge */}
                          <span className={cn("px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase select-none tracking-wider", getPriorityColorLocal(task.priority))}>
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

                            {onAddSubtask && (
                              <button
                                onClick={() => onAddSubtask(task.id)}
                                className="px-2.5 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-text-secondary hover:text-text-primary transition-all flex items-center gap-1 select-none"
                              >
                                <Plus className="w-3.5 h-3.5 text-text-muted" /> Subtask
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <select
                              value={task.status === 'done' ? 'completed' : task.status}
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
                            <RecursiveSubtaskList 
                              subtasks={task.subtasks}
                              onSelectTask={onSelectTask}
                              onStatusChange={onStatusChange}
                              onEditTask={onEditTask}
                              onDeleteTask={onDeleteTask}
                              depth={1}
                            />
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
