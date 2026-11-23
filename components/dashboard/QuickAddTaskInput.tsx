'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Hash, 
  CornerDownRight, 
  AtSign, 
  Calendar, 
  Clock,
  X, 
  Check, 
  CheckSquare,
  Video, 
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { workcenterService, WCTask } from '@/services/workcenter';
import { issuesService } from '@/services/issues';
import { Project, Task, Meeting } from '@/types';
import { today, isoDay } from './Widgets';

export interface TeammateUser {
  id: number;
  name: string;
  avatar?: string | null;
  role?: string | null;
  department?: string | null;
}

interface QuickAddTaskInputProps {
  projects?: Project[];
  allTasks?: (WCTask | Task | any)[];
  meetings?: Meeting[];
  teammates?: TeammateUser[];
  currentUserId?: string;
  currentUserName?: string;
  onTaskCreated?: () => void;
  onOpenMeetingModal?: () => void;
  prefillAssignee?: TeammateUser | null;
  isDocked?: boolean;
  dropUp?: boolean;
}

export function QuickAddTaskInput({
  projects = [],
  allTasks = [],
  meetings = [],
  teammates = [],
  currentUserId = '',
  currentUserName = '',
  onTaskCreated,
  onOpenMeetingModal,
  prefillAssignee,
  isDocked = false,
  dropUp = false
}: QuickAddTaskInputProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<number | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<string>(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 - 11:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Time slot conflict detection prompt
  const [conflictPrompt, setConflictPrompt] = useState<{
    cleanTitle: string;
    targetDate: string;
    finalAssigneeId?: number;
    existingTitle: string;
    conflictingType: 'task' | 'meeting';
    currentSlot: string;
    currentStart: string;
    currentEnd: string;
    nextSlot: string;
    nextStart: string;
    nextEnd: string;
  } | null>(null);

  // Active autocomplete trigger popup: null | 'project' | 'subtask' | 'assignee'
  const [activeTrigger, setActiveTrigger] = useState<'project' | 'subtask' | 'assignee' | null>(null);
  const [triggerQuery, setTriggerQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Issue mode toggle (!)
  const [isIssue, setIsIssue] = useState(false);
  const [autoAssignNotice, setAutoAssignNotice] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // If prefilled assignee is provided (e.g. from CEO Team Pulse "+ Assign Task")
  useEffect(() => {
    if (prefillAssignee) {
      setSelectedAssigneeId(prefillAssignee.id);
      inputRef.current?.focus();
    }
  }, [prefillAssignee]);

  const parseHour = (timeStr: string): number => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim().toLowerCase();
    const isPM = str.includes('pm');
    const isAM = str.includes('am');
    const match = str.match(/(\d{1,2})/);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h;
  };

  // Robust check for whether a slot is occupied across all tasks & meetings (across all projects)
  const checkOccupantSlot = (sH: number, eH: number, dateStr?: string, assigneeId?: number) => {
    const targetDate = (dateStr || deadline || today()).slice(0, 10);
    const finalAssignee = assigneeId || selectedAssigneeId || (currentUserId ? parseInt(currentUserId, 10) : undefined);

    // 1. Task check (across all projects for this user)
    const tConf = allTasks.find(t => {
      if (t.status === 'completed' || t.status === 'done') return false;
      const tAssignee = t.assigned_to_id || t.assignedTo?.id || t.assigneeId;
      if (finalAssignee && tAssignee && String(tAssignee) !== String(finalAssignee)) return false;

      const tDate = (t.scheduled_date || t.scheduledDate || t.deadline || t.dueDate || '')?.slice(0, 10);
      if (!tDate || tDate !== targetDate) return false;

      const tStart = t.scheduled_start_time || t.scheduledStartTime || t.start_time || t.time;
      const tEnd = t.scheduled_end_time || t.scheduledEndTime || t.end_time;
      if (!tStart) return false;

      const tStartH = parseHour(String(tStart));
      const tEndH = tEnd ? parseHour(String(tEnd)) : (tStartH + 1);

      return sH < tEndH && eH > tStartH;
    });

    if (tConf) return { occupied: true, title: tConf.title, type: 'task' as const };

    // 2. Meeting check (across all projects for this user)
    if (meetings && meetings.length > 0) {
      const mConf = meetings.find(m => {
        if (m.status === 'completed' || m.status === 'cancelled') return false;
        const isUserIn = !finalAssignee || 
          String(m.owner_id) === String(finalAssignee) ||
          m.participants?.some(p => String(p.user_id) === String(finalAssignee) && p.status !== 'declined') ||
          (m.attendees && m.attendees.includes(currentUserName));
        if (!isUserIn) return false;

        const mDate = m.date?.slice(0, 10);
        if (!mDate || mDate !== targetDate) return false;
        if (!m.time) return false;

        const mStartH = parseHour(String(m.time));
        const mEndH = m.end_time ? parseHour(String(m.end_time)) : (mStartH + 1);

        return sH < mEndH && eH > mStartH;
      });

      if (mConf) return { occupied: true, title: mConf.title, type: 'meeting' as const };
    }

    return { occupied: false, title: '', type: 'task' as const };
  };

  const isSlotOccupied = (startH: number) => {
    return checkOccupantSlot(startH, startH + 1).occupied;
  };

  // Find who is free at target date and hour slot (for auto-assigning issues; strictly excludes CEO)
  const findFreeTeammate = (targetDate: string, sH: number, eH: number): TeammateUser | null => {
    if (!teammates || teammates.length === 0) return null;

    // Filter out CEO accounts for auto-assigning
    const eligibleTeammates = teammates.filter(u => {
      const role = String(u.role || '').toLowerCase();
      const name = String(u.name || '').toLowerCase();
      const isCeo = role === 'ceo' || role === 'super_admin' || role === 'admin' || Number(u.id) === 1 || name.includes('ceo') || name.includes('vincent');
      return !isCeo;
    });

    if (eligibleTeammates.length === 0) return null;

    const scored = eligibleTeammates.map(u => {
      const occ = checkOccupantSlot(sH, eH, targetDate, u.id);
      const isFree = !occ.occupied;
      const activeCount = (allTasks || []).filter(t => {
        if (t.status === 'completed' || t.status === 'done' || t.status === 'closed' || t.status === 'resolved') return false;
        const uid = t.assigned_to_id || t.assigneeId || t.assignedTo?.id;
        return String(uid) === String(u.id);
      }).length;
      return { teammate: u, isFree, activeCount };
    });

    // 1. Prefer teammates who are free at this hour, with the lowest active task count
    const freeCandidates = scored.filter(s => s.isFree).sort((a, b) => a.activeCount - b.activeCount);
    if (freeCandidates.length > 0) {
      return freeCandidates[0].teammate;
    }

    // 2. If nobody is free at this hour, pick the teammate with the lowest total active tasks
    const sorted = scored.sort((a, b) => a.activeCount - b.activeCount);
    return sorted[0]?.teammate || null;
  };

  // Auto-suggest next free hour slot on initial load or changes if selected slot is occupied
  useEffect(() => {
    if (!allTasks && (!meetings || meetings.length === 0)) return;
    const curStartH = parseHour(selectedTimeSlot.split(' - ')[0] || '10:00');
    if (isSlotOccupied(curStartH)) {
      for (let h = 10; h < 22; h++) {
        if (!isSlotOccupied(h)) {
          const s = `${h.toString().padStart(2, '0')}:00`;
          const e = `${((h + 1) % 24).toString().padStart(2, '0')}:00`;
          setSelectedTimeSlot(`${s} - ${e}`);
          break;
        }
      }
    }
  }, [allTasks, meetings, currentUserId, currentUserName, selectedAssigneeId, deadline]);

  // Selected object lookups
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => Number(p.id) === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const selectedParentTask = useMemo(() => {
    if (!selectedParentTaskId) return null;
    return allTasks.find(t => Number(t.id) === selectedParentTaskId) || null;
  }, [selectedParentTaskId, allTasks]);

  const selectedAssignee = useMemo(() => {
    if (!selectedAssigneeId) return null;
    return teammates.find(u => Number(u.id) === selectedAssigneeId) || null;
  }, [selectedAssigneeId, teammates]);

  // Hierarchical Subtask Tree Parser (Matching Operations Calendar exactly!)
  const hierarchicalTasks = useMemo(() => {
    // 1. Filter tasks by selected project if specified, with full ancestor project inheritance
    const scopedTasks = allTasks.filter(t => {
      if (!selectedProjectId) return true;
      const tProjId = t.projectId || t.project_id;
      if (tProjId && String(tProjId) === String(selectedProjectId)) return true;

      // Inherit project from parent/ancestor if not explicitly set
      let curr = t;
      while (curr && (curr.parentId || curr.parent_id)) {
        const pid = curr.parentId || curr.parent_id;
        const parent = allTasks.find(p => String(p.id) === String(pid));
        const parentProjId = parent?.projectId || parent?.project_id;
        if (parent && parentProjId && String(parentProjId) === String(selectedProjectId)) return true;
        curr = parent;
      }
      return false;
    });

    const taskMap = new Map<string, any>();
    scopedTasks.forEach(t => taskMap.set(String(t.id), t));

    const childrenByParent = new Map<string, any[]>();
    const rootTasks: any[] = [];

    scopedTasks.forEach(t => {
      const pid = t.parentId || t.parent_id ? String(t.parentId || t.parent_id) : null;
      if (pid && taskMap.has(pid)) {
        if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
        childrenByParent.get(pid)!.push(t);
      } else {
        rootTasks.push(t);
      }
    });

    // Sort recent first
    const getSortWeight = (t: any): number => {
      if (t.createdAt || t.created_at) {
        const ts = new Date(t.createdAt || t.created_at).getTime();
        if (!isNaN(ts)) return ts;
      }
      const numId = parseInt(String(t.id), 10);
      return isNaN(numId) ? 0 : numId;
    };

    rootTasks.sort((a, b) => getSortWeight(b) - getSortWeight(a));
    childrenByParent.forEach(children => {
      children.sort((a, b) => getSortWeight(b) - getSortWeight(a));
    });

    const result: Array<{ 
      id: number; 
      title: string; 
      displayTitle: string; 
      depth: number; 
      status?: string;
      projectName?: string;
      projectId?: number | null 
    }> = [];

    const traverse = (t: any, depth: number) => {
      const tid = String(t.id);
      let prefix = '';
      if (depth === 0) {
        prefix = '📌 ';
      } else if (depth === 1) {
        prefix = '    ↳ [Subtask] ';
      } else if (depth === 2) {
        prefix = '        ↳↳ [Sub-subtask] ';
      } else {
        prefix = '  '.repeat(depth * 2) + '↳ ';
      }

      const statusBadge = (t.status === 'completed' || t.status === 'done') ? ' (Completed)' : '';
      const pId = t.projectId ? Number(t.projectId) : (t.project_id ? Number(t.project_id) : null);
      const proj = pId ? projects.find(p => Number(p.id) === pId) : null;

      result.push({
        id: Number(t.id),
        title: t.title,
        displayTitle: `${prefix}${t.title}${statusBadge}`,
        depth,
        status: t.status,
        projectName: proj?.name,
        projectId: pId
      });

      const children = childrenByParent.get(tid);
      if (children && children.length > 0) {
        children.forEach(child => traverse(child, depth + 1));
      }
    };

    rootTasks.forEach(root => traverse(root, 0));
    return result;
  }, [allTasks, selectedProjectId, projects]);

  // Autocomplete options based on active trigger
  const filteredProjects = useMemo(() => {
    if (activeTrigger !== 'project') return [];
    const q = triggerQuery.toLowerCase().trim();
    return projects.filter(p => !q || p.name.toLowerCase().includes(q));
  }, [activeTrigger, triggerQuery, projects]);

  const filteredSubtasks = useMemo(() => {
    if (activeTrigger !== 'subtask') return [];
    const q = triggerQuery.toLowerCase().trim();
    return hierarchicalTasks.filter(t => !q || t.title.toLowerCase().includes(q));
  }, [activeTrigger, triggerQuery, hierarchicalTasks]);

  const filteredTeammates = useMemo(() => {
    if (activeTrigger !== 'assignee') return [];
    const q = triggerQuery.toLowerCase().trim();
    return teammates.filter(u => 
      !q || 
      u.name.toLowerCase().includes(q) || 
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  }, [activeTrigger, triggerQuery, teammates]);

  // Check cursor position for '#', '~', or '@'
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || '';

    if (currentWord.startsWith('#')) {
      setActiveTrigger('project');
      setTriggerQuery(currentWord.slice(1));
      setHighlightedIndex(0);
    } else if (currentWord.startsWith('~')) {
      setActiveTrigger('subtask');
      setTriggerQuery(currentWord.slice(1));
      setHighlightedIndex(0);
    } else if (currentWord.startsWith('@')) {
      setActiveTrigger('assignee');
      setTriggerQuery(currentWord.slice(1));
      setHighlightedIndex(0);
    } else if (currentWord.startsWith('!')) {
      setIsIssue(true);
      setActiveTrigger(null);
    } else {
      setActiveTrigger(null);
    }

    if (val.includes('!') && !isIssue) {
      setIsIssue(true);
    }
  };

  // Keyboard navigation inside autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeTrigger) {
      let count = 0;
      if (activeTrigger === 'project') count = filteredProjects.length;
      if (activeTrigger === 'subtask') count = filteredSubtasks.length;
      if (activeTrigger === 'assignee') count = filteredTeammates.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, count));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + count) % Math.max(1, count));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (count > 0) {
          if (activeTrigger === 'project' && filteredProjects[highlightedIndex]) {
            selectProject(filteredProjects[highlightedIndex]);
          } else if (activeTrigger === 'subtask' && filteredSubtasks[highlightedIndex]) {
            selectSubtask(filteredSubtasks[highlightedIndex]);
          } else if (activeTrigger === 'assignee' && filteredTeammates[highlightedIndex]) {
            selectAssignee(filteredTeammates[highlightedIndex]);
          }
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setActiveTrigger(null);
        return;
      }
    }

    if (e.key === 'Enter' && !activeTrigger) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Replace or insert the typed #/@/~ token with clean formatted tag and record selection
  const selectProject = (project: Project) => {
    setSelectedProjectId(Number(project.id));
    
    // Replace the # or #query with #${project.name}
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const lastHashPos = textBefore.lastIndexOf('#');
    
    let newText = '';
    if (lastHashPos !== -1) {
      const beforeHash = textBefore.slice(0, lastHashPos);
      newText = `${beforeHash}#${project.name} ${textAfter}`.trimStart();
    } else {
      newText = text.trim() ? `${text.trim()} #${project.name} ` : `#${project.name} `;
    }
    setText(newText);
    setActiveTrigger(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const clearSelectedProject = () => {
    if (selectedProject) {
      const escaped = selectedProject.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`#${escaped}\\s*`, 'gi');
      setText(prev => prev.replace(regex, '').trim());
    }
    setSelectedProjectId(null);
    setSelectedParentTaskId(null);
  };

  const selectSubtask = (item: { id: number; title: string; projectId?: number | null; projectName?: string }) => {
    setSelectedParentTaskId(item.id);
    if (item.projectId && !selectedProjectId) {
      setSelectedProjectId(item.projectId);
      const proj = projects.find(p => Number(p.id) === item.projectId);
      if (proj && !text.includes(`#${proj.name}`)) {
        setText(prev => `${prev.trim()} #${proj.name} `.trimStart());
      }
    }
    
    // Replace ~ or ~query with ~"${item.title}"
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const lastTildePos = textBefore.lastIndexOf('~');
    
    let newText = '';
    if (lastTildePos !== -1) {
      const beforeTilde = textBefore.slice(0, lastTildePos);
      newText = `${beforeTilde}~"${item.title}" ${textAfter}`.trimStart();
    } else {
      newText = text.trim() ? `${text.trim()} ~"${item.title}" ` : `~"${item.title}" `;
    }
    setText(newText);
    setActiveTrigger(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const clearSelectedSubtask = () => {
    if (selectedParentTask) {
      const escaped = selectedParentTask.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`~"?${escaped}"?\\s*`, 'gi');
      setText(prev => prev.replace(regex, '').trim());
    }
    setSelectedParentTaskId(null);
  };

  const selectAssignee = (user: TeammateUser) => {
    setSelectedAssigneeId(user.id);
    
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const lastAtPos = textBefore.lastIndexOf('@');
    
    let newText = '';
    if (lastAtPos !== -1) {
      const beforeAt = textBefore.slice(0, lastAtPos);
      newText = `${beforeAt}@${user.name} ${textAfter}`.trimStart();
    } else {
      newText = text.trim() ? `${text.trim()} @${user.name} ` : `@${user.name} `;
    }
    setText(newText);
    setActiveTrigger(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const clearSelectedAssignee = () => {
    if (selectedAssignee) {
      const escaped = selectedAssignee.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escaped}\\s*`, 'gi');
      setText(prev => prev.replace(regex, '').trim());
    }
    setSelectedAssigneeId(null);
  };

  // Submit task creation (handles conflict checking & next available slot prompts)
  const handleSubmit = async (overrideStart?: string, overrideEnd?: string, overrideSlot?: string) => {
    const isIssueMode = isIssue || text.includes('!');

    let finalProjectId: number | null = selectedProjectId;
    let finalParentTaskId: number | null = selectedParentTaskId;
    let finalAssigneeId: number | undefined = selectedAssigneeId || undefined;

    // 1. Detect typed project tag #ProjectName if not explicitly set
    if (!finalProjectId) {
      const hashMatch = text.match(/#([^\s~@!]+)/);
      if (hashMatch) {
        const pQuery = hashMatch[1].toLowerCase().replace(/['"]/g, '');
        const found = projects.find(p => 
          p.name.toLowerCase() === pQuery || 
          p.name.toLowerCase().replace(/\s+/g, '') === pQuery ||
          p.name.toLowerCase().startsWith(pQuery)
        );
        if (found) finalProjectId = Number(found.id);
      }
    }

    // 2. Detect typed subtask tag ~"Subtask Title" or ~Subtask if not explicitly set
    if (!finalParentTaskId) {
      const tildeMatch = text.match(/~"([^"]+)"/) || text.match(/~([^\s#@!]+)/);
      if (tildeMatch) {
        const sQuery = tildeMatch[1].toLowerCase().trim();
        const found = hierarchicalTasks.find(t => 
          t.title.toLowerCase() === sQuery || 
          t.title.toLowerCase().includes(sQuery)
        );
        if (found) {
          finalParentTaskId = Number(found.id);
          if (found.projectId && !finalProjectId) {
            finalProjectId = found.projectId;
          }
        }
      }
    }

    // 3. Detect typed assignee tag @TeammateName if not explicitly set
    if (!finalAssigneeId) {
      const atMatch = text.match(/@([^\s~#!]+)/);
      if (atMatch) {
        const aQuery = atMatch[1].toLowerCase().trim();
        const found = teammates.find(u => 
          u.name.toLowerCase() === aQuery || 
          u.name.toLowerCase().replace(/\s+/g, '') === aQuery ||
          u.name.toLowerCase().startsWith(aQuery)
        );
        if (found) finalAssigneeId = Number(found.id);
      }
    }

    let cleanTitle = text
      .replace(/#"[^"]+"/g, '')
      .replace(/#\S+/g, '')
      .replace(/~"[^"]+"/g, '')
      .replace(/~\S+/g, '')
      .replace(/@"[^"]+"/g, '')
      .replace(/@\S+/g, '')
      .replace(/^!\s*/, '')
      .replace(/\s+!\s*/g, ' ')
      .trim();

    if (!cleanTitle) {
      if (finalProjectId) {
        const pObj = projects.find(p => Number(p.id) === finalProjectId);
        cleanTitle = `${pObj?.name || 'Project'} Task`;
      } else {
        cleanTitle = 'New Task';
      }
    }

    const [defaultStart, defaultEnd] = selectedTimeSlot ? selectedTimeSlot.split(' - ') : ['10:00', '11:00'];
    const startT = overrideStart || defaultStart || '10:00';
    const endT = overrideEnd || defaultEnd || '11:00';
    const currentSlot = overrideSlot || selectedTimeSlot || `${startT} - ${endT}`;
    const targetDate = (deadline || today()).slice(0, 10);
    const startH = parseInt(startT.split(':')[0], 10);
    const endH = parseInt(endT.split(':')[0], 10);

    let autoAssignedName = '';

    // If creating an Issue and no @ assignee was explicitly chosen: auto-assign to someone free at that time!
    if (isIssueMode && !finalAssigneeId) {
      const freeTeammate = findFreeTeammate(targetDate, startH, endH);
      if (freeTeammate) {
        finalAssigneeId = freeTeammate.id;
        autoAssignedName = freeTeammate.name;
      } else if (currentUserId) {
        finalAssigneeId = parseInt(currentUserId, 10);
      }
    } else if (!finalAssigneeId) {
      finalAssigneeId = currentUserId ? parseInt(currentUserId, 10) : undefined;
    }

    // If no override provided, check if current slot is already occupied by a task or meeting for this user on this date
    if (!overrideStart) {
      const occupant = checkOccupantSlot(startH, endH, targetDate, finalAssigneeId);

      if (occupant.occupied) {
        // Calculate the next unoccupied time slot
        let nextStartStr = `${(endH % 24).toString().padStart(2, '0')}:00`;
        let nextEndStr = `${((endH + 1) % 24).toString().padStart(2, '0')}:00`;
        let nextSlotStr = `${nextStartStr} - ${nextEndStr}`;

        for (let i = 0; i < 24; i++) {
          const testStart = (endH + i) % 24;
          const testEnd = (testStart + 1) % 24;
          const cand = checkOccupantSlot(testStart, testEnd, targetDate, finalAssigneeId);
          if (!cand.occupied) {
            nextStartStr = `${testStart.toString().padStart(2, '0')}:00`;
            nextEndStr = `${testEnd.toString().padStart(2, '0')}:00`;
            nextSlotStr = `${nextStartStr} - ${nextEndStr}`;
            break;
          }
        }

        setConflictPrompt({
          cleanTitle,
          targetDate,
          finalAssigneeId,
          existingTitle: occupant.title,
          conflictingType: occupant.type,
          currentSlot,
          currentStart: startT,
          currentEnd: endT,
          nextSlot: nextSlotStr,
          nextStart: nextStartStr,
          nextEnd: nextEndStr,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let createdIssueId: number | null = null;
      // Sync to Issue Center if created as an issue!
      if (isIssueMode) {
        try {
          const issueRes: any = await issuesService.createIssue({
            title: cleanTitle,
            description: `Reported issue: ${cleanTitle}`,
            priority: 'high',
            category: 'Bug',
            deadline: targetDate,
            project_id: finalProjectId || undefined,
            assigned_user_id: finalAssigneeId || undefined,
          });
          createdIssueId = issueRes?.data?.id || issueRes?.id || null;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('issue:created'));
          }
        } catch (issueErr) {
          console.error('Failed to sync to issue center:', issueErr);
        }
      }

      const finalTitle = isIssueMode && !cleanTitle.startsWith('[Issue]') 
        ? `[Issue] ${cleanTitle}` 
        : cleanTitle;

      await workcenterService.createTask({
        title: finalTitle,
        deadline: targetDate,
        scheduled_date: targetDate,
        scheduled_start_time: startT,
        scheduled_end_time: endT,
        project_id: finalProjectId || undefined,
        parent_id: finalParentTaskId || undefined,
        assigned_to_id: finalAssigneeId,
        priority: isIssueMode ? 'high' : 'medium',
        source: isIssueMode ? (createdIssueId ? `issue:${createdIssueId}` : 'issue') : undefined,
        is_issue: isIssueMode ? true : undefined,
      } as any);

      if (autoAssignedName) {
        setAutoAssignNotice(`⚠️ Issue auto-assigned to ${autoAssignedName} (Free at ${currentSlot})`);
        setTimeout(() => setAutoAssignNotice(null), 5000);
      }

      // Automatically advance selectedTimeSlot for sequential quick adds to the next free slot!
      const finalEndH = parseHour(endT.split(':')[0]) % 24;
      let nextFreeH = finalEndH;
      for (let offset = 0; offset < 24; offset++) {
        const testH = (finalEndH + offset) % 24;
        if (!checkOccupantSlot(testH, testH + 1, targetDate, finalAssigneeId).occupied) {
          nextFreeH = testH;
          break;
        }
      }
      const advStart = `${nextFreeH.toString().padStart(2, '0')}:00`;
      const advEnd = `${((nextFreeH + 1) % 24).toString().padStart(2, '0')}:00`;
      setSelectedTimeSlot(`${advStart} - ${advEnd}`);

      // Reset
      setText('');
      setSelectedProjectId(null);
      setSelectedParentTaskId(null);
      setSelectedAssigneeId(null);
      setIsIssue(false);
      setDeadline(today());
      setActiveTrigger(null);
      setConflictPrompt(null);
      onTaskCreated?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('task:created'));
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setActiveTrigger(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div 
      className={cn(
        "relative w-full border rounded-2xl transition-all normal-case shadow-2xl overflow-hidden",
        isDocked 
          ? "bg-background-secondary border-border-subtle hover:border-accent-blue/50 focus-within:border-accent-blue p-2 sm:p-2.5" 
          : "bg-background-secondary border-border-subtle hover:border-accent-blue/40 focus-within:border-accent-blue p-3 sm:p-4 shadow-sm"
      )}
      style={{ backgroundColor: 'var(--bg-secondary)', opacity: 1 }}
    >
      {/* Auto-assign Notification Toast */}
      {autoAssignNotice && (
        <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={14} className="shrink-0 text-amber-500" />
          <span className="truncate">{autoAssignNotice}</span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 w-full min-w-0">
        <span className={cn(
          "rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center shrink-0",
          isDocked ? "w-5 h-5 text-xs" : "w-6 h-6 text-sm"
        )}>
          <Plus size={isDocked ? 13 : 15} />
        </span>
        
        <input
          id="global-quick-add-input"
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isDocked ? "Quick add task... (# project, ~ subtask, @ person)" : "What would you like to achieve today? Use #project, ~subtask, @assignee, !issue..."}
          className="min-w-0 flex-1 bg-transparent border-0 outline-none text-[13px] sm:text-[14.5px] placeholder:text-text-secondary/60 text-text-primary"
          disabled={isSubmitting}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {onOpenMeetingModal && (
            <button
              type="button"
              onClick={onOpenMeetingModal}
              title="Schedule a meeting for today"
              style={{ backgroundColor: 'var(--surface-card)' }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border border-border-subtle hover:border-accent-blue hover:text-accent-blue text-[11.5px] sm:text-[12px] font-medium text-text-secondary transition-all cursor-pointer bg-surface-card hover:bg-surface-hover shrink-0"
            >
              <Video size={13} className="text-accent-blue shrink-0" />
              <span className="hidden sm:inline">+ Meeting</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!text.trim() || isSubmitting}
            className="flex items-center gap-1 px-3 sm:px-3.5 py-1.5 bg-accent-blue hover:bg-accent-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] sm:text-[12.5px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus size={13} className="shrink-0" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Selected Metadata Chips Row - Single fluid horizontal row */}
      <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-border-subtle/50 text-[11px] sm:text-[11.5px] overflow-x-auto scrollbar-none py-0.5 w-full">
        {/* Project Chip / Button */}
        {selectedProject ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-bold text-xs shadow-xs shrink-0">
            <Hash size={12} className="stroke-[2.5]" />
            <span className="max-w-[120px] sm:max-w-[150px] truncate">{selectedProject.name}</span>
            <button 
              type="button" 
              onClick={clearSelectedProject} 
              className="hover:text-accent-red ml-0.5 cursor-pointer text-accent-blue/70 hover:text-red-500"
              title="Remove project filter"
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTrigger(activeTrigger === 'project' ? null : 'project');
              setTriggerQuery('');
              inputRef.current?.focus();
            }}
            style={activeTrigger === 'project' ? undefined : { backgroundColor: 'var(--surface-card)' }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
              activeTrigger === 'project'
                ? "bg-accent-blue text-white shadow-xs"
                : "bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/50"
            )}
          >
            <Hash size={12} className={activeTrigger === 'project' ? "text-white stroke-[2.5]" : "text-accent-blue stroke-[2.5]"} />
            <span>Project (#)</span>
          </button>
        )}

        {/* Parent / Subtask Chip / Button */}
        {selectedParentTask ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold text-xs shadow-xs shrink-0">
            <CornerDownRight size={12} className="stroke-[2.5]" />
            <span className="max-w-[120px] sm:max-w-[150px] truncate">{selectedParentTask.title}</span>
            <button 
              type="button" 
              onClick={clearSelectedSubtask} 
              className="hover:text-accent-red ml-0.5 cursor-pointer text-purple-500/70 hover:text-red-500"
              title="Remove subtask parent"
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTrigger(activeTrigger === 'subtask' ? null : 'subtask');
              setTriggerQuery('');
              inputRef.current?.focus();
            }}
            style={activeTrigger === 'subtask' ? undefined : { backgroundColor: 'var(--surface-card)' }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
              activeTrigger === 'subtask'
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-purple-400/50"
            )}
          >
            <CornerDownRight size={12} className={activeTrigger === 'subtask' ? "text-white stroke-[2.5]" : "text-purple-400 stroke-[2.5]"} />
            <span>Subtask (~)</span>
          </button>
        )}

        {/* Assignee Chip / Button */}
        {selectedAssignee ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs shadow-xs shrink-0">
            <AtSign size={12} className="stroke-[2.5]" />
            <span className="max-w-[110px] sm:max-w-[140px] truncate">{selectedAssignee.name}</span>
            <button 
              type="button" 
              onClick={clearSelectedAssignee} 
              className="hover:text-accent-red ml-0.5 cursor-pointer text-emerald-500/70 hover:text-red-500"
              title="Remove assignee"
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTrigger(activeTrigger === 'assignee' ? null : 'assignee');
              setTriggerQuery('');
              inputRef.current?.focus();
            }}
            style={activeTrigger === 'assignee' ? undefined : { backgroundColor: 'var(--surface-card)' }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
              activeTrigger === 'assignee'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-emerald-500/50"
            )}
          >
            <UserCheck size={12} className={activeTrigger === 'assignee' ? "text-white stroke-[2.5]" : "text-emerald-500 stroke-[2.5]"} />
            <span><span className="hidden sm:inline">Assigned: </span><span className="underline decoration-dotted">Myself (@)</span></span>
          </button>
        )}

        {/* Issue Mode Toggle Chip / Button */}
        {isIssue ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs shadow-xs shrink-0 animate-in fade-in">
            <AlertCircle size={12} className="stroke-[2.5] text-amber-500" />
            <span>Issue (!)</span>
            <button 
              type="button" 
              onClick={() => setIsIssue(false)} 
              className="hover:text-accent-red ml-0.5 cursor-pointer text-text-secondary hover:text-red-500"
              title="Remove Issue flag"
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsIssue(true);
              inputRef.current?.focus();
            }}
            style={{ backgroundColor: 'var(--surface-card)' }}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-amber-500/50 shrink-0"
            title="Flag as Issue (!) - Auto-assigns to free teammate if unassigned"
          >
            <AlertCircle size={12} className="text-amber-500 stroke-[2.5]" />
            <span>Issue (!)</span>
          </button>
        )}

        {/* Deadline Chip (Defaults to Today) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}
            style={showDatePicker ? undefined : { backgroundColor: 'var(--surface-card)' }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
              showDatePicker 
                ? "bg-accent-blue text-white shadow-xs" 
                : "bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/50"
            )}
          >
            <Calendar size={12} className={showDatePicker ? "text-white" : "text-accent-blue"} />
            <span>{deadline === today() ? 'Today' : deadline}</span>
          </button>

          {showDatePicker && (
            <div 
              className={cn(
                "absolute right-0 z-[9999] p-2 bg-background-secondary text-text-primary border border-border-subtle rounded-2xl shadow-2xl flex flex-col gap-1 w-48 max-w-[calc(100vw-2rem)] animate-in fade-in duration-100",
                dropUp ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-1.5 slide-in-from-top-2"
              )}
              style={{ backgroundColor: 'var(--bg-secondary)', opacity: 1 }}
            >
              <div 
                className="px-2.5 py-1 text-[10px] uppercase font-bold text-text-secondary border-b border-border-subtle mb-0.5 rounded-lg"
                style={{ backgroundColor: 'var(--surface-card)' }}
              >
                Select Due Date
              </div>
              <button
                type="button"
                onClick={() => { setDeadline(today()); setShowDatePicker(false); }}
                style={deadline === today() ? undefined : { backgroundColor: 'var(--surface-card)' }}
                className={cn(
                  'text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between',
                  deadline === today()
                    ? 'bg-accent-blue text-white shadow-xs'
                    : 'bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/40'
                )}
              >
                <span>☀️ Today</span>
                {deadline === today() && <span className="text-[9px] font-bold uppercase bg-white/20 px-1.5 py-0.5 rounded">Active</span>}
              </button>
              <button
                type="button"
                onClick={() => { 
                  const d = new Date(Date.now() + 86400000); 
                  setDeadline(isoDay(d)); 
                  setShowDatePicker(false); 
                }}
                style={deadline === isoDay(new Date(Date.now() + 86400000)) ? undefined : { backgroundColor: 'var(--surface-card)' }}
                className={cn(
                  'text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between',
                  deadline === isoDay(new Date(Date.now() + 86400000))
                    ? 'bg-accent-blue text-white shadow-xs'
                    : 'bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/40'
                )}
              >
                <span>⏭️ Tomorrow</span>
              </button>
              <button
                type="button"
                onClick={() => { 
                  const d = new Date();
                  d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
                  setDeadline(isoDay(d));
                  setShowDatePicker(false);
                }}
                style={{ backgroundColor: 'var(--surface-card)' }}
                className="text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/40"
              >
                <span>📅 Next Monday</span>
              </button>
              <div className="pt-1.5 border-t border-border-subtle">
                <input
                  type="date"
                  value={deadline}
                  onChange={e => { if (e.target.value) { setDeadline(e.target.value); setShowDatePicker(false); } }}
                  style={{ backgroundColor: 'var(--surface-card)' }}
                  className="w-full text-xs p-1.5 bg-surface-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Time Slot Chip */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}
            style={showTimePicker ? undefined : { backgroundColor: 'var(--surface-card)' }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
              showTimePicker 
                ? "bg-accent-blue text-white shadow-xs" 
                : "bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/50"
            )}
            title="Select schedule time slot"
          >
            <Clock size={12} className={showTimePicker ? "text-white" : "text-accent-blue"} />
            <span>{selectedTimeSlot}</span>
          </button>

            {showTimePicker && (
              <div 
                className={cn(
                  "absolute right-0 z-[9999] p-2 bg-background-secondary text-text-primary border border-border-subtle rounded-2xl shadow-2xl flex flex-col gap-1 w-56 max-w-[calc(100vw-2rem)] animate-in fade-in duration-100 max-h-72 overflow-y-auto",
                  dropUp ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-1.5 slide-in-from-top-2"
                )}
                style={{ backgroundColor: 'var(--bg-secondary)', opacity: 1 }}
              >
                <div 
                  className="px-2.5 py-1 text-[10px] uppercase font-bold text-text-secondary border-b border-border-subtle mb-0.5 flex items-center justify-between rounded-lg"
                  style={{ backgroundColor: 'var(--surface-card)' }}
                >
                  <span>Schedule Timing</span>
                  <span className="text-[9px] font-normal lowercase text-text-secondary/70">1 hr slots</span>
                </div>
                {[
                  '09:00 - 10:00',
                  '10:00 - 11:00',
                  '11:00 - 12:00',
                  '12:00 - 13:00',
                  '13:00 - 14:00',
                  '14:00 - 15:00',
                  '15:00 - 16:00',
                  '16:00 - 17:00',
                  '17:00 - 18:00',
                ].map(slot => {
                  const sH = parseHour(slot.split(':')[0]);
                  const isOcc = isSlotOccupied(sH);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        const occupant = checkOccupantSlot(sH, sH + 1);
                        if (occupant.occupied) {
                          let nextStartStr = '';
                          let nextEndStr = '';
                          for (let h = 9; h < 22; h++) {
                            if (!isSlotOccupied(h)) {
                              nextStartStr = `${h.toString().padStart(2, '0')}:00`;
                              nextEndStr = `${((h + 1) % 24).toString().padStart(2, '0')}:00`;
                              break;
                            }
                          }
                          const nextSlotStr = nextStartStr ? `${nextStartStr} - ${nextEndStr}` : '11:00 - 12:00';
                          setConflictPrompt({
                            cleanTitle: text.trim() || 'New Task',
                            targetDate: (deadline || today()).slice(0, 10),
                            finalAssigneeId: selectedAssigneeId || (currentUserId ? parseInt(currentUserId, 10) : undefined),
                            existingTitle: occupant.title,
                            conflictingType: occupant.type,
                            currentSlot: slot,
                            currentStart: `${sH.toString().padStart(2, '0')}:00`,
                            currentEnd: `${((sH + 1) % 24).toString().padStart(2, '0')}:00`,
                            nextSlot: nextSlotStr,
                            nextStart: nextStartStr || '11:00',
                            nextEnd: nextEndStr || '12:00',
                          });
                          setShowTimePicker(false);
                          return;
                        }
                        setSelectedTimeSlot(slot);
                        setShowTimePicker(false);
                      }}
                      style={selectedTimeSlot === slot ? undefined : { backgroundColor: 'var(--surface-card)' }}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        selectedTimeSlot === slot
                          ? 'bg-accent-blue text-white shadow-xs'
                          : isOcc
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                            : 'bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/40'
                      )}
                    >
                      <span className="font-bold">{slot}</span>
                      {isOcc && (
                        <span className={cn(
                          "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                          selectedTimeSlot === slot ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        )}>
                          Occupied
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {/* AUTOCOMPLETE POPUP DROPDOWN */}
      {activeTrigger && (
        <div 
          ref={dropdownRef}
          className={cn(
            "absolute left-1 right-1 sm:left-2 sm:right-2 z-[9999] bg-white dark:bg-[#121A2A] text-text-primary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden max-h-[55vh] sm:max-h-80 overflow-y-auto animate-in fade-in duration-150",
            dropUp ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-2 slide-in-from-top-2"
          )}
          style={{ backgroundColor: 'var(--bg-secondary, #FFFFFF)', opacity: 1 }}
        >
          {/* Header indicator */}
          <div 
            className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-[#1A2332] border-b border-border-subtle text-[10px] sm:text-[11px] font-bold text-text-secondary uppercase tracking-wider"
            style={{ backgroundColor: 'var(--surface-card, #F9FAFB)' }}
          >
            <span className="flex items-center gap-1.5 font-bold text-text-primary truncate">
              {activeTrigger === 'project' && <>📁 <span>Select Project (#)</span></>}
              {activeTrigger === 'subtask' && (
                <>🌳 <span>{selectedProject ? `Subtasks for #${selectedProject.name} (~)` : 'All Available Tasks (~)'}</span></>
              )}
              {activeTrigger === 'assignee' && <>👤 <span>Assign Teammate (@)</span></>}
            </span>
            <span className="text-[9px] sm:text-[10px] lowercase text-text-secondary font-normal shrink-0">Esc to close</span>
          </div>

          {/* PROJECT LIST */}
          {activeTrigger === 'project' && (
            <div className="p-2 space-y-1.5">
              {filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-xs font-semibold text-text-secondary">No matching projects found</div>
              ) : (
                filteredProjects.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProject(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={highlightedIndex === idx ? undefined : { backgroundColor: 'var(--surface-card)' }}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer group gap-2',
                      highlightedIndex === idx 
                        ? 'bg-accent-blue text-white shadow-md' 
                        : 'bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/40'
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <Hash size={14} className={highlightedIndex === idx ? 'text-white stroke-[2.5]' : 'text-accent-blue stroke-[2.5]'} />
                      <span className={cn("font-bold text-xs sm:text-[13.5px] truncate", highlightedIndex === idx ? "text-white" : "text-text-primary")}>
                        {p.name}
                      </span>
                    </span>
                    <span className={cn(
                      'text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0',
                      highlightedIndex === idx 
                        ? 'bg-white/20 text-white border-transparent' 
                        : 'bg-background-primary text-text-secondary border-border-subtle'
                    )}>
                      {p.status || 'Active'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* HIERARCHICAL SUBTASK TREE */}
          {activeTrigger === 'subtask' && (
            <div className="p-1.5 sm:p-2 space-y-1.5">
              {filteredSubtasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-secondary space-y-1.5">
                  <p className="font-semibold text-text-primary">{selectedProjectId ? `No tasks found under #${selectedProject?.name}.` : 'No tasks available to nest under.'}</p>
                  {selectedProjectId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedProjectId(null); setTriggerQuery(''); }}
                      className="text-accent-blue underline hover:text-accent-blue-hover text-xs font-bold cursor-pointer"
                    >
                      Clear project filter to view all tasks
                    </button>
                  )}
                </div>
              ) : (
                filteredSubtasks.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectSubtask(t)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      paddingLeft: `${Math.max(8, Math.min(24, t.depth * 8 + 8))}px`,
                      backgroundColor: highlightedIndex === idx ? undefined : 'var(--surface-card)',
                    }}
                    className={cn(
                      'w-full flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl text-left transition-all cursor-pointer group gap-1.5',
                      highlightedIndex === idx 
                        ? 'bg-accent-blue text-white shadow-md' 
                        : 'bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/40'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {t.depth > 0 ? (
                        <span className={cn("shrink-0", highlightedIndex === idx ? "text-white" : "text-purple-500 dark:text-purple-400")}>
                          <CornerDownRight size={13} className="stroke-[2.5]" />
                        </span>
                      ) : (
                        <span className={cn("shrink-0", highlightedIndex === idx ? "text-white" : "text-accent-blue")}>
                          <CheckSquare size={14} className="stroke-[2.5]" />
                        </span>
                      )}
                      <span className={cn(
                        "font-bold text-xs sm:text-[13px] line-clamp-2 sm:line-clamp-1 break-words",
                        highlightedIndex === idx ? "text-white" : "text-text-primary"
                      )}>
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-5 sm:pl-0 flex-wrap">
                      {t.depth > 0 && (
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border",
                          highlightedIndex === idx 
                            ? "bg-white/20 text-white border-transparent" 
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20"
                        )}>
                          Subtask
                        </span>
                      )}
                      {t.projectName && (
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded max-w-[85px] sm:max-w-[100px] truncate border",
                          highlightedIndex === idx 
                            ? "bg-white/20 text-white border-transparent" 
                            : "bg-accent-blue/10 text-accent-blue border-accent-blue/20"
                        )}>
                          #{t.projectName}
                        </span>
                      )}
                      {t.status && (
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border",
                          highlightedIndex === idx 
                            ? "bg-white/20 text-white border-transparent" 
                            : t.status === 'completed' || t.status === 'done' 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                              : "bg-background-primary text-text-secondary border-border-subtle"
                        )}>
                          {t.status}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* TEAMMATES LIST */}
          {activeTrigger === 'assignee' && (
            <div className="p-2 space-y-1.5">
              {filteredTeammates.length === 0 ? (
                <div className="p-4 text-center text-xs font-semibold text-text-secondary">No teammates found</div>
              ) : (
                filteredTeammates.map((u, idx) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectAssignee(u)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={highlightedIndex === idx ? undefined : { backgroundColor: 'var(--surface-card)' }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer group',
                      highlightedIndex === idx 
                        ? 'bg-accent-blue text-white shadow-md' 
                        : 'bg-surface-card hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-accent-blue/40'
                    )}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-border-subtle" />
                    ) : (
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        highlightedIndex === idx ? 'bg-white/25 text-white' : 'bg-accent-blue/15 text-accent-blue border border-accent-blue/20'
                      )}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={cn("font-bold text-[13px] block truncate", highlightedIndex === idx ? "text-white" : "text-text-primary")}>
                        {u.name}
                      </span>
                      <span className={cn('text-[11px] block truncate font-medium', highlightedIndex === idx ? 'text-white/80' : 'text-text-secondary')}>
                        {u.role || 'Member'} {u.department ? `· ${u.department}` : ''}
                      </span>
                    </div>
                    {String(u.id) === String(currentUserId) && (
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-bold uppercase',
                        highlightedIndex === idx ? 'bg-white/20 text-white' : 'bg-accent-blue/15 text-accent-blue'
                      )}>
                        You
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TIME SLOT CONFLICT / NEXT TIME PROMPT MODAL */}
      {conflictPrompt && isMounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-background-secondary border border-border-subtle rounded-2xl p-5 shadow-2xl w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 duration-150 relative z-[10060]">
            {/* Header with Icon */}
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                conflictPrompt.conflictingType === 'meeting'
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              )}>
                {conflictPrompt.conflictingType === 'meeting' ? <Video className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-text-primary">
                  {conflictPrompt.conflictingType === 'meeting' ? 'Meeting Already Scheduled' : 'Time Slot Already Occupied'}
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  There is already a {conflictPrompt.conflictingType} scheduled from <span className="font-semibold text-text-primary">{conflictPrompt.currentSlot}</span>:
                </p>
                <div className="mt-1.5 p-2 rounded-lg bg-background-primary border border-border-subtle text-xs font-semibold text-text-primary truncate">
                  &ldquo;{conflictPrompt.existingTitle}&rdquo;
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl text-xs text-text-primary flex items-start gap-2">
              <span className="text-accent-blue font-bold">💡</span>
              <p>
                Would you like to schedule &ldquo;<span className="font-semibold">{conflictPrompt.cleanTitle}</span>&rdquo; at the next time (<span className="font-bold text-accent-blue">{conflictPrompt.nextSlot}</span>)?
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setConflictPrompt(null)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-background-primary transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  const keepSlot = conflictPrompt.currentSlot;
                  const keepStart = conflictPrompt.currentStart;
                  const keepEnd = conflictPrompt.currentEnd;
                  setSelectedTimeSlot(keepSlot);
                  if (text.trim()) {
                    handleSubmit(keepStart, keepEnd, keepSlot);
                  } else {
                    setConflictPrompt(null);
                  }
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-background-primary transition-colors cursor-pointer text-center"
              >
                Keep at {conflictPrompt.currentSlot}
              </button>

              <button
                type="button"
                onClick={() => {
                  const chosenNextSlot = conflictPrompt.nextSlot;
                  const chosenNextStart = conflictPrompt.nextStart;
                  const chosenNextEnd = conflictPrompt.nextEnd;
                  setSelectedTimeSlot(chosenNextSlot);
                  if (text.trim()) {
                    handleSubmit(chosenNextStart, chosenNextEnd, chosenNextSlot);
                  } else {
                    setConflictPrompt(null);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-accent-blue hover:bg-accent-blue-hover text-white transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={13} />
                <span>{text.trim() ? `Add at ${conflictPrompt.nextSlot}` : `Use ${conflictPrompt.nextSlot}`}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
