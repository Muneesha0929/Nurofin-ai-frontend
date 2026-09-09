'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Video,
  BellRing,
  Trash2,
  CalendarDays,
  Search,
  Users,
  Link2,
  Unlink,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Sunrise,
  Moon,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  X,
  Calendar
} from 'lucide-react';
import { meetingsService } from '@/services/meetings';
import { plannerService, PlannerUser, ScheduleEvent } from '@/services/planner';
import { tasksService } from '@/services/tasks';
import { projectsService } from '@/services/projects';
import { issuesService } from '@/services/issues';
import { useStore } from '@/store';
import { Task } from '@/types';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';

export default function PlannerPage() {
  const { userProfile } = useStore();
  const currentUserId = parseInt(userProfile.id || '0');
  const isAdmin = ['super_admin', 'ceo'].includes(userProfile.role);

  const [teammates, setTeammates] = useState<PlannerUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(currentUserId);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [teamScheduleEvents, setTeamScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [localEvents, setLocalEvents] = useState<any[]>([]);
  const [allLocalEvents, setAllLocalEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [viewTeamSchedule, setViewTeamSchedule] = useState(false);
  const [showPrevDayPopup, setShowPrevDayPopup] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('week');

  // Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStartDate, setNewEventStartDate] = useState('');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any>(null);
  const [newEventType, setNewEventType] = useState('meeting');
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isSchedulingTask, setIsSchedulingTask] = useState(false);
  const [unscheduledSlotOpen, setUnscheduledSlotOpen] = useState(false);
  const [unscheduledSlotHour, setUnscheduledSlotHour] = useState<number | null>(null);
  const [conflictData, setConflictData] = useState<{message: string, alternative_times: any[]} | null>(null);
  const [newEventParticipantIds, setNewEventParticipantIds] = useState<number[]>([]);
  const [newEventParticipants, setNewEventParticipants] = useState<number[]>([]);
  const [newEventProjectId, setNewEventProjectId] = useState<string>('none');
  const [newEventTaskId, setNewEventTaskId] = useState<string>('none');
  
  // Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  // Task Schedule Form State
  const [scheduleTaskOpen, setScheduleTaskOpen] = useState(false);
  const [taskPushOpen, setTaskPushOpen] = useState(false);
  const [taskPushDate, setTaskPushDate] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskScheduleDate, setTaskScheduleDate] = useState('');
  const [taskScheduleStartTime, setTaskScheduleStartTime] = useState('09:00');
  const [taskScheduleEndTime, setTaskScheduleEndTime] = useState('10:00');
  const [scheduleTaskConflictData, setScheduleTaskConflictData] = useState<any>(null);

  const [completeTaskOpen, setCompleteTaskOpen] = useState(false);
  const [taskExtendedTime, setTaskExtendedTime] = useState('');

  const isOwnSchedule = selectedUserId === currentUserId;

  const getWeekStart = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const getWeekEnd = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 5);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const loadTeammates = async () => {
    try {
      const data = await plannerService.getUsers();
      setTeammates(data);
    } catch (error) {
      console.error('Failed to load teammates:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await projectsService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  useEffect(() => {
    if (viewTeamSchedule && teammates.length > 0) {
      const fetchTeamSchedules = async () => {
        try {
          const start = new Date(selectedDate);
          start.setDate(start.getDate() - 30);
          const end = new Date(selectedDate);
          end.setDate(end.getDate() + 30);
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          
          const promises = teammates.map(tm => plannerService.getSchedule(tm.id, startStr, endStr));
          const results = await Promise.all(promises);
          
          let allGoogleEvents: ScheduleEvent[] = [];
          results.forEach((res, index) => {
            if (res.schedule) {
              const userGoogleEvents = res.schedule
                .filter((e: any) => e.source === 'google_calendar')
                .map((e: any) => ({ ...e, owner_id: teammates[index].id }));
              allGoogleEvents = [...allGoogleEvents, ...userGoogleEvents];
            }
          });
          setTeamScheduleEvents(allGoogleEvents);
        } catch (error) {
          console.error('Failed to load team schedules', error);
        }
      };
      fetchTeamSchedules();
    }
  }, [viewTeamSchedule, teammates, selectedDate]);

  const loadSchedule = useCallback(async () => {
    try {
      setScheduleLoading(true);
      setLoading(true);
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - 30);
      const end = new Date(selectedDate);
      end.setDate(end.getDate() + 30);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      const data = await plannerService.getSchedule(selectedUserId, startStr, endStr);
      setScheduleEvents((data.schedule || []).map((e: any) => e.source === 'google_calendar' ? { ...e, owner_id: selectedUserId } : e));

      const rawLocalData = await meetingsService.getMeetings();
      const localData = rawLocalData.map(e => ({ ...e, source: 'nurofin' }));
      setAllLocalEvents(localData);
      const filteredLocalData = localData.filter(m => 
        String(m.owner_id) === String(selectedUserId) || 
        (m.participants && m.participants.some(p => String(p.user_id) === String(selectedUserId)))
      );
      setLocalEvents(filteredLocalData);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setScheduleLoading(false);
      setLoading(false);
    }
  }, [selectedUserId, selectedDate, currentUserId]);
  
  const loadTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      const data = await tasksService.getTasks();
      setAllTasks(data);
      
      const userTasks = data.filter(t => 
        (String(t.assignedTo?.id) === String(selectedUserId) ||
        String(t.assigneeId) === String(selectedUserId)) &&
        (!t.has_subtasks) // Only show leaf tasks (tasks with no subtasks)
      );
      
      setTasks(userTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  }, [selectedUserId]);

  const handleCompleteTask = (e: React.MouseEvent, taskId: string | number) => {
    e.stopPropagation();
    setSelectedTaskId(String(taskId));
    setTaskExtendedTime('');
    setCompleteTaskOpen(true);
  };

  const submitCompleteTask = async (extendedTimeStr: string, completionDate: string) => {
    if (!selectedTaskId) return;
    try {
      const task = tasks.find(t => t.id === selectedTaskId);
      const extended_time = parseFloat(extendedTimeStr);
      
      if (task?.source === 'issue') {
        await issuesService.updateIssue(Number(selectedTaskId), { 
          status: 'resolved', 
          actual_completion_date: completionDate 
        } as any);
      } else {
        await tasksService.updateTask(selectedTaskId, {
          status: 'completed',
          extended_time: isNaN(extended_time) ? undefined : extended_time,
          actual_completion_date: completionDate,
        });
      }
      
      setCompleteTaskOpen(false);
      setSelectedTaskId(null);
      await loadTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  useEffect(() => {
    loadTeammates();
    loadProjects();
    setNewEventStartDate(new Date().toISOString().split('T')[0]);
    setNewTaskDueDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadSchedule();
      if (teammates.length > 0) {
        loadTasks();
      }
    }
  }, [selectedUserId, loadSchedule, loadTasks, teammates]);

  const [availabilityWarnings, setAvailabilityWarnings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!newEventStartDate || !newEventStartTime) {
      setConflictData(null);
      return;
    }
    const checkAvailability = async () => {
      const computedEndTime = newEventEndTime || (() => {
        try {
          const parts = newEventStartTime.split(':');
          const endH = (parseInt(parts[0]) + 1).toString().padStart(2, '0');
          return `${endH}:${parts[1] || '00'}`;
        } catch(e) {
          return newEventStartTime;
        }
      })();
      
      const idsToCheck = Array.from(new Set([selectedUserId, ...newEventParticipants]));
      let foundConflict = false;
      let allAlternatives: any[] = [];
      let conflictMessages: string[] = [];
      
      for (const id of idsToCheck) {
        try {
          const res = await fetch(`/api/v1/users/${id}/availability?date=${newEventStartDate}&start_time=${newEventStartTime}&end_time=${computedEndTime}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
            }
          });
          const json = await res.json();
          if (json.data && json.data.is_busy) {
            foundConflict = true;
            const user = teammates.find(t => t.id === id) || { full_name: id === currentUserId ? 'You' : 'Participant' };
            conflictMessages.push(`${user.full_name} is busy: ${json.data.reasons.join(', ')}`);
            if (json.data.alternative_times && json.data.alternative_times.length > 0 && allAlternatives.length === 0) {
              allAlternatives = json.data.alternative_times; // keep the first set of alternative times
            }
          }
        } catch (e) {
          console.error('Availability check failed', e);
        }
      }
      
      if (foundConflict) {
        setConflictData({
          message: `Overlap detected! ${conflictMessages.join('. ')}. Can we schedule it at another time?`,
          alternative_times: allAlternatives
        });
      } else {
        setConflictData(null);
      }
    };
    checkAvailability();
  }, [newEventStartDate, newEventStartTime, newEventEndTime, newEventParticipants, selectedUserId, teammates]);

  useEffect(() => {
    if (!taskScheduleDate || !taskScheduleStartTime) {
      setScheduleTaskConflictData(null);
      return;
    }
    const checkAvailability = async () => {
      const fallbackEnd = (() => {
        try {
          const parts = taskScheduleStartTime.split(':');
          const endH = (parseInt(parts[0]) + 1).toString().padStart(2, '0');
          return `${endH}:${parts[1] || '00'}`;
        } catch(e) {
          return taskScheduleStartTime;
        }
      })();
      let computedEndTime = taskScheduleEndTime || fallbackEnd;
      if (computedEndTime <= taskScheduleStartTime) {
        computedEndTime = fallbackEnd;
      }
      
      try {
        const excludeParam = selectedTaskId ? `&exclude_task_id=${selectedTaskId}` : '';
        const res = await fetch(`/api/v1/users/${selectedUserId}/availability?date=${taskScheduleDate}&start_time=${taskScheduleStartTime}&end_time=${computedEndTime}${excludeParam}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
          }
        });
        const json = await res.json();
        if (json.data && json.data.is_busy) {
          setScheduleTaskConflictData({
            message: `Overlap detected! You are busy: ${json.data.reasons.join(', ')}. Can we schedule it at another time?`,
            alternative_times: json.data.alternative_times || []
          });
        } else {
          setScheduleTaskConflictData(null);
        }
      } catch (e) {
        console.error('Availability check failed', e);
      }
    };
    checkAvailability();
  }, [taskScheduleDate, taskScheduleStartTime, taskScheduleEndTime, selectedUserId, selectedTaskId]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventStartDate || !newEventEndDate || !newEventStartTime || !newEventEndTime) {
      alert("Please fill in all required fields (title, start date, end date, start time, end time).");
      return;
    }
    if (conflictData) {
      alert("Please resolve the scheduling conflict by selecting an alternative time before adding the event.");
      return;
    }
    try {
      if (newEventType === 'task') {
        await tasksService.createTask({
          title: newEventTitle,
          description: '',
          status: 'in_progress',
          priority: 'medium',
          startDate: newEventStartDate,
          dueDate: newEventEndDate,
          scheduledDate: newEventStartDate,
          scheduledStartTime: newEventStartTime,
          scheduledEndTime: newEventEndTime,
          assigneeId: selectedUserId.toString(),
          projectId: newEventTaskId !== 'none' ? (allTasks.find(t => String(t.id) === newEventTaskId)?.projectId || (newEventProjectId !== 'none' ? newEventProjectId : undefined)) : (newEventProjectId !== 'none' ? newEventProjectId : undefined),
          parentId: newEventTaskId !== 'none' ? newEventTaskId : undefined
        } as any);
        loadTasks();
      } else {
        const newEvent = await meetingsService.createMeeting({
          title: newEventTitle,
          date: newEventStartDate,
          time: newEventStartTime,
          end_time: newEventEndTime,
          type: newEventType,
          participants: newEventParticipants.map(String) as any,
          project_id: newEventTaskId !== 'none' ? (allTasks.find(t => String(t.id) === newEventTaskId)?.projectId || (newEventProjectId !== 'none' ? newEventProjectId : undefined)) : (newEventProjectId !== 'none' ? newEventProjectId : undefined),
          task_id: newEventTaskId !== 'none' ? newEventTaskId : undefined
        });
        if (newEventTaskId !== 'none') {
          await tasksService.updateTask(newEventTaskId, {
            scheduledDate: newEventStartDate,
            scheduledStartTime: newEventStartTime,
            scheduledEndTime: newEventEndTime,
          });
          loadTasks();
        }
        setLocalEvents([...localEvents, { ...newEvent, source: 'nurofin' }]);
      }
      setNewEventTitle('');
      setNewEventParticipants([]);
      setNewEventOpen(false);
      loadSchedule();
    } catch (error: any) {
      if (error?.detail?.alternative_times) {
        setConflictData(error.detail);
      } else {
        console.error('Failed to create event:', error);
      }
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      await tasksService.createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        status: 'in_progress',
        priority: newTaskPriority,
        startDate: newTaskStartDate,
        dueDate: newTaskDueDate,
        assigneeId: selectedUserId.toString()
      } as any);
      
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskOpen(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  const handlePushTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !taskPushDate) return;
    try {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (!task) return;
      
      if (task.source === 'issue') {
        await issuesService.updateIssue(Number(selectedTaskId), { deadline: taskPushDate, scheduled_date: taskPushDate, pushed_to_next_day: true } as any);
      } else {
        await tasksService.updateTask(selectedTaskId, {
          dueDate: taskPushDate,
          scheduledDate: taskPushDate,
          pushed_to_next_day: true
        });
      }
      
      setTaskPushOpen(false);
      setSelectedTaskId(null);
      loadTasks();
      loadSchedule();
    } catch (error) {
      console.error('Failed to push task:', error);
    }
  };

  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !taskScheduleDate || !taskScheduleStartTime || !taskScheduleEndTime) return;
    if (scheduleTaskConflictData) {
      alert("Please resolve the scheduling conflict by selecting an alternative time before scheduling the task.");
      return;
    }
    if (isSchedulingTask) return;
    setIsSchedulingTask(true);
    try {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (!task) return;
      
      if (task.source === 'issue') {
        await issuesService.updateIssue(Number(selectedTaskId), {
          scheduled_date: taskScheduleDate,
          scheduled_start_time: taskScheduleStartTime,
          scheduled_end_time: taskScheduleEndTime
        } as any);
      } else {
        await tasksService.updateTask(selectedTaskId, {
          ...task,
          scheduledDate: taskScheduleDate,
          scheduledStartTime: taskScheduleStartTime,
          scheduledEndTime: taskScheduleEndTime
        });
      }
      
      setScheduleTaskOpen(false);
      setSelectedTaskId(null);
      loadTasks();
      loadSchedule(); // Refresh timeline events
    } catch (error) {
      console.error('Failed to schedule task:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await meetingsService.deleteMeeting(id);
      setLocalEvents(localEvents.filter(e => e.id !== id));
      loadSchedule();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/planner/google/callback`;
      const authUrl = await plannerService.getGoogleLoginUrl(redirectUri);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Google login URL:', error);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await plannerService.disconnectGoogle();
      loadTeammates();
      loadSchedule();
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error);
    }
  };

  const getMonthStart = (date: Date): string => {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    return d.toISOString().split('T')[0];
  };

  const getMonthEnd = (date: Date): string => {
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return d.toISOString().split('T')[0];
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days: Date[] = [];
    const current = new Date(startDate);
    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const formatDateStr = (date: Date): string => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const prevSelectedDateRef = useRef(selectedDate.getTime());
  const hasInitializedPopup = useRef(false);

  useEffect(() => {
    if (activeTab !== 'day' || tasks.length === 0) return;
    
    if (!hasInitializedPopup.current || prevSelectedDateRef.current !== selectedDate.getTime()) {
      hasInitializedPopup.current = true;
      prevSelectedDateRef.current = selectedDate.getTime();
      
      const selectedDateStr = formatDateStr(selectedDate);
      
      const prevDayDate = new Date(selectedDate);
      prevDayDate.setDate(prevDayDate.getDate() - 1);
      const prevDayStr = formatDateStr(prevDayDate);

      const hasOverdue = tasks.some(t => {
        if (t.status === 'completed') return false;
        const taskDateStr = t.scheduledDate || (t.dueDate ? t.dueDate.split('T')[0] : null);
        return taskDateStr && taskDateStr < selectedDateStr;
      });
      
      const hasCompletedYesterday = tasks.some(t => {
        if (t.status !== 'completed') return false;
        if (t.actual_completion_date) {
          return t.actual_completion_date.split('T')[0] === prevDayStr;
        }
        const tDate = t.scheduledDate || (t.dueDate ? t.dueDate.split('T')[0] : null);
        return tDate === prevDayStr;
      });
      
      if (hasOverdue || hasCompletedYesterday) {
        setShowPrevDayPopup(true);
      } else {
        setShowPrevDayPopup(false);
      }
    }
  }, [tasks, selectedDate, activeTab]);

  const getEventBadge = (source: string, type: string, e?: any) => {
    if (e && e.pushed_to_next_day) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (e && e.extended_time) return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (source === 'google_calendar') return 'text-[#4285F4] bg-[#4285F4]/10 border-[#4285F4]/20';
    if (source === 'nurofin_task' || type === 'task') return 'text-accent-purple bg-accent-purple/10 border-accent-purple/20';
    switch (type) {
      case 'meeting': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
      case 'event': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
      case 'reminder': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      default: return 'text-text-secondary bg-background-secondary border-border-subtle';
    }
  };

  const getEventIcon = (source: string, type: string) => {
    if (source === 'google_calendar') return <Globe className="w-3.5 h-3.5 text-[#4285F4]" />;
    if (source === 'nurofin_task' || type === 'task') return <Briefcase className="w-3.5 h-3.5 text-accent-purple" />;
    switch (type) {
      case 'meeting': return <Video className="w-3.5 h-3.5 text-accent-blue" />;
      case 'event': return <CalendarDays className="w-3.5 h-3.5 text-accent-green" />;
      case 'reminder': return <BellRing className="w-3.5 h-3.5 text-accent-orange" />;
      default: return <Clock className="w-3.5 h-3.5 text-text-secondary" />;
    }
  };

  const getSelectedUser = () => teammates.find(u => u.id === selectedUserId);

  const filteredTeammates = teammates.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const todayStr = formatDateStr(new Date());
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekDayNums = [1, 2, 3, 4, 5, 6, 0];
  const dailyHours = Array.from({ length: 24 }, (_, i) => i);
  
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    const val = `${hour.toString().padStart(2, '0')}:${min}`;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    let h = hour % 12;
    if (h === 0) h = 12;
    const label = `${h}:${min} ${ampm}`;
    return { value: val, label };
  });

  const getEventsForDate = (dateStr: string) => {
    let local = localEvents.filter(e => e.date === dateStr);
    let currentTasks = tasks;
    let currentGoogleSource = scheduleEvents;
    
    if (viewTeamSchedule) {
      local = allLocalEvents.filter(e => e.date === dateStr);
      currentTasks = allTasks;
      currentGoogleSource = teamScheduleEvents.length > 0 ? teamScheduleEvents : scheduleEvents;
    }

    const googleRaw = currentGoogleSource.filter(e => {
      if (e.source === 'google_calendar' && e.start) {
        return e.start.startsWith(dateStr);
      }
      return false;
    });

    const uniqueGoogle: any[] = [];
    const googleKeys = new Set();
    googleRaw.forEach((e: any) => {
      const key = e.id || `${e.title}-${e.start}`;
      if (!googleKeys.has(key)) {
        googleKeys.add(key);
        uniqueGoogle.push(e);
      }
    });
    
    const parentIds = new Set(allTasks.map((t: any) => t.parentId).filter(Boolean));
    
    const scheduledTasks = currentTasks
      .filter(t => {
        const isTargetUser = viewTeamSchedule || String(t.assignedTo?.id || t.assigneeId) === String(selectedUserId);
        
        let isDateMatch = false;
        if (t.status === 'completed' || t.status === 'done') {
           if (t.actual_completion_date) {
               isDateMatch = t.actual_completion_date.startsWith(dateStr);
           } else {
               isDateMatch = t.scheduledDate === dateStr || !!(!t.scheduledDate && t.dueDate && t.dueDate.startsWith(dateStr));
           }
        } else {
           isDateMatch = t.scheduledDate === dateStr || !!(!t.scheduledDate && t.dueDate && t.dueDate.startsWith(dateStr));
        }
        
        const isLeaf = !parentIds.has(t.id);
        return isTargetUser && isDateMatch && isLeaf;
      })
      .map(t => {
        let taskDate = t.scheduledDate || (t.dueDate ? t.dueDate.split('T')[0] : dateStr);
        if ((t.status === 'completed' || t.status === 'done') && t.actual_completion_date) {
            taskDate = t.actual_completion_date.split('T')[0];
        }
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          date: taskDate,
          start_time: t.scheduledStartTime,
          end_time: t.scheduledEndTime,
          assigned_to: t.assignedTo?.id || t.assigneeId,
          source: 'nurofin_task',
          type: 'task',
          priority: t.priority,
          status: t.status,
          extended_time: t.extended_time,
          pushed_to_next_day: t.pushed_to_next_day
        };
      });

    const localMapped = local.map(e => ({ ...e, source: 'nurofin' }));
    const finalLocal: any[] = [];
    localMapped.forEach(e => {
       if (e.type === 'google_event' || e.type === 'GOOGLE_EVENT') {
          const exists = uniqueGoogle.some(g => g.title?.toLowerCase().trim() === e.title?.toLowerCase().trim());
          if (!exists) {
             finalLocal.push(e);
          }
       } else {
          finalLocal.push(e);
       }
    });

    return [...finalLocal, ...uniqueGoogle, ...scheduledTasks].sort((a, b) => {
      const timeA = a.start_time || (a.start ? a.start.split('T')[1] : '00:00');
      const timeB = b.start_time || (b.start ? b.start.split('T')[1] : '00:00');
      return String(timeA).localeCompare(String(timeB));
    });
  };

  // Returns the hour (0-23) for an event, or null if it can't be determined
  const getEventHour = (e: any): number | null => {
    if (e.source === 'google_calendar' && e.start) {
      return new Date(e.start).getHours();
    }
    // Meetings from meetingsService use 'time' field; tasks use 'start_time'
    const timeStr = e.start_time || e.time;
    if (timeStr) {
      const parsed = parseInt(String(timeStr).split(':')[0]);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const getEventEndHour = (e: any): number | null => {
    if (e.source === 'google_calendar' && e.end) {
      return new Date(e.end).getHours();
    }
    if (e.end_time) {
      let parsed = parseInt(e.end_time.split(':')[0]);
      if (isNaN(parsed)) return null;
      if (e.extended_time && !isNaN(parseFloat(e.extended_time))) {
        parsed += Math.floor(parseFloat(e.extended_time));
      }
      return parsed;
    }
    return null;
  };

  const getEventTimeLabel = (e: any): string => {
    if (e.source === 'google_calendar' && e.start) {
      return new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return e.start_time || '';
  };

  const selectedUserInfo = getSelectedUser();

  const getDiffFromMonday = (currentDay: number, targetDay: number) => {
    const cur = currentDay === 0 ? 7 : currentDay;
    const target = targetDay === 0 ? 7 : targetDay;
    return target - cur;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto font-sans text-text-primary">
      {/* Teammate Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-surface-card border border-border-subtle rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-border-subtle bg-background-secondary/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-accent-blue" /> Team
            </h3>
            {selectedUserInfo?.google_connected && isOwnSchedule && (
              <button
                onClick={handleDisconnectGoogle}
                className="text-[10px] text-accent-red hover:text-accent-red/80 flex items-center gap-1"
                title="Disconnect Google Calendar"
              >
                <Unlink className="w-3 h-3" /> Disconnect
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search teammates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-background-primary/80 backdrop-blur border border-border-subtle rounded-lg pl-9 pr-3 text-xs text-text-primary focus:border-accent-blue outline-none transition-all shadow-sm focus:shadow-md"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <AnimatePresence>
            {filteredTeammates.map((user, idx) => (
              <motion.button
                key={user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setSelectedUserId(user.id)}
                className={cn(
                  "w-full p-2 flex items-center gap-3 rounded-lg text-left transition-all duration-200 border border-transparent group",
                  selectedUserId === user.id
                    ? "bg-accent-blue/10 border-accent-blue/30 shadow-sm"
                    : "hover:bg-surface-hover hover:border-border-subtle"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-accent-blue/20 flex items-center justify-center text-xs font-bold text-accent-blue flex-shrink-0 overflow-hidden shadow-sm relative">
                  {user.profile_picture ? (
                    <img 
                      src={user.profile_picture} 
                      alt={user.full_name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span className={user.profile_picture ? "hidden" : ""}>
                    {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  {user.id === currentUserId && (
                    <div className="absolute inset-0 border-2 border-accent-blue rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-semibold truncate transition-colors",
                    selectedUserId === user.id ? "text-accent-blue" : "text-text-primary group-hover:text-text-primary"
                  )}>
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-text-muted truncate capitalize">{user.role || 'Member'}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {String(user.id) !== String(userProfile?.id) && (
                    <a href={`/team-chat?createDirectChat=${user.id}`} onClick={(e) => e.stopPropagation()} className="bg-white/10 hover:bg-white/30 p-1.5 rounded-full text-text-secondary hover:text-accent-blue transition-colors group-hover:opacity-100 opacity-0" title="Direct Message">
                      <MessageCircle className="w-3 h-3" />
                    </a>
                  )}
                  {user.google_connected && (
                    <span title="Google Calendar connected" className="bg-white/10 p-1 rounded-full">
                      <Globe className="w-3 h-3 text-[#4285F4]" />
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Google Calendar Connect Button */}
        {!selectedUserInfo?.google_connected && isOwnSchedule && (
          <div className="p-4 border-t border-border-subtle bg-background-secondary/80">
            <button
              onClick={handleConnectGoogle}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Link2 className="w-3.5 h-3.5" /> Connect Google Calendar
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 relative">
        {/* Background ambient light */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
        
        {scheduleEvents.some(e => e.source === 'google_error') && (
          <div className="bg-accent-red/10 border border-accent-red/30 p-4 rounded-xl shadow-sm flex items-center gap-3 z-10 relative">
            <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-accent-red tracking-tight">Google Calendar Disconnected</h4>
              <p className="text-xs text-text-secondary mt-0.5">Your Google Calendar connection expired or was revoked. Please reconnect to sync your events.</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
          <div>
            <h2 className="text-xl font-extrabold flex items-center gap-2 text-text-primary tracking-tight">
              {selectedUserInfo?.full_name || 'Team'}&apos;s Workspace
              {isOwnSchedule && <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-2.5 py-1 rounded-full font-bold shadow-sm uppercase tracking-wider">Your Schedule</span>}
              {!isOwnSchedule && <span title="Read-only view"><Lock className="w-4 h-4 text-text-muted" /></span>}
            </h2>
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
              {selectedUserInfo?.google_connected ? <CheckCircle2 className="w-3 h-3 text-accent-green" /> : <AlertCircle className="w-3 h-3 text-text-muted" />}
              {selectedUserInfo?.google_connected
                ? "Synced with Google Calendar + Nurofin"
                : "Nurofin schedule only (Google Calendar not connected)"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'tasks' ? (
              (isAdmin || isOwnSchedule) && (
                <button 
                  onClick={() => setNewTaskOpen(!newTaskOpen)}
                  className="h-8 px-3 rounded flex items-center gap-1.5 bg-accent-purple text-white text-xs font-semibold hover:bg-accent-purple/90 transition-colors shadow-sm"
                >
                  <Briefcase className="w-4 h-4" /> Assign Task
                </button>
              )
            ) : (
              isOwnSchedule && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNewEventOpen(!newEventOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Event
                </motion.button>
              )
            )}
          </div>
        </div>

        {/* Add Event Form */}
        <AnimatePresence>
          {newEventOpen && isOwnSchedule && activeTab !== 'tasks' && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddEvent} 
              className="bg-surface-card border-b border-border-subtle p-5 grid grid-cols-1 sm:grid-cols-6 gap-4 items-start text-xs shadow-inner overflow-hidden z-0"
            >
              {conflictData && (
                <div className="sm:col-span-6 bg-accent-red/10 border border-accent-red/30 rounded-lg p-3 mb-2">
                  <div className="flex items-start gap-2 text-accent-red mb-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="font-semibold text-xs leading-relaxed">{conflictData.message}</p>
                  </div>
                  {conflictData.alternative_times && conflictData.alternative_times.length > 0 && (
                    <div className="space-y-1.5 mt-2 pl-6">
                      <p className="text-[10px] font-bold text-text-secondary uppercase">Suggested Alternative Times:</p>
                      <div className="flex flex-wrap gap-2">
                        {conflictData.alternative_times.map((alt: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewEventStartDate(alt.date);
                              setNewEventStartTime(alt.start_time);
                              setConflictData(null);
                            }}
                            className="px-2 py-1 bg-background-primary border border-border-subtle hover:border-accent-blue rounded text-xs transition-colors"
                          >
                            {alt.date} at {alt.start_time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. AWS Billing Review"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={newEventStartDate}
                  onChange={e => {
                    setNewEventStartDate(e.target.value);
                    if (!newEventEndDate || newEventEndDate < e.target.value) {
                      setNewEventEndDate(e.target.value);
                    }
                  }}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={newEventEndDate}
                  onChange={e => setNewEventEndDate(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Start Time</label>
                <select
                  value={newEventStartTime}
                  onChange={e => setNewEventStartTime(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                >
                  {timeOptions.map(opt => (
                    <option key={`ev-start-${opt.value}`} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">End Time</label>
                <select
                  value={newEventEndTime}
                  onChange={e => setNewEventEndTime(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                >
                  {timeOptions.map(opt => (
                    <option key={`ev-end-${opt.value}`} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Event Type</label>
                <select
                  value={newEventType}
                  onChange={e => setNewEventType(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                >
                  <option value="meeting">Meeting</option>
                  <option value="reminder">Reminder</option>
                  <option value="event">Event</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Project</label>
                <select
                  value={newEventProjectId}
                  onChange={e => {
                    setNewEventProjectId(e.target.value);
                    setNewEventTaskId('none');
                  }}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                >
                  <option value="none">None</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Related Task</label>
                <select
                  value={newEventTaskId}
                  onChange={e => setNewEventTaskId(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                >
                  <option value="none">None</option>
                  {allTasks.filter((t: any) => newEventProjectId === 'none' || String(t.projectId) === String(newEventProjectId)).map((t: any) => {
                    const parent = t.parentId ? allTasks.find((p: any) => p.id === t.parentId) : null;
                    const displayTitle = parent ? `${parent.title} ➔ ${t.title}` : t.title;
                    return (
                      <option key={t.id} value={t.id}>{displayTitle}</option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-6">
                <button type="button" onClick={() => setShowParticipants(!showParticipants)} className="flex items-center gap-2 text-[10px] text-text-secondary font-bold uppercase tracking-wider hover:text-text-primary transition-colors">
                  Participants (Optional)
                  {showParticipants ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <AnimatePresence>
                  {showParticipants && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-2 overflow-hidden pt-2">
                        {teammates.filter(tm => tm.id !== currentUserId).map(tm => {
                           const isSelected = newEventParticipants.includes(tm.id);
                           return (
                              <button
                                key={tm.id}
                                type="button"
                                onClick={() => {
                                   if (isSelected) {
                                      setNewEventParticipants(newEventParticipants.filter(id => id !== tm.id));
                                   } else {
                                      setNewEventParticipants([...newEventParticipants, tm.id]);
                                   }
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected ? 'bg-accent-blue text-white' : 'bg-background-secondary text-text-secondary hover:bg-surface-hover border border-border-subtle'}`}
                              >
                                 {tm.email}
                              </button>
                           )
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-2 justify-end h-10 items-center sm:col-span-6 mt-2 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => setNewEventOpen(false)}
                  className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 h-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                >
                  Save Event
                </button>
              </div>
            </motion.form>
          )}
          
          {/* Add Task Form (Admin Only) */}
          {newTaskOpen && activeTab === 'tasks' && isAdmin && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddTask} 
              className="bg-surface-card border-b border-border-subtle p-5 grid grid-cols-1 sm:grid-cols-6 gap-4 items-start text-xs shadow-inner overflow-hidden z-0"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Prepare Q3 Report"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  placeholder="Optional details..."
                  value={newTaskDescription}
                  onChange={e => setNewTaskDescription(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-purple transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-purple transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={newTaskStartDate}
                  onChange={e => {
                    setNewTaskStartDate(e.target.value);
                    if (!newTaskDueDate || newTaskDueDate < e.target.value) {
                      setNewTaskDueDate(e.target.value);
                    }
                  }}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-purple transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-purple transition-all"
                />
              </div>
              <div className="flex gap-2 justify-end h-10 items-center sm:col-span-6 mt-2 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => setNewTaskOpen(false)}
                  className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 h-10 bg-accent-purple hover:bg-accent-purple-light text-white font-bold rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" /> Assign Task
                </button>
              </div>
            </motion.form>
          )}

          {/* Unscheduled Tasks Modal */}
          {unscheduledSlotOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-xl w-full max-w-lg flex flex-col gap-5 relative z-[60]"
              >
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-accent-blue" /> Schedule Task ({unscheduledSlotHour != null ? `${unscheduledSlotHour % 12 === 0 ? 12 : unscheduledSlotHour % 12}:00 ${unscheduledSlotHour >= 12 ? 'PM' : 'AM'}` : ''})
                </h3>
                <p className="text-xs text-text-secondary">Select an unscheduled task to assign it to this time slot.</p>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {tasks.filter(t => !t.scheduledDate && t.status !== 'completed' && t.status !== 'done').length === 0 ? (
                    <div className="text-center py-6 text-text-muted text-xs italic">
                      No unscheduled tasks available.
                    </div>
                  ) : (
                    tasks.filter(t => !t.scheduledDate && t.status !== 'completed' && t.status !== 'done').map(t => (
                      <div 
                        key={t.id}
                        onClick={async () => {
                          const dateStr = formatDateStr(selectedDate);
                          const startHour = unscheduledSlotHour || 0;
                          const endHour = startHour + 1;
                          const startStr = `${startHour.toString().padStart(2, '0')}:00`;
                          const endStr = `${endHour.toString().padStart(2, '0')}:00`;
                          
                          try {
                            if (t.source === 'issue') {
                              await issuesService.updateIssue(Number(t.id), {
                                scheduled_date: dateStr,
                                scheduled_start_time: startStr,
                                scheduled_end_time: endStr
                              } as any);
                            } else {
                              await tasksService.updateTask(t.id, {
                                ...t,
                                scheduledDate: dateStr,
                                scheduledStartTime: startStr,
                                scheduledEndTime: endStr
                              });
                            }
                            setUnscheduledSlotOpen(false);
                            loadTasks();
                            loadSchedule();
                          } catch (err) {
                            console.error("Failed to quick-schedule task:", err);
                          }
                        }}
                        className="p-3 border border-border-subtle hover:border-accent-blue/50 bg-background-primary/50 hover:bg-accent-blue/5 rounded-lg cursor-pointer transition-all flex flex-col gap-1"
                      >
                        <div className="text-xs font-bold text-text-primary">{t.title}</div>
                        <div className="text-[10px] text-text-secondary flex gap-3">
                          <span className={t.priority === 'high' || t.priority === 'critical' ? 'text-accent-red font-semibold' : ''}>
                            Priority: {t.priority}
                          </span>
                          {t.is_issue && <span className="text-accent-orange font-semibold">Issue</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex gap-2 justify-end h-10 items-center mt-2 border-t border-border-subtle pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setUnscheduledSlotOpen(false);
                      setUnscheduledSlotHour(null);
                    }}
                    className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Views */}
        <div className="flex flex-col relative z-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList className="bg-surface-card p-1 rounded-lg shadow-sm border border-border-subtle self-start">
                <TabsTrigger value="day" className="rounded-md px-4 py-1.5 data-[state=active]:bg-background-primary data-[state=active]:shadow-sm transition-all text-xs font-bold">Daily</TabsTrigger>
                <TabsTrigger value="week" className="rounded-md px-4 py-1.5 data-[state=active]:bg-background-primary data-[state=active]:shadow-sm transition-all text-xs font-bold">Weekly</TabsTrigger>
                <TabsTrigger value="month" className="rounded-md px-4 py-1.5 data-[state=active]:bg-background-primary data-[state=active]:shadow-sm transition-all text-xs font-bold">Monthly</TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-md px-4 py-1.5 data-[state=active]:bg-background-primary data-[state=active]:shadow-sm transition-all text-xs font-bold flex items-center gap-1.5">
                  Tasks <span className="bg-accent-purple/20 text-accent-purple text-[9px] px-1.5 py-0.5 rounded-full leading-none">{tasks.length}</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                {activeTab === 'week' && (
                  <div className="flex items-center bg-background-secondary rounded-lg border border-border-subtle p-1 shadow-sm">
                    <button onClick={() => navigateWeek(-1)} className="p-1.5 hover:bg-surface-hover rounded-md transition-colors">
                      <ChevronLeft className="w-4 h-4 text-text-primary" />
                    </button>
                    <span className="text-xs font-bold text-text-primary min-w-[190px] text-center tracking-wide">
                      {new Date(getWeekStart(selectedDate)).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - {new Date(getWeekEnd(selectedDate)).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                    </span>
                    <button onClick={() => navigateWeek(1)} className="p-1.5 hover:bg-surface-hover rounded-md transition-colors">
                      <ChevronRight className="w-4 h-4 text-text-primary" />
                    </button>
                  </div>
                )}
                {activeTab === 'month' && (
                  <div className="flex items-center bg-background-secondary rounded-lg border border-border-subtle p-1 shadow-sm">
                    <button onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-surface-hover rounded-md transition-colors">
                      <ChevronLeft className="w-4 h-4 text-text-primary" />
                    </button>
                    <span className="text-xs font-bold text-text-primary min-w-[150px] text-center tracking-wide">
                      {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-surface-hover rounded-md transition-colors">
                      <ChevronRight className="w-4 h-4 text-text-primary" />
                    </button>
                  </div>
                )}
                {activeTab === 'day' && (
                  <div className="flex items-center gap-2 bg-background-secondary px-2 py-1 rounded-lg border border-border-subtle shadow-sm">
                    <button 
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(newDate.getDate() - 1);
                        setSelectedDate(newDate);
                      }}
                      className="p-1 hover:bg-surface-hover rounded-md transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-text-primary" />
                    </button>
                    <span className="text-sm font-extrabold text-text-primary tracking-wide px-2">
                      {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      {formatDateStr(selectedDate) === todayStr && <span className="ml-2 text-[10px] bg-accent-blue/10 text-accent-blue px-1.5 py-0.5 rounded uppercase">Today</span>}
                    </span>
                    <button 
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(newDate.getDate() + 1);
                        setSelectedDate(newDate);
                      }}
                      className="p-1 hover:bg-surface-hover rounded-md transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-text-primary" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Daily View */}
            <TabsContent value="day" className="mt-0">
              <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-md space-y-6">
                <h3 className="text-sm font-bold border-b border-border-subtle pb-4 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-accent-blue" /> Daily Timeline
                  </span>
                    <button 
                      onClick={() => setViewTeamSchedule(!viewTeamSchedule)}
                      className={`text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-md shadow-sm border transition-all ${
                        viewTeamSchedule 
                        ? 'bg-accent-blue text-white border-accent-blue hover:bg-accent-blue-hover' 
                        : 'bg-background-secondary text-text-secondary hover:bg-surface-hover border-border-subtle'
                      }`}
                    >
                      {viewTeamSchedule ? 'Viewing Team Schedule' : 'View Team Schedule'}
                    </button>
                </h3>

                {scheduleLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                    <div className="animate-spin w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full mb-4"></div>
                    <p className="text-sm font-medium animate-pulse">Loading schedule...</p>
                  </div>
                ) : (() => {
                  const currentDayStr = formatDateStr(selectedDate);
                  const todaysEvents = getEventsForDate(currentDayStr);

                  const formatAmPm = (hourNum: number) => {
                    const ampm = hourNum >= 12 ? 'PM' : 'AM';
                    let h = hourNum % 12;
                    if (h === 0) h = 12;
                    return `${h}:00 ${ampm}`;
                  };

                  const renderEventCard = (evt: any, idx: number, isCompact: boolean = false) => {
                      const isTask = evt.source === 'nurofin_task' || evt.source === 'issue' || evt.source === 'nurofin_issue';
                      
                      // Assign colors based on user id for team schedule view
                      let bgColor = 'bg-background-primary/80';
                      let borderColor = 'border-border-subtle hover:border-accent-blue/50';
                      let textColor = 'text-text-primary';
                      let userName = '';
                    
                      if (evt.source !== 'google_calendar') {
                        if (isTask) {
                          if (evt.extended_time) {
                            bgColor = isCompact ? 'bg-red-500' : 'bg-red-50';
                            borderColor = isCompact ? 'border-red-600' : 'border-red-200';
                            textColor = isCompact ? 'text-white' : 'text-red-700';
                          } else if (evt.status === 'completed' || evt.status === 'done') {
                            bgColor = isCompact ? 'bg-green-500' : 'bg-green-50';
                            borderColor = isCompact ? 'border-green-600' : 'border-green-200';
                            textColor = isCompact ? 'text-white' : 'text-green-700';
                          } else if (evt.pushed_to_next_day) {
                            bgColor = isCompact ? 'bg-orange-500' : 'bg-orange-50';
                            borderColor = isCompact ? 'border-orange-600' : 'border-orange-200';
                            textColor = isCompact ? 'text-white' : 'text-orange-700';
                          } else if (evt.status === 'in_progress') {
                            bgColor = isCompact ? 'bg-yellow-500' : 'bg-yellow-50';
                            borderColor = isCompact ? 'border-yellow-600' : 'border-yellow-200';
                            textColor = isCompact ? 'text-white' : 'text-yellow-700';
                          } else {
                            // Default task color (blue)
                            bgColor = isCompact ? 'bg-blue-500' : 'bg-blue-50';
                            borderColor = isCompact ? 'border-blue-600' : 'border-blue-200';
                            textColor = isCompact ? 'text-white' : 'text-blue-700';
                          }
                          const assignedId = evt.assigned_to;
                          if (assignedId) {
                            const user = teammates.find(t => String(t.id) === String(assignedId));
                            if (user) userName = user.full_name;
                          }
                        } else {
                          // Not a task, keep user-based colors or default
                          const assignedId = evt.owner_id;
                          if (assignedId) {
                            const user = teammates.find(t => String(t.id) === String(assignedId));
                            if (user) {
                              userName = user.full_name;
                              const colorPalettes = isCompact ? [
                                { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
                                { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white' },
                                { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white' },
                                { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white' },
                              ] : [
                                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                                { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                                { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                                { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
                              ];
                              const userIdx = teammates.findIndex(t => String(t.id) === String(assignedId));
                              const colorIdx = userIdx >= 0 ? userIdx % colorPalettes.length : 0;
                              bgColor = colorPalettes[colorIdx].bg;
                              borderColor = colorPalettes[colorIdx].border;
                              textColor = colorPalettes[colorIdx].text;
                            }
                          }
                        }
                      }

                    return (
                      <div 
                        key={idx} 
                        className={`${bgColor} ${textColor} backdrop-blur ${isCompact ? 'p-1.5' : 'p-4'} rounded-xl border ${borderColor} hover:shadow-md transition-all flex flex-col ${isCompact ? '' : 'sm:flex-row sm:items-center'} justify-between ${isCompact ? 'gap-0.5' : 'gap-4'} group ${isTask || evt.source === 'google_calendar' || evt.source === 'nurofin' ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (isTask) {
                            const fullTask = allTasks.find(t => String(t.id) === String(evt.id));
                            if (fullTask) {
                                setSelectedTaskDetails(fullTask);
                                setTaskDetailsOpen(true);
                            }
                          } else if (evt.source === 'google_calendar') {
                            const meetLink = evt.hangout_link || evt.hangoutLink;
                            const eventLink = evt.event_link || evt.htmlLink || evt.url;
                            if (meetLink) window.open(meetLink, '_blank');
                            else if (eventLink) window.open(eventLink, '_blank');
                            else window.location.href = '/meetings';
                          } else if (evt.source === 'nurofin') {
                            window.location.href = '/meetings';
                          }
                        }}
                      >
                        <div className="space-y-1">
                          <h4 className={`font-bold ${isCompact ? 'text-[10px]' : 'text-sm'} flex items-center gap-1.5 leading-tight`}>
                            {getEventIcon(evt.source, evt.type)}
                            <span className="line-clamp-2">{evt.title}</span>
                          </h4>
                          {evt.extended_time && (
                            <p className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mt-1", isCompact ? "bg-white/20 text-white" : "bg-red-500/10 text-red-500")}>
                              + {evt.extended_time}h Extended
                            </p>
                          )}
                          {evt.pushed_to_next_day && (
                            <p className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mt-1", isCompact ? "bg-white/20 text-white" : "bg-orange-500/10 text-orange-500")}>
                              Pushed to today
                            </p>
                          )}
                          {!isCompact && userName && <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">{userName}</p>}
                          {!isCompact && evt.description && <p className="text-xs opacity-70 line-clamp-1">{evt.description}</p>}
                          {(evt.start_time || evt.time) && (
                            <p className={`font-medium flex items-center gap-1 mt-1 opacity-90 ${isCompact ? 'text-[9px]' : 'text-[11px]'}`}>
                              <Clock className="w-3 h-3" />
                              {evt.start_time || evt.time} {evt.end_time ? `- ${evt.end_time}` : ''}
                            </p>
                          )}
                          {!evt.start_time && evt.source === 'google_calendar' && evt.start && evt.end && (
                            <p className={`font-medium flex items-center gap-1 mt-1 opacity-90 ${isCompact ? 'text-[9px]' : 'text-[11px]'}`}>
                              <Clock className="w-3 h-3" />
                              {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
{new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        {!isCompact && (
                          <div className="shrink-0 flex items-center gap-3">
                            <span className="text-[10px] font-bold text-text-muted bg-background-secondary/50 px-2 py-1 rounded-md uppercase tracking-wider">
                              {evt.source === 'google_calendar' ? 'Event' : evt.type}
                            </span>
                            {evt.source === 'nurofin_task' && isOwnSchedule && evt.id && evt.status !== 'completed' && (
                              <button 
                                onClick={(e) => handleCompleteTask(e, evt.id)}
                                className="p-1.5 hover:bg-accent-green/10 text-text-muted hover:text-accent-green rounded-md transition-colors"
                                title="Mark as Complete"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {evt.source === 'nurofin_task' && isOwnSchedule && evt.id && evt.status !== 'completed' && evt.status !== 'done' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(evt.id);
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  setTaskPushDate(tomorrow.toISOString().split('T')[0]);
                                  setTaskPushOpen(true);
                                }}
                                className="text-[9px] font-bold text-accent-orange bg-accent-orange/10 hover:bg-accent-orange/20 px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                              >
                                Push
                              </button>
                            )}
                            {evt.source === 'nurofin' && isOwnSchedule && evt.id && (
                              <button onClick={() => handleDeleteEvent(evt.id)} className="text-text-muted hover:text-accent-orange transition-colors bg-surface-hover p-1.5 rounded-md opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  };

                  if (viewTeamSchedule) {
                    return (
                      <div className="w-full max-h-[75vh] overflow-y-auto pb-4 relative border border-border-subtle rounded-xl">
                        <div className="w-full flex flex-col min-w-[800px]">
                          {/* Header Row */}
                          <div className="grid border-b border-border-subtle pb-2 mb-4 sticky top-0 bg-surface-card z-10 pt-4" style={{ gridTemplateColumns: `4rem repeat(${teammates.length}, minmax(0, 1fr))` }}>
                            <div className="bg-surface-card"></div>
                            {teammates.map((tm, tmIdx) => {
                               const bgColors = ['bg-blue-500 text-white', 'bg-purple-500 text-white', 'bg-orange-500 text-white', 'bg-emerald-500 text-white', 'bg-rose-500 text-white'];
                               const colorClass = bgColors[tmIdx % bgColors.length];
                               return (
                                 <div key={tm.id} className={`mx-1 p-2 rounded-lg text-center text-xs font-bold uppercase tracking-wider truncate flex flex-col items-center justify-center gap-1 ${colorClass}`}>
                                   <span>{tm.full_name.split(' ')[0]}</span>
                                   {String(tm.id) !== String(userProfile?.id) && (
                                     <a href={`/team-chat?createDirectChat=${tm.id}`} className="flex items-center gap-1 text-[9px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full transition" title="Direct Message">
                                       <MessageCircle className="w-3 h-3" /> Chat
                                     </a>
                                   )}
                                 </div>
                               );
                            })}
                          </div>
                          
                          {/* Hour Rows */}
                          {dailyHours.map((hourNum) => {
                            const hourEvents = todaysEvents.filter(e => {
                              const startH = getEventHour(e);
                              const endH = getEventEndHour(e);
                              if (startH === null) return false;
                              if (endH !== null && endH > startH) {
                                return (hourNum as number) >= startH && (hourNum as number) < endH;
                              }
                              return startH === hourNum;
                            });
                            return (
                              <div key={hourNum} className="grid border-b border-border-subtle/40 py-4 last:border-0 hover:bg-surface-hover/30 transition-colors" style={{ gridTemplateColumns: `4rem repeat(${teammates.length}, minmax(0, 1fr))` }}>
                                <div className="font-mono text-text-secondary font-bold text-sm pt-2 text-right pr-2">
                                  {formatAmPm(hourNum as number)}
                                </div>
                                {teammates.map(tm => {
                                   const tmEvents = hourEvents.filter(e => {
                                      const assignedId = e.source === 'nurofin_task' ? e.assigned_to : e.owner_id;
                                      return String(assignedId) === String(tm.id);
                                   });
                                   return (
                                     <div key={tm.id} className="px-0.5 space-y-1">
                                       {tmEvents.length > 0 ? (
                                          tmEvents.map((evt, idx) => renderEventCard(evt, idx, true))
                                       ) : (
                                          <div className="h-12 border border-dashed border-border-subtle/50 rounded-xl bg-background-secondary/10 flex items-center justify-center text-text-muted/30 text-[9px] font-medium opacity-0 hover:opacity-100 transition-opacity">Available</div>
                                       )}
                                     </div>
                                   );
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-5"
                    >
                          {dailyHours.map((hourNum) => {
                            const hourEvents = todaysEvents.filter(e => {
                              const startH = getEventHour(e);
                              const endH = getEventEndHour(e);
                              if (startH === null) return false;
                              if (endH !== null && endH > startH) {
                                return (hourNum as number) >= startH && (hourNum as number) < endH;
                              }
                              return startH === hourNum;
                            });

                            return (
                              <motion.div variants={itemVariants} key={hourNum} className="flex gap-5 items-start text-xs border-b border-border-subtle/40 pb-4 last:border-0 last:pb-0">
                                <span className="font-mono text-text-secondary font-bold text-sm w-16 pt-2">{formatAmPm(hourNum as number)}</span>
                                {hourEvents.length > 0 ? (
                                  <div className="flex-1 space-y-3">
                                    {hourEvents.map((evt, idx) => renderEventCard(evt, idx))}
                                  </div>
                                ) : (
                                  <div className="flex-1 border border-dashed border-border-subtle p-4 rounded-xl text-text-muted italic bg-background-primary/30 flex items-center justify-center opacity-50 text-xs font-medium relative group hover:opacity-100 hover:bg-surface-hover/50 transition-all">
                                    No events scheduled
                                    {isOwnSchedule && (
                                      <button 
                                        onClick={() => {
                                          setUnscheduledSlotHour(hourNum as number);
                                          setUnscheduledSlotOpen(true);
                                        }}
                                        className="absolute right-4 p-1.5 rounded-full bg-accent-blue/10 text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-blue hover:text-white"
                                        title="Schedule a task here"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                      </motion.div>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Weekly View */}
            <TabsContent value="week" className="mt-0">
              <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-md space-y-6">
                <h3 className="text-sm font-bold border-b border-border-subtle pb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-accent-blue" /> Weekly Planner
                </h3>
                <motion.div 
                  className="grid grid-cols-1 lg:grid-cols-7 gap-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                {weekDays.map((dayName, idx) => {
                  const dayNum = weekDayNums[idx];
                  const dayDate = new Date(selectedDate);
                  const currentDay = dayDate.getDay();
                  const diff = getDiffFromMonday(currentDay, dayNum);
                  dayDate.setDate(dayDate.getDate() + diff);
                  const dayStr = formatDateStr(dayDate);

                  const dayEvents = getEventsForDate(dayStr);
                  const isToday = dayStr === todayStr;

                  return (
                    <motion.div variants={itemVariants} key={dayName} className={cn(
                      "border rounded-xl flex flex-col min-h-[350px]",
                      isToday ? "border-accent-blue bg-accent-blue/5 shadow-sm" : "border-border-subtle bg-background-secondary/30"
                    )}>
                      <div className={cn(
                        "p-3 border-b text-center backdrop-blur-sm",
                        isToday ? "bg-accent-blue/10 border-accent-blue/20" : "bg-background-secondary/50 border-border-subtle"
                      )}>
                        <span className={cn("text-[11px] font-extrabold uppercase tracking-widest", isToday ? "text-accent-blue" : "text-text-secondary")}>{dayName}</span>
                        <p className={cn("text-2xl font-black mt-1", isToday ? "text-accent-blue" : "text-text-primary")}>
                          {dayDate.getDate()}
                        </p>
                      </div>
                      <div className="p-2 flex-1 space-y-2 relative">
                        {dayEvents.map((e, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={idx} 
                            className={`bg-background-primary group p-2.5 rounded-lg border border-border-subtle/80 text-left relative hover:border-accent-blue/50 hover:shadow-md transition-all cursor-pointer ${e.source === 'nurofin_task' ? 'space-y-2.5' : 'space-y-1.5'}`}
                            onClick={() => {
                              if (e.source === 'nurofin_task') {
                                const fullTask = allTasks.find(t => String(t.id) === String(e.id));
                                if (fullTask) {
                                  setSelectedTaskDetails(fullTask);
                                  setTaskDetailsOpen(true);
                                }
                              } else if (e.source === 'google_calendar') {
                                const meetLink = e.hangout_link || e.hangoutLink;
                                const eventLink = e.event_link || e.htmlLink || e.url;
                                if (meetLink) window.open(meetLink, '_blank');
                                else if (eventLink) window.open(eventLink, '_blank');
                                else window.location.href = '/meetings';
                              } else if (e.source === 'nurofin') {
                                window.location.href = '/meetings';
                              }
                            }}
                          >
                            {e.source === 'nurofin_task' ? (
                              <>
                                <h4 className="text-[10px] font-bold text-text-primary line-clamp-2 leading-tight pr-6">{e.title}</h4>
                                <div className="flex items-center justify-between mt-1.5 text-[9px]">
                                  <span className="text-text-muted flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {e.start_time || ''}
                                  </span>
                                  {isOwnSchedule && e.id && (
                                    <select
                                      value={e.status}
                                      onChange={async (ev) => {
                                        ev.stopPropagation();
                                        const nextStatus = ev.target.value;
                                        if (nextStatus === 'completed' || nextStatus === 'done') {
                                          setSelectedTaskId(String(e.id));
                                          setTaskExtendedTime('');
                                          setCompleteTaskOpen(true);
                                        } else {
                                          try {
                                            await tasksService.updateTask(e.id, { status: nextStatus as any });
                                            loadTasks();
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }
                                      }}
                                      onClick={ev => ev.stopPropagation()}
                                      className="bg-transparent text-text-secondary outline-none cursor-pointer p-0 hover:text-accent-blue max-w-[60px] truncate"
                                    >
                                      <option value="todo">To Do</option>
                                      <option value="in_progress">In Prog</option>
                                      <option value="review">Review</option>
                                      <option value="completed">Done</option>
                                      <option value="blocked">On Hold</option>
                                      <option value="done">Done</option>
                                    </select>
                                  )}
                                </div>
                                {isOwnSchedule && e.id && e.status !== 'completed' && e.status !== 'done' && (
                                  <button 
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setSelectedTaskId(e.id);
                                      const tomorrow = new Date();
                                      tomorrow.setDate(tomorrow.getDate() + 1);
                                      setTaskPushDate(tomorrow.toISOString().split('T')[0]);
                                      setTaskPushOpen(true);
                                    }}
                                    className="absolute top-1.5 right-1.5 text-[8px] font-bold text-accent-orange bg-accent-orange/10 hover:bg-accent-orange/20 px-1 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    Push
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <h4 className="text-xs font-bold text-text-primary pr-4 leading-tight">{e.title}</h4>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={cn("flex items-center gap-1 font-medium",
                                    e.source === 'google_calendar' ? 'text-[#4285F4]' : 'text-text-secondary'
                                  )}>
                                    {e.source === 'google_calendar' ? (
                                      <><Globe className="w-3 h-3" /> {e.start ? new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</>
                                    ) : (
                                      <><Clock className="w-3 h-3" /> {e.start_time || ''}</>
                                    )}
                                  </span>
                                  <span className={cn("text-[9px] uppercase font-bold border px-1.5 py-0.5 rounded shadow-sm", getEventBadge(e.source, e.type, e))}>
                                    {e.source === 'google_calendar' ? 'Google' : e.type}
                                  </span>
                                </div>
                              </>
                            )}
                            {e.source === 'nurofin' && isOwnSchedule && e.id && (
                              <button
                                onClick={() => handleDeleteEvent(e.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-orange transition-all bg-surface-hover p-1 rounded-md"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </motion.div>
                        ))}
                        {dayEvents.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[11px] text-text-muted italic font-medium opacity-50">Free</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                </motion.div>
              </div>
            </TabsContent>

            {/* Monthly View */}
            <TabsContent value="month" className="mt-0">
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-md space-y-6"
              >
                <h3 className="text-sm font-bold border-b border-border-subtle pb-4 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-accent-blue" /> Monthly Overview
                </h3>
                <div>
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-text-secondary border-b border-border-subtle pb-4 mb-4">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {getDaysInMonth(currentMonth).map((day, idx) => {
                    const dateStr = formatDateStr(day);
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday = dateStr === todayStr;
                    const dayEvents = getEventsForDate(dateStr);

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "min-h-[100px] p-2 border rounded-xl flex flex-col gap-1 text-left transition-all overflow-hidden",
                          isToday ? "border-accent-blue/50 bg-accent-blue/5 ring-1 ring-accent-blue/20 shadow-sm" : "border-border-subtle/50",
                          isCurrentMonth ? "bg-background-primary hover:bg-surface-hover/50 hover:shadow-md cursor-pointer" : "bg-background-secondary/30 opacity-40"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={cn(
                            "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm",
                            isToday ? "bg-accent-blue text-white" : "text-text-secondary bg-background-secondary"
                          )}>
                            {day.getDate()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <div key={i} className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded truncate leading-tight shadow-sm flex items-center gap-1",
                              e.source === 'google_calendar'
                                ? 'bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20'
                                : e.type === 'meeting' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                                : e.type === 'event' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                                : 'bg-accent-orange/10 text-accent-orange border border-accent-orange/20'
                            )}>
                              {e.source === 'google_calendar' ? <Globe className="w-2.5 h-2.5 flex-shrink-0" /> : null}
                              <span className="truncate">
                                {e.source === 'google_calendar'
                                  ? (e.start ? new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' : '') + e.title
                                  : (e.start_time || '') + ' ' + e.title}
                              </span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] font-bold text-text-muted text-center block mt-1 hover:text-text-primary transition-colors bg-surface-hover rounded py-0.5">+{dayEvents.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </motion.div>
            </TabsContent>
            
            {/* Tasks Tab View */}
            <TabsContent value="tasks" className="mt-0">
              <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-md space-y-6">
                <h3 className="text-sm font-bold border-b border-border-subtle pb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-accent-purple" /> Assigned Tasks
                </h3>
                
                {tasksLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin w-8 h-8 border-4 border-accent-purple border-t-transparent rounded-full"></div>
                  </div>
                ) : tasks.length > 0 ? (
                  <div className="space-y-6">
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                      {tasks.filter(t => t.status !== 'completed').map(task => (
                        <motion.button 
                          key={task.id} 
                          variants={itemVariants}
                          whileHover={{ y: -4 }}
                          onClick={() => { setSelectedTaskDetails(task); setTaskDetailsOpen(true); }}
                          className="bg-background-primary p-3 rounded-md border border-border-subtle hover:border-text-muted transition-colors cursor-pointer text-left space-y-3 relative group flex flex-col h-full w-full"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-relaxed">{task.title}</h4>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted bg-background-secondary border border-border-subtle px-2 py-0.5 rounded w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                            General Tasks
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3.5 text-xs pt-1 border-t border-border-subtle/50">
                            <span className={cn("px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase select-none tracking-wider", 
                              task.priority?.toLowerCase() === 'high' ? 'bg-accent-red/10 text-accent-red border-accent-red/20' : 
                              task.priority?.toLowerCase() === 'medium' ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/20' : 
                              task.priority?.toLowerCase() === 'low' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' : 
                              'bg-text-secondary/10 text-text-secondary border-text-secondary/20'
                            )}>
                              {task.priority || 'Medium'}
                            </span>
                            <span className="text-text-muted text-[10px] font-bold flex items-center gap-1 select-none">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" /> {task.dueDate}
                            </span>
                          </div>
                          <div 
                            className="flex items-center justify-between gap-2.5 pt-2 border-t border-border-subtle/30 mt-auto w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(task.id);
                                  setTaskScheduleDate(task.scheduledDate || formatDateStr(new Date()));
                                  setTaskScheduleStartTime(task.scheduledStartTime || '09:00');
                                  setTaskScheduleEndTime(task.scheduledEndTime || '10:00');
                                  setScheduleTaskOpen(true);
                                }}
                                className="px-2.5 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-accent-purple hover:text-accent-purple/80 transition-all flex items-center gap-1 select-none"
                                title="Schedule task"
                              >
                                {task.scheduledDate ? 'Reschedule' : 'Schedule'}
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(task.id);
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  setTaskPushDate(tomorrow.toISOString().split('T')[0]);
                                  setTaskPushOpen(true);
                                }}
                                className="px-2.5 py-1 bg-background-secondary hover:bg-surface-hover border border-border-subtle/50 text-[9px] font-bold rounded text-accent-orange hover:text-accent-orange/80 transition-all flex items-center gap-1 select-none"
                                title="Push to tomorrow"
                              >
                                Push
                              </button>
                            </div>
                            <select
                              value={task.status}
                              onChange={async (e) => {
                                const nextStatus = e.target.value;
                                if (nextStatus === 'completed' || nextStatus === 'done') {
                                  setSelectedTaskId(String(task.id));
                                  setTaskExtendedTime('');
                                  setCompleteTaskOpen(true);
                                } else {
                                  try {
                                    await tasksService.updateTask(task.id, { status: nextStatus as any });
                                    loadTasks();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="bg-background-secondary border border-border-subtle text-[10px] rounded p-1 text-text-secondary outline-none cursor-pointer font-bold"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="completed">Completed</option>
                              <option value="blocked">On Hold</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                    
                    {tasks.some(t => t.status === 'completed') && (
                      <div className="pt-6 border-t border-border-subtle">
                        <button type="button" onClick={() => setShowCompletedTasks(!showCompletedTasks)} className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                          {showCompletedTasks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          Completed Tasks
                        </button>
                        <AnimatePresence>
                          {showCompletedTasks && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {tasks.filter(t => t.status === 'completed').map(task => (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => { setSelectedTaskDetails(task); setTaskDetailsOpen(true); }}
                                    className="bg-background-secondary text-left border border-border-subtle rounded-xl p-4 opacity-75 hover:opacity-100 transition-all w-full"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-sm border bg-accent-green/10 text-accent-green border-accent-green/20">
                                        Completed
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-sm text-text-primary line-clamp-1">{task.title}</h4>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border-subtle rounded-xl bg-background-primary/50">
                    <Briefcase className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                    <p className="text-sm font-bold text-text-secondary">No tasks assigned</p>
                    <p className="text-xs text-text-muted mt-1">This user is all caught up!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    {/* Previous Day Overview Modal */}
    <AnimatePresence>
      {showPrevDayPopup && (() => {
        const selectedDateStr = formatDateStr(selectedDate);
        const isBeforeSelected = (taskDateStr: string | null) => {
          if (!taskDateStr) return false;
          return taskDateStr < selectedDateStr;
        };

        const prevPendingTasks = tasks.filter(t => {
          const tDate = t.scheduledDate || (t.dueDate ? t.dueDate.split('T')[0] : null);
          return t.status !== 'completed' && isBeforeSelected(tDate);
        });
        
        const prevDayDate = new Date(selectedDate);
        prevDayDate.setDate(prevDayDate.getDate() - 1);
        const prevDayStr = formatDateStr(prevDayDate);

        const prevCompletedTasks = tasks.filter(t => {
          if (t.status !== 'completed') return false;
          if (t.actual_completion_date) {
            return t.actual_completion_date.split('T')[0] === prevDayStr;
          }
          const tDate = t.scheduledDate || (t.dueDate ? t.dueDate.split('T')[0] : null);
          return tDate === prevDayStr;
        });
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-card border border-border-subtle rounded-xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setShowPrevDayPopup(false)}
                className="absolute top-4 right-4 p-1 rounded-md hover:bg-surface-hover text-text-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-text-primary">Yesterday&apos;s Overview</h2>
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wider">{prevDayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-orange"></span>
                    Uncompleted Tasks ({prevPendingTasks.length})
                  </h3>
                  {prevPendingTasks.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2">
                      {prevPendingTasks.map(t => (
                        <div key={t.id} className="text-xs font-medium bg-background-primary px-3 py-2 rounded-lg border border-border-subtle shadow-sm truncate">
                          {t.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted italic bg-background-secondary p-3 rounded-lg border border-dashed border-border-subtle">
                      No pending tasks! Great job yesterday.
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-green"></span>
                    Completed Tasks ({prevCompletedTasks.length})
                  </h3>
                  {prevCompletedTasks.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2">
                      {prevCompletedTasks.map(t => (
                        <div key={t.id} className="text-xs font-medium bg-background-primary px-3 py-2 rounded-lg border border-border-subtle shadow-sm truncate line-through opacity-70">
                          {t.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted italic bg-background-secondary p-3 rounded-lg border border-dashed border-border-subtle">
                      No tasks completed yesterday.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setShowPrevDayPopup(false)}
                  className="px-6 py-2 bg-accent-blue text-white text-sm font-bold rounded-lg hover:bg-accent-blue-hover transition-colors shadow-md"
                >
                  Got it, let&apos;s plan
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </AnimatePresence>

    {/* Schedule Task Modal */}
    <AnimatePresence>
        {taskPushOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-xl w-full max-w-sm flex flex-col gap-4"
            >
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-accent-orange" /> Push Task
              </h3>
              <form onSubmit={handlePushTask} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Select New Date</label>
                  <input
                    type="date"
                    required
                    value={taskPushDate}
                    onChange={e => setTaskPushDate(e.target.value)}
                    className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-orange transition-all"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => {
                      setTaskPushOpen(false);
                      setSelectedTaskId(null);
                    }}
                    className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md transition-all text-xs"
                  >
                    Push Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <CompleteTaskModal
          isOpen={completeTaskOpen}
          onClose={() => {
            setCompleteTaskOpen(false);
            setSelectedTaskId(null);
          }}
          onSubmit={submitCompleteTask}
          taskExtendedTime={taskExtendedTime}
          setTaskExtendedTime={setTaskExtendedTime}
        />

        {scheduleTaskOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-xl w-full max-w-sm flex flex-col gap-4"
            >
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-accent-purple" /> Schedule Task
              </h3>
              <form onSubmit={handleScheduleTask} className="space-y-4">
                {scheduleTaskConflictData && (
                  <div className="bg-accent-orange/10 border border-accent-orange/30 p-3 rounded-md text-xs">
                    <div className="flex items-start gap-2 text-accent-orange font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>{scheduleTaskConflictData.message}</p>
                    </div>
                    {scheduleTaskConflictData.alternative_times && scheduleTaskConflictData.alternative_times.length > 0 && (
                      <div className="mt-2.5 space-y-1.5 pl-6">
                        <p className="text-[10px] font-bold text-text-secondary uppercase">Suggested Alternatives:</p>
                        <div className="flex flex-wrap gap-2">
                          {scheduleTaskConflictData.alternative_times.map((alt: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setTaskScheduleDate(alt.date);
                                setTaskScheduleStartTime(alt.start_time);
                                setTaskScheduleEndTime(alt.end_time);
                              }}
                              className="text-[10px] bg-background-secondary border border-border-subtle hover:border-accent-purple hover:text-accent-purple px-2 py-1 rounded transition-colors"
                            >
                              {new Date(alt.date + 'T' + alt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={taskScheduleDate}
                    onChange={e => setTaskScheduleDate(e.target.value)}
                    className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Start Time</label>
                    <select
                      value={taskScheduleStartTime}
                      onChange={e => setTaskScheduleStartTime(e.target.value)}
                      className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                    >
                      {timeOptions.map(opt => (
                        <option key={`start-${opt.value}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">End Time</label>
                    <select
                      value={taskScheduleEndTime}
                      onChange={e => setTaskScheduleEndTime(e.target.value)}
                      className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-purple transition-all"
                    >
                      {timeOptions.map(opt => (
                        <option key={`end-${opt.value}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleTaskOpen(false);
                      setSelectedTaskId(null);
                    }}
                    className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all text-xs"
                  >
                    Save
                  </button>
                </div>      
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Details Modal */}
      <AnimatePresence>
        {taskDetailsOpen && selectedTaskDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-xl w-full max-w-lg flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border-subtle pb-4">
                <h3 className="text-lg font-bold text-text-primary">{selectedTaskDetails.title}</h3>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-sm border ${selectedTaskDetails.status === 'completed' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' : 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'}`}>
                  {selectedTaskDetails.status.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-sm text-text-primary">{selectedTaskDetails.description || 'No description provided.'}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Due Date</h4>
                    <p className="text-sm text-text-primary">{selectedTaskDetails.dueDate}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Priority</h4>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-sm border ${selectedTaskDetails.priority === 'high' ? 'bg-accent-red/10 text-accent-red border-accent-red/20' : selectedTaskDetails.priority === 'medium' ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/20' : 'bg-text-secondary/10 text-text-secondary border-text-secondary/20'}`}>
                      {selectedTaskDetails.priority}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => { setTaskDetailsOpen(false); setSelectedTaskDetails(null); }} className="px-6 h-10 bg-background-secondary hover:bg-surface-hover border border-border-subtle text-text-primary font-bold rounded-lg transition-all text-xs">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
