'use client';

import React, { useState } from 'react';
import {
  Clock,
  Video,
  Plus,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask, workcenterService } from '@/services/workcenter';
import { Meeting } from '@/types';
import { today } from './Widgets';
import { TeammateUser } from './QuickAddTaskInput';
import { useStore } from '@/lib/store';

interface CeoTeamPulseProps {
  teammates: TeammateUser[];
  tasks: WCTask[];
  meetings: Meeting[];
  onOpenTaskPanel: (t: WCTask) => void;
  onAssignToTeammate: (user: TeammateUser) => void;
  onRefresh?: () => void;
}

const isDoneStatus = (status?: string) =>
  ['completed', 'done', 'resolved', 'closed'].includes(String(status || '').toLowerCase());

const isCompletedToday = (t: WCTask, now: string): boolean => {
  if (!isDoneStatus(t.status)) return false;
  const doneDay = (t.actual_completion_date || '').slice(0, 10);
  if (doneDay) return doneDay === now;
  const hist = (t.completion_date_history || []).find(
    h => h.new_value && (h.new_value === 'completed' || h.new_value === 'done' || /^\d{4}-\d{2}-\d{2}/.test(h.new_value))
  );
  const histDay = (hist?.changed_at || hist?.new_value || '').slice(0, 10);
  if (histDay) return histDay === now;
  return (t.scheduled_date || t.deadline || '').slice(0, 10) === now;
};

const toMinutes = (hhmm?: string | null): number | null => {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export function CeoTeamPulse({
  teammates,
  tasks,
  meetings,
  onOpenTaskPanel,
  onAssignToTeammate,
  onRefresh,
}: CeoTeamPulseProps) {
  const { searchQuery } = useStore();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  const [noteTaskId, setNoteTaskId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  const now = today();
  const currentTime = new Date();
  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

  const effectiveSearch = (search || searchQuery || '').trim().toLowerCase();
  const departments = Array.from(new Set(teammates.map(u => u.department).filter(Boolean))) as string[];

  const filteredTeammates = teammates.filter(u => {
    if (selectedEmpId !== 'all' && String(u.id) !== selectedEmpId) return false;
    const matchesSearch =
      !effectiveSearch ||
      u.name.toLowerCase().includes(effectiveSearch) ||
      (u.role && u.role.toLowerCase().includes(effectiveSearch)) ||
      (u.department && u.department.toLowerCase().includes(effectiveSearch));
    const matchesDept = selectedDept === 'all' || u.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Active tasks scheduled for today + ONLY tasks completed today (exclude completed yesterday or earlier)
  const teamInProgressToday = tasks.filter(
    t => !isDoneStatus(t.status) && (t.scheduled_date || t.deadline || '').slice(0, 10) === now
  );
  const teamCompletedToday = tasks.filter(t => isCompletedToday(t, now));
  const teamTodayTasks = [...teamInProgressToday, ...teamCompletedToday];
  const teamMeetingsToday = meetings.filter(m => m.date === now && m.status !== 'cancelled');

  const sendCeoInstruction = async (task: WCTask, customMessage?: string) => {
    const content = (customMessage ?? noteText).trim();
    if (!content) return;
    setSendingNote(true);
    try {
      await workcenterService.addComment(task.id, { content: `[CEO Update] ${content}` });
      setNoteText('');
      setNoteTaskId(null);
      onRefresh?.();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('task:created'));
    } catch (err) {
      console.error('Failed to send CEO instruction:', err);
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 normal-case">
      {/* Top Team Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Members</span>
          <b className="text-2xl font-black text-text-primary">{filteredTeammates.length}</b>
        </div>
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Scheduled Active Today</span>
          <b className="text-2xl font-black text-accent-blue">{teamInProgressToday.length}</b>
        </div>
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Completed Today</span>
          <b className="text-2xl font-black text-emerald-500">{teamCompletedToday.length}</b>
        </div>
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Meetings Today</span>
          <b className="text-2xl font-black text-purple-500">{teamMeetingsToday.length}</b>
        </div>
      </div>

      {/* Filter by Employee, Department, and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-8 pr-3 py-1.5 bg-background-secondary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none"
            />
          </div>

          <select
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
            aria-label="Filter by employee"
            className="px-2.5 py-1.5 bg-background-secondary border border-border-subtle rounded-xl text-xs text-text-primary outline-none"
          >
            <option value="all">All Employees</option>
            {teammates.map(u => (
              <option key={u.id} value={String(u.id)}>{u.name}</option>
            ))}
          </select>

          {departments.length > 0 && (
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              aria-label="Filter by department"
              className="px-2.5 py-1.5 bg-background-secondary border border-border-subtle rounded-xl text-xs text-text-primary outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>

        <span className="text-xs text-text-secondary">
          Showing {filteredTeammates.length} member{filteredTeammates.length !== 1 ? 's' : ''} · Today ({now})
        </span>
      </div>

      {/* Employee Cards with Time-Block Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTeammates.map(u => {
          const activeToday = teamInProgressToday
            .filter(t => String(t.assigned_to_id) === String(u.id))
            .sort((a, b) => (a.scheduled_start_time || '99:99').localeCompare(b.scheduled_start_time || '99:99'));

          const completedToday = teamCompletedToday
            .filter(t => String(t.assigned_to_id) === String(u.id))
            .sort((a, b) => (a.scheduled_start_time || '99:99').localeCompare(b.scheduled_start_time || '99:99'));

          const userScheduledToday = [...activeToday, ...completedToday];

          // Infer live status from wall-clock time
          const carryOverTask = activeToday.find(t => {
            const endM = toMinutes(t.scheduled_end_time);
            return endM !== null && endM <= currentMins;
          });
          const currentSlotTask = activeToday.find(t => {
            const startM = toMinutes(t.scheduled_start_time);
            const endM = toMinutes(t.scheduled_end_time) ?? (startM !== null ? startM + 60 : null);
            return startM !== null && endM !== null && currentMins >= startM && currentMins < endM;
          });

          const userMeetings = teamMeetingsToday.filter(
            m =>
              String(m.owner_id) === String(u.id) ||
              m.participants?.some(p => String(p.user_id) === String(u.id)) ||
              m.attendees?.includes(u.name)
          );

          let liveStatusLabel = 'No active slot right now';
          let liveStatusCls = 'bg-background-primary text-text-secondary border-border-subtle';
          if (carryOverTask) {
            liveStatusLabel = `Still working on ${carryOverTask.scheduled_start_time || ''}–${carryOverTask.scheduled_end_time || ''} task`;
            liveStatusCls = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
          } else if (currentSlotTask) {
            liveStatusLabel = `Working now (${currentSlotTask.scheduled_start_time}–${currentSlotTask.scheduled_end_time || ''})`;
            liveStatusCls = 'bg-accent-blue/15 text-accent-blue border-accent-blue/30';
          } else if (userScheduledToday.length > 0 && activeToday.length === 0) {
            liveStatusLabel = 'All today’s tasks completed';
            liveStatusCls = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
          }

          return (
            <div
              key={u.id}
              className="bg-background-secondary border border-border-subtle rounded-2xl p-4 flex flex-col gap-3"
            >
              {/* Employee Heading + Live Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-border-subtle" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-accent-blue/15 text-accent-blue flex items-center justify-center text-xs font-bold shrink-0">
                      {u.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-text-primary truncate">{u.name}</h4>
                    <p className="text-[11px] text-text-secondary truncate">
                      {u.role || 'Teammate'} {u.department ? `· ${u.department}` : ''}
                    </p>
                  </div>
                </div>
                <span className={cn('text-[10.5px] font-bold px-2.5 py-1 rounded-lg border shrink-0', liveStatusCls)}>
                  {liveStatusLabel}
                </span>
              </div>

              {/* Today's Scheduled Active Tasks + Completed Today */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-text-secondary uppercase tracking-wider">
                  <span>Planned Today ({activeToday.length} active)</span>
                  {completedToday.length > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {completedToday.length} completed today
                    </span>
                  )}
                </div>

                {activeToday.length === 0 && completedToday.length === 0 ? (
                  <p className="text-xs text-text-secondary italic py-1">No tasks scheduled or completed today.</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {activeToday.map(t => {
                      const done = false;
                      const isCarry = carryOverTask && carryOverTask.id === t.id;
                      const isNow = currentSlotTask && currentSlotTask.id === t.id;
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            'p-2.5 rounded-xl border space-y-1.5',
                            done
                              ? 'bg-background-primary/40 border-border-subtle opacity-65'
                              : isCarry
                                ? 'bg-amber-500/5 border-amber-500/35'
                                : isNow
                                  ? 'bg-accent-blue/5 border-accent-blue/35'
                                  : 'bg-background-primary border-border-subtle'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenTaskPanel(t)}
                              className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
                            >
                              {done ? (
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                              ) : isCarry ? (
                                <AlertCircle size={13} className="text-amber-500 shrink-0" />
                              ) : (
                                <Clock size={13} className="text-accent-blue shrink-0" />
                              )}
                              <span className={cn('text-xs font-semibold truncate group-hover:text-accent-blue', done && 'line-through')}>
                                {t.title}
                              </span>
                            </button>

                            <span className="font-mono text-[10.5px] font-bold text-accent-blue shrink-0">
                              {t.scheduled_start_time ? `${t.scheduled_start_time}–${t.scheduled_end_time || ''}` : 'Anytime'}
                            </span>
                          </div>

                          {!done && (
                            <div className="flex items-center justify-between gap-2 text-[10.5px]">
                              <span className="text-text-secondary">
                                {isCarry ? 'Still in progress (slot elapsed)' : isNow ? 'Currently active slot' : 'Scheduled'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => sendCeoInstruction(t, 'Please prioritize other urgent work and do this task later.')}
                                  className="px-2 py-0.5 rounded bg-background-secondary border border-border-subtle hover:border-accent-blue text-text-secondary hover:text-text-primary font-semibold cursor-pointer"
                                  title="Send notification to employee to do this later"
                                >
                                  Do Later
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setNoteTaskId(noteTaskId === t.id ? null : t.id); setNoteText(''); }}
                                  className="px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 font-semibold cursor-pointer"
                                >
                                  Update / Notify
                                </button>
                              </div>
                            </div>
                          )}

                          {noteTaskId === t.id && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                autoFocus
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder={`Message ${u.name.split(' ')[0]} (triggers notification)...`}
                                className="flex-1 rounded-lg border border-border-subtle bg-background-secondary px-2.5 py-1 text-xs outline-none focus:border-accent-blue"
                              />
                              <button
                                type="button"
                                disabled={sendingNote || !noteText.trim()}
                                onClick={() => sendCeoInstruction(t)}
                                className="px-2.5 py-1 rounded-lg bg-accent-blue text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                              >
                                <Send size={11} /> Send
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {completedToday.length > 0 && (
                <div className="pt-2 border-t border-border-subtle/50 space-y-1.5">
                  <div className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Completed Today ({completedToday.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {completedToday.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpenTaskPanel(t)}
                        className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/25 hover:border-emerald-500/50 text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span className="text-xs font-semibold text-text-primary line-through truncate">{t.title}</span>
                        </span>
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {t.scheduled_start_time ? `${t.scheduled_start_time}–${t.scheduled_end_time || ''}` : 'Done today'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {userMeetings.length > 0 && (
                <div className="pt-2 border-t border-border-subtle/50 space-y-1">
                  <div className="text-[10.5px] font-bold text-text-secondary uppercase tracking-wider">
                    Meetings ({userMeetings.length})
                  </div>
                  {userMeetings.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs text-text-secondary">
                      <span className="truncate flex items-center gap-1.5">
                        <Video size={11} className="text-purple-500 shrink-0" />
                        <span>{m.title}</span>
                      </span>
                      <span className="font-mono text-[10.5px] shrink-0">{m.time}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border-subtle flex justify-end">
                <button
                  type="button"
                  onClick={() => onAssignToTeammate(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-blue/10 hover:bg-accent-blue hover:text-white text-accent-blue text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus size={12} /> Assign Task
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
