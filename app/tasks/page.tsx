'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { tasksService } from '@/services/tasks';
import { projectsService } from '@/services/projects';
import { usersService } from '@/services/users';
import { Task, TaskStatus, TaskPriority, Project, UserProfile as UserType } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  ListFilter, 
  AlignLeft, 
  MessageSquare, 
  Edit, 
  Trash, 
  Calendar,
  Loader2,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'completed', 'blocked'] as const),
  priority: z.enum(['low', 'medium', 'high'] as const),
  dueDate: z.string().min(1, 'Due date is required'),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function TaskCenterPage() {
  const { tasks, addTask, updateTask, deleteTask, changeTaskStatus, setTasks, userProfile } = useStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [completeTaskOpen, setCompleteTaskOpen] = useState(false);
  const [taskExtendedTime, setTaskExtendedTime] = useState('');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [tasksData, usersData, projectsData] = await Promise.all([
          tasksService.getTasks(),
          usersService.getUsers(),
          projectsService.getProjects()
        ]);
        if (active) {
          setTasks(tasksData);
          setAvailableUsers(usersData);
          setAvailableProjects(projectsData);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load tasks');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    const onFocus = () => { if (active) loadData(); };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [setTasks]);

  const submitCompleteTask = async (extendedTimeStr: string, completionDate: string) => {
    if (!completingTaskId) return;
    try {
      const updateData: any = { status: 'completed', actual_completion_date: completionDate };
      if (extendedTimeStr && !isNaN(parseFloat(extendedTimeStr))) {
        updateData.extended_time = parseFloat(extendedTimeStr);
      }
      await tasksService.updateTask(completingTaskId, updateData);
      changeTaskStatus(completingTaskId, 'completed');
      setCompleteTaskOpen(false);
      setCompletingTaskId(null);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const getPriorityColor = (prio: TaskPriority) => {
    switch (prio) {
      case 'high': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
      case 'medium': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      default: return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'review': return 'Under Review';
      case 'done': return 'Done';
      case 'completed': return 'Completed';
      case 'blocked': return 'Blocked';
    }
  };

  // Open details
  const handleOpenDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  // Create task modal
  const handleOpenCreate = () => {
    setEditMode(false);
    reset({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  // Edit task modal
  const handleOpenEdit = (task: Task) => {
    setEditMode(true);
    setSelectedTask(task);
    reset({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeId: (task as any).assigneeId || '',
      projectId: task.projectId || '',
    });
    setModalOpen(true);
    setDetailsOpen(false);
  };

  // Handle Form Submission
  const onSubmit = async (data: TaskFormValues) => {
    try {
      const selectedProj = availableProjects.find(p => p.id === data.projectId);
      const projectName = selectedProj ? selectedProj.name : undefined;

      const selectedUser = availableUsers.find(u => u.id === data.assigneeId);
      const assignedTo = selectedUser ? {
        name: selectedUser.name,
        avatar: selectedUser.avatar
      } : {
        name: 'Unassigned',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      };

      const payload = {
        ...data,
        projectName,
        assignedTo,
      };

      if (editMode && selectedTask) {
        const updated = await tasksService.updateTask(selectedTask.id, payload as any);
        updateTask(selectedTask.id, updated);
      } else {
        const created = await tasksService.createTask(payload as any);
        addTask(created);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm font-medium">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-md mx-auto text-center">
        <AlertCircle className="w-10 h-10 text-accent-red" />
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-1">Failed to Load Tasks</h3>
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-text-primary">
      {/* Page Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background-secondary p-4 rounded-lg border border-border-subtle">
        <div>
          <h2 className="text-base font-bold font-sans">Nurofin Task Center</h2>
          <p className="text-2xs text-text-secondary mt-0.5">Manage tasks, update sprint items, and change roadmap states.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-md shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      <Tabs defaultValue="kanban">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-2">
          <TabsList>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="table">Table List View</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <span className="text-2xs text-text-secondary font-bold uppercase tracking-wider">Project Filter:</span>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="bg-background-secondary border border-border-subtle text-xs rounded-md px-3 py-1.5 text-text-primary font-medium outline-none cursor-pointer hover:border-text-muted transition-colors"
            >
              <option value="all">All Projects</option>
              <option value="general">General (No Project)</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 1. Kanban Board view tab content */}
        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {(['todo', 'in_progress', 'review', 'completed', 'blocked', 'done'] as TaskStatus[]).map((col) => {
              const colTasks = tasks.filter(t => {
                if (t.status !== col) return false;
                if (filterProjectId === 'all') return true;
                if (filterProjectId === 'general') return !t.projectId;
                return t.projectId === filterProjectId;
              });
              return (
                <div key={col} className="bg-background-secondary rounded-lg border border-border-subtle flex flex-col max-h-[80vh]">
                  {/* Column Header */}
                  <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-surface-card/20">
                    <span className="text-xs font-bold text-text-primary">{getStatusLabel(col)}</span>
                    <span className="text-2xs bg-background-primary border border-border-subtle px-2 py-0.5 rounded text-text-secondary font-bold">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Card lists */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleOpenDetails(task)}
                        className="bg-background-primary p-3 rounded-md border border-border-subtle hover:border-text-muted transition-colors cursor-pointer text-left space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-relaxed">{task.title}</h4>
                        </div>
                        
                        {(() => {
                          const projName = task.projectName || availableProjects.find(p => p.id === task.projectId)?.name;
                          if (projName) {
                            return (
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent-blue bg-accent-blue/5 border border-accent-blue/10 px-2 py-0.5 rounded w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                                {projName}
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted bg-background-secondary border border-border-subtle px-2 py-0.5 rounded w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                              General Tasks
                            </div>
                          );
                        })()}

                        <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-[10px]">
                          <span className={cn("px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase", getPriorityColor(task.priority))}>
                            {task.priority}
                          </span>
                          <span className="text-text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {task.dueDate}
                          </span>
                        </div>

                        {/* Dropdown status selector */}
                        <div 
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={task.status}
                            onChange={async (e) => {
                              const nextStatus = e.target.value as TaskStatus;
                              if (nextStatus === 'completed' || nextStatus === 'done') {
                                setCompletingTaskId(String(task.id));
                                setTaskExtendedTime('');
                                setCompleteTaskOpen(true);
                              } else {
                                try {
                                  await tasksService.updateTask(task.id, { status: nextStatus });
                                  changeTaskStatus(task.id, nextStatus);
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="bg-background-secondary border border-border-subtle text-[10px] rounded p-1 text-text-secondary outline-none cursor-pointer"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="completed">Completed</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-center py-8 text-2xs text-text-muted">No items in this column.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* 2. Table List view tab content */}
        <TabsContent value="table" className="mt-4">
          <div className="bg-background-secondary border border-border-subtle rounded-lg overflow-hidden shadow-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.filter(t => {
                  if (filterProjectId === 'all') return true;
                  if (filterProjectId === 'general') return !t.projectId;
                  return t.projectId === filterProjectId;
                }).map((task) => (
                  <TableRow 
                    key={task.id} 
                    onClick={() => handleOpenDetails(task)} 
                    className="cursor-pointer"
                  >
                    <TableCell className="font-semibold text-xs">{task.title}</TableCell>
                    <TableCell>
                      {(() => {
                        const assignee = task.assignedTo || (() => {
                          const u = availableUsers.find(usr => usr.id === (task as any).assigneeId);
                          return u ? { name: u.name, avatar: u.avatar } : null;
                        })();
                        
                        if (!assignee) return <span className="text-2xs text-text-muted">Unassigned</span>;
                        
                        return (
                          <div className="flex items-center gap-2 group">
                            <div 
                              className="w-5 h-5 rounded-full bg-cover bg-center" 
                              style={{ backgroundImage: `url(${assignee.avatar})` }}
                            />
                            <span className="text-2xs">{assignee.name}</span>
                            {(task as any).assigneeId && String((task as any).assigneeId) !== String(userProfile?.id) && (
                              <a href={`/team-chat?createDirectChat=${(task as any).assigneeId}`} onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[9px] bg-accent-blue text-white px-1.5 py-0.5 rounded-full transition" title="Message Assignee">
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-2xs text-text-secondary">
                      {task.projectName || availableProjects.find(p => p.id === task.projectId)?.name || 'General'}
                    </TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase", getPriorityColor(task.priority))}>
                        {task.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-2xs text-text-secondary">{task.dueDate}</TableCell>
                    <TableCell>
                      <span className="text-2xs font-semibold text-text-primary">
                        {getStatusLabel(task.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Details Side Modal */}
      {selectedTask && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 mt-1.5 font-sans">
                <span className={cn("px-2 py-0.5 rounded border text-[9px] font-bold uppercase", getPriorityColor(selectedTask.priority))}>
                  {selectedTask.priority} Priority
                </span>
                <span className="text-2xs bg-surface-card px-2 py-0.5 rounded border border-border-subtle">
                  {getStatusLabel(selectedTask.status)}
                </span>
                {(() => {
                  const projName = selectedTask.projectName || availableProjects.find(p => p.id === selectedTask.projectId)?.name;
                  if (projName) {
                    return (
                      <span className="text-2xs text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">
                        {projName}
                      </span>
                    );
                  }
                  return (
                    <span className="text-2xs text-text-muted bg-background-secondary px-2 py-0.5 rounded border border-border-subtle">
                      General Tasks
                    </span>
                  );
                })()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 font-sans text-xs">
              <div className="space-y-1.5">
                <span className="text-2xs text-text-secondary font-bold uppercase tracking-wider block">Description</span>
                <p className="text-text-primary leading-relaxed bg-background-primary p-3 rounded border border-border-subtle/50">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-2xs text-text-secondary font-bold uppercase tracking-wider block mb-1">Owner</span>
                  {(() => {
                    const assignee = selectedTask.assignedTo || (() => {
                      const u = availableUsers.find(usr => usr.id === (selectedTask as any).assigneeId);
                      return u ? { name: u.name, avatar: u.avatar } : null;
                    })();
                    
                    if (!assignee) return <span className="text-xs text-text-muted">Unassigned</span>;
                    
                    return (
                      <div className="flex items-center gap-2 group">
                        <div 
                          className="w-6 h-6 rounded-full bg-cover bg-center" 
                          style={{ backgroundImage: `url(${assignee.avatar})` }}
                        />
                        <span>{assignee.name}</span>
                        {(selectedTask as any).assigneeId && String((selectedTask as any).assigneeId) !== String(userProfile?.id) && (
                          <a href={`/team-chat?createDirectChat=${(selectedTask as any).assigneeId}`} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[9px] bg-accent-blue text-white px-2 py-0.5 rounded-full transition" title="Message Assignee">
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <span className="text-2xs text-text-secondary font-bold uppercase tracking-wider block mb-1">Due Date</span>
                  <span className="font-medium text-text-primary">{selectedTask.dueDate}</span>
                </div>
              </div>

              {/* Task Comment timeline */}
              <div className="space-y-2 pt-2 border-t border-border-subtle/50">
                <span className="text-2xs text-text-secondary font-bold uppercase tracking-wider block">Comments</span>
                {selectedTask.comments && selectedTask.comments.map(c => (
                  <div key={c.id} className="flex gap-3 bg-background-primary p-2.5 rounded border border-border-subtle/30">
                    <div 
                      className="w-6 h-6 rounded-full bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${c.avatar})` }}
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-text-primary">{c.author}</span>
                        <span className="text-[9px] text-text-muted">{c.time}</span>
                      </div>
                      <p className="text-text-secondary text-[11px] leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <p className="text-[11px] text-text-muted text-center py-2">No comments yet.</p>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                onClick={async () => {
                  try {
                    await tasksService.deleteTask(selectedTask.id);
                    deleteTask(selectedTask.id);
                    setDetailsOpen(false);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-3 py-1.5 bg-accent-red/10 border border-accent-red/20 text-accent-red text-2xs font-semibold rounded hover:bg-accent-red/20 transition-all flex items-center gap-1"
              >
                <Trash className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={() => handleOpenEdit(selectedTask)}
                className="px-3 py-1.5 bg-background-primary border border-border-subtle text-text-secondary hover:text-text-primary text-2xs font-semibold rounded transition-all flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" /> Edit details
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Creation / Update Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Update Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>
              Enter the parameters below to add or edit this task item.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Task Title</label>
              <Input
                type="text"
                placeholder="Review API CORS standards"
                {...register('title')}
                className={errors.title ? 'border-accent-red' : ''}
              />
              {errors.title && <span className="text-[10px] text-accent-red">{errors.title.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Description</label>
              <Textarea
                placeholder="Detail task scope and clear milestones..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Assignee</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  {...register('assigneeId')}
                >
                  <option value="">Unassigned</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Project Link</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  {...register('projectId')}
                >
                  <option value="">No Project (General)</option>
                  {availableProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Priority</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  {...register('priority')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Due Date</label>
                <Input
                  type="date"
                  {...register('dueDate')}
                  className={errors.dueDate ? 'border-accent-red' : ''}
                />
                {errors.dueDate && <span className="text-[10px] text-accent-red">{errors.dueDate.message}</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Status Column</label>
              <select
                className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                {...register('status')}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Under Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-2xs font-semibold rounded transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-2xs font-semibold rounded shadow transition-all"
              >
                {editMode ? 'Save Changes' : 'Create Task'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CompleteTaskModal
        isOpen={completeTaskOpen}
        onClose={() => {
          setCompleteTaskOpen(false);
          setCompletingTaskId(null);
        }}
        onSubmit={submitCompleteTask}
        taskExtendedTime={taskExtendedTime}
        setTaskExtendedTime={setTaskExtendedTime}
      />
    </div>
  );
}
