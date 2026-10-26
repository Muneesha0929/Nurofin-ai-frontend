'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Star, 
  Folder, 
  User, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Save,
  Check,
  Paperclip,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import { EmployeeTask } from './Step2EmployeeDashboard';

interface Step3TaskWorkUpdateProps {
  task?: EmployeeTask;
  taskId?: string;
  onBackToDashboard?: () => void;
  onSaveSuccess?: (updatedTask: any) => void;
}

export default function Step3TaskWorkUpdate({
  task: initialTask,
  taskId,
  onBackToDashboard,
  onSaveSuccess
}: Step3TaskWorkUpdateProps) {
  // Master tasks list for pagination (1 of 5)
  const [allTasksList, setAllTasksList] = useState<EmployeeTask[]>([
    {
      id: 'task-1',
      sNo: 1,
      title: 'Create marketing posts',
      description: 'Design and post 3 posts for GMDI (LinkedIn/Instagram)',
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
      notes: 'Monthly report finalized with KPI analysis.',
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
      notes: 'Competitor benchmarking completed.',
      deliverables: ['competitor_sheet.xlsx'],
      progressPercent: 100
    }
  ]);

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (taskId) {
      const idx = allTasksList.findIndex(t => t.id === taskId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const currentTask = allTasksList[currentIndex];

  // Editable work state
  const [status, setStatus] = useState<'Pending' | 'In Progress' | 'Completed'>(currentTask.status);
  const [workNotes, setWorkNotes] = useState<string>(currentTask.notes || 'Created 2 posts. Working on the third post. Will complete by 26 Oct.');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string }[]>([
    { name: 'post1.png', size: '2.4 MB', type: 'image' },
    { name: 'post2.png', size: '1.8 MB', type: 'image' }
  ]);

  // History timeline items
  const [historyItems, setHistoryItems] = useState([
    {
      id: '1',
      time: 'Today, 10:30 AM',
      type: 'status',
      title: 'Status updated to In Progress',
      subtitle: '"Created 2 posts. Working on the third post."'
    },
    {
      id: '2',
      time: 'Yesterday, 4:20 PM',
      type: 'upload',
      title: 'File uploaded: post1.png',
      subtitle: ''
    },
    {
      id: '3',
      time: 'Yesterday, 4:15 PM',
      type: 'upload',
      title: 'File uploaded: post2.png',
      subtitle: ''
    },
    {
      id: '4',
      time: '14 Oct 2026, 09:00 AM',
      type: 'assignment',
      title: 'Task assigned by D/CEO',
      subtitle: '"Design and post 3 marketing posts for GMDI"'
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleNextTask = () => {
    if (currentIndex < allTasksList.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextT = allTasksList[nextIdx];
      setStatus(nextT.status);
      setWorkNotes(nextT.notes || '');
    }
  };

  const handlePrevTask = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevT = allTasksList[prevIdx];
      setStatus(prevT.status);
      setWorkNotes(prevT.notes || '');
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setAttachedFiles(attachedFiles.filter(f => f.name !== fileName));
  };

  const handleSimulateFileUpload = () => {
    const num = attachedFiles.length + 1;
    const newFile = {
      name: `deliverable_post_${num}.png`,
      size: '2.1 MB',
      type: 'image'
    };
    setAttachedFiles([...attachedFiles, newFile]);
    setHistoryItems([
      {
        id: Date.now().toString(),
        time: 'Just now',
        type: 'upload',
        title: `File uploaded: ${newFile.name}`,
        subtitle: ''
      },
      ...historyItems
    ]);
  };

  const handleSaveUpdate = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      
      // Update task in master list
      const updated = allTasksList.map((t, idx) => {
        if (idx === currentIndex) {
          return {
            ...t,
            status,
            notes: workNotes,
            deliverables: attachedFiles.map(f => f.name),
            progressPercent: status === 'Completed' ? 100 : status === 'In Progress' ? 66 : 0
          };
        }
        return t;
      });
      setAllTasksList(updated);

      // Add to history
      setHistoryItems([
        {
          id: Date.now().toString(),
          time: 'Just now',
          type: 'status',
          title: `Status updated to ${status}`,
          subtitle: `"${workNotes.slice(0, 50)}${workNotes.length > 50 ? '...' : ''}"`
        },
        ...historyItems
      ]);

      if (onSaveSuccess) {
        onSaveSuccess(updated[currentIndex]);
      }

      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner (Step 3 banner from WhatsApp image) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-transparent border border-blue-500/20">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm tracking-wider shadow-md shadow-blue-500/20">
            STEP 3
          </span>
          <span className="text-slate-400 font-light">—</span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Update Your Work (Task Details)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can mark the task as Pending, In Progress or Completed and add your work details here.
            </p>
          </div>
        </div>

        {/* Back navigation & Sprint dropdown */}
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to My Tasks
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
            Q3 (14 Oct - 28 Oct 2026)
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Task update saved successfully! Changes synced to Task Center & CEO Matrix.
          </div>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Back to Tasks →
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Left Task Details form, Right Progress & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Task Details & Update Form */}
        <div className="lg:col-span-2 bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          
          {/* Header with Title & Task Pagination (Task 1 of 5) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  {currentTask.title}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentTask.description}
                </p>
              </div>
            </div>

            {/* Pagination: Task X of Y < > */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>Task {currentIndex + 1} of {allTasksList.length}</span>
              <div className="flex items-center gap-1 ml-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                <button
                  onClick={handlePrevTask}
                  disabled={currentIndex === 0}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextTask}
                  disabled={currentIndex === allTasksList.length - 1}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Metadata Chips: Deadline, Score, Category, Assigned by */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" /> Deadline
              </div>
              <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{currentTask.deadline}</div>
              <div className="text-[10px] text-amber-500 font-semibold">(5 days left)</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <Star className="w-3.5 h-3.5 text-amber-500" /> Score
              </div>
              <div className="font-black text-sm text-slate-800 dark:text-slate-200">{currentTask.score} Points</div>
              <div className="text-[10px] text-slate-400">Target weight</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <Folder className="w-3.5 h-3.5 text-purple-500" /> Category
              </div>
              <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{currentTask.category || 'Marketing'}</div>
              <div className="text-[10px] text-slate-400">Department</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-emerald-500" /> Assigned By
              </div>
              <div className="font-bold text-xs text-blue-600 dark:text-blue-400">{currentTask.assignedBy || 'DC D/CEO'}</div>
              <div className="text-[10px] text-slate-400">Reviewer</div>
            </div>
          </div>

          {/* Full Description Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Full Description
            </label>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Design and post 3 marketing posts for GMDI on LinkedIn and Instagram. Use proper branding and keep the content professional. Ensure copy is proofread and matches Q3 messaging guidelines.
            </div>
          </div>

          {/* Update Status Radio Group */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Update Status
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 'Pending', label: 'Pending', color: 'border-amber-500 text-amber-500' },
                { val: 'In Progress', label: 'In Progress', color: 'border-blue-500 text-blue-500' },
                { val: 'Completed', label: 'Completed', color: 'border-emerald-500 text-emerald-500' }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setStatus(opt.val as any)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    status === opt.val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    status === opt.val ? 'border-white' : 'border-slate-400'
                  }`}>
                    {status === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Work Update / Notes Textarea with Char Count (61/500) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Your Work Update / Notes
              </label>
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                {workNotes.length}/500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="Detail your progress, blockers, or deliverables..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
            />
          </div>

          {/* Attach Files (Optional) */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Attach Files (Optional)
            </label>

            {/* Drag & drop box */}
            <div 
              onClick={handleSimulateFileUpload}
              className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/40 text-center cursor-pointer transition"
            >
              <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Drag and drop files here or <span className="text-blue-600 dark:text-blue-400 underline">click to upload</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Images, PDFs, Docs (Max 10 MB each)
              </div>
            </div>

            {/* File chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{file.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{file.size}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.name)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevTask}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
            >
              ← Previous Task
            </button>

            <button
              type="button"
              onClick={handleSaveUpdate}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Update'}
            </button>
          </div>

        </div>

        {/* Right Column (1 span): Progress, Activity Timeline & Related Tasks */}
        <div className="space-y-6">
          
          {/* Task Progress Bar Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Task Progress
              </h3>
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                {currentTask.progressPercent || 66}%
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${currentTask.progressPercent || 66}%` }}
              ></div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {currentTask.progressPercent === 100 
                ? 'All deliverables completed' 
                : '2 of 3 posts completed'}
            </p>
          </div>

          {/* Activity / History Timeline Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Activity / History
            </h3>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {historyItems.map((item, idx) => (
                <div key={item.id} className="relative pl-6 text-xs space-y-0.5">
                  <div className={`absolute left-0.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#12131c] ${
                    item.type === 'status' ? 'bg-emerald-500' : item.type === 'upload' ? 'bg-blue-500' : 'bg-slate-400'
                  }`}></div>
                  <div className="text-[10px] font-semibold text-slate-400">{item.time}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{item.title}</div>
                  {item.subtitle && (
                    <div className="text-[11px] text-slate-500 italic">{item.subtitle}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Related Tasks Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Related Tasks
            </h3>

            <div className="space-y-2">
              {allTasksList.filter((_, i) => i !== currentIndex).map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    const idx = allTasksList.findIndex(x => x.id === t.id);
                    setCurrentIndex(idx);
                    setStatus(t.status);
                    setWorkNotes(t.notes || '');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 text-xs">{t.sNo}</span>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{t.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    t.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : t.status === 'In Progress'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {t.status}
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
