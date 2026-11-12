'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Video, 
  Clock, 
  Calendar, 
  Users, 
  AlignLeft, 
  Check, 
  Loader2,
  Sparkles,
  ExternalLink,
  Repeat
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { meetingsService } from '@/services/meetings';
import { today } from './Widgets';
import { TeammateUser } from './QuickAddTaskInput';

interface QuickAddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  teammates: TeammateUser[];
  currentUserId: string;
}

export function QuickAddMeetingModal({
  isOpen,
  onClose,
  onCreated,
  teammates,
  currentUserId
}: QuickAddMeetingModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  
  // Default to next nearest 30 min block
  const now = new Date();
  const nextHour = (now.getHours() + 1) % 24;
  const defStart = `${String(nextHour).padStart(2, '0')}:00`;
  const defEnd = `${String((nextHour + 1) % 24).padStart(2, '0')}:00`;

  const [startTime, setStartTime] = useState(defStart);
  const [endTime, setEndTime] = useState(defEnd);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekdays' | 'weekly' | 'custom'>('none');
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [repeatWeeks, setRepeatWeeks] = useState(2);
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isOpen) return null;

  const toggleParticipant = (uid: number) => {
    setSelectedParticipants(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleOpenGoogleMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
    setLinkNotice('Google Meet opened in a new tab! Once your room loads, copy its URL and paste it below.');
  };

  const handleUseInstantGoogleMeet = () => {
    setMeetingLink('https://meet.google.com/new');
    setLinkNotice('Using Google Meet instant launcher link.');
  };

  const handleGenerateTeamRoom = () => {
    const slug = (title.trim() || 'meeting').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const roomCode = Math.random().toString(36).substring(2, 8);
    setMeetingLink(`https://meet.jit.si/nurofin-${slug}-${roomCode}`);
    setLinkNotice('Generated instant browser video room (no Google account needed).');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a meeting title.');
      return;
    }

    if (selectedParticipants.length === 0) {
      setError('Please select at least one teammate to invite.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const datesToSchedule: string[] = [date];
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

      for (const d of datesToSchedule) {
        await meetingsService.createMeeting({
          title: title.trim(),
          date: d,
          time: startTime,
          end_time: endTime,
          meeting_link: meetingLink.trim() || undefined,
          notes: notes.trim() || undefined,
          participant_ids: selectedParticipants,
          type: 'meeting',
          is_recurring: recurrence !== 'none',
          recurrence_rule: recurrence === 'custom' ? `custom:${selectedDays.join(',')}` : recurrence,
        });
      }

      // Reset
      setTitle('');
      setMeetingLink('');
      setNotes('');
      setSelectedParticipants([]);
      setRecurrence('none');
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create meeting:', err);
      setError(err?.message || err?.detail || 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs normal-case animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-[10060]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-background-primary/40">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center">
              <Video size={16} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-text-primary">Schedule Meeting</h2>
              <p className="text-[11px] text-text-secondary">Invited teammates will receive an RSVP in their My Day</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-background-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[11.5px] font-semibold text-text-secondary mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q4 Executive Strategy Sync"
              required
              className="w-full px-3.5 py-2 bg-background-primary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none transition-colors"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-accent-blue" /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-background-primary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <Clock size={12} className="text-accent-blue" /> Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-background-primary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <Clock size={12} className="text-accent-blue" /> End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-background-primary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none"
              />
            </div>
          </div>

          {/* Recurrence / Repeat Option (Google Meet Style) */}
          <div className="p-3 bg-background-primary/60 border border-border-subtle rounded-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11.5px] font-semibold text-text-primary flex items-center gap-1.5">
                <Repeat size={12} className="text-accent-blue" />
                <span>Repeat Schedule (Google Meet Style)</span>
              </label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as any)}
                className="px-2.5 py-1.5 bg-background-secondary border border-border-subtle rounded-lg text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer"
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
              <div className="space-y-1.5 pt-1.5 border-t border-border-subtle/50">
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
                            ? 'bg-accent-blue text-white border-accent-blue shadow-2xs font-bold'
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
              <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle/40 text-xs">
                <span className="text-[11px] text-text-secondary">Repeat for:</span>
                <select
                  value={repeatWeeks}
                  onChange={e => setRepeatWeeks(Number(e.target.value))}
                  className="px-2 py-1 bg-background-secondary border border-border-subtle rounded-md text-[11px] text-text-primary outline-none cursor-pointer"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks (Recommended)</option>
                  <option value={4}>4 weeks (1 Month)</option>
                  <option value={8}>8 weeks (2 Months)</option>
                </select>
              </div>
            )}
          </div>

          {/* Video / Call Link */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-[11.5px] font-semibold text-text-secondary flex items-center gap-1">
                <Video size={12} className="text-accent-blue" /> Meeting Link (Optional)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenGoogleMeet}
                  title="Opens real Google Meet in a new tab so you can copy the live room link"
                  className="text-[11px] font-semibold text-accent-blue hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ExternalLink size={10} /> Open Google Meet
                </button>
                <span className="text-text-muted text-[10px]">|</span>
                <button
                  type="button"
                  onClick={handleGenerateTeamRoom}
                  title="Generates a 100% working browser video room"
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  + Instant Video Room
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="url"
                value={meetingLink}
                onChange={e => {
                  setMeetingLink(e.target.value);
                  setLinkNotice(null);
                }}
                placeholder="Paste real Google Meet link (e.g. https://meet.google.com/abc-defg-hij)"
                className="w-full px-3.5 py-2 bg-background-primary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none pr-8"
              />
              {meetingLink && (
                <button
                  type="button"
                  onClick={() => { setMeetingLink(''); setLinkNotice(null); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {linkNotice && (
              <p className="text-[11px] text-accent-blue flex items-center gap-1">
                <Check size={11} /> {linkNotice}
              </p>
            )}
          </div>

          {/* Participants Multi-Select */}
          <div>
            <label className="block text-[11.5px] font-semibold text-text-secondary mb-1.5 flex items-center gap-1">
              <Users size={12} className="text-accent-blue" /> Invite Teammates * ({selectedParticipants.length} selected - at least 1 required)
            </label>
            <div className="p-2 bg-background-primary border border-border-subtle rounded-xl max-h-36 overflow-y-auto space-y-1">
              {teammates
                .filter(u => String(u.id) !== String(currentUserId))
                .map(u => {
                  const selected = selectedParticipants.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleParticipant(u.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer',
                        selected ? 'bg-accent-blue/15 text-accent-blue font-semibold' : 'hover:bg-background-secondary text-text-primary'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-accent-blue/15 text-accent-blue flex items-center justify-center text-[10px] font-bold shrink-0">
                            {u.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate">{u.name}</span>
                        {u.department && <span className="text-[10px] text-text-secondary truncate">({u.department})</span>}
                      </div>
                      {selected && <Check size={13} className="text-accent-blue shrink-0" />}
                    </button>
                  );
                })}
            </div>
            <p className="text-[10px] text-text-secondary mt-1">Invited members receive an in-app invite with Accept / Decline buttons in their My Day.</p>
          </div>

          {/* Notes / Agenda */}
          <div>
            <label className="block text-[11.5px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <AlignLeft size={12} className="text-accent-blue" /> Agenda / Description
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Topics to discuss, attachments or key agenda items..."
              className="w-full px-3.5 py-2 bg-background-primary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
              <span>Schedule Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return isMounted && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
