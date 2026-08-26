import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (extendedTime: string, completionDate: string) => void;
  taskExtendedTime: string;
  setTaskExtendedTime: (val: string) => void;
}

import { useState } from 'react';

export function CompleteTaskModal({
  isOpen,
  onClose,
  onSubmit,
  taskExtendedTime,
  setTaskExtendedTime,
}: CompleteTaskModalProps) {
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(taskExtendedTime, completionDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-xl w-full max-w-sm flex flex-col gap-4"
      >
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-accent-green" /> Complete Task
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Actual Date of Completion</label>
            <input
              type="date"
              value={completionDate}
              onChange={e => setCompletionDate(e.target.value)}
              className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-green transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Extended Time (hours)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g. 2 for 2 extra hours"
              value={taskExtendedTime}
              onChange={e => setTaskExtendedTime(e.target.value)}
              className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-green transition-all"
            />
            <p className="text-[10px] text-text-muted">Leave empty if you finished on time.</p>
          </div>
          <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 h-10 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all text-xs"
            >
              Mark Complete
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
