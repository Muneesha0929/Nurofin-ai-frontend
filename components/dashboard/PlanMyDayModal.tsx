'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sun,
  Clock,
  Check,
  Sparkles,
  AlertTriangle,
  Bell,
  Calendar,
  Loader2,
  Flag,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask, workcenterService } from '@/services/workcenter';
import { issuesService } from '@/services/issues';
import { Meeting } from '@/types';
import { today } from './Widgets';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';

export interface PriorityRankInfo {
  label: string;
  rank: number;
  objectiveTitle?: string;
}

interface PlanMyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueTasks: WCTask[];
  allAssignedTasks?: WCTask[];
  priorityRanks?: Record<number, PriorityRankInfo>;
  todayTasks: WCTask[];
  todayMeetings: Meeting[];
  onRefresh: () => void;
  currentUserId?: string;
}

const SLOTS = [
  { label: '09:00 – 10:00', start: '09:00', end: '10:00' },
  { label: '10:00 – 11:00', start: '10:00', end: '11:00' },
  { label: '11:00 – 12:00', start: '11:00', end: '12:00' },
  { label: '12:00 – 13:00', start: '12:00', end: '13:00' },
  { label: '13:00 – 14:00', start: '13:00', end: '14:00' },
  { label: '14:00 – 15:00', start: '14:00', end: '15:00' },
  { label: '15:00 – 16:00', start: '15:00', end: '16:00' },
  { label: '16:00 – 17:00', start: '16:00', end: '17:00' },
  { label: '17:00 – 18:00', start: '17:00', end: '18:00' },
];

const getTaskPriorityMeta = (t: WCTask, priorityRanks?: Record<number, PriorityRankInfo>) => {
  const mapped = priorityRanks?.[Number(t.id)];
  if (mapped) {
    const cls =
      mapped.rank === 1
        ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
        : mapped.rank === 2
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : 'bg-accent-blue/15 text-accent-blue border-accent-blue/30';
    return { isPrioritySection: true, rank: mapped.rank, label: mapped.label, cls, objectiveTitle: mapped.objectiveTitle };
  }
  const v = String(t.priority || 'medium').toLowerCase();
  if (v === 'critical') {
    return { isPrioritySection: true, rank: 1, label: 'P1', cls: 'bg-accent-red/15 text-accent-red border-accent-red/30', objectiveTitle: undefined };
  }
  if (v === 'high') {
    return { isPrioritySection: true, rank: 2, label: 'P2', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', objectiveTitle: undefined };
  }
  return {
    isPrioritySection: false,
    rank: v === 'medium' ? 50 : 60,
    label: v === 'medium' ? 'Normal' : 'Low',
    cls: 'bg-background-secondary text-text-secondary border-border-subtle',
    objectiveTitle: undefined,
  };
};

export function PlanMyDayModal({
  isOpen,
  onClose,
  overdueTasks = [],
  allAssignedTasks = [],
  priorityRanks,
  todayTasks = [],
  todayMeetings = [],
  onRefresh,
  currentUserId,
}: PlanMyDayModalProps) {
  const now = today();
  const [completingTask, setCompletingTask] = useState<WCTask | null>(null);
  const [extendedTime, setExtendedTime] = useState('');
  const [completedLocally, setCompletedLocally] = useState<Set<number>>(new Set());
  const [scheduledLocally, setScheduledLocally] = useState<Record<number, { start: string; end: string }>>({});
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [schedulingTask, setSchedulingTask] = useState<WCTask | null>(null);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [p1Warning, setP1Warning] = useState<string | null>(null);
  const [pendingDoTodayTask, setPendingDoTodayTask] = useState<WCTask | null>(null);
  const [confirmCloseWarning, setConfirmCloseWarning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    setP1Warning(null);
    setPendingDoTodayTask(null);
    setSchedulingTask(null);
    setConfirmCloseWarning(false);
    setActionError(null);
    setCompletedLocally(new Set());
    setScheduledLocally({});
    try {
      const saved = localStorage.getItem(`nurofin-pmd-remind:${currentUserId || 'me'}:${now}`);
      if (saved) setRemindedIds(new Set(JSON.parse(saved)));
      else setRemindedIds(new Set());
    } catch {
      setRemindedIds(new Set());
    }
  }, [isOpen, currentUserId, now]);

  const isDone = (status?: string) =>
    ['completed', 'done', 'resolved', 'closed'].includes(String(status || '').toLowerCase());

  // Combine all active tasks assigned to this user across departments/projects
  const myPlanningPool = useMemo(() => {
    const map = new Map<number, WCTask>();
    const combined = [...(allAssignedTasks || []), ...(overdueTasks || []), ...(todayTasks || [])];
    for (const t of combined) {
      if (!t || t.id === undefined || t.id === null || isDone(t.status)) continue;
      if (completedLocally.has(Number(t.id))) continue;
      if (currentUserId && String(t.assigned_to_id) !== String(currentUserId)) continue;
      if (!map.has(Number(t.id))) map.set(Number(t.id), t);
    }
    return Array.from(map.values());
  }, [allAssignedTasks, overdueTasks, todayTasks, currentUserId, completedLocally]);

  // Split into: 1) Actual Priority Tasks (P1, P2, P3...)  2) Yesterday's / Other Assigned Tasks
  const { priorityTasks, otherTasks } = useMemo(() => {
    const prios: Array<{ task: WCTask; meta: ReturnType<typeof getTaskPriorityMeta> }> = [];
    const others: Array<{ task: WCTask; meta: ReturnType<typeof getTaskPriorityMeta> }> = [];

    for (const t of myPlanningPool) {
      const meta = getTaskPriorityMeta(t, priorityRanks);
      if (meta.isPrioritySection) prios.push({ task: t, meta });
      else others.push({ task: t, meta });
    }

    prios.sort((a, b) => {
      if (a.meta.rank !== b.meta.rank) return a.meta.rank - b.meta.rank;
      return String(a.task.deadline || '9999').localeCompare(String(b.task.deadline || '9999'));
    });

    // Show yesterday's / recently assigned or overdue tasks at top of Other Tasks
    others.sort((a, b) => {
      const da = String(a.task.scheduled_date || a.task.deadline || a.task.created_at || '9999').slice(0, 10);
      const db = String(b.task.scheduled_date || b.task.deadline || b.task.created_at || '9999').slice(0, 10);
      return db.localeCompare(da);
    });

    return { priorityTasks: prios, otherTasks: others };
  }, [myPlanningPool, priorityRanks]);

  // Any P1/P2/P3 priority task not yet scheduled for today and not completed
  const unplannedPriorityTasks = useMemo(() => {
    return priorityTasks.filter(({ task }) => {
      const d = String(task.scheduled_date || task.deadline || '').slice(0, 10);
      return d !== now && !scheduledLocally[Number(task.id)];
    });
  }, [priorityTasks, now, scheduledLocally]);

  const checkOverlap = (startStr: string, endStr: string, ignoreTaskId?: number) => {
    const sH = parseInt(startStr.split(':')[0] || '9', 10);
    const eH = parseInt(endStr.split(':')[0] || '10', 10);

    const taskConflict = (todayTasks || []).find(t => {
      if (ignoreTaskId && Number(t.id) === Number(ignoreTaskId)) return false;
      if (isDone(t.status) || completedLocally.has(Number(t.id))) return false;
      const tDate = String(t.scheduled_date || t.deadline || '').slice(0, 10);
      if (tDate !== now) return false;
      const localSlot = scheduledLocally[Number(t.id)];
      const tStart = localSlot?.start || t.scheduled_start_time;
      const tEnd = localSlot?.end || t.scheduled_end_time;
      if (!tStart) return false;
      const ts = parseInt(tStart.split(':')[0], 10);
      const te = tEnd ? parseInt(tEnd.split(':')[0], 10) : ts + 1;
      return sH < te && eH > ts;
    });
    if (taskConflict) return { conflict: true, title: taskConflict.title, kind: 'task' as const };

    const meetingConflict = (todayMeetings || []).find(m => {
      if (m.status === 'cancelled' || m.status === 'completed' || !m.time) return false;
      const ms = parseInt(m.time.split(':')[0], 10);
      const me = m.end_time ? parseInt(m.end_time.split(':')[0], 10) : ms + 1;
      return sH < me && eH > ms;
    });
    if (meetingConflict) return { conflict: true, title: meetingConflict.title, kind: 'meeting' as const };

    return { conflict: false, title: '', kind: 'task' as const };
  };

  const freeSlots = useMemo(
    () => SLOTS.filter(s => !checkOverlap(s.start, s.end, schedulingTask?.id).conflict),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayTasks, todayMeetings, schedulingTask, now, completedLocally, scheduledLocally]
  );

  if (!isOpen) return null;

  const openTimePicker = (task: WCTask, forceIgnoreP1 = false) => {
    setActionError(null);
    setConfirmCloseWarning(false);
    const meta = getTaskPriorityMeta(task, priorityRanks);
    if (!forceIgnoreP1 && meta.rank > 1) {
      const unplannedTopP1 = unplannedPriorityTasks.find(
        p => p.meta.rank === 1 && Number(p.task.id) !== Number(task.id)
      );
      if (unplannedTopP1) {
        setP1Warning(`Your ${unplannedTopP1.meta.label} task "${unplannedTopP1.task.title}" is still not scheduled for today and not completed yet.`);
        setPendingDoTodayTask(task);
        return;
      }
    }

    setP1Warning(null);
    setPendingDoTodayTask(null);
    setSchedulingTask(task);
    const firstFree = SLOTS.find(s => !checkOverlap(s.start, s.end, task.id).conflict) || SLOTS[0];
    const localSlot = scheduledLocally[Number(task.id)];
    setSlotStart(localSlot?.start || task.scheduled_start_time || firstFree.start);
    setSlotEnd(localSlot?.end || task.scheduled_end_time || firstFree.end);
  };

  const confirmDoToday = async () => {
    if (!schedulingTask) return;
    if (!slotStart || !slotEnd || slotEnd <= slotStart) {
      setActionError('End time must be after start time.');
      return;
    }
    setActionError(null);
    setBusyTaskId(schedulingTask.id);
    try {
      const realIssueId = (schedulingTask as any).issue_id ?? (schedulingTask.id < 0 ? Math.abs(schedulingTask.id) : null);
      if (realIssueId && schedulingTask.id < 0) {
        await issuesService.updateIssue(realIssueId, {
          deadline: now,
          scheduled_date: now,
          scheduled_start_time: slotStart,
          scheduled_end_time: slotEnd,
        } as any);
      } else {
        await workcenterService.updateTask(schedulingTask.id, {
          scheduled_date: now,
          ...(schedulingTask.deadline ? {} : { deadline: now }),
          scheduled_start_time: slotStart,
          scheduled_end_time: slotEnd,
        });
      }
      setScheduledLocally(prev => ({ ...prev, [Number(schedulingTask.id)]: { start: slotStart, end: slotEnd } }));
      setSchedulingTask(null);
      onRefresh();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update time slot. Please try another slot.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleRemindLater = (task: WCTask) => {
    const next = new Set(remindedIds);
    next.add(task.id);
    setRemindedIds(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`nurofin-pmd-remind:${currentUserId || 'me'}:${now}`, JSON.stringify([...next]));
    }
  };

  const handleConfirmCompletion = async (extVal: string, completionDate: string) => {
    const task = completingTask;
    if (!task) return;
    setActionError(null);
    const ext = parseFloat(extVal);
    try {
      const realIssueId = (task as any).issue_id ?? (task.id < 0 ? Math.abs(task.id) : null);
      if (task.id > 0) {
        await workcenterService.updateTask(task.id, {
          status: 'completed',
          extended_time: isNaN(ext) ? undefined : ext,
          actual_completion_date: completionDate,
        });
      }

      let issueId: number | null = realIssueId;
      const src = (task as any).source;
      if (!issueId && typeof src === 'string' && src.startsWith('issue:')) {
        issueId = parseInt(src.split(':')[1], 10);
      }
      if (!issueId && ((task as any).is_issue || task.title?.startsWith('[Issue]'))) {
        const cleanTitle = task.title.replace(/^\[Issue\]\s*/i, '').trim().toLowerCase();
        const allIssues = (await issuesService.getIssues().catch(() => ({ issues: [] }))).issues || [];
        const matched = allIssues.find((i: any) => i.title.trim().toLowerCase() === cleanTitle);
        if (matched) issueId = parseInt(matched.id, 10);
      }
      if (issueId && !isNaN(issueId)) {
        await issuesService.updateStatus(issueId, 'resolved').catch(() => {});
      }

      setCompletedLocally(prev => new Set(prev).add(Number(task.id)));
      if (schedulingTask && Number(schedulingTask.id) === Number(task.id)) {
        setSchedulingTask(null);
      }
      setCompletingTask(null);
      setExtendedTime('');
      onRefresh();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('issue:updated'));
        window.dispatchEvent(new CustomEvent('task:created'));
      }
    } catch (err: any) {
      setCompletingTask(null);
      setExtendedTime('');
      setActionError(err?.message || 'Could not mark task completed. Please try again.');
    }
  };

  const handleAttemptClose = () => {
    if (unplannedPriorityTasks.length > 0 && !confirmCloseWarning) {
      setConfirmCloseWarning(true);
      return;
    }
    onClose();
  };

  const currentOverlap = schedulingTask ? checkOverlap(slotStart, slotEnd, schedulingTask.id) : { conflict: false, title: '', kind: 'task' as const };
  const plannedTodayCount = myPlanningPool.filter(
    t => String(t.scheduled_date || t.deadline || '').slice(0, 10) === now || Boolean(scheduledLocally[Number(t.id)])
  ).length;

  const renderTaskRow = (t: WCTask, meta: ReturnType<typeof getTaskPriorityMeta>) => {
    const localSlot = scheduledLocally[Number(t.id)];
    const isPlannedToday = String(t.scheduled_date || t.deadline || '').slice(0, 10) === now || Boolean(localSlot);
    const displayStart = localSlot?.start || t.scheduled_start_time;
    const displayEnd = localSlot?.end || t.scheduled_end_time;
    const isReminded = remindedIds.has(t.id);

    return (
      <div
        key={t.id}
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors',
          isPlannedToday
            ? 'bg-accent-blue/5 border-accent-blue/30'
            : isReminded
              ? 'bg-background-primary/40 border-border-subtle opacity-75'
              : 'bg-background-primary border-border-subtle hover:border-accent-blue/40'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn('text-[10px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 font-mono', meta.cls)}>
            {meta.label}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-text-primary truncate">{t.title}</div>
            <div className="text-[10.5px] text-text-secondary flex flex-wrap items-center gap-2">
              {meta.objectiveTitle && <span className="text-accent-blue font-medium truncate max-w-[180px]">{meta.objectiveTitle}</span>}
              {t.project_name && <span>#{t.project_name}</span>}
              {t.deadline && (
                <span className="inline-flex items-center gap-0.5">
                  <Calendar size={10} /> {String(t.deadline).slice(0, 10)}
                </span>
              )}
              {isPlannedToday && displayStart && (
                <span className="text-accent-blue font-semibold inline-flex items-center gap-0.5">
                  <Clock size={10} /> {displayStart}–{displayEnd || ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => openTimePicker(t)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1',
              isPlannedToday
                ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30'
                : 'bg-accent-blue hover:bg-accent-blue-hover text-white'
            )}
          >
            <Sun size={11} /> {isPlannedToday ? 'Change Slot' : 'Do Today'}
          </button>
          <button
            type="button"
            onClick={() => {
              setExtendedTime('');
              setCompletingTask(t);
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 transition-colors"
          >
            <Check size={11} />
            <span>Completed</span>
          </button>
          <button
            type="button"
            onClick={() => handleRemindLater(t)}
            className={cn(
              'px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer inline-flex items-center gap-1',
              isReminded
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-background-secondary border-border-subtle text-text-secondary hover:text-text-primary'
            )}
          >
            <Bell size={11} /> {isReminded ? 'Snoozed' : 'Remind Me Later'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs normal-case" onClick={handleAttemptClose}>
      <div
        className="w-full max-w-2xl max-h-[88vh] bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-background-primary/50">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center">
              <Sun size={16} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-text-primary">Plan Your Day Today</h2>
              <p className="text-[11px] text-text-secondary">
                {priorityTasks.length} priority · {otherTasks.length} other · {plannedTodayCount} planned today · {todayMeetings.length} meeting{todayMeetings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 rounded-lg hover:bg-background-primary text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Always-Visible Priority Status Warning whenever P1/P2/P3 tasks are unscheduled & incomplete */}
        {unplannedPriorityTasks.length > 0 && (
          <div className={cn(
            'shrink-0 mx-5 mt-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs',
            confirmCloseWarning
              ? 'bg-accent-red/10 border-accent-red/40 text-accent-red'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div>
                <b>
                  {confirmCloseWarning
                    ? 'Priority Tasks Still Unscheduled!'
                    : 'Priority Tasks Not Scheduled Yet:'}
                </b>{' '}
                <span>
                  {unplannedPriorityTasks.length} priority task{unplannedPriorityTasks.length !== 1 ? 's' : ''} ({unplannedPriorityTasks.slice(0, 3).map(p => p.meta.label).join(', ')}) {unplannedPriorityTasks.length === 1 ? 'is' : 'are'} still not scheduled for today and not completed yet.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openTimePicker(unplannedPriorityTasks[0].task, true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer"
              >
                Schedule {unplannedPriorityTasks[0].meta.label}
              </button>
              {confirmCloseWarning && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1 rounded-lg border border-border-subtle bg-background-primary text-text-primary font-semibold cursor-pointer"
                >
                  Close Anyway
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Feedback Banner */}
        {actionError && (
          <div className="shrink-0 mx-5 mt-3 p-2.5 rounded-xl bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red flex items-center justify-between gap-2">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="cursor-pointer"><X size={13} /></button>
          </div>
        )}

        {/* P1 Guardrail Warning Banner when clicking lower-priority task */}
        {p1Warning && pendingDoTodayTask && (
          <div className="shrink-0 mx-5 mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span><b>Priority Reminder:</b> {p1Warning}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const p1 = unplannedPriorityTasks.find(p => p.meta.rank === 1);
                  if (p1) openTimePicker(p1.task, true);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-semibold cursor-pointer"
              >
                Plan P1 First
              </button>
              <button
                type="button"
                onClick={() => openTimePicker(pendingDoTodayTask, true)}
                className="px-2.5 py-1 rounded-lg border border-border-subtle bg-background-primary text-text-primary font-semibold cursor-pointer"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        )}

        {/* Inline Time-Slot Picker with Overlap Detection + Custom Time Inputs */}
        {schedulingTask && (
          <div className="shrink-0 mx-5 mt-3 p-3.5 rounded-xl bg-background-primary border border-accent-blue/40 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-text-primary truncate">
                Schedule Today: <span className="text-accent-blue">{schedulingTask.title}</span>
              </div>
              <button type="button" onClick={() => setSchedulingTask(null)} className="text-text-secondary hover:text-text-primary cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SLOTS.map(s => {
                const ov = checkOverlap(s.start, s.end, schedulingTask.id);
                const selected = slotStart === s.start && slotEnd === s.end;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => { setSlotStart(s.start); setSlotEnd(s.end); }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors',
                      selected
                        ? 'bg-accent-blue text-white border-accent-blue'
                        : ov.conflict
                          ? 'bg-accent-red/5 border-accent-red/30 text-accent-red'
                          : 'bg-background-secondary border-border-subtle text-text-primary hover:border-accent-blue'
                    )}
                    title={ov.conflict ? `Overlaps with ${ov.title}` : 'Free slot'}
                  >
                    {s.label} {ov.conflict ? '⚠️' : ''}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-text-secondary font-semibold">Custom:</span>
              <input
                type="time"
                value={slotStart}
                onChange={e => setSlotStart(e.target.value)}
                className="rounded-lg border border-border-subtle bg-background-secondary px-2 py-1 text-xs text-text-primary"
              />
              <span>to</span>
              <input
                type="time"
                value={slotEnd}
                onChange={e => setSlotEnd(e.target.value)}
                className="rounded-lg border border-border-subtle bg-background-secondary px-2 py-1 text-xs text-text-primary"
              />
            </div>

            {currentOverlap.conflict && (
              <div className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/25 text-[11.5px] text-accent-red space-y-1">
                <div>
                  <b>Overlap detected:</b> Conflicts with {currentOverlap.kind === 'meeting' ? 'meeting' : 'task'} &ldquo;{currentOverlap.title}&rdquo;.
                </div>
                {freeSlots.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-text-primary">
                    <span className="font-semibold">Recommended free slots:</span>
                    {freeSlots.slice(0, 3).map(fs => (
                      <button
                        key={fs.label}
                        type="button"
                        onClick={() => { setSlotStart(fs.start); setSlotEnd(fs.end); }}
                        className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer"
                      >
                        {fs.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busyTaskId === schedulingTask.id || currentOverlap.conflict}
                onClick={confirmDoToday}
                className="px-3.5 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
              >
                {busyTaskId === schedulingTask.id && <Loader2 size={12} className="animate-spin" />}
                <span>{busyTaskId === schedulingTask.id ? 'Saving…' : 'Confirm Today & Time Slot'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Compact Scrollable Priority-First List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-3">
          {myPlanningPool.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Sparkles size={28} className="mx-auto text-emerald-500" />
              <div className="text-sm font-bold text-text-primary">All caught up!</div>
              <p className="text-xs text-text-secondary">You have no pending tasks to plan right now.</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: PRIORITY TASKS (P1, P2, P3...) */}
              {priorityTasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent-red px-1">
                    <Flag size={11} />
                    <span>Priority Tasks (P1, P2, P3…) — {priorityTasks.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {priorityTasks.map(({ task, meta }) => renderTaskRow(task, meta))}
                  </div>
                </div>
              )}

              {/* SECTION 2: YESTERDAY'S & OTHER ASSIGNED TASKS */}
              {otherTasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary px-1 pt-1">
                    <Clock size={11} />
                    <span>Yesterday&apos;s &amp; Other Assigned Tasks — {otherTasks.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {otherTasks.map(({ task, meta }) => renderTaskRow(task, meta))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-border-subtle bg-background-primary/50 flex items-center justify-between text-xs gap-2">
          <span className="text-text-secondary">
            {unplannedPriorityTasks.length > 0
              ? `${unplannedPriorityTasks.length} priority task(s) still need scheduling for today.`
              : 'All priority tasks are scheduled or handled!'}
          </span>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="px-4 py-1.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white font-semibold cursor-pointer shrink-0"
          >
            Done Planning
          </button>
        </div>
      </div>

      {completingTask && (
        <CompleteTaskModal
          isOpen={true}
          onClose={() => setCompletingTask(null)}
          onSubmit={handleConfirmCompletion}
          taskExtendedTime={extendedTime}
          setTaskExtendedTime={setExtendedTime}
          isIssue={Boolean(
            completingTask.title?.startsWith('[Issue]') ||
            (completingTask as any)?.source === 'issue' ||
            (completingTask as any)?.is_issue
          )}
        />
      )}
    </div>
  );
}
