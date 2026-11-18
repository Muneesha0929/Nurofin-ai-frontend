'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Video, 
  Clock, 
  Calendar, 
  Users, 
  Check, 
  Loader2,
  Trash2,
  ExternalLink,
  Edit3,
  Repeat
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { meetingsService } from '@/services/meetings';
import { Meeting } from '@/types';
import { TeammateUser } from './QuickAddTaskInput';
import { today, isoDay } from './Widgets';

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  meeting: Meeting | null;
  teammates: TeammateUser[];
  currentUserId?: string;
}

export function EditMeetingModal({
  isOpen,
  onClose,
  onUpdated,
  meeting,
  teammates,
  currentUserId
}: EditMeetingModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekdays' | 'weekly' | 'custom'>('none');
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [repeatWeeks, setRepeatWeeks] = useState<number>(8); // Defaults to 8 weeks (2 months)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || '');
      setDate(meeting.date ? meeting.date.slice(0, 10) : today());
      
      const sT = meeting.time || '10:00';
      setStartTime(sT);
      
      // Calculate end time if duration has hours or minutes
      let eT = '11:00';
      if (meeting.duration && meeting.duration.includes('-')) {
        const parts = meeting.duration.split('-');
        if (parts[1]) eT = parts[1].trim();
      } else {
        const sH = parseInt(sT.split(':')[0], 10);
        eT = `${String((sH + 1) % 24).padStart(2, '0')}:00`;
      }
      setEndTime(eT);

      setMeetingLink(meeting.meeting_link || '');
      setNotes(meeting.notes || meeting.agenda || '');
      
      const pIds = (meeting.participants || [])
        .map(p => Number(p.user_id))
        .filter(id => !isNaN(id) && id > 0);
      setSelectedParticipants(pIds);

      // Load recurrence settings
      if (meeting.is_recurring) {
        const rule = meeting.recurrence_rule || 'daily';
        if (rule.startsWith('custom:')) {
          setRecurrence('custom');
          setSelectedDays(rule.replace('custom:', '').split(','));
        } else if (['daily', 'weekdays', 'weekly'].includes(rule)) {
          setRecurrence(rule as any);
        } else {
          setRecurrence('daily');
        }
      } else {
        setRecurrence('none');
      }

      setError(null);
      setSuccessMsg(null);
    }
  }, [meeting, isOpen]);

  if (!isOpen || !meeting || !isMounted) return null;

  const toggleParticipant = (uid: number) => {
    setSelectedParticipants(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleOpenGoogleMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  const handleGenerateTeamRoom = () => {
    const slug = (title.trim() || 'meeting').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const roomCode = Math.random().toString(36).substring(2, 8);
    setMeetingLink(`https://meet.jit.si/nurofin-${slug}-${roomCode}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a meeting title.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isRecurring = recurrence !== 'none';
      const recurrenceRule = recurrence === 'custom' ? `custom:${selectedDays.join(',')}` : (isRecurring ? recurrence : undefined);

      // 1. Update current meeting
      await meetingsService.updateMeeting(meeting.id, {
        title: title.trim(),
        date,
        time: startTime,
        end_time: endTime,
        meeting_link: meetingLink.trim() || null,
        notes: notes.trim() || undefined,
        agenda: notes.trim() || undefined,
        is_recurring: isRecurring,
        recurrence_rule: recurrenceRule,
      } as any);

      // 2. If recurrence is active, schedule future recurring meetings across repeatWeeks
      if (isRecurring) {
        const datesToSchedule: string[] = [];
        const startDt = new Date(date + 'T12:00:00');
        const maxDays = repeatWeeks * 7;

        if (recurrence === 'daily') {
          for (let i = 1; i < maxDays; i++) {
            const nextD = new Date(startDt);
            nextD.setDate(startDt.getDate() + i);
            datesToSchedule.push(nextD.toISOString().split('T')[0]);
          }
        } else if (recurrence === 'weekdays') {
          for (let i = 1; i < maxDays; i++) {
            const nextD = new Date(startDt);
            nextD.setDate(startDt.getDate() + i);
            const day = nextD.getDay();
            if (day >= 1 && day <= 5) {
              datesToSchedule.push(nextD.toISOString().split('T')[0]);
            }
          }
        } else if (recurrence === 'weekly') {
          for (let i = 1; i < repeatWeeks; i++) {
            const nextD = new Date(startDt);
            nextD.setDate(startDt.getDate() + (i * 7));
            datesToSchedule.push(nextD.toISOString().split('T')[0]);
          }
        } else if (recurrence === 'custom') {
          const dayMap: { [k: string]: number } = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
          const selectedNums = selectedDays.map(d => dayMap[d.toLowerCase()]);
          for (let i = 1; i < maxDays; i++) {
            const nextD = new Date(startDt);
            nextD.setDate(startDt.getDate() + i);
            if (selectedNums.includes(nextD.getDay())) {
              datesToSchedule.push(nextD.toISOString().split('T')[0]);
            }
          }
        }

        // Schedule future recurring meetings
        for (const futureDate of datesToSchedule) {
          try {
            await meetingsService.createMeeting({
              title: title.trim(),
              date: futureDate,
              time: startTime,
              end_time: endTime,
              meeting_link: meetingLink.trim() || undefined,
              notes: notes.trim() || undefined,
              participant_ids: selectedParticipants,
              type: 'meeting',
              is_recurring: true,
              recurrence_rule: recurrenceRule,
            });
          } catch (createErr) {
            console.error('Failed to create recurring meeting occurrence:', createErr);
          }
        }
      }

      const durationLabel = repeatWeeks >= 52 
        ? '1 year' 
        : repeatWeeks >= 8 
          ? `${Math.round(repeatWeeks / 4)} months` 
          : `${repeatWeeks} weeks`;

      setSuccessMsg(isRecurring 
        ? `Meeting updated and scheduled ${recurrence} for ${durationLabel}!`
        : 'Meeting updated and rescheduled successfully!'
      );
      setTimeout(() => {
        onUpdated();
        onClose();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('task:created'));
          window.dispatchEvent(new CustomEvent('meeting:updated'));
        }
      }, 700);
    } catch (err: any) {
      console.error('Failed to update meeting:', err);
      setError(err?.detail || err?.message || 'Failed to update meeting. Please check the fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to cancel and delete this meeting?')) return;
    setIsDeleting(true);
    try {
      await meetingsService.deleteMeeting(meeting.id);
      onUpdated();
      onClose();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('task:created'));
        window.dispatchEvent(new CustomEvent('meeting:updated'));
      }
    } catch (err: any) {
      console.error('Failed to delete meeting:', err);
      setError('Failed to delete meeting.');
    } finally {
      setIsDeleting(false);
    }
  };

  const timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '20:00'
  ];

  const modalNode = (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs normal-case animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-background-secondary border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-text-primary animate-in zoom-in-95 duration-150"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0"
          style={{ backgroundColor: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center">
              <Edit3 size={16} />
            </span>
            <div>
              <h3 className="text-base font-bold text-text-primary">Edit / Reschedule Meeting</h3>
              <p className="text-[11px] text-text-secondary">Update timing, video link, or reschedule to other days</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-background-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
              <Check size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">
              Meeting Title <span className="text-accent-red">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Sprint Sync with Sir"
              style={{ backgroundColor: 'var(--surface-card)' }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle focus:border-accent-blue outline-none text-xs font-semibold text-text-primary transition-colors"
            />
          </div>

          {/* Date & Quick Reschedule Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Calendar size={13} className="text-accent-blue" />
                <span>Date & Schedule</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(today())}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer",
                    date === today() 
                      ? "bg-accent-blue text-white border-accent-blue" 
                      : "bg-surface-card hover:bg-surface-hover text-text-secondary border-border-subtle"
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(Date.now() + 86400000);
                    setDate(isoDay(d));
                  }}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer",
                    date === isoDay(new Date(Date.now() + 86400000))
                      ? "bg-accent-blue text-white border-accent-blue" 
                      : "bg-surface-card hover:bg-surface-hover text-text-secondary border-border-subtle"
                  )}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
                    setDate(isoDay(d));
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-surface-card hover:bg-surface-hover text-text-secondary border-border-subtle transition-all cursor-pointer"
                >
                  Next Mon
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ backgroundColor: 'var(--surface-card)' }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle focus:border-accent-blue outline-none text-xs font-semibold text-text-primary transition-colors"
            />
          </div>

          {/* Time Slot Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-accent-blue" />
                <span>Start Time</span>
              </label>
              <select
                value={startTime}
                onChange={e => {
                  const s = e.target.value;
                  setStartTime(s);
                  const sH = parseInt(s.split(':')[0], 10);
                  setEndTime(`${String((sH + 1) % 24).padStart(2, '0')}:00`);
                }}
                style={{ backgroundColor: 'var(--surface-card)' }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle focus:border-accent-blue outline-none text-xs font-semibold text-text-primary transition-colors cursor-pointer"
              >
                {timeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5">
                End Time
              </label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{ backgroundColor: 'var(--surface-card)' }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle focus:border-accent-blue outline-none text-xs font-semibold text-text-primary transition-colors cursor-pointer"
              >
                {timeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Repeat / Recurrence Options (Google Meet Style) */}
          <div 
            className="p-3.5 rounded-2xl border border-border-subtle space-y-3"
            style={{ backgroundColor: 'var(--surface-card)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Repeat size={13} className="text-accent-blue" />
                <span>Repeat Schedule (Google Meet Style)</span>
              </label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as any)}
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                className="px-2.5 py-1.5 border border-border-subtle rounded-xl text-xs font-semibold text-text-primary outline-none focus:border-accent-blue cursor-pointer"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily (Every day)</option>
                <option value="weekdays">Every weekday (Monday to Friday)</option>
                <option value="weekly">Weekly on this day</option>
                <option value="custom">Custom particular days...</option>
              </select>
            </div>

            {/* Custom Particular Days Picker (e.g. Mon, Wed, Fri) */}
            {recurrence === 'custom' && (
              <div className="space-y-1.5 pt-2 border-t border-border-subtle/50">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                  Select Days of the Week:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'mon', label: 'Mon' },
                    { key: 'tue', label: 'Tue' },
                    { key: 'wed', label: 'Wed' },
                    { key: 'thu', label: 'Thu' },
                    { key: 'fri', label: 'Fri' },
                    { key: 'sat', label: 'Sat' },
                    { key: 'sun', label: 'Sun' },
                  ].map(d => {
                    const isSelected = selectedDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => {
                          setSelectedDays(prev => 
                            isSelected ? prev.filter(k => k !== d.key) : [...prev, d.key]
                          );
                        }}
                        className={cn(
                          'w-9 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer border text-center',
                          isSelected
                            ? 'bg-accent-blue text-white border-accent-blue shadow-xs font-bold'
                            : 'bg-background-secondary border-border-subtle text-text-secondary hover:text-text-primary'
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Repeat Duration */}
            {recurrence !== 'none' && (
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50 text-xs">
                <span className="text-[11px] font-semibold text-text-secondary">Repeat for:</span>
                <select
                  value={repeatWeeks}
                  onChange={e => setRepeatWeeks(Number(e.target.value))}
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                  className="px-2.5 py-1.5 border border-border-subtle rounded-xl text-xs font-semibold text-text-primary outline-none cursor-pointer"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={4}>4 weeks (1 Month)</option>
                  <option value={8}>8 weeks (2 Months)</option>
                  <option value={12}>12 weeks (3 Months)</option>
                  <option value={26}>26 weeks (6 Months)</option>
                  <option value={52}>52 weeks (1 Year)</option>
                </select>
              </div>
            )}
          </div>

          {/* Meeting Link with generator options */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Video size={13} className="text-accent-blue" />
                <span>Meeting Video Link</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenGoogleMeet}
                  className="text-[10px] font-semibold text-accent-blue hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <span>Google Meet</span>
                  <ExternalLink size={9} />
                </button>
                <span className="text-text-secondary/50">•</span>
                <button
                  type="button"
                  onClick={handleGenerateTeamRoom}
                  className="text-[10px] font-semibold text-purple-500 hover:underline cursor-pointer"
                >
                  Generate Room
                </button>
              </div>
            </div>
            <input
              type="url"
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/xyz or https://meet.jit.si/..."
              style={{ backgroundColor: 'var(--surface-card)' }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle focus:border-accent-blue outline-none text-xs font-semibold text-text-primary transition-colors"
            />
          </div>

          {/* Agenda / Notes */}
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">
              Agenda / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add key discussion topics or reminders..."
              style={{ backgroundColor: 'var(--surface-card)' }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle focus:border-accent-blue outline-none text-xs text-text-primary transition-colors resize-none"
            />
          </div>

          {/* Participants */}
          {teammates.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5 flex items-center gap-1.5">
                <Users size={13} className="text-accent-blue" />
                <span>Participants ({selectedParticipants.length} invited)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-border-subtle/60 rounded-xl">
                {teammates.map(u => {
                  const isSelected = selectedParticipants.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleParticipant(u.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        isSelected 
                          ? "bg-accent-blue text-white shadow-xs" 
                          : "bg-surface-card hover:bg-surface-hover text-text-secondary border border-border-subtle"
                      )}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-accent-blue/20 text-accent-blue text-[9px] font-bold flex items-center justify-center shrink-0">
                          {u.name.slice(0, 1)}
                        </span>
                      )}
                      <span>{u.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-accent-red hover:bg-accent-red/10 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Cancel Meeting</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting || !title.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
