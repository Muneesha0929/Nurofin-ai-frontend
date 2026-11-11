'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sun, 
  Clock, 
  Calendar, 
  Check, 
  ChevronRight, 
  Sparkles, 
  ArrowRight,
  Flame,
  CheckCircle2,
  Video
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask, workcenterService } from '@/services/workcenter';
import { Meeting } from '@/types';
import { today, isoDay } from './Widgets';

interface PlanMyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueTasks: WCTask[];
  todayTasks: WCTask[];
  todayMeetings: Meeting[];
  onRefresh: () => void;
  currentUserId?: string;
}

export function PlanMyDayModal({
  isOpen,
  onClose,
  overdueTasks = [],
  todayTasks = [],
  todayMeetings = [],
  onRefresh,
  currentUserId
}: PlanMyDayModalProps) {
  const [currentOverdueIndex, setCurrentOverdueIndex] = useState(0);
  const [step, setStep] = useState<'overdue' | 'agenda' | 'finish'>('overdue');
  const now = today();

  // Reset index & step whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentOverdueIndex(0);
      setStep('overdue');
    }
  }, [isOpen]);

  // Strictly filter overdue tasks to current user only - called unconditionally!
  const myOverdueTasks = useMemo(() => {
    if (!Array.isArray(overdueTasks)) return [];
    return overdueTasks.filter(t => {
      if (!currentUserId) return true;
      return String(t.assigned_to_id) === String(currentUserId);
    });
  }, [overdueTasks, currentUserId]);

  const currentOverdue = myOverdueTasks[currentOverdueIndex] || null;
  const hasOverdueToReview = myOverdueTasks.length > 0 && currentOverdueIndex < myOverdueTasks.length;

  if (!isOpen) return null;

  const handleNextOverdue = () => {
    if (currentOverdueIndex + 1 < myOverdueTasks.length) {
      setCurrentOverdueIndex(prev => prev + 1);
    } else {
      setStep('agenda');
    }
  };

  const handleDoToday = async () => {
    if (!currentOverdue) return;
    try {
      await workcenterService.updateTask(currentOverdue.id, { deadline: now });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
    handleNextOverdue();
  };

  const handleTomorrow = async () => {
    if (!currentOverdue) return;
    try {
      const tomorrow = isoDay(new Date(Date.now() + 86400000));
      await workcenterService.updateTask(currentOverdue.id, { deadline: tomorrow });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
    handleNextOverdue();
  };

  const handleNextWeek = async () => {
    if (!currentOverdue) return;
    try {
      const nextWeek = isoDay(new Date(Date.now() + 7 * 86400000));
      await workcenterService.updateTask(currentOverdue.id, { deadline: nextWeek });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
    handleNextOverdue();
  };

  const handleDone = async () => {
    if (!currentOverdue) return;
    try {
      await workcenterService.updateStatus(currentOverdue.id, 'completed');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
    handleNextOverdue();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs normal-case animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-background-secondary border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-background-primary/40">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center">
              <Sun size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Plan My Day</h2>
              <p className="text-[11px] text-text-secondary">Daily Focus & Planning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-background-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* STEP 1: Overdue Sequential Review */}
        {step === 'overdue' && (
          <div className="p-6 flex flex-col items-center text-center">
            {hasOverdueToReview && currentOverdue ? (
              <div className="w-full flex flex-col items-center gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent-red bg-accent-red/10 border border-accent-red/20 px-2.5 py-0.5 rounded-full">
                  Overdue Task ({currentOverdueIndex + 1} of {myOverdueTasks.length})
                </span>

                <div className="p-4 bg-background-primary border border-border-subtle rounded-2xl w-full text-left">
                  <h3 className="text-base font-bold text-text-primary mb-1">
                    {currentOverdue.title}
                  </h3>
                  {currentOverdue.project_name && (
                    <span className="text-xs text-accent-blue font-medium">
                      #{currentOverdue.project_name}
                    </span>
                  )}
                  {currentOverdue.description && (
                    <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                      {currentOverdue.description}
                    </p>
                  )}
                </div>

                <p className="text-xs text-text-secondary">When would you like to tackle this?</p>

                {/* 4 Decision Buttons */}
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={handleDoToday}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <Sun size={13} /> Do Today
                  </button>
                  <button
                    type="button"
                    onClick={handleTomorrow}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-background-primary border border-border-subtle hover:border-accent-blue text-text-primary text-xs font-semibold transition-all cursor-pointer"
                  >
                    ⏭️ Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-background-primary border border-border-subtle hover:border-accent-blue text-text-primary text-xs font-semibold transition-all cursor-pointer"
                  >
                    📅 Next Week
                  </button>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <Check size={13} /> Mark Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <Sparkles size={32} className="text-emerald-500" />
                <h3 className="text-base font-bold text-text-primary">No Overdue Tasks!</h3>
                <p className="text-xs text-text-secondary max-w-xs">
                  Your slate is clean. Let&apos;s review what you have planned for today.
                </p>
                <button
                  type="button"
                  onClick={() => setStep('agenda')}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
                >
                  <span>Review Today&apos;s Agenda</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Review Today's Agenda */}
        {step === 'agenda' && (
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-text-primary">Today&apos;s Schedule</h3>
              <p className="text-xs text-text-secondary">Here is what is locked in for today:</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {todayMeetings.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2.5 bg-background-primary border border-border-subtle rounded-xl text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Video size={13} className="text-purple-500 shrink-0" />
                    <span className="font-semibold text-text-primary truncate">{m.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-text-secondary shrink-0">{m.time}</span>
                </div>
              ))}

              {todayTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-background-primary border border-border-subtle rounded-xl text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 size={13} className="text-accent-blue shrink-0" />
                    <span className="font-medium text-text-primary truncate">{t.title}</span>
                  </div>
                  {t.project_name && <span className="text-[10px] text-accent-blue shrink-0">#{t.project_name}</span>}
                </div>
              ))}

              {todayMeetings.length === 0 && todayTasks.length === 0 && (
                <p className="text-xs text-text-secondary text-center py-4">
                  No tasks or meetings scheduled yet for today.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep('finish')}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <span>Looks Good, Let&apos;s Go!</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* STEP 3: Finish Celebratory Screen */}
        {step === 'finish' && (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <span className="text-4xl">🚀</span>
            <h3 className="text-lg font-black text-text-primary">You&apos;re All Set!</h3>
            <p className="text-xs text-text-secondary max-w-xs">
              You have {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} and {todayMeetings.length} meeting{todayMeetings.length !== 1 ? 's' : ''} lined up. Focus on one task at a time and conquer your day!
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Start My Day
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
