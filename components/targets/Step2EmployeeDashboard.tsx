'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  FileText, 
  Award, 
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Save,
  Check
} from 'lucide-react';

export interface EmployeeTask {
  id: string;
  sNo: number;
  title: string;
  description: string;
  deadline: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  score: number;
  category?: string;
  assignedBy?: string;
  notes?: string;
  deliverables?: string[];
  progressPercent?: number;
}

interface Step2EmployeeDashboardProps {
  onSelectTask?: (task: EmployeeTask) => void;
  onNavigateToStep3?: (taskId: string) => void;
  employeeName?: string;
}

export default function Step2EmployeeDashboard({
  onSelectTask,
  onNavigateToStep3,
  employeeName = 'Harshini'
}: Step2EmployeeDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('Q3 (14 Oct - 28 Oct 2026)');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');
  
  // Interactive tasks state
  const [tasks, setTasks] = useState<EmployeeTask[]>([
    {
      id: 'task-1',
      sNo: 1,
      title: 'Create marketing posts',
      description: 'Design and post 3 posts for GMDI',
      deadline: '28 Oct 2026',
      status: 'In Progress',
      score: 10,
      category: 'Marketing',
      assignedBy: 'DC D/CEO',
      notes: 'Created 2 posts. Working on the third post. Will complete by 26 Oct.',
      deliverables: ['post1.png', 'post2.png'],
      progressPercent: 66
    },
    {
      id: 'task-2',
      sNo: 2,
      title: 'Find potential clients',
      description: 'List 20 startup companies',
      deadline: '28 Oct 2026',
      status: 'Pending',
      score: 10,
      category: 'Business Development',
      assignedBy: 'DC D/CEO',
      notes: '',
      deliverables: [],
      progressPercent: 0
    },
    {
      id: 'task-3',
      sNo: 3,
      title: 'Prepare report',
      description: 'Monthly marketing report',
      deadline: '28 Oct 2026',
      status: 'Completed',
      score: 10,
      category: 'Marketing',
      assignedBy: 'DC D/CEO',
      notes: 'Report submitted for internal review and approved.',
      deliverables: ['monthly_report.pdf'],
      progressPercent: 100
    },
    {
      id: 'task-4',
      sNo: 4,
      title: 'Social media research',
      description: 'Find content ideas',
      deadline: '28 Oct 2026',
      status: 'Pending',
      score: 10,
      category: 'Marketing',
      assignedBy: 'DC D/CEO',
      notes: '',
      deliverables: [],
      progressPercent: 0
    },
    {
      id: 'task-5',
      sNo: 5,
      title: 'Competitor analysis',
      description: 'Compare with 5 competitors',
      deadline: '28 Oct 2026',
      status: 'Completed',
      score: 10,
      category: 'Marketing',
      assignedBy: 'DC D/CEO',
      notes: 'Comparison matrix completed across 5 key competitors.',
      deliverables: ['competitor_sheet.xlsx'],
      progressPercent: 100
    }
  ]);

  // Quick Notes state
  const [quickNotes, setQuickNotes] = useState('Reviewed Q3 target milestones with D/CEO. Prioritizing GMDI LinkedIn graphics first.');
  const [noteSaved, setNoteSaved] = useState(false);

  // Compute metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const notStartedTasks = tasks.filter(t => t.status === 'Pending' && !t.notes).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalScore = tasks.reduce((sum, t) => sum + t.score, 0);

  // Filtered tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === 'All') return matchesSearch;
    return matchesSearch && task.status === filterTab;
  });

  const handleSaveNote = () => {
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleTaskAction = (task: EmployeeTask) => {
    if (onSelectTask) onSelectTask(task);
    if (onNavigateToStep3) onNavigateToStep3(task.id);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner (Step 2 banner from WhatsApp image) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-sm tracking-wider shadow-md shadow-emerald-500/20">
            STEP 2
          </span>
          <span className="text-slate-400 font-light">—</span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Your Dashboard ({employeeName})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All the tasks that sir assigns will appear here. You just need to complete and update the status.
            </p>
          </div>
        </div>

        {/* Sprint selector & User profile */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent font-bold outline-none cursor-pointer text-slate-900 dark:text-white text-xs"
            >
              <option value="Q3 (14 Oct - 28 Oct 2026)">Q3 (14 Oct - 28 Oct 2026)</option>
              <option value="Q3 (29 Oct - 12 Nov 2026)">Q3 (29 Oct - 12 Nov 2026)</option>
              <option value="Full Month (October 2026)">Full Month (October 2026)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              HS
            </div>
            <span>{employeeName}</span>
          </div>
        </div>
      </div>

      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Good Morning, {employeeName} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Here are your current targets and assigned tasks for the active 15-day sprint cycle.
          </p>
        </div>
      </div>

      {/* Top 4 Stat Cards (Matching Image 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Total Tasks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tasks</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalTasks}</div>
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completedTasks}</div>
          </div>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingTasks}</div>
          </div>
        </div>

        {/* Progress % */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{progressPercent}%</div>
          </div>
        </div>

      </div>

      {/* Main Content Grid: Left Tasks & Bottom Analytics, Right Calendar & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Tasks Table & 3 Bottom Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* My Tasks (Q3) Card */}
          <div className="bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            
            {/* Table Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                My Tasks (Q3)
              </h2>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Tabs: All (5) | Pending (2) | In Progress (1) | Completed (2) */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              {[
                { key: 'All', count: totalTasks },
                { key: 'Pending', count: pendingTasks },
                { key: 'In Progress', count: inProgressTasks },
                { key: 'Completed', count: completedTasks }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    filterTab === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.key}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filterTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* The Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <th className="py-2.5 px-3 w-14 text-center">S.No</th>
                    <th className="py-2.5 px-3">Task / Activity</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Deadline</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No tasks match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => (
                      <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                        <td className="py-3.5 px-3 text-center font-bold text-slate-500">
                          {task.sNo}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {task.title}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {task.description}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                          <span className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            {task.deadline}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            task.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : task.status === 'In Progress'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-extrabold text-blue-600 dark:text-blue-400">
                          {task.score}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleTaskAction(task)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                              task.status === 'Completed'
                                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                            }`}
                          >
                            {task.status === 'Completed' ? 'View' : 'Update'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* 3 Bottom Cards (Progress Overview, Target Details, Quick Notes) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Progress Overview with Donut */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Progress Overview
              </h3>

              <div className="flex items-center gap-4">
                {/* Donut representation */}
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      strokeWidth="7"
                      className="text-slate-100 dark:text-slate-800"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      strokeWidth="7"
                      strokeDasharray={201}
                      strokeDashoffset={201 - (progressPercent / 100) * 201}
                      strokeLinecap="round"
                      className="text-emerald-500 transition-all duration-700"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-sm font-black text-slate-900 dark:text-white leading-none block">{progressPercent}%</span>
                    <span className="text-[9px] text-slate-400 font-semibold block uppercase">Done</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{completedTasks}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> In Progress
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{pendingTasks}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Target Details */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Target Details
              </h3>
              
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Period:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">14 Oct 2026 - 28 Oct 2026 (15 Days)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned By:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">DC D/CEO</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Marketing</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Total Target Score:</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{totalScore} Points</span>
                </div>
              </div>
            </div>

            {/* Card 3: Quick Notes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Quick Notes
                  </h3>
                  {noteSaved && <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5"><Check className="w-3 h-3" /> Saved</span>}
                </div>
                <textarea
                  rows={3}
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  placeholder="Add notes about your work..."
                  className="w-full mt-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm"
                >
                  <Save className="w-3 h-3" />
                  Save Note
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column (1 span): Deadline Calendar & Upcoming Deadlines */}
        <div className="space-y-6">
          
          {/* Deadline Calendar Card (Matching Image 2 October 2026 calendar) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Deadline Calendar
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">October 2026</span>
                <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Calendar Grid (October 2026: 1st is Thursday) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
              {/* Previous month greyed out */}
              <span className="py-1.5 text-slate-300 dark:text-slate-700">27</span>
              <span className="py-1.5 text-slate-300 dark:text-slate-700">28</span>
              <span className="py-1.5 text-slate-300 dark:text-slate-700">29</span>
              <span className="py-1.5 text-slate-300 dark:text-slate-700">30</span>
              
              {/* October days */}
              <span className="py-1.5 text-slate-700 dark:text-slate-300">1</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">2</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">3</span>

              <span className="py-1.5 text-slate-700 dark:text-slate-300">4</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">5</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">6</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">7</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">8</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">9</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">10</span>

              <span className="py-1.5 text-slate-700 dark:text-slate-300">11</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">12</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">13</span>
              {/* 14 Oct: Start of 15-day sprint */}
              <span className="py-1.5 rounded-full bg-blue-600 text-white font-extrabold shadow-sm">14</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">15</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">16</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">17</span>

              <span className="py-1.5 text-slate-700 dark:text-slate-300">18</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">19</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">20</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">21</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">22</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">23</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">24</span>

              <span className="py-1.5 text-slate-700 dark:text-slate-300">25</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">26</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">27</span>
              {/* 28 Oct: Sprint Deadline Highlight */}
              <span className="py-1.5 rounded-full bg-rose-500 text-white font-black ring-2 ring-rose-300 dark:ring-rose-800 shadow-md">28</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">29</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">30</span>
              <span className="py-1.5 text-slate-700 dark:text-slate-300">31</span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Sprint Start (14 Oct)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Deadline (28 Oct)
              </span>
            </div>
          </div>

          {/* Upcoming Deadlines List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Upcoming Deadlines
              </h3>
              <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'Create marketing posts', due: 'Due in 5 days', date: '28 Oct', dotColor: 'bg-blue-500' },
                { title: 'Find potential clients', due: 'Due in 5 days', date: '28 Oct', dotColor: 'bg-amber-500' },
                { title: 'Social media research', due: 'Due in 5 days', date: '28 Oct', dotColor: 'bg-amber-500' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dotColor} shrink-0`}></span>
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.title}</div>
                      <div className="text-[10px] text-slate-400">{item.due}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
