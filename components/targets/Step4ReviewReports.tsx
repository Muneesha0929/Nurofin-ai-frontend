'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  FileSpreadsheet, 
  ArrowRight, 
  Check, 
  Calendar, 
  Building2, 
  User, 
  Repeat, 
  Share2,
  TrendingUp,
  BarChart3,
  Award
} from 'lucide-react';

export interface ReviewTaskItem {
  id: string;
  sNo: number;
  title: string;
  description: string;
  deadline: string;
  status: 'Completed' | 'In Progress' | 'Pending' | 'Overdue';
  score: number;
  obtainedScore: number;
  remarks: string;
  department: string;
}

interface Step4ReviewReportsProps {
  onCarryForwardSuccess?: (carriedTasks: ReviewTaskItem[]) => void;
  onClosePeriodSuccess?: () => void;
}

export default function Step4ReviewReports({
  onCarryForwardSuccess,
  onClosePeriodSuccess
}: Step4ReviewReportsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('Q3 (14 Oct - 28 Oct 2026)');

  // 15-Day Review Task Summary Data (matching WhatsApp image 4)
  const [tasks, setTasks] = useState<ReviewTaskItem[]>([
    {
      id: 'r1',
      sNo: 1,
      title: 'Create marketing posts',
      description: 'Design and post 3 posts for GMDI',
      deadline: '28 Oct 2026',
      status: 'Completed',
      score: 10,
      obtainedScore: 10,
      remarks: '3 posts created',
      department: 'Marketing'
    },
    {
      id: 'r2',
      sNo: 2,
      title: 'Find potential clients',
      description: 'List 20 startup companies',
      deadline: '28 Oct 2026',
      status: 'In Progress',
      score: 10,
      obtainedScore: 5,
      remarks: 'Found 10 companies',
      department: 'Marketing'
    },
    {
      id: 'r3',
      sNo: 3,
      title: 'Prepare report',
      description: 'Monthly marketing report',
      deadline: '28 Oct 2026',
      status: 'Completed',
      score: 10,
      obtainedScore: 10,
      remarks: 'Submitted',
      department: 'Marketing'
    },
    {
      id: 'r4',
      sNo: 4,
      title: 'Social media research',
      description: 'Find content ideas',
      deadline: '28 Oct 2026',
      status: 'Pending',
      score: 10,
      obtainedScore: 0,
      remarks: 'Not started',
      department: 'Marketing'
    },
    {
      id: 'r5',
      sNo: 5,
      title: 'Competitor analysis',
      description: 'Compare with 5 competitors',
      deadline: '28 Oct 2026',
      status: 'Overdue',
      score: 10,
      obtainedScore: 0,
      remarks: 'Pending',
      department: 'Marketing'
    }
  ]);

  // Carried forward tasks tracking
  const [pushedTasks, setPushedTasks] = useState<Record<string, boolean>>({});
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [periodClosed, setPeriodClosed] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Compute metrics
  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const overdueCount = tasks.filter(t => t.status === 'Overdue').length;

  const totalPossibleScore = tasks.reduce((sum, t) => sum + t.score, 0);
  const totalObtainedScore = tasks.reduce((sum, t) => sum + t.obtainedScore, 0);
  const overallProgressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const scorePercent = totalPossibleScore > 0 ? Math.round((totalObtainedScore / totalPossibleScore) * 100) : 0;

  const incompleteTasks = tasks.filter(t => t.status !== 'Completed');

  const handleUpdateObtained = (id: string, val: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, obtainedScore: val } : t));
  };

  const handleUpdateRemarks = (id: string, val: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, remarks: val } : t));
  };

  const handlePushTask = (task: ReviewTaskItem) => {
    setPushedTasks(prev => ({ ...prev, [task.id]: true }));
    setTimeout(() => {
      alert(`Task "${task.title}" pushed to Sprint Cycle 2 (29 Oct - 12 Nov 2026) with carry-over tag.`);
    }, 100);
  };

  const handleCloseAndCarryForward = () => {
    if (!confirm('Close this 15-day period and roll over all uncompleted tasks into the next 15-day cycle?')) return;
    setIsClosingPeriod(true);
    setTimeout(() => {
      setIsClosingPeriod(false);
      setPeriodClosed(true);
      const newPushed: Record<string, boolean> = {};
      incompleteTasks.forEach(t => { newPushed[t.id] = true; });
      setPushedTasks(newPushed);
      if (onCarryForwardSuccess) {
        onCarryForwardSuccess(incompleteTasks);
      }
      if (onClosePeriodSuccess) {
        onClosePeriodSuccess();
      }
    }, 700);
  };

  const handleExport = (type: 'PDF' | 'Excel') => {
    setExportNotice(`Exporting ${type} Report for ${selectedPeriod}...`);
    setTimeout(() => {
      setExportNotice(null);
      alert(`${type} Report generated and downloaded successfully!`);
    }, 1200);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner (Step 4 from WhatsApp image) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-500/20">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-extrabold text-sm tracking-wider shadow-md shadow-purple-500/20">
            STEP 4
          </span>
          <span className="text-slate-400 font-light">—</span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Review &amp; Reports (After 15 Days)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sir can review your progress, check completed and pending tasks, calculate score, and carry forward incompleted tasks to the next period.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
            {selectedPeriod}
          </div>

          <button
            onClick={() => handleExport('PDF')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-2">
          <Download className="w-4 h-4 animate-bounce text-blue-500" />
          {exportNotice}
        </div>
      )}

      {periodClosed && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Target period closed! {incompleteTasks.length} uncompleted tasks carried forward into next sprint cycle.
          </div>
          <span className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-extrabold uppercase">
            Closed &amp; Archived
          </span>
        </div>
      )}

      {/* Breadcrumb Bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>Targets</span>
          <span>&gt;</span>
          <span className="text-blue-600 dark:text-blue-400 font-extrabold">Target Report (Q3)</span>
        </div>
      </div>

      {/* Top 5 Stat Metrics Cards (Total, Completed, Pending, Overdue, Overall Progress) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        
        {/* Total Tasks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Total Tasks</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalTasks}</div>
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Completed</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</span>
              <span className="text-[10px] font-bold text-emerald-500">({Math.round((completedCount/totalTasks)*100)}%)</span>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Pending</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
              <span className="text-[10px] font-bold text-amber-500">({Math.round((pendingCount/totalTasks)*100)}%)</span>
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Overdue</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">{overdueCount}</span>
              <span className="text-[10px] font-bold text-rose-500">({Math.round((overdueCount/totalTasks)*100)}%)</span>
            </div>
          </div>
        </div>

        {/* Overall Progress Gauge */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
            <svg className="w-11 h-11 transform -rotate-90">
              <circle cx="22" cy="22" r="18" strokeWidth="4" className="text-slate-100 dark:text-slate-800" stroke="currentColor" fill="transparent" />
              <circle
                cx="22" cy="22" r="18" strokeWidth="4"
                strokeDasharray={113}
                strokeDashoffset={113 - (overallProgressPercent / 100) * 113}
                strokeLinecap="round"
                className="text-emerald-500"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-[11px] font-extrabold text-slate-800 dark:text-slate-200">{overallProgressPercent}%</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Overall Progress</div>
            <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {completedCount} of {totalTasks} Tasks
            </div>
          </div>
        </div>

      </div>

      {/* Task Summary Table */}
      <div className="bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Task Summary
          </h3>
          <span className="text-xs text-slate-400">
            Click Obtained score or remarks to edit review grading
          </span>
        </div>

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
                <th className="py-2.5 px-3 text-center text-blue-600 dark:text-blue-400 font-extrabold">Obtained</th>
                <th className="py-2.5 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                  <td className="py-3 px-3 text-center font-bold text-slate-400">
                    {task.sNo}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {task.title}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {task.description}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {task.deadline}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      task.status === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : task.status === 'In Progress'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        : task.status === 'Overdue'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                    {task.score}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max={task.score}
                      value={task.obtainedScore}
                      onChange={(e) => handleUpdateObtained(task.id, Number(e.target.value))}
                      className="w-14 mx-auto text-center font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg py-1 outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={task.remarks}
                      onChange={(e) => handleUpdateRemarks(task.id, e.target.value)}
                      placeholder="Add reviewer remarks..."
                      className="w-full text-xs text-slate-700 dark:text-slate-300 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 outline-none py-1 font-medium"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytical Cards Row (Score Overview, Performance by Category, Target Details) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Score Overview Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Score Overview
          </h3>

          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="38" strokeWidth="8" className="text-slate-100 dark:text-slate-800" stroke="currentColor" fill="transparent" />
                <circle
                  cx="48" cy="48" r="38" strokeWidth="8"
                  strokeDasharray={238}
                  strokeDashoffset={238 - (scorePercent / 100) * 238}
                  strokeLinecap="round"
                  className="text-emerald-500"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-sm font-black text-slate-900 dark:text-white leading-none block">{totalObtainedScore}/{totalPossibleScore}</span>
                <span className="text-[9px] text-slate-400 font-semibold block uppercase mt-0.5">Total Score</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">2 (40%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> In Progress
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">1 (20%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">1 (20%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Overdue
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">1 (20%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance by Category Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Performance by Category
          </h3>

          <div className="h-28 flex items-end justify-between gap-2 pt-4 px-2">
            {[
              { label: 'Marketing', pct: 40, active: true },
              { label: 'Operations', pct: 0, active: false },
              { label: 'Compliance', pct: 0, active: false },
              { label: 'HR', pct: 0, active: false },
              { label: 'Customer', pct: 0, active: false }
            ].map(col => (
              <div key={col.label} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  {col.pct}%
                </span>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-20 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${col.active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    style={{ height: `${col.pct > 0 ? col.pct : 4}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-semibold text-slate-400 truncate max-w-[45px] text-center">
                  {col.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Target Details Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Target Details
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Period:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">14 Oct - 28 Oct 2026 (15 Days)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Employee:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">HS</span>
                Harshini
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Department:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Marketing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Reviewer:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">DC D/CEO (Sir)</span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Total Score:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{totalPossibleScore}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Obtained Score:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {totalObtainedScore} ({scorePercent}%)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3 Bottom Action Cards (Carry Forward, Close Period, Export Reports) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Carry Forward Incomplete Tasks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-rose-500">
            <Repeat className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Carry Forward Incomplete Tasks
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            The following tasks are not completed. They can be automatically pushed to the next target period or manually reassigned by sir.
          </p>

          <div className="space-y-2 pt-1">
            {incompleteTasks.map((t, idx) => (
              <div key={t.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{t.title}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    t.status === 'Overdue' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t.deadline}</span>
                  {pushedTasks[t.id] ? (
                    <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Pushed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePushTask(t)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] transition"
                    >
                      Push to Next Period
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Complete Target & Close Period */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Complete Target &amp; Close Period
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Once reviewed, you can close this target period. Incomplete tasks will be moved to the next period.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleCloseAndCarryForward}
              disabled={isClosingPeriod || periodClosed}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              <Repeat className="w-3.5 h-3.5" />
              {isClosingPeriod ? 'Processing...' : periodClosed ? 'Period Closed & Rolled' : 'Close & Carry Forward'}
            </button>

            <button
              type="button"
              onClick={() => alert('Period remains open for further task updates.')}
              className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
            >
              Keep Open
            </button>
          </div>
        </div>

        {/* Card 3: Export Reports */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-purple-500">
              <Share2 className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Export Reports
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Download detailed reports for records, HR performance evaluations, and management review.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => handleExport('PDF')}
              className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold text-xs transition flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              Download PDF Report
            </button>

            <button
              type="button"
              onClick={() => handleExport('Excel')}
              className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-xs transition flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
