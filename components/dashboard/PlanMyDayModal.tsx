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
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask, workcenterService } from '@/services/workcenter';
import { issuesService } from '@/services/issues';
import { Meeting } from '@/types';
import { today } from './Widgets';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';

interface PlanMyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueTasks: WCTask[];
  allAssignedTasks?: WCTask[];
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

const priorityRank = (p?: string) => {
  const v = String(p || 'medium').toLowerCase();
  if (v === 'critical') return 1;
  if (v === 'high') return 2;
  if (v === 'medium') return 3;
  return 4;
};

const priorityBadge = (p?: string) => {
  const r = priorityRank(p);
  if (r === 1) return { label: 'P1', cls: 'bg-accent-red/15 text-accent-red border-accent-red/30' };
  if (r === 2) return { label: 'P2', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
  return { label: 'P3', cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' };
};

export function PlanMyDayModal({
  isOpen,
  onClose,
  overdueTasks = [],
  allAssignedTasks = [],
  todayTasks = [],
  todayMeetings = [],
  onRefresh,
  currentUserId,
}: PlanMyDayModalProps) {
  const now = today();
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [extendedTime, setExtendedTime] = useState('');
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [schedulingTask, setSchedulingTask] = useState<WCTask | null>(null);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [p1Warning, setP1Warning] = useState<string | null>(null);
  const [pendingDoTodayTask, setPendingDoTodayTask] = useState<WCTask | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    setP1Warning(null);
    setPendingDoTodayTask(null);
    setSchedulingTask(null);
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
      if (!t || !t.id || isDone(t.status)) continue;
      if (currentUserId && String(t.assigned_to_id) !== String(currentUserId)) continue;
      if (!map.has(Number(t.id))) map.set(Number(t.id), t);
    }
    return Array.from(map.values()).sort((a, b) => {
      const pr = priorityRank(a.priority) - priorityRank(b.priority);
      if (pr !== 0) return pr;
      return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999'));
    });
  }, [allAssignedTasks, overdueTasks, todayTasks, currentUserId]);

  const checkOverlap = (startStr: string, endStr: string, ignoreTaskId?: number) => {
    const sH = parseInt(startStr.split(':')[0] || '9', 10);
    const eH = parseInt(endStr.split(':')[0] || '10', 10);

    const taskConflict = (todayTasks || []).find(t => {
      if (ignoreTaskId && Number(t.id) === Number(ignoreTaskId)) return false;
      if (isDone(t.status)) return false;
      const tDate = String(t.scheduled_date || t.deadline || '').slice(0, 10);
      if (tDate !== now) return false;
      if (!t.scheduled_start_time) return false;
      const ts = parseInt(t.scheduled_start_time.split(':')[0], 10);
      const te = t.scheduled_end_time ? parseInt(t.scheduled_end_time.split(':')[0], 10) : ts + 1;
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
    [todayTasks, todayMeetings, schedulingTask, now]
  );

  if (!isOpen) return null;

  const openTimePicker = (task: WCTask, forceIgnoreP1 = false) => {
    // Priority guardrail: warn if user tries to schedule P2/P3 while an unplanned P1 task exists
    const isThisP1 = priorityRank(task.priority) === 1;
    if (!forceIgnoreP1 && !isThisP1) {
      const unplannedP1 = myPlanningPool.find(t => {
        if (Number(t.id) === Number(task.id)) return false;
        if (priorityRank(t.priority) !== 1) return false;
        const d = String(t.scheduled_date || t.deadline || '').slice(0, 10);
        return d !== now;
      });
      if (unplannedP1) {
        setP1Warning(`Your P1 task "${unplannedP1.title}" is still not planned for today.`);
        setPendingDoTodayTask(task);
        return;
      }
    }

    setP1Warning(null);
    setPendingDoTodayTask(null);
    setSchedulingTask(task);
    const firstFree = SLOTS.find(s => !checkOverlap(s.start, s.end, task.id).conflict) || SLOTS[0];
    setSlotStart(task.scheduled_start_time || firstFree.start);
    setSlotEnd(task.scheduled_end_time || firstFree.end);
  };

  const confirmDoToday = async () => {
    if (!schedulingTask) return;
    setBusyTaskId(schedulingTask.id);
    try {
      await workcenterService.updateTask(schedulingTask.id, {
        scheduled_date: now,
        deadline: now,
        scheduled_start_time: slotStart,
        scheduled_end_time: slotEnd,
      });
      setSchedulingTask(null);
      onRefresh();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (err) {
      console.error('Failed to schedule task for today:', err);
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
    if (!completingTaskId) return;
    const ext = parseFloat(extVal);
    const completedTask = myPlanningPool.find(t => Number(t.id) === Number(completingTaskId));
    try {
      await workcenterService.updateTask(completingTaskId, {
        status: 'completed',
        extended_time: isNaN(ext) ? undefined : ext,
        actual_completion_date: completionDate,
      });

      if (completedTask) {
        let issueId: number | null = null;
        const src = (completedTask as any).source;
        if (typeof src === 'string' && src.startsWith('issue:')) {
          issueId = parseInt(src.split(':')[1], 10);
        }
        if (!issueId && ((completedTask as any).is_issue || completedTask.title?.startsWith('[Issue]'))) {
          const cleanTitle = completedTask.title.replace(/^\[Issue\]\s*/i, '').trim().toLowerCase();
          const allIssues = (await issuesService.getIssues().catch(() => ({ issues: [] }))).issues || [];
          const matched = allIssues.find((i: any) => i.title.trim().toLowerCase() === cleanTitle);
          if (matched) issueId = parseInt(matched.id, 10);
        }
        if (issueId && !isNaN(issueId)) {
          await issuesService.updateStatus(issueId, 'resolved').catch(() => {});
        }
      }

      onRefresh();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('issue:updated'));
        window.dispatchEvent(new CustomEvent('task:created'));
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setCompletingTaskId(null);
      setExtendedTime('');
    }
  };

  const currentOverlap = schedulingTask ? checkOverlap(slotStart, slotEnd, schedulingTask.id) : { conflict: false, title: '', kind: 'task' as const };
  const plannedTodayCount = myPlanningPool.filter(t => String(t.scheduled_date || t.deadline || '').slice(0, 10) === now).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs normal-case" onClick={onClose}>
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
                {myPlanningPool.length} assigned task{myPlanningPool.length !== 1 ? 's' : ''} · {plannedTodayCount} planned for today · {todayMeetings.length} meeting{todayMeetings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-background-primary text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* P1 Guardrail Warning Banner */}
        {p1Warning && pendingDoTodayTask && (
          <div className="shrink-0 mx-5 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span><b>Priority Reminder:</b> {p1Warning}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const p1 = myPlanningPool.find(t => priorityRank(t.priority) === 1 && String(t.scheduled_date || t.deadline || '').slice(0, 10) !== now);
                  if (p1) openTimePicker(p1, true);
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

        {/* Inline Time-Slot Picker with Overlap Detection */}
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
                className="px-3.5 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {busyTaskId === schedulingTask.id ? 'Saving…' : 'Confirm Today & Time Slot'}
              </button>
            </div>
          </div>
        )}

        {/* Compact Scrollable List of Tasks (handles 15-20+ tasks cleanly without huge spaces) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-1.5">
          {myPlanningPool.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Sparkles size={28} className="mx-auto text-emerald-500" />
              <div className="text-sm font-bold text-text-primary">All caught up!</div>
              <p className="text-xs text-text-secondary">You have no pending tasks to plan right now.</p>
            </div>
          ) : (
            myPlanningPool.map(t => {
              const badge = priorityBadge(t.priority);
              const isPlannedToday = String(t.scheduled_date || t.deadline || '').slice(0, 10) === now;
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
                    <span className={cn('text-[10px] font-extrabold px-1.5 py-0.5 rounded border shrink-0', badge.cls)}>
                      {badge.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-text-primary truncate">{t.title}</div>
                      <div className="text-[10.5px] text-text-secondary flex flex-wrap items-center gap-2">
                        {t.project_name && <span>#{t.project_name}</span>}
                        {t.deadline && (
                          <span className="inline-flex items-center gap-0.5">
                            <Calendar size={10} /> {String(t.deadline).slice(0, 10)}
                          </span>
                        )}
                        {isPlannedToday && t.scheduled_start_time && (
                          <span className="text-accent-blue font-semibold inline-flex items-center gap-0.5">
                            <Clock size={10} /> {t.scheduled_start_time}–{t.scheduled_end_time || ''}
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
                      onClick={() => setCompletingTaskId(t.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 transition-colors"
                    >
                      <Check size={11} /> Completed
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
            })
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-border-subtle bg-background-primary/50 flex items-center justify-between text-xs">
          <span className="text-text-secondary">You can reopen this anytime today from the Plan My Day badge.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white font-semibold cursor-pointer"
          >
            Done Planning
          </button>
        </div>
      </div>

      {(() => {
        const foundTask = completingTaskId ? myPlanningPool.find(t => Number(t.id) === Number(completingTaskId)) : null;
        const isIssue = Boolean(
          foundTask?.title?.startsWith('[Issue]') ||
          (foundTask as any)?.source === 'issue' ||
          (foundTask as any)?.is_issue
        );
        return (
          <CompleteTaskModal
            isOpen={completingTaskId !== null}
            onClose={() => setCompletingTaskId(null)}
            onSubmit={handleConfirmCompletion}
            taskExtendedTime={extendedTime}
            setTaskExtendedTime={setExtendedTime}
            isIssue={isIssue}
          />
        );
      })()}
    </div>
  );
}
