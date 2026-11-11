'use client';

import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Video, 
  Plus, 
  Search, 
  Check, 
  AlertTriangle,
  Calendar,
  Briefcase
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { WCTask } from '@/services/workcenter';
import { Meeting } from '@/types';
import { today } from './Widgets';
import { TeammateUser } from './QuickAddTaskInput';

interface CeoTeamPulseProps {
  teammates: TeammateUser[];
  tasks: WCTask[];
  meetings: Meeting[];
  onOpenTaskPanel: (t: WCTask) => void;
  onAssignToTeammate: (user: TeammateUser) => void;
}

export function CeoTeamPulse({
  teammates,
  tasks,
  meetings,
  onOpenTaskPanel,
  onAssignToTeammate
}: CeoTeamPulseProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const now = today();

  // Departments list
  const departments = Array.from(new Set(teammates.map(u => u.department).filter(Boolean))) as string[];

  // Filter teammates
  const filteredTeammates = teammates.filter(u => {
    const matchesSearch = !search || 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      (u.role && u.role.toLowerCase().includes(search.toLowerCase()));
    const matchesDept = selectedDept === 'all' || u.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Calculate team-wide daily summary
  const teamTodayTasks = tasks.filter(t => t.deadline?.slice(0, 10) === now);
  const teamCompletedToday = teamTodayTasks.filter(t => t.status === 'completed' || t.status === 'done');
  const teamInProgressToday = teamTodayTasks.filter(t => t.status !== 'completed' && t.status !== 'done');
  const teamMeetingsToday = meetings.filter(m => m.date === now);

  return (
    <div className="flex flex-col gap-5 normal-case">
      {/* Top Banner: CEO Team Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1 shadow-xs">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Total Teammates</span>
          <b className="text-2xl font-black text-text-primary">{teammates.length}</b>
        </div>
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1 shadow-xs">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">In Progress Today</span>
          <b className="text-2xl font-black text-accent-blue">{teamInProgressToday.length}</b>
        </div>
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1 shadow-xs">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Completed Today</span>
          <b className="text-2xl font-black text-emerald-500">{teamCompletedToday.length}</b>
        </div>
        <div className="p-3.5 bg-background-secondary border border-border-subtle rounded-2xl flex flex-col gap-1 shadow-xs">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Meetings Today</span>
          <b className="text-2xl font-black text-purple-500">{teamMeetingsToday.length}</b>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter teammates..."
              className="w-full pl-8 pr-3 py-1.5 bg-background-secondary border border-border-subtle focus:border-accent-blue rounded-xl text-xs text-text-primary outline-none"
            />
          </div>

          {departments.length > 0 && (
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 bg-background-secondary border border-border-subtle rounded-xl text-xs text-text-primary outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>

        <span className="text-xs text-text-secondary self-start sm:self-auto">
          Showing {filteredTeammates.length} members
        </span>
      </div>

      {/* Teammates Workload Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTeammates.map(u => {
          const userTasks = tasks.filter(t => String(t.assigned_to_id) === String(u.id));
          const userTodayTasks = userTasks.filter(t => t.deadline?.slice(0, 10) === now);
          const userActiveTasks = userTodayTasks.filter(t => t.status !== 'completed' && t.status !== 'done');
          const userOverdueTasks = userTasks.filter(t => t.deadline && t.deadline.slice(0, 10) < now && t.status !== 'completed');
          const userMeetings = meetings.filter(m => 
            m.date === now && (
              String(m.owner_id) === String(u.id) || 
              m.participants?.some(p => String(p.user_id) === String(u.id)) ||
              m.attendees?.includes(u.name)
            )
          );

          // Determine capacity status
          let statusBadge = { label: 'Free', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
          if (userActiveTasks.length > 6 || userOverdueTasks.length > 2) {
            statusBadge = { label: 'Overloaded', color: 'bg-accent-red/10 text-accent-red border-accent-red/20' };
          } else if (userActiveTasks.length >= 3) {
            statusBadge = { label: 'Busy', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
          } else if (userActiveTasks.length > 0 || userMeetings.length > 0) {
            statusBadge = { label: 'Balanced', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
          }

          return (
            <div
              key={u.id}
              className="bg-background-secondary border border-border-subtle rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-accent-blue/40 transition-all gap-3.5"
            >
              {/* Header: User Profile & Workload Badge */}
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
                    <h4 className="text-[13.5px] font-bold text-text-primary truncate">{u.name}</h4>
                    <p className="text-[11px] text-text-secondary truncate">
                      {u.role || 'Teammate'} {u.department ? `· ${u.department}` : ''}
                    </p>
                  </div>
                </div>

                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0', statusBadge.color)}>
                  {statusBadge.label}
                </span>
              </div>

              {/* Today's Tasks for this member */}
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-bold text-text-secondary uppercase tracking-wider block">
                  Today&apos;s Tasks ({userActiveTasks.length})
                </span>

                {userActiveTasks.length === 0 ? (
                  <p className="text-[11.5px] text-text-secondary/70 italic py-1">
                    No active tasks assigned for today.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {userActiveTasks.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpenTaskPanel(t)}
                        className="w-full flex items-center justify-between gap-2 p-1.5 rounded-lg bg-background-primary/60 hover:bg-background-primary text-left text-xs transition-colors cursor-pointer group"
                      >
                        <span className="truncate group-hover:text-accent-blue font-medium">{t.title}</span>
                        {t.project_name && (
                          <span className="text-[9.5px] text-text-secondary shrink-0">#{t.project_name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Meetings for this member */}
              {userMeetings.length > 0 && (
                <div className="space-y-1 pt-1.5 border-t border-border-subtle/50">
                  <span className="text-[10.5px] font-bold text-text-secondary uppercase tracking-wider block">
                    Today&apos;s Meetings ({userMeetings.length})
                  </span>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {userMeetings.map(m => {
                      const userParticipant = m.participants?.find(p => String(p.user_id) === String(u.id));
                      const isAccepted = userParticipant?.status === 'accepted';
                      return (
                        <div key={m.id} className="flex items-center justify-between text-xs text-text-secondary py-0.5">
                          <span className="truncate flex items-center gap-1.5">
                            <Video size={11} className="text-purple-500 shrink-0" />
                            <span>{m.title}</span>
                          </span>
                          <span className={cn('text-[9.5px] font-semibold shrink-0', isAccepted ? 'text-emerald-500' : 'text-amber-500')}>
                            {m.time} {isAccepted ? '✔' : '⏳'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Quick-Assign Button */}
              <div className="pt-2 border-t border-border-subtle flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onAssignToTeammate(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-blue/10 hover:bg-accent-blue hover:text-white text-accent-blue text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  <Plus size={12} />
                  <span>Assign Task</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
