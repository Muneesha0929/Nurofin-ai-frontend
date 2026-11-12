'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Sparkles, 
  Calendar, 
  Clock, 
  Check, 
  Plus, 
  ChevronRight, 
  ArrowRight,
  Sun,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask, workcenterService } from '@/services/workcenter';
import { today, isoDay, QuickNotes } from './Widgets';

interface SmartSuggestionsDrawerProps {
  tasks: WCTask[];
  currentUserId: string;
  isDirector: boolean;
  onOpenTaskPanel: (t: WCTask) => void;
  onRefresh: () => void;
  onCompleteTask: (taskId: number) => void;
}

export function SmartSuggestionsDrawer({
  tasks,
  currentUserId,
  isDirector,
  onOpenTaskPanel,
  onRefresh,
  onCompleteTask
}: SmartSuggestionsDrawerProps) {
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const [completingIds, setCompletingIds] = useState<Set<number>>(new Set());
  const [addedTodayIds, setAddedTodayIds] = useState<Set<number>>(new Set());
  const now = today();

  const getDueDate = (t: WCTask): string | null => {
    const raw = t.deadline || t.scheduled_date || null;
    return raw ? raw.slice(0, 10) : null;
  };

  // Overdue tasks (due strictly before today)
  const overdueTasks = tasks.filter(t => {
    const isDone = t.status === 'completed' || t.status === 'done';
    const isMine = String(t.assigned_to_id) === String(currentUserId);
    const dDate = getDueDate(t);
    const isOverdue = Boolean(dDate && dDate < now);
    return !isDone && isOverdue && (scope === 'team' && isDirector ? true : isMine);
  }).sort((a, b) => (getDueDate(a) || '').localeCompare(getDueDate(b) || ''));

  // Upcoming & Due Deadlines (due today or within next 3 days)
  const threeDaysLater = isoDay(new Date(Date.now() + 3 * 86400000));
  const suggestedTasks = tasks.filter(t => {
    const isDone = t.status === 'completed' || t.status === 'done';
    const isMine = String(t.assigned_to_id) === String(currentUserId);
    const dDate = getDueDate(t);
    const isImminent = Boolean(dDate && dDate >= now && dDate <= threeDaysLater);
    return !isDone && isImminent && (scope === 'team' && isDirector ? true : isMine);
  }).sort((a, b) => (getDueDate(a) || '').localeCompare(getDueDate(b) || '')).slice(0, 6);

  const handleDoneWithAnimation = (taskId: number) => {
    if (completingIds.has(taskId)) return;
    setCompletingIds(prev => new Set(prev).add(taskId));
    setTimeout(async () => {
      await onCompleteTask(taskId);
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 450);
  };

  // Quick 1-Click Action: Move Overdue or Suggested to Today (sets deadline & scheduled_date)
  const handleDoToday = async (taskId: number) => {
    try {
      setAddedTodayIds(prev => new Set(prev).add(taskId));
      await workcenterService.updateTask(taskId, { 
        deadline: now,
        scheduled_date: now 
      });
      setTimeout(() => {
        onRefresh();
        setAddedTodayIds(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }, 400);
    } catch (err) {
      console.error('Failed to move task to today:', err);
      setAddedTodayIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  // Quick 1-Click Action: Move to Tomorrow
  const handleTomorrow = async (taskId: number) => {
    try {
      const tomorrow = isoDay(new Date(Date.now() + 86400000));
      await workcenterService.updateTask(taskId, { 
        deadline: tomorrow,
        scheduled_date: tomorrow 
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to move task to tomorrow:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4 normal-case">
      {/* 1. OVERDUE SECTION (High Priority Attention) */}
      <div className={cn(
        'rounded-2xl border p-4 transition-all shadow-xs',
        overdueTasks.length > 0 
          ? 'bg-accent-red/5 dark:bg-accent-red/10 border-accent-red/20' 
          : 'bg-background-secondary border-border-subtle'
      )}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
              overdueTasks.length > 0 ? 'bg-accent-red/15 text-accent-red' : 'bg-background-primary text-text-secondary'
            )}>
              <AlertTriangle size={13} />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Overdue ({overdueTasks.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {isDirector && (
              <div className="flex items-center bg-background-primary p-0.5 rounded-lg border border-border-subtle text-[10px]">
                <button
                  type="button"
                  onClick={() => setScope('mine')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer',
                    scope === 'mine' ? 'bg-accent-blue text-white shadow-2xs' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setScope('team')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer',
                    scope === 'team' ? 'bg-accent-blue text-white shadow-2xs' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  Team
                </button>
              </div>
            )}
            {overdueTasks.length > 0 && (
              <span className="text-[10.5px] font-semibold text-accent-red">
                Needs Rescheduling
              </span>
            )}
          </div>
        </div>

        {overdueTasks.length === 0 ? (
          <p className="text-xs text-text-secondary py-1">
            Zero overdue items. You&apos;re completely up to speed! 🎉
          </p>
        ) : (
          <div className="space-y-2.5">
            {overdueTasks.slice(0, 6).map(t => {
              const dStr = getDueDate(t) || now; const daysDiff = Math.max(1, Math.round((new Date(now).getTime() - new Date(dStr).getTime()) / 86400000));

              return (
                <div 
                  key={t.id}
                  className="p-3 bg-background-primary/80 border border-border-subtle rounded-xl hover:border-accent-red/40 transition-all flex flex-col gap-2 min-w-0 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenTaskPanel(t)}
                      className="text-xs font-semibold text-text-primary hover:text-accent-red text-left break-words whitespace-normal flex-1 transition-colors cursor-pointer"
                    >
                      {t.title}
                    </button>
                    <span className="text-[9.5px] font-bold text-accent-red shrink-0 whitespace-nowrap bg-accent-red/10 px-1.5 py-0.5 rounded ml-1">
                      {daysDiff}d overdue
                    </span>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-border-subtle/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleDoToday(t.id)}
                      disabled={addedTodayIds.has(t.id)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs",
                        addedTodayIds.has(t.id)
                          ? "bg-emerald-500 text-white"
                          : "bg-accent-blue/10 hover:bg-accent-blue hover:text-white text-accent-blue"
                      )}
                      title="Schedule for Today and add to My Day"
                    >
                      {addedTodayIds.has(t.id) ? (
                        <>
                          <Check size={11} strokeWidth={3} /> Added!
                        </>
                      ) : (
                        <>
                          <Sun size={11} /> Do Today
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTomorrow(t.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-background-secondary text-text-secondary hover:text-text-primary font-medium transition-colors cursor-pointer"
                    >
                      Tomorrow
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDoneWithAnimation(t.id)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ml-auto",
                        completingIds.has(t.id) 
                          ? "bg-accent-blue text-white font-semibold" 
                          : "hover:bg-emerald-500/10 text-text-secondary hover:text-emerald-500"
                      )}
                      title="Mark done"
                    >
                      <Check size={11} strokeWidth={completingIds.has(t.id) ? 3 : 2} /> 
                      <span>{completingIds.has(t.id) ? "Done!" : "Done"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {overdueTasks.length > 6 && (
              <p className="text-[11px] text-text-secondary text-center pt-1">
                +{overdueTasks.length - 6} more overdue tasks in Task Center
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. SMART SUGGESTIONS (Upcoming Priorities) */}
      <div className="rounded-2xl border border-border-subtle bg-background-secondary p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles size={13} />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Smart Suggestions ({suggestedTasks.length})
          </h3>
        </div>

        {suggestedTasks.length === 0 ? (
          <p className="text-xs text-text-secondary py-1">
            No impending deadlines in the next 3 days.
          </p>
        ) : (
          <div className="space-y-2">
            {suggestedTasks.map(t => (
              <div 
                key={t.id}
                className="flex items-center justify-between gap-2.5 p-2.5 bg-background-primary/60 border border-border-subtle rounded-xl hover:border-accent-blue/40 transition-colors min-w-0 overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenTaskPanel(t)}
                    className="text-xs font-medium text-text-primary hover:text-accent-blue break-words whitespace-normal block text-left transition-colors cursor-pointer leading-snug"
                  >
                    {t.title}
                  </button>
                  <span className="text-[10px] text-text-secondary block break-words whitespace-normal mt-0.5">
                    Due {t.deadline?.slice(5)} {t.project_name ? `· ${t.project_name}` : ''}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDoToday(t.id)}
                  title="Schedule for Today and pull into My Day"
                  disabled={addedTodayIds.has(t.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 self-center shadow-2xs",
                    addedTodayIds.has(t.id)
                      ? "bg-emerald-500 text-white"
                      : "bg-accent-blue/10 hover:bg-accent-blue hover:text-white text-accent-blue"
                  )}
                >
                  {addedTodayIds.has(t.id) ? (
                    <>
                      <Check size={11} strokeWidth={3} />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <Plus size={11} />
                      <span>Today</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. QUICK NOTES WIDGET */}
      <QuickNotes userId={currentUserId} />
    </div>
  );
}
