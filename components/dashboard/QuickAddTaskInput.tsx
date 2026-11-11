'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Hash, 
  CornerDownRight, 
  AtSign, 
  Calendar, 
  X, 
  Check, 
  Video, 
  UserCheck
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { workcenterService, WCTask } from '@/services/workcenter';
import { Project, Task } from '@/types';
import { today, isoDay } from './Widgets';

export interface TeammateUser {
  id: number;
  name: string;
  avatar?: string | null;
  role?: string | null;
  department?: string | null;
}

interface QuickAddTaskInputProps {
  projects: Project[];
  allTasks: (WCTask | Task | any)[];
  teammates: TeammateUser[];
  currentUserId: string;
  currentUserName: string;
  onTaskCreated: () => void;
  onOpenMeetingModal?: () => void;
  prefillAssignee?: TeammateUser | null;
}

export function QuickAddTaskInput({
  projects,
  allTasks,
  teammates,
  currentUserId,
  currentUserName,
  onTaskCreated,
  onOpenMeetingModal,
  prefillAssignee
}: QuickAddTaskInputProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<number | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<string>(today());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Active autocomplete trigger popup: null | 'project' | 'subtask' | 'assignee'
  const [activeTrigger, setActiveTrigger] = useState<'project' | 'subtask' | 'assignee' | null>(null);
  const [triggerQuery, setTriggerQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // If prefilled assignee is provided (e.g. from CEO Team Pulse "+ Assign Task")
  useEffect(() => {
    if (prefillAssignee) {
      setSelectedAssigneeId(prefillAssignee.id);
      inputRef.current?.focus();
    }
  }, [prefillAssignee]);

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

    const result: Array<{ id: number; title: string; displayTitle: string; depth: number; projectId?: number | null }> = [];

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

      result.push({
        id: Number(t.id),
        title: t.title,
        displayTitle: `${prefix}${t.title}${statusBadge}`,
        depth,
        projectId: t.projectId ? Number(t.projectId) : (t.project_id ? Number(t.project_id) : null)
      });

      const children = childrenByParent.get(tid);
      if (children && children.length > 0) {
        children.forEach(child => traverse(child, depth + 1));
      }
    };

    rootTasks.forEach(root => traverse(root, 0));
    return result;
  }, [allTasks, selectedProjectId]);

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
    } else {
      setActiveTrigger(null);
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

  // Replace the typed #/@/~ token with clean text and record selection
  const removeTriggerTokenFromInput = (prefix: string) => {
    const cursorPos = inputRef.current?.selectionStart || text.length;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const lastTriggerPos = textBefore.lastIndexOf(prefix);
    if (lastTriggerPos !== -1) {
      const cleanBefore = textBefore.slice(0, lastTriggerPos);
      setText((cleanBefore + textAfter).trim());
    }
  };

  const selectProject = (project: Project) => {
    setSelectedProjectId(Number(project.id));
    removeTriggerTokenFromInput('#');
    setActiveTrigger(null);
    inputRef.current?.focus();
  };

  const selectSubtask = (item: { id: number; title: string; projectId?: number | null }) => {
    setSelectedParentTaskId(item.id);
    if (item.projectId && !selectedProjectId) {
      setSelectedProjectId(item.projectId);
    }
    removeTriggerTokenFromInput('~');
    setActiveTrigger(null);
    inputRef.current?.focus();
  };

  const selectAssignee = (user: TeammateUser) => {
    setSelectedAssigneeId(user.id);
    removeTriggerTokenFromInput('@');
    setActiveTrigger(null);
    inputRef.current?.focus();
  };

  // Submit task creation
  const handleSubmit = async () => {
    const cleanTitle = text
      .replace(/#\S+/g, '')
      .replace(/~\S+/g, '')
      .replace(/@\S+/g, '')
      .trim();

    if (!cleanTitle) return;

    setIsSubmitting(true);
    try {
      // Rule: Default assignee is current user if no @ assignee chosen
      const finalAssigneeId = selectedAssigneeId || (currentUserId ? parseInt(currentUserId, 10) : undefined);

      await workcenterService.createTask({
        title: cleanTitle,
        deadline: deadline || today(),
        scheduled_date: deadline || today(),
        scheduled_start_time: '09:00',
        scheduled_end_time: '10:00',
        project_id: selectedProjectId || undefined,
        parent_id: selectedParentTaskId || undefined,
        assigned_to_id: finalAssigneeId,
        priority: 'medium',
      });

      // Reset
      setText('');
      setSelectedProjectId(null);
      setSelectedParentTaskId(null);
      setSelectedAssigneeId(null);
      setDeadline(today());
      setActiveTrigger(null);
      onTaskCreated();
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
    <div className="relative w-full bg-background-secondary border border-border-subtle hover:border-accent-blue/40 focus-within:border-accent-blue rounded-2xl p-3 sm:p-4 shadow-sm transition-all normal-case">
      {/* Input row */}
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center shrink-0">
          <Plus size={15} />
        </span>
        
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to achieve today? Use #project, ~subtask, @assignee..."
          className="flex-1 bg-transparent border-0 outline-none text-[14px] sm:text-[15px] placeholder:text-text-secondary/60 text-text-primary"
          disabled={isSubmitting}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenMeetingModal && (
            <button
              type="button"
              onClick={onOpenMeetingModal}
              title="Schedule a meeting for today"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle hover:border-accent-blue hover:text-accent-blue text-[12px] font-medium text-text-secondary transition-all cursor-pointer bg-background-primary/50"
            >
              <Video size={13} className="text-accent-blue" />
              <span className="hidden sm:inline">+ Meeting</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-blue hover:bg-accent-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12.5px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Selected Metadata Chips Row */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-border-subtle/50 text-[11.5px]">
        {/* Project Chip / Button */}
        {selectedProject ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/20 font-medium">
            <Hash size={11} />
            <span className="max-w-[120px] truncate">{selectedProject.name}</span>
            <button 
              type="button" 
              onClick={() => { setSelectedProjectId(null); setSelectedParentTaskId(null); }} 
              className="hover:text-accent-red ml-0.5 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTrigger('project');
              setTriggerQuery('');
              inputRef.current?.focus();
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <Hash size={11} />
            <span>Project (#)</span>
          </button>
        )}

        {/* Parent / Subtask Chip / Button */}
        {selectedParentTask ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
            <CornerDownRight size={11} />
            <span className="max-w-[140px] truncate">{selectedParentTask.title}</span>
            <button 
              type="button" 
              onClick={() => setSelectedParentTaskId(null)} 
              className="hover:text-accent-red ml-0.5 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTrigger('subtask');
              setTriggerQuery('');
              inputRef.current?.focus();
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <CornerDownRight size={11} />
            <span>Subtask (~)</span>
          </button>
        )}

        {/* Assignee Chip / Button */}
        {selectedAssignee ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
            <AtSign size={11} />
            <span className="max-w-[120px] truncate">{selectedAssignee.name}</span>
            <button 
              type="button" 
              onClick={() => setSelectedAssigneeId(null)} 
              className="hover:text-accent-red ml-0.5 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTrigger('assignee');
              setTriggerQuery('');
              inputRef.current?.focus();
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <UserCheck size={11} />
            <span>Assigned: <b>Myself (@)</b></span>
          </button>
        )}

        {/* Deadline Chip (Defaults to Today) */}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background-primary border border-border-subtle hover:border-accent-blue text-text-primary font-medium transition-colors cursor-pointer"
          >
            <Calendar size={11} className="text-accent-blue" />
            <span>{deadline === today() ? 'Today' : deadline}</span>
          </button>

          {showDatePicker && (
            <div className="absolute right-0 top-full mt-1.5 z-50 p-2.5 bg-background-secondary border border-border-subtle rounded-xl shadow-xl flex flex-col gap-1 w-44">
              <button
                type="button"
                onClick={() => { setDeadline(today()); setShowDatePicker(false); }}
                className={cn('text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent-blue/10 hover:text-accent-blue transition-colors', deadline === today() && 'font-bold text-accent-blue')}
              >
                ☀️ Today
              </button>
              <button
                type="button"
                onClick={() => { 
                  const d = new Date(Date.now() + 86400000); 
                  setDeadline(isoDay(d)); 
                  setShowDatePicker(false); 
                }}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent-blue/10 hover:text-accent-blue transition-colors"
              >
                ⏭️ Tomorrow
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
                  setDeadline(isoDay(d));
                  setShowDatePicker(false);
                }}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent-blue/10 hover:text-accent-blue transition-colors"
              >
                📅 Next Monday
              </button>
              <div className="pt-1 border-t border-border-subtle">
                <input
                  type="date"
                  value={deadline}
                  onChange={e => { if (e.target.value) { setDeadline(e.target.value); setShowDatePicker(false); } }}
                  className="w-full text-xs p-1 bg-background-primary border border-border-subtle rounded text-text-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AUTOCOMPLETE POPUP DROPDOWN */}
      {activeTrigger && (
        <div 
          ref={dropdownRef}
          className="absolute left-3 right-3 top-full mt-2 z-50 bg-background-secondary/95 backdrop-blur-md border border-border-subtle rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-background-primary/60 border-b border-border-subtle text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            <span>
              {activeTrigger === 'project' && '📁 Select Project (#)'}
              {activeTrigger === 'subtask' && (selectedProject ? `🌳 Subtasks for #${selectedProject.name} (~)` : '🌳 All Available Tasks / Subtasks (~)')}
              {activeTrigger === 'assignee' && '👤 Assign Teammate (@)'}
            </span>
            <span className="text-[10px] lowercase text-text-secondary/70">Press Enter or Tab to select • Esc to close</span>
          </div>

          {/* PROJECT LIST */}
          {activeTrigger === 'project' && (
            <div className="p-1.5">
              {filteredProjects.length === 0 ? (
                <div className="p-3 text-center text-xs text-text-secondary">No matching projects found</div>
              ) : (
                filteredProjects.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProject(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer',
                      highlightedIndex === idx ? 'bg-accent-blue text-white' : 'hover:bg-background-primary text-text-primary'
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium truncate">
                      <Hash size={13} className={highlightedIndex === idx ? 'text-white' : 'text-accent-blue'} />
                      {p.name}
                    </span>
                    <span className={cn('text-[10px] uppercase font-semibold px-2 py-0.5 rounded', highlightedIndex === idx ? 'bg-white/20 text-white' : 'bg-background-primary text-text-secondary')}>
                      {p.status || 'Active'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* HIERARCHICAL SUBTASK TREE (Operations Calendar Format!) */}
          {activeTrigger === 'subtask' && (
            <div className="p-1.5">
              {filteredSubtasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-secondary space-y-1">
                  <p>{selectedProjectId ? `No tasks found under #${selectedProject?.name}.` : 'No tasks available to nest under.'}</p>
                  {selectedProjectId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedProjectId(null); setTriggerQuery(''); }}
                      className="text-accent-blue underline hover:text-accent-blue-hover text-[11px] cursor-pointer"
                    >
                      Clear project to view all tasks
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
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer font-mono whitespace-pre',
                      highlightedIndex === idx ? 'bg-accent-blue text-white' : 'hover:bg-background-primary text-text-primary'
                    )}
                  >
                    <span className="truncate">{t.displayTitle}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* TEAMMATES LIST */}
          {activeTrigger === 'assignee' && (
            <div className="p-1.5">
              {filteredTeammates.length === 0 ? (
                <div className="p-3 text-center text-xs text-text-secondary">No teammates found</div>
              ) : (
                filteredTeammates.map((u, idx) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectAssignee(u)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer',
                      highlightedIndex === idx ? 'bg-accent-blue text-white' : 'hover:bg-background-primary text-text-primary'
                    )}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', highlightedIndex === idx ? 'bg-white/20 text-white' : 'bg-accent-blue/15 text-accent-blue')}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold block truncate">{u.name}</span>
                      <span className={cn('text-[10px] block truncate', highlightedIndex === idx ? 'text-white/80' : 'text-text-secondary')}>
                        {u.role || 'Member'} {u.department ? `· ${u.department}` : ''}
                      </span>
                    </div>
                    {String(u.id) === String(currentUserId) && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded', highlightedIndex === idx ? 'bg-white/20 text-white' : 'bg-background-primary text-accent-blue font-semibold')}>
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
    </div>
  );
}
