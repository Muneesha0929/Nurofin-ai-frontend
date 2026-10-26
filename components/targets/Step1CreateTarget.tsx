'use client';

import React, { useState } from 'react';
import { 
  User, 
  Plus, 
  Trash2, 
  Send, 
  Calendar, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Building2,
  FileText,
  Award,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '@/types';

export interface TargetTaskItem {
  id: string;
  title: string;
  description: string;
  deadline: string;
  score: number;
}

interface Step1CreateTargetProps {
  users?: UserProfile[];
  onAssignSuccess?: (targetData: any) => void;
  onNavigateToDashboard?: () => void;
}

export default function Step1CreateTarget({ 
  users = [], 
  onAssignSuccess,
  onNavigateToDashboard 
}: Step1CreateTargetProps) {
  // Stepper state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Target Form
  const [employee, setEmployee] = useState<string>('Harshini');
  const [department, setDepartment] = useState<string>('Marketing');
  const [targetPeriod, setTargetPeriod] = useState<string>('15 Days (14 Oct 2026 - 28 Oct 2026)');
  const [reviewer, setReviewer] = useState<string>('DC D/CEO');

  // Task Items
  const [tasks, setTasks] = useState<TargetTaskItem[]>([
    {
      id: '1',
      title: 'Create marketing posts',
      description: 'Design 3 posts for GMDI',
      deadline: '2026-10-28',
      score: 10
    },
    {
      id: '2',
      title: 'Find potential clients',
      description: 'List 20 startup companies',
      deadline: '2026-10-28',
      score: 10
    },
    {
      id: '3',
      title: 'Prepare report',
      description: 'Monthly marketing report',
      deadline: '2026-10-28',
      score: 10
    }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('2026-10-28');
  const [newTaskScore, setNewTaskScore] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedSuccess, setAssignedSuccess] = useState(false);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: TargetTaskItem = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Scope deliverable',
      deadline: newTaskDeadline || '2026-10-28',
      score: Number(newTaskScore) || 10
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskScore(10);
  };

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleUpdateTask = (id: string, field: keyof TargetTaskItem, value: any) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const totalScore = tasks.reduce((sum, t) => sum + (Number(t.score) || 0), 0);

  const handleAssignTarget = () => {
    if (tasks.length === 0) {
      alert('Please add at least one task to assign the target.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setAssignedSuccess(true);
      if (onAssignSuccess) {
        onAssignSuccess({
          employee,
          department,
          targetPeriod,
          reviewer,
          tasks,
          totalScore
        });
      }
    }, 600);
  };

  const departmentsList = [
    'Marketing',
    'Product',
    'Business Development',
    'Operations',
    'Compliance',
    'HR',
    'Customer Support'
  ];

  const employeesList = [
    { name: 'Harshini', initials: 'HS', dept: 'Marketing', role: 'Marketing Lead' },
    { name: 'Manisha', initials: 'MN', dept: 'Product', role: 'Product Lead' },
    { name: 'Alex C.', initials: 'AC', dept: 'BD', role: 'BD Executive' },
    { name: 'Karthik Raman', initials: 'KR', dept: 'BD', role: 'Head of BD' },
    { name: 'Sarah K.', initials: 'SK', dept: 'Operations', role: 'Head of Ops' },
    { name: 'David R.', initials: 'DR', dept: 'Compliance', role: 'Compliance Lead' },
    { name: 'Arjun Mehta', initials: 'AM', dept: 'Product', role: 'Engineer' }
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner (Step 1 matching WhatsApp image) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm tracking-wider shadow-md shadow-blue-500/20">
            STEP 1
          </span>
          <span className="text-slate-400 font-light">—</span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Sir Creates Your Target
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sir will create targets and assign tasks to you for 15 days.
            </p>
          </div>
        </div>

        {/* 4-Step Interactive Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {[
            { num: 1, title: 'Choose employee', desc: 'Select who the target is for' },
            { num: 2, title: 'Add tasks', desc: 'Enter tasks and details' },
            { num: 3, title: 'Set deadline', desc: 'Set 15 days target period' },
            { num: 4, title: 'Assign', desc: 'Send target to employee' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div 
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                  currentStep === s.num
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20 ring-2 ring-blue-500/30'
                    : currentStep > s.num
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20'
                    : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === s.num
                    ? 'bg-white text-blue-600'
                    : currentStep > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {currentStep > s.num ? '✓' : s.num}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="font-bold leading-tight">{s.title}</div>
                  <div className="text-[10px] opacity-75">{s.desc}</div>
                </div>
              </div>
              {idx < 3 && <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {assignedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <span className="font-bold">Target Successfully Assigned!</span> {tasks.length} tasks scheduled for {employee} ({targetPeriod}).
            </div>
          </div>
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
            >
              Open Employee Dashboard →
            </button>
          )}
        </div>
      )}

      {/* Main Target Creation Card */}
      <div className="bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        
        {/* Card Header & Breadcrumb */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>Targets</span>
            <span>&gt;</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">Create Target</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Create Target (Q3)
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Total Weight: {totalScore} pts
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Section: Target Details */}
          <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Target Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={employee}
                    onChange={(e) => {
                      const emp = e.target.value;
                      setEmployee(emp);
                      const found = employeesList.find(x => x.name === emp);
                      if (found) setDepartment(found.dept);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  >
                    {employeesList.map(emp => (
                      <option key={emp.name} value={emp.name}>
                        {emp.name} ({emp.initials}) — {emp.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                  {departmentsList.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Target Period */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Period <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={targetPeriod}
                    onChange={(e) => setTargetPeriod(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  >
                    <option value="15 Days (14 Oct 2026 - 28 Oct 2026)">15 Days (14 Oct 2026 - 28 Oct 2026)</option>
                    <option value="15 Days (29 Oct 2026 - 12 Nov 2026)">15 Days (29 Oct 2026 - 12 Nov 2026)</option>
                    <option value="30 Days (Monthly: Oct 2026)">30 Days (Monthly: Oct 2026)</option>
                    <option value="Full Quarter (Q3 2026)">Full Quarter (Q3 2026)</option>
                  </select>
                </div>
              </div>

              {/* Reviewer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reviewer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                  <option value="DC D/CEO">DC / D/CEO (Sir)</option>
                  <option value="HOD Marketing">HOD Marketing</option>
                  <option value="HOD Product">HOD Product</option>
                  <option value="HOD Operations">HOD Operations</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section: Add Tasks Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Add Tasks ({tasks.length})
              </h3>
              <span className="text-xs text-slate-400">
                Each task will appear on employee&apos;s dashboard and sync to Task Center
              </span>
            </div>

            {/* Tasks Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-3 w-16 text-center">S.No</th>
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 w-44">Deadline</th>
                    <th className="py-3 px-3 w-28 text-center">Score</th>
                    <th className="py-3 px-3 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {tasks.map((task, index) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                          className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 outline-none py-1"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={task.description}
                          onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                          className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 outline-none py-1"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="date"
                            value={task.deadline}
                            onChange={(e) => handleUpdateTask(task.id, 'deadline', e.target.value)}
                            className="bg-transparent font-medium text-slate-700 dark:text-slate-300 outline-none text-xs"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          value={task.score}
                          min="1"
                          max="100"
                          onChange={(e) => handleUpdateTask(task.id, 'score', Number(e.target.value))}
                          className="w-16 mx-auto text-center font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg py-1 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(task.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Inline Add Task Row */}
                  <tr className="bg-blue-50/30 dark:bg-blue-950/10">
                    <td className="py-3 px-3 text-center font-bold text-blue-500">
                      +
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Add new task title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        className="w-full text-xs font-semibold placeholder:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Description / deliverables..."
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        className="w-full text-xs placeholder:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="date"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        value={newTaskScore}
                        min="1"
                        max="100"
                        onChange={(e) => setNewTaskScore(Number(e.target.value))}
                        className="w-16 mx-auto text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleAddTask}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm"
                      >
                        Add
                      </button>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
              <button
                type="button"
                onClick={handleAddTask}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-dashed border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="text-right mr-2">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Target Score</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">{totalScore} Points</div>
                </div>

                <button
                  type="button"
                  onClick={handleAssignTarget}
                  disabled={isSubmitting || tasks.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Assigning...' : 'Assign Target'}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
