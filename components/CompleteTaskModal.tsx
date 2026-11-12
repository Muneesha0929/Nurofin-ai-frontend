import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (extendedTime: string, completionDate: string) => void;
  taskExtendedTime: string;
  setTaskExtendedTime: (val: string) => void;
}

export function CompleteTaskModal({
  isOpen,
  onClose,
  onSubmit,
  taskExtendedTime,
  setTaskExtendedTime,
}: CompleteTaskModalProps) {
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(taskExtendedTime, completionDate);
  };

  const quickHours = [
    { label: 'On Time (0h)', value: '' },
    { label: '+1 hr', value: '1' },
    { label: '+2 hrs', value: '2' },
    { label: '+3 hrs', value: '3' },
  ];

  const modalContent = (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-2xl w-full max-w-sm flex flex-col gap-4 relative z-[10060]"
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
          <div className="space-y-2">
            <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent-blue" />
              <span>Extended Time (Hours)</span>
            </label>

            {/* 1-Click Quick Options */}
            <div className="grid grid-cols-2 gap-1.5">
              {quickHours.map(opt => {
                const isSelected = taskExtendedTime === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setTaskExtendedTime(opt.value)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center',
                      isSelected
                        ? 'bg-accent-blue/15 border-accent-blue text-accent-blue shadow-xs font-bold'
                        : 'bg-background-primary border-border-subtle hover:border-accent-blue/40 text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="Or custom extra hours (e.g. 1.5)"
                value={taskExtendedTime}
                onChange={e => setTaskExtendedTime(e.target.value)}
                className="w-full h-9 bg-background-primary border border-border-subtle rounded-lg px-3 text-xs text-text-primary focus:border-accent-green transition-all"
              />
            </div>
            <p className="text-[10px] text-text-muted">Select 0h if completed on time, or add extra hours taken.</p>
          </div>
          <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 h-10 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all text-xs cursor-pointer"
            >
              Mark Complete
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
