'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { Target } from '@/services/targetService';
import { CheckSquare, Trash2, Edit, ArrowRight } from 'lucide-react';

const CircularProgress = ({ percentage, label, color = "blue", size = "normal" }: { percentage: number, label: string, color?: string, size?: "normal" | "small" }) => {
  const radius = size === "small" ? 22 : 28;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  
  const colorMap: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-emerald-500",
    purple: "text-purple-500",
    orange: "text-amber-500",
    rose: "text-rose-500",
    teal: "text-teal-500",
    amber: "text-amber-500"
  };

  const svgClass = size === "small" ? "w-16 h-16" : "w-20 h-20";
  const center = size === "small" ? "32" : "40";
  const textClass = size === "small" ? "text-xs" : "text-base";
  const labelClass = size === "small" ? "text-[11px]" : "text-sm";
  const strokeWidth = size === "small" ? "3.5" : "5";

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg className={`${svgClass} transform -rotate-90`}>
          <circle
            className="text-slate-100 dark:text-[#1e2030]"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
          />
          <circle
            className={`${colorMap[color] || 'text-blue-500'} transition-all duration-500 ease-in-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
          />
        </svg>
        <span className={`absolute font-bold text-slate-700 dark:text-slate-200 ${textClass}`}>{Math.round(percentage)}%</span>
      </div>
      <span className={`font-medium text-slate-500 dark:text-slate-400 mt-1.5 whitespace-nowrap ${labelClass}`}>{label}</span>
    </div>
  );
};

export const COMPETENCIES = [
    { title: "Team Spirit & Collaboration", desc: "Works well with others, supports colleagues, shares information and contributes positively to the team." },
    { title: "Skills & Job Knowledge", desc: "Understands the role, has the required knowledge and continuously improves skills to perform the job effectively." },
    { title: "Timeliness & Time Management", desc: "Reports/starts work on time, manages priorities well and completes assigned work within agreed timelines." },
    { title: "Consistency & Discipline", desc: "Maintains consistent performance, follows processes and instructions, and demonstrates professional discipline." },
    { title: "Ownership & Accountability", desc: "Takes responsibility for assigned work, follows through without constant supervision and accepts accountability for results." },
    { title: "Practical Thinking & Street Smartness", desc: "Uses common sense, thinks practically, handles situations independently and finds solutions rather than only identifying problems." },
    { title: "Target Orientation & Achievement", desc: "Understands expectations and targets, plans accordingly and makes a strong effort to achieve or exceed them." },
    { title: "Leadership & Initiative", desc: "Takes initiative, proactively identifies what needs to be done, motivates/supports others and steps up when required." },
    { title: "Execution & Getting Things Done", desc: "Converts plans into action, follows up effectively, overcomes obstacles and ensures that work is completed with the desired outcome." },
    { title: "Delegation & Team Development", desc: "Where applicable, assigns work appropriately, gives clear direction, follows up and develops team members to take greater responsibility." }
];

interface Props {
  viewMonth: string;
  users: UserProfile[];
  allTargets: Record<number, Target[]>;
  allUsersList: UserProfile[];
  currentUser: UserProfile;
  onEdit?: (target: Target) => void;
  onDelete?: (targetId: number) => void;
  onToggle?: (target: Target) => void;
  onScoreUpdate?: (target: Target, score: number) => void;
  onPushTarget?: (target: Target) => void;
}

export default function PerformanceDashboard({ viewMonth, users, allTargets, allUsersList, currentUser, onEdit, onDelete, onToggle, onScoreUpdate, onPushTarget }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);

  const getCleanTitle = (title: string) => title.replace(/^\[Quarterly\]\s*/i, '').replace(/^\[Eval\]\s*/i, '');
  const isQuarterly = (t: Target) => t.title.toLowerCase().startsWith('[quarterly]');
  const isEval = (t: Target) => t.title.startsWith('[Eval]');

  const userColors = ['blue', 'purple', 'green', 'orange', 'rose', 'teal'];
  
  const getUserRole = (userId: number) => {
      const u = allUsersList.find(x => Number(x.id) === userId);
      return u?.role?.toLowerCase() || '';
  };
  
  const isCeo = (userId: number) => {
      if (userId === 1) return true;
      const role = getUserRole(userId);
      return role === 'ceo' || role === 'super_admin';
  };

  const [year, month] = viewMonth.split('-');
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-[#12131c] rounded-2xl shadow-sm border border-slate-200 dark:border-[#1e2030] overflow-hidden">
        
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 p-5 border-b border-slate-100 dark:border-[#1e2030] bg-slate-50 dark:bg-[#181926] font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
          <div className="col-span-4 pl-4">Employee</div>
          <div className="col-span-2 text-center">Work Completed</div>
          <div className="col-span-2 text-center">Peer Eval</div>
          <div className="col-span-2 text-center">CEO Eval</div>
          <div className="col-span-2 text-center">Overall Average</div>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading performance data...</div>
        ) : (
          users.map((emp, index) => {
            const allT = allTargets[Number(emp.id)] || [];
            const targets = allT.filter(t => {
                const targetMonth = t.month || "";
                return targetMonth === viewMonth;
            });

            const themeColor = userColors[index % userColors.length];
            
            let validWorkTargets = 0;
            let workSum = 0;
            let validCeoTargets = 0;
            let ceoSum = 0;
            let validPeerTargets = 0;
            let peerSum = 0;
            
            targets.forEach(t => {
                const isEvalTarget = t.title.startsWith('[Eval]');
                let hasSelfScore = false;
                
                if (t.reviewer_scores && t.reviewer_scores.length > 0) {
                    t.reviewer_scores.forEach(s => {
                        const rId = Number(s.reviewer_id);
                        if (rId === Number(emp.id)) {
                            if (!isEvalTarget) {
                                workSum += s.score;
                                validWorkTargets++;
                                hasSelfScore = true;
                            }
                        } else if (isCeo(rId)) {
                            ceoSum += s.score;
                            validCeoTargets++;
                        } else {
                            peerSum += s.score;
                            validPeerTargets++;
                        }
                    });
                } else {
                    if (t.my_score != null && t.my_score > 0 && !isEvalTarget) {
                        workSum += t.my_score;
                        validWorkTargets++;
                        hasSelfScore = true;
                    }
                    if (t.average_score != null && t.score_count > 0) {
                        if (t.my_score != null && t.score_count > 1) {
                            const othersTotal = (t.average_score * t.score_count) - (isEvalTarget ? 0 : t.my_score);
                            const othersAvg = othersTotal / (t.score_count - (isEvalTarget ? 0 : 1));
                            ceoSum += othersAvg;
                            validCeoTargets++;
                        } else if (t.my_score == null && t.score_count > 0) {
                            ceoSum += t.average_score;
                            validCeoTargets++;
                        }
                    }
                }
                
                if (!hasSelfScore && !isEvalTarget) {
                    if (t.is_completed) {
                        workSum += 100;
                    }
                    if (t.is_completed || t.id > 0) {
                        validWorkTargets++;
                    }
                }
            });

            const workCompleted = validWorkTargets > 0 ? (workSum / validWorkTargets) : 0;
            const ceoEval = validCeoTargets > 0 ? (ceoSum / validCeoTargets) : 0;
            const peerEval = validPeerTargets > 0 ? (peerSum / validPeerTargets) : 0;
            
            let overall = 0;
            if (targets.length === 0) overall = 0;
            else overall = (workCompleted + peerEval + ceoEval) / 3;

            const isExpanded = selectedEmployee === Number(emp.id);

            // Filtering
            const quarterlyTargets = targets.filter(t => isQuarterly(t));
            const globalTargets = targets.filter(t => t.is_global && !isQuarterly(t) && !isEval(t));
            const indTargets = targets.filter(t => !t.is_global && !isQuarterly(t) && !isEval(t));

            // Monthly Employee Evaluations
            const currentMonth = viewMonth;
            const isEmpTeamLead = emp.role?.toLowerCase() === 'team_lead';
            const isSelf = Number(currentUser?.id) === Number(emp.id);
            const isEmployeeViewer = currentUser?.role?.toLowerCase() !== 'team_lead' && currentUser?.role?.toLowerCase() !== 'ceo' && currentUser?.role?.toLowerCase() !== 'super_admin';
            const isEmployeeViewingTeamLead = isEmployeeViewer && isEmpTeamLead && !isSelf;

            const comps = isEmpTeamLead 
                ? (isEmployeeViewingTeamLead ? COMPETENCIES.slice(7, 10) : COMPETENCIES) 
                : COMPETENCIES.slice(0, 7);
            
            const monthlyEvalTargets: Target[] = comps.map((c, idx) => {
                const existing = targets.find(t => t.title === `[Eval] ${c.title}` && t.month === currentMonth);
                if (existing) return existing;
                return {
                    id: -1000000 - idx, // dummy negative ID
                    title: `[Eval] ${c.title}`,
                    description: c.desc,
                    month: currentMonth,
                    is_global: false,
                    is_completed: false,
                    user_id: Number(emp.id),
                    created_by_id: 0,
                    my_score: 0,
                    average_score: 0,
                    score_count: 0
                } as Target;
            });

            const renderTargetList = (list: Target[], emptyMsg: string, isEvalSection: boolean = false) => {
              if (list.length === 0) return <div className="text-slate-400 text-sm py-3 italic px-4">{emptyMsg}</div>;
              return list.map(t => {
                const isWcQuarter = t.id < 0 && !isEval(t);
                const myEval = t.my_score ?? 0;
                
                let tWork = 0, tPeer = 0, tCeo = 0;
                let hasWork = false, hasPeer = false, hasCeo = false;
                
                if (t.reviewer_scores && t.reviewer_scores.length > 0) {
                    t.reviewer_scores.forEach(s => {
                        const rId = Number(s.reviewer_id);
                        if (rId === Number(emp.id)) { tWork = s.score; hasWork = true; }
                        else if (isCeo(rId)) { tCeo = s.score; hasCeo = true; }
                        else { tPeer = s.score; hasPeer = true; }
                    });
                } else {
                    if (t.my_score != null && t.my_score > 0) { tWork = t.my_score; hasWork = true; }
                    if (t.average_score != null && t.score_count > 0) {
                        if (t.my_score != null && t.score_count > 1) {
                            const othersTotal = (t.average_score * t.score_count) - t.my_score;
                            tCeo = othersTotal / (t.score_count - 1); hasCeo = true;
                        } else if (t.my_score == null && t.score_count > 0) {
                            tCeo = t.average_score; hasCeo = true;
                        }
                    }
                }
                if (!hasWork && t.is_completed) { tWork = 100; hasWork = true; }
                
                let tOverallSum = 0, tOverallCount = 0;
                if (hasWork && !isEvalSection) { tOverallSum += tWork; tOverallCount++; }
                if (hasPeer) { tOverallSum += tPeer; tOverallCount++; }
                if (hasCeo) { tOverallSum += tCeo; tOverallCount++; }
                const tOverall = tOverallCount > 0 ? tOverallSum / tOverallCount : 0;
                
                const isSelfTarget = Number(currentUser?.id) === Number(emp.id);
                const showScoreInput = !isWcQuarter && (!isEvalSection || !isSelfTarget);
                const scoreLabel = isSelfTarget ? "My Progress %" : "Add Score %";
                const circleSize = showScoreInput ? "small" : "normal";

                return (
                <div key={t.id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center py-4 px-4 border-b border-slate-100 dark:border-[#1e2030] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                  
                  {/* Left: Title & Checkbox */}
                  <div className="flex items-start gap-3 w-full xl:w-1/3 mb-4 xl:mb-0 pr-4">
                    {!isEvalSection && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onToggle?.(t); }}
                          className={`flex-shrink-0 w-4 h-4 mt-1 rounded border flex items-center justify-center transition-colors ${t.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}
                          disabled={isWcQuarter}
                          title={isWcQuarter ? "Managed in Workcenter" : "Toggle complete"}
                        >
                          {t.is_completed && <CheckSquare className="w-3 h-3" />}
                        </button>
                    )}
                    <div className="flex flex-col">
                        <span className={t.is_completed && !isEvalSection ? 'line-through text-slate-400 text-sm font-medium' : 'text-slate-700 dark:text-slate-200 text-sm font-bold leading-tight'}>
                          {getCleanTitle(t.title)}
                        </span>
                        {(() => {
                            if (!t.description) return null;
                            const match = t.description.match(/\[Pushed from (\d{4}-\d{2})\]/);
                            const cleanDesc = t.description.replace(/\[Pushed from \d{4}-\d{2}\]\s*/, '');
                            return (
                                <>
                                    {cleanDesc && <span className="text-[11px] text-slate-500 mt-1 leading-relaxed">{cleanDesc}</span>}
                                    {match && <span className="text-[10px] text-orange-500 font-bold uppercase mt-1">Pushed from {match[1]}</span>}
                                </>
                            );
                        })()}
                        {isWcQuarter && <span className="text-[10px] text-purple-500 font-bold uppercase mt-1">Workcenter Global</span>}
                    </div>
                  </div>

                  {/* Middle: Mini Circles for this Target */}
                  <div className={`flex items-center justify-start xl:justify-center gap-6 ${showScoreInput ? 'w-full xl:w-auto mb-4 xl:mb-0' : 'flex-1 justify-end xl:pr-12'}`}>
                      {!isEvalSection && <CircularProgress percentage={tWork} label="Work" color={themeColor} size={circleSize} />}
                      <CircularProgress percentage={tPeer} label="Peer" color={themeColor} size={circleSize} />
                      <CircularProgress percentage={tCeo} label="CEO" color={themeColor} size={circleSize} />
                      <CircularProgress percentage={tOverall} label="Avg" color={themeColor} size={circleSize} />
                  </div>

                  {/* Right: Actions (Score Input + Edit/Delete) */}
                  {showScoreInput && (
                      <div className="flex items-center justify-end gap-4 w-full xl:w-auto">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1a1c23] px-3 py-2 rounded-lg shadow-inner border border-slate-200 dark:border-[#2a2d3d]">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{scoreLabel}</label>
                            <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                defaultValue={myEval} 
                                onBlur={(e) => { e.stopPropagation(); onScoreUpdate?.(t, Number(e.target.value)); }}
                                className="w-16 bg-white dark:bg-[#12131c] border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 font-bold text-center"
                                title="Enter percentage score and click away"
                            />
                        </div>

                        {!isWcQuarter && !isEvalSection && (
                            <div className="flex items-center gap-1">
                              {!t.is_completed && !t.title.includes('(Pushed)') && (
                                  <button onClick={(e) => { e.stopPropagation(); onPushTarget?.(t); }} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors" title="Push to Next Month">
                                      <ArrowRight className="w-5 h-5" />
                                  </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); onEdit?.(t); }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" title="Edit">
                                  <Edit className="w-5 h-5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onDelete?.(t.id); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors" title="Delete">
                                  <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                        )}
                      </div>
                  )}

                </div>
                );
              });
            };

            return (
              <div key={emp.id} className="border-b last:border-b-0 border-slate-100 dark:border-[#1e2030] bg-white dark:bg-[#12131c]">
                
                {/* User Aggregate Row */}
                <div 
                  className="grid grid-cols-12 gap-4 p-5 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors"
                  onClick={() => setSelectedEmployee(isExpanded ? null : Number(emp.id))}
                >
                  <div className="col-span-4 flex items-center space-x-4 pl-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold uppercase overflow-hidden flex-shrink-0 shadow-sm border-2 border-white dark:border-[#1e2030] bg-slate-100 text-slate-600`}>
                      {emp.avatar ? (
                        <img src={emp.avatar} alt={emp.name || emp.username} className="w-full h-full object-cover" />
                      ) : (
                        (emp.name || emp.username || 'U').substring(0, 2)
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-base text-slate-800 dark:text-slate-100">{emp.name || emp.username}</div>
                      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">{emp.role}</div>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex justify-center">
                    <CircularProgress percentage={workCompleted} label="Work" color={themeColor} />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <CircularProgress percentage={peerEval} label="Peer" color={themeColor} />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <CircularProgress percentage={ceoEval} label="CEO" color={themeColor} />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <CircularProgress percentage={overall} label="Overall" color={themeColor} />
                  </div>
                </div>

                {/* Expanded Detailed Targets with Horizontal Rows */}
                {isExpanded && (
                  <div className="p-0 sm:p-8 bg-slate-50/50 dark:bg-[#181926]/50 border-t border-slate-100 dark:border-[#1e2030]">
                    <div className="px-4 sm:px-0 mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        Evaluate Targets <span className="text-slate-400 font-normal">&mdash; {emp.name || emp.username}</span>
                      </h3>
                    </div>

                    <div className="flex flex-col gap-8">

                      {/* Employee Feedback Section */}
                      <div className="bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-[#1e2030] shadow-sm overflow-hidden">
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 border-b border-slate-200 dark:border-[#1e2030]">
                          <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 uppercase text-xs tracking-wider">
                            Monthly Employee Evaluation Feedback ({monthName})
                          </h4>
                        </div>
                        <div className="flex flex-col">
                          {renderTargetList(monthlyEvalTargets, "No evaluation criteria", true)}
                        </div>
                      </div>
                      
                      {!isEmployeeViewingTeamLead && (
                        <>
                          {/* Quarter-wise Section */}
                          <div className="bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-[#1e2030] shadow-sm overflow-hidden">
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 border-b border-slate-200 dark:border-[#1e2030]">
                          <h4 className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2 uppercase text-xs tracking-wider">
                            Quarter-wise Targets
                          </h4>
                        </div>
                        <div className="flex flex-col">
                          {renderTargetList(quarterlyTargets, "No quarterly targets")}
                        </div>
                      </div>

                      {/* Global Section */}
                      <div className="bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-[#1e2030] shadow-sm overflow-hidden">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 border-b border-slate-200 dark:border-[#1e2030]">
                          <h4 className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase text-xs tracking-wider">
                            Global Targets
                          </h4>
                        </div>
                        <div className="flex flex-col">
                          {renderTargetList(globalTargets, "No global targets")}
                        </div>
                      </div>
                      
                      {/* Individual Section */}
                      <div className="bg-white dark:bg-[#12131c] rounded-2xl border border-slate-200 dark:border-[#1e2030] shadow-sm overflow-hidden">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 border-b border-slate-200 dark:border-[#1e2030]">
                          <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 uppercase text-xs tracking-wider">
                            Individual Targets
                          </h4>
                        </div>
                        <div className="flex flex-col">
                          {renderTargetList(indTargets, "No individual targets")}
                        </div>
                      </div>
                        </>
                      )}

                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
