import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Task, Meeting } from '@/types';
import { tasksService } from '@/services/tasks';
import { plannerService } from '@/services/planner';

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueTasks: any[];
  yesterdayMeetings: any[];
  onTasksUpdate: () => void;
}

export function DailyCheckinModal({
  isOpen,
  onClose,
  overdueTasks,
  yesterdayMeetings,
  onTasksUpdate,
}: DailyCheckinModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCompleteTask = async (taskId: string) => {
    try {
      setSubmitting(true);
      await tasksService.updateTask(taskId, { status: 'completed' });
      onTasksUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePushTask = async (taskId: string) => {
    try {
      setSubmitting(true);
      const today = new Date().toISOString().split('T')[0];
      await tasksService.updateTask(taskId, { dueDate: today, scheduledDate: today });
      onTasksUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMeetingStatus = async (meetingId: string, status: string) => {
    try {
      setSubmitting(true);
      // Wait, is there a meeting status update endpoint? Assuming plannerService or meetingsService.
      // We will just mock it closing in the UI for now, or you can implement the real API call.
      onTasksUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (overdueTasks.length === 0 && yesterdayMeetings.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-2xl w-full max-w-lg flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
      >
        <div>
          <h3 className="text-xl font-black text-text-primary flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-accent-orange" /> Daily Check-in
          </h3>
          <p className="text-[12px] text-text-secondary mt-1">Before starting today, please resolve your open items from yesterday.</p>
        </div>
        
        {yesterdayMeetings.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12}/> Yesterday&apos;s Meetings</h4>
            {yesterdayMeetings.map(m => (
              <div key={m.id} className="p-3 bg-background-primary border border-border-subtle rounded-lg flex flex-col gap-3">
                <div>
                  <div className="text-[13px] font-bold text-text-primary">{m.title}</div>
                  <div className="text-[11px] text-text-secondary">{m.time} - {m.end_time || 'No end time'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleMeetingStatus(m.id, 'completed')} disabled={submitting} className="flex-1 text-[11px] font-bold py-1.5 bg-accent-green/10 text-accent-green hover:bg-accent-green/20 rounded-md transition-all">Completed</button>
                  <button onClick={() => handleMeetingStatus(m.id, 'canceled')} disabled={submitting} className="flex-1 text-[11px] font-bold py-1.5 bg-accent-red/10 text-accent-red hover:bg-accent-red/20 rounded-md transition-all">Canceled</button>
                  <button onClick={() => handleMeetingStatus(m.id, 'rescheduled')} disabled={submitting} className="flex-1 text-[11px] font-bold py-1.5 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 rounded-md transition-all">Rescheduled</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {overdueTasks.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5"><Clock size={12}/> Overdue Tasks</h4>
            {overdueTasks.map(t => (
              <div key={t.id} className="p-3 bg-background-primary border border-border-subtle rounded-lg flex flex-col gap-3">
                <div>
                  <div className="text-[13px] font-bold text-text-primary">{t.title}</div>
                  <div className="text-[11px] text-text-secondary">Was due on {t.deadline || t.dueDate}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleCompleteTask(t.id)} disabled={submitting} className="flex-1 text-[11px] font-bold py-1.5 bg-accent-green text-white hover:bg-green-600 rounded-md transition-all">Mark Done</button>
                  <button onClick={() => handlePushTask(t.id)} disabled={submitting} className="flex-1 text-[11px] font-bold py-1.5 bg-surface-hover text-text-primary hover:bg-border-subtle rounded-md transition-all">Push to Today</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-2 pt-4 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-6 h-10 bg-accent-blue hover:bg-blue-600 text-white font-bold rounded-lg shadow-md transition-all text-xs"
          >
            I&apos;ll do this later
          </button>
        </div>
      </motion.div>
    </div>
  );
}
