'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { QuickAddTaskInput, TeammateUser } from '@/components/dashboard/QuickAddTaskInput';
import { QuickAddMeetingModal } from '@/components/dashboard/QuickAddMeetingModal';
import { projectsService } from '@/services/projects';
import { workcenterService, WCTask } from '@/services/workcenter';
import { tasksService } from '@/services/tasks';
import { meetingsService } from '@/services/meetings';
import { usersService } from '@/services/users';
import { Project, Meeting } from '@/types';
import { usePathname } from 'next/navigation';

export default function GlobalQuickAddBar() {
  const { userProfile, sidebarCollapsed } = useStore();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [teammates, setTeammates] = useState<TeammateUser[]>([]);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projRes, wcRes, ptRes, mtRes, usRes] = await Promise.allSettled([
        projectsService.getProjects(),
        workcenterService.getTasks({ page_size: 300 }),
        tasksService.getTasks(),
        meetingsService.getMeetings(),
        usersService.getUsers()
      ]);

      if (projRes.status === 'fulfilled' && projRes.value) {
        setProjects(projRes.value);
      }

      // Merge workcenter + planner tasks for complete conflict checking
      const wcTasks = (wcRes.status === 'fulfilled' && wcRes.value?.tasks) || [];
      const ptTasks = (ptRes.status === 'fulfilled' && ptRes.value) || [];
      
      const map = new Map<number, any>();
      wcTasks.forEach((t: any) => {
        if (!t || !t.id) return;
        map.set(Number(t.id), t);
      });
      ptTasks.forEach((pt: any) => {
        if (!pt || !pt.id) return;
        const idNum = Number(pt.id);
        if (!map.has(idNum)) {
          map.set(idNum, {
            ...pt,
            id: idNum,
            deadline: pt.dueDate || pt.deadline || pt.scheduledDate,
            scheduled_date: pt.scheduledDate || pt.scheduled_date,
            scheduled_start_time: pt.scheduledStartTime || pt.scheduled_start_time,
            scheduled_end_time: pt.scheduledEndTime || pt.scheduled_end_time,
            assigned_to_id: pt.assignedTo?.id ? Number(pt.assignedTo.id) : (pt.assigneeId ? Number(pt.assigneeId) : null)
          });
        }
      });
      setAllTasks(Array.from(map.values()));

      if (mtRes.status === 'fulfilled' && mtRes.value) {
        setMeetings(mtRes.value);
      }

      if (usRes.status === 'fulfilled' && usRes.value) {
        setTeammates(usRes.value.map(u => ({
          id: Number(u.id),
          name: u.name,
          avatar: u.avatar,
          role: u.role,
          department: u.department
        })));
      }
    } catch (e) {
      console.error('Failed to load global quick add data:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoginPage) return;
    loadData();

    // Listen for task creation events from anywhere to refresh internal state
    const handleTaskCreated = () => {
      loadData();
    };
    window.addEventListener('task:created', handleTaskCreated);
    return () => window.removeEventListener('task:created', handleTaskCreated);
  }, [isLoginPage, loadData]);

  if (isLoginPage) return null;

  return (
    <>
      <div 
        className={cn(
          "fixed bottom-4 z-40 transition-all duration-300 pointer-events-none flex justify-center px-4",
          sidebarCollapsed ? "left-16 right-0" : "left-64 right-0"
        )}
      >
        <div className="pointer-events-auto w-full max-w-3xl pr-14 sm:pr-16">
          <QuickAddTaskInput
            isDocked
            dropUp
            projects={projects}
            allTasks={allTasks}
            meetings={meetings}
            teammates={teammates}
            currentUserId={userProfile?.id}
            currentUserName={userProfile?.name}
            onTaskCreated={() => {
              window.dispatchEvent(new CustomEvent('task:created'));
              loadData();
            }}
            onOpenMeetingModal={() => setMeetingModalOpen(true)}
          />
        </div>
      </div>

      <QuickAddMeetingModal
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent('task:created'));
          loadData();
        }}
        teammates={teammates}
        currentUserId={userProfile?.id}
      />
    </>
  );
}
