'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Video, 
  MoreVertical, 
  Calendar, 
  Hash, 
  CornerDownRight, 
  User, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Sparkles,
  CalendarCheck,
  Flame,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask, workcenterService } from '@/services/workcenter';
import { meetingsService } from '@/services/meetings';
import { Meeting, Project } from '@/types';
import { today, isoDay } from './Widgets';
import { QuickAddTaskInput, TeammateUser } from './QuickAddTaskInput';

interface MyDayViewProps {
  allTasks?: (WCTask | any)[];
  tasks: WCTask[];
  meetings: Meeting[];
  currentUserId: string;
  currentUserName: string;
  isDirector: boolean;
  projects: Project[];
  teammates: TeammateUser[];
  onOpenTaskPanel: (t: WCTask) => void;
  onRefresh: () => void;
  onOpenMeetingModal: () => void;
  onCompleteTask: (taskId: number) => void;
  prefillAssignee?: TeammateUser | null;
}

export function MyDayView({
  allTasks,
  tasks,
  meetings,
  currentUserId,
  currentUserName,
  isDirector,
  projects,
  teammates,
  onOpenTaskPanel,
  onRefresh,
  onOpenMeetingModal,
  onCompleteTask,
  prefillAssignee
}: MyDayViewProps) {
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<number | null>(null);
  const [activeMenuMeetingId, setActiveMenuMeetingId] = useState<string | null>(null);
  const [rescheduleTaskId, setRescheduleTaskId] = useState<number | null>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<number>>(new Set());

  const now = today();

  // Filter today's meetings:
  // Show if date == today AND (isDirector OR user is owner OR user is in attendees/participants)
  const todaysMeetings = meetings.filter(m => {
    if (m.date !== now) return false;
    if (isDirector) return true;
    if (String(m.owner_id) === String(currentUserId)) return true;
    if (m.participants?.some(p => String(p.user_id) === String(currentUserId))) return true;
    if (m.attendees?.includes(currentUserName)) return true;
    return false;
  }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Filter today's tasks:
  // Deadline or scheduled date is today, and assigned to current user (or isDirector viewing own)
  const todaysTasks = tasks.filter(t => {
    const isMine = String(t.assigned_to_id) === String(currentUserId);
    const dateToCheck = (t.scheduled_date || t.deadline || '')?.slice(0, 10);
    const isToday = dateToCheck === now;
    return isMine && isToday;
  });

  const activeTasks = todaysTasks.filter(t => t.status !== 'completed' && t.status !== 'done');
  const completedTasks = todaysTasks.filter(t => t.status === 'completed' || t.status === 'done');

  const totalCount = todaysTasks.length + todaysMeetings.length;
  const doneCount = completedTasks.length + todaysMeetings.filter(m => m.status === 'completed').length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Handle Meeting RSVP (Accept / Decline)
  const handleAcceptMeeting = async (meetingId: string) => {
    try {
      await meetingsService.acceptMeeting(meetingId);
      onRefresh();
    } catch (err) {
      console.error('Failed to accept meeting:', err);
    }
  };

  const handleDeclineMeeting = async (meetingId: string) => {
    try {
      await meetingsService.declineMeeting(meetingId);
      onRefresh();
    } catch (err) {
      console.error('Failed to decline meeting:', err);
    }
  };

  // Handle Meeting Status Change (Joined / Completed)
  const handleUpdateMeetingStatus = async (meetingId: string, status: string) => {
    try {
      await meetingsService.updateMeeting(meetingId, { status } as any);
      onRefresh();
    } catch (err) {
      console.error('Failed to update meeting status:', err);
    }
  };

  // Handle Quick Reschedule for a task
  const handleReschedule = async (taskId: number, newDeadline: string) => {
    try {
      await workcenterService.updateTask(taskId, { deadline: newDeadline });
      setActiveMenuTaskId(null);
      setRescheduleTaskId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to reschedule task:', err);
    }
  };

  // Animated Checkbox Completion Handler (Shows satisfying blue tick feedback before transition)
  const handleCheckTask = (taskId: number) => {
    if (completingTaskIds.has(taskId)) return;
    setCompletingTaskIds(prev => new Set(prev).add(taskId));
    setTimeout(async () => {
      await onCompleteTask(taskId);
      setCompletingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 450);
  };

  // Handle Uncompleting / Restoring a task
  const handleRestoreTask = async (taskId: number) => {
    try {
      await workcenterService.updateStatus(taskId, 'in_progress');
      onRefresh();
    } catch (err) {
      console.error('Failed to restore task:', err);
    }
  };

  // Handle Task Deletion
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await workcenterService.deleteTask(taskId);
      setActiveMenuTaskId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-5 normal-case">
      {/* Header section with clean daily planning */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
              My Day
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
              {dayName}, {formattedDate}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {activeTasks.length === 0 && todaysMeetings.length === 0 ? (
              <span className="text-emerald-500 font-medium">✨ All clear for today! Take a breather or plan ahead.</span>
            ) : (
              <span>{activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} to do • {todaysMeetings.length} meeting{todaysMeetings.length !== 1 ? 's' : ''} scheduled</span>
            )}
          </p>
        </div>

        {/* Progress Pill */}
        {totalCount > 0 && (
          <div className="flex items-center gap-3 bg-background-secondary border border-border-subtle rounded-2xl px-3.5 py-2 self-start sm:self-auto">
            <div className="w-24 bg-background-primary h-2 rounded-full overflow-hidden border border-border-subtle">
              <div 
                className="h-full bg-accent-blue rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            <span className="text-[11.5px] font-bold text-text-primary whitespace-nowrap">
              {progressPercent}% done
            </span>
          </div>
        )}
      </div>

      {/* QUICK-ADD TASK & MEETING INPUT (Front and Center) */}
      <QuickAddTaskInput
        projects={projects}
        allTasks={allTasks || tasks}
        teammates={teammates}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onTaskCreated={onRefresh}
        onOpenMeetingModal={onOpenMeetingModal}
        prefillAssignee={prefillAssignee}
      />

      {/* TODAY'S MEETINGS (Google Calendar-style cards with RSVP & Join actions) */}
      {todaysMeetings.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <Video size={13} className="text-accent-blue" />
              <span>Today&apos;s Meetings ({todaysMeetings.length})</span>
            </span>
            <button
              onClick={onOpenMeetingModal}
              className="text-[11px] font-semibold text-accent-blue hover:underline cursor-pointer normal-case"
            >
              + Schedule Meeting
            </button>
          </div>

          <div className="space-y-2">
            {todaysMeetings.map(m => {
              const isOwner = String(m.owner_id) === String(currentUserId) || m.owner_name === currentUserName;
              const myParticipant = m.participants?.find(p => String(p.user_id) === String(currentUserId));
              const myRsvpStatus = myParticipant?.status || (isOwner ? 'accepted' : 'pending');
              const isCompleted = m.status === 'completed';
              const isLive = m.status === 'in_progress';

              return (
                <div
                  key={m.id}
                  className={cn(
                    'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all',
                    isCompleted 
                      ? 'bg-background-secondary/40 border-border-subtle opacity-70' 
                      : isLive 
                        ? 'bg-emerald-500/5 border-emerald-500/30 shadow-xs'
                        : 'bg-background-secondary border-border-subtle hover:border-accent-blue/40 shadow-xs'
                  )}
                >
                  {/* Left: Time & Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex flex-col items-center justify-center w-14 py-1.5 px-1 rounded-xl bg-background-primary border border-border-subtle text-center shrink-0">
                      <span className="text-[11px] font-bold text-text-primary leading-tight">
                        {m.time}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-text-secondary">
                        {m.duration.includes('-') ? m.duration.split('-')[1]?.trim() : 'Call'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn('text-[13.5px] font-bold text-text-primary truncate', isCompleted && 'line-through text-text-secondary')}>
                          {m.title}
                        </h4>

                        {/* Status Badges */}
                        {isCompleted ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background-primary text-text-secondary border border-border-subtle">
                            ✔ Finished
                          </span>
                        ) : isLive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live / Joined
                          </span>
                        ) : null}

                        {isOwner && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Host
                          </span>
                        )}
                      </div>

                      {/* Notes / Agenda */}
                      {m.notes && (
                        <p className="text-[11.5px] text-text-secondary line-clamp-1 mt-0.5">
                          {m.notes}
                        </p>
                      )}

                      {/* Participants Avatars with RSVP Status */}
                      {m.participants && m.participants.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {m.participants.slice(0, 5).map(p => (
                              <div key={p.id} className="relative inline-block" title={`${p.user_name} (${p.status})`}>
                                {p.user_avatar ? (
                                  <img src={p.user_avatar} alt={p.user_name} className="w-5 h-5 rounded-full ring-2 ring-background-secondary object-cover" />
                                ) : (
                                  <span className="w-5 h-5 rounded-full bg-accent-blue/20 ring-2 ring-background-secondary text-accent-blue text-[9px] font-bold flex items-center justify-center">
                                    {p.user_name.slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                                {/* RSVP dot */}
                                <span className={cn(
                                  'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-background-secondary',
                                  p.status === 'accepted' ? 'bg-emerald-500' : p.status === 'declined' ? 'bg-accent-red' : 'bg-amber-400'
                                )} />
                              </div>
                            ))}
                          </div>
                          {m.participants.length > 5 && (
                            <span className="text-[10px] text-text-secondary">+{m.participants.length - 5}</span>
                          )}
                          <span className="text-[10.5px] text-text-secondary ml-1">
                            {m.participants.filter(p => p.status === 'accepted').length} accepted
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Google Calendar RSVP Prompt & Join / Status controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* RSVP Prompt for Invited Teammate */}
                    {!isOwner && myRsvpStatus === 'pending' && !isCompleted && (
                      <div className="flex items-center gap-1.5 bg-background-primary p-1 rounded-xl border border-border-subtle">
                        <span className="text-[11px] font-medium text-text-secondary px-1.5">Going?</span>
                        <button
                          type="button"
                          onClick={() => handleAcceptMeeting(m.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                        >
                          <Check size={11} /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineMeeting(m.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent-red/10 text-text-secondary hover:text-accent-red text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <X size={11} /> Decline
                        </button>
                      </div>
                    )}

                    {!isOwner && myRsvpStatus === 'accepted' && !isCompleted && (
                      <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-lg">
                        <Check size={12} /> Accepted
                      </span>
                    )}

                    {!isOwner && myRsvpStatus === 'declined' && (
                      <span className="text-[11px] font-semibold text-accent-red flex items-center gap-1 px-2 py-1 bg-accent-red/10 rounded-lg">
                        <X size={12} /> Declined
                      </span>
                    )}

                    {/* Join Meeting Link Button */}
                    {m.meeting_link && !isCompleted && (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (m.status !== 'in_progress') {
                            handleUpdateMeetingStatus(m.id, 'in_progress');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        <Video size={13} />
                        <span>Join</span>
                        <ExternalLink size={10} className="opacity-80" />
                      </a>
                    )}

                    {/* Mark as Finished / Live toggle */}
                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateMeetingStatus(m.id, 'completed')}
                        title="Mark meeting as finished"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border-subtle hover:border-emerald-500 hover:text-emerald-500 text-xs font-medium text-text-secondary transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span className="hidden md:inline">Finish</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateMeetingStatus(m.id, 'scheduled')}
                        className="text-[11px] font-medium text-text-secondary hover:text-accent-blue hover:underline cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TODAY'S TASKS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-wider px-1">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-accent-blue" />
            <span>Today&apos;s Focus Tasks ({activeTasks.length})</span>
          </span>
          <span className="text-[11px] font-normal text-text-secondary normal-case">
            Click checkbox to complete
          </span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="p-8 text-center bg-background-secondary/50 border border-dashed border-border-subtle rounded-2xl">
            <Sparkles size={24} className="mx-auto text-accent-blue mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-text-primary">No tasks due today</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              Type in the box above to add your first task for today, or check suggestions on the right to pull items in.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map(t => {
              const hasProject = Boolean(t.project_name);
              const isSubtask = Boolean(t.parent_id);
              const isCompleting = completingTaskIds.has(t.id);

              return (
                <div
                  key={t.id}
                  className={cn(
                    "group relative flex items-center justify-between gap-3 p-3.5 bg-background-secondary border border-border-subtle hover:border-accent-blue/50 rounded-2xl shadow-xs transition-all duration-200",
                    isCompleting && "bg-accent-blue/10 border-accent-blue/40 shadow-sm"
                  )}
                >
                  {/* Left: Checkbox + Title + Badges */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleCheckTask(t.id)}
                      className="mt-0.5 text-text-secondary hover:text-accent-blue transition-colors cursor-pointer shrink-0"
                      title="Mark as completed"
                    >
                      {isCompleting ? (
                        <span className="w-[18px] h-[18px] rounded-full bg-accent-blue text-white flex items-center justify-center animate-in zoom-in-75 duration-150 shadow-xs">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : (
                        <Circle size={18} className="hover:text-accent-blue transition-colors" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenTaskPanel(t)}
                          className={cn(
                            "text-[13.5px] font-semibold text-text-primary hover:text-accent-blue text-left transition-all truncate cursor-pointer",
                            isCompleting && "line-through text-text-secondary/60 opacity-60"
                          )}
                        >
                          {t.title}
                        </button>

                        {/* Priority Pill */}
                        {['high', 'critical'].includes(t.priority?.toLowerCase()) && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-red/10 text-accent-red border border-accent-red/20">
                            {t.priority}
                          </span>
                        )}
                      </div>

                      {/* Context Badges: Project, Parent Subtask, Assignee */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-text-secondary">
                        {hasProject && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue font-medium">
                            <Hash size={10} />
                            <span className="truncate max-w-[120px]">{t.project_name}</span>
                          </span>
                        )}

                        {isSubtask && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                            <CornerDownRight size={10} />
                            <span>Subtask</span>
                          </span>
                        )}

                        {/* If assigned to someone else */}
                        {t.assigned_to_name && String(t.assigned_to_id) !== String(currentUserId) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background-primary border border-border-subtle font-medium text-text-secondary">
                            <User size={10} />
                            <span>@{t.assigned_to_name}</span>
                          </span>
                        )}

                        {/* Deadline badge: Today */}
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-text-secondary ml-1">
                          <Calendar size={10} className="text-accent-blue" />
                          <span>Today</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: 3-Dots Action Menu */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveMenuTaskId(activeMenuTaskId === t.id ? null : t.id)}
                      className="w-7 h-7 rounded-lg hover:bg-background-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {/* Popover Menu */}
                    {activeMenuTaskId === t.id && (
                      <div className="absolute right-0 top-full mt-1.5 z-40 w-44 bg-background-secondary border border-border-subtle rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => { onOpenTaskPanel(t); setActiveMenuTaskId(null); }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-text-primary hover:bg-accent-blue/10 hover:text-accent-blue rounded-lg transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        
                        <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-text-secondary">
                          Reschedule
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 86400000);
                            handleReschedule(t.id, isoDay(d));
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-text-primary hover:bg-accent-blue/10 hover:text-accent-blue rounded-lg transition-colors cursor-pointer"
                        >
                          ⏭️ Tomorrow
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
                            handleReschedule(t.id, isoDay(d));
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-text-primary hover:bg-accent-blue/10 hover:text-accent-blue rounded-lg transition-colors cursor-pointer"
                        >
                          📅 Next Monday
                        </button>

                        <div className="border-t border-border-subtle my-0.5" />
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors cursor-pointer font-medium"
                        >
                          Delete Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED TASKS ACCORDION */}
      {completedTasks.length > 0 && (
        <div className="pt-2 border-t border-border-subtle/50">
          <button
            type="button"
            onClick={() => setCompletedExpanded(!completedExpanded)}
            className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer py-1"
          >
            {completedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Completed Today ({completedTasks.length})</span>
          </button>

          {completedExpanded && (
            <div className="space-y-1.5 mt-2">
              {completedTasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-background-secondary/40 border border-border-subtle/60 rounded-xl text-text-secondary"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleRestoreTask(t.id)}
                      className="text-emerald-500 hover:text-text-secondary transition-colors cursor-pointer shrink-0"
                      title="Click to restore"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <span className="text-xs line-through text-text-secondary truncate">
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-secondary shrink-0">
                    Done
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
