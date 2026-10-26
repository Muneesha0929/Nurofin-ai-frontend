'use client';

import React, { useState } from 'react';
import { 
  GitFork, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Maximize2, 
  Minimize2,
  ExternalLink,
  Target,
  Sparkles
} from 'lucide-react';

interface ActivityNode {
  code: string;
  title: string;
  picName: string;
  picInitials: string;
  targetDate: string;
  status: 'Done' | 'In progress' | 'At risk' | 'Pending';
}

interface ObjectiveNode {
  id: string;
  num: number;
  title: string;
  status: 'On track' | 'At risk' | 'Off track' | 'Done';
  progress: number;
  activityCount: number;
  tag?: string;
  activities: ActivityNode[];
}

interface DepartmentNode {
  id: string;
  code: string;
  name: string;
  hodName: string;
  hodInitials: string;
  progress: number;
  health: 'On track' | 'At risk' | 'Off track' | 'Done';
  team: string[];
  objectives: ObjectiveNode[];
}

interface GoalMapTreeProps {
  onSelectActivity?: (activity: ActivityNode) => void;
}

export default function GoalMapTree({ onSelectActivity }: GoalMapTreeProps) {
  // Tree state
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
    bd: true,
    product: false,
    ops: false
  });

  const [expandedObjectives, setExpandedObjectives] = useState<Record<string, boolean>>({
    'bd-3': true,
    'bd-1': false
  });

  const [filterHealth, setFilterHealth] = useState<string>('all');

  const departments: DepartmentNode[] = [
    {
      id: 'bd',
      code: 'BD',
      name: 'Business Development',
      hodName: 'Karthik Raman',
      hodInitials: 'KR',
      progress: 74,
      health: 'At risk',
      team: ['HS', 'AM', 'DK'],
      objectives: [
        {
          id: 'bd-1',
          num: 1,
          title: 'Sign 12 new mid-market merchants',
          status: 'On track',
          progress: 65,
          activityCount: 7,
          tag: 'T1',
          activities: [
            { code: '1.1', title: 'Build target list of 150 merchants', picName: 'Harshini S', picInitials: 'HS', targetDate: '10 Oct', status: 'Done' },
            { code: '1.2', title: 'Outreach: 60 discovery calls', picName: 'Harshini S', picInitials: 'HS', targetDate: '31 Oct', status: 'Done' },
            { code: '1.3', title: 'Product demos to 25 shortlisted', picName: 'Arjun Mehta', picInitials: 'AM', targetDate: '15 Nov', status: 'In progress' }
          ]
        },
        {
          id: 'bd-2',
          num: 2,
          title: 'Grow volume from existing clients',
          status: 'At risk',
          progress: 70,
          activityCount: 3,
          tag: 'T2',
          activities: [
            { code: '2.1', title: 'Review top 10 merchant volume drops', picName: 'Divya Krishnan', picInitials: 'DK', targetDate: '25 Oct', status: 'In progress' },
            { code: '2.2', title: 'Propose volume discount tiering', picName: 'Karthik Raman', picInitials: 'KR', targetDate: '05 Nov', status: 'Pending' }
          ]
        },
        {
          id: 'bd-3',
          num: 3,
          title: 'Second sponsor bank in pipeline',
          status: 'On track',
          progress: 70,
          activityCount: 2,
          tag: 'T1',
          activities: [
            { code: '3.1', title: 'Shortlist 3 banks with API banking', picName: 'Karthik Raman', picInitials: 'KR', targetDate: '20 Oct', status: 'Done' },
            { code: '3.2', title: 'First meetings and tech due-diligence', picName: 'Karthik Raman', picInitials: 'KR', targetDate: '30 Nov', status: 'In progress' }
          ]
        },
        {
          id: 'bd-4',
          num: 4,
          title: 'Pricing playbook for the new rate card',
          status: 'Done',
          progress: 100,
          activityCount: 2,
          tag: 'T2',
          activities: [
            { code: '4.1', title: 'Competitor pricing benchmarking', picName: 'Divya Krishnan', picInitials: 'DK', targetDate: '12 Oct', status: 'Done' }
          ]
        },
        {
          id: 'bd-5',
          num: 5,
          title: 'Pipeline hygiene in CRM',
          status: 'On track',
          progress: 78,
          activityCount: 2,
          tag: 'T1',
          activities: [
            { code: '5.1', title: 'Purge duplicate lead entries', picName: 'Harshini S', picInitials: 'HS', targetDate: '18 Oct', status: 'Done' }
          ]
        }
      ]
    },
    {
      id: 'product',
      code: 'Product',
      name: 'Product & Engineering',
      hodName: 'Manisha',
      hodInitials: 'MN',
      progress: 75,
      health: 'At risk',
      team: ['AM', 'HS', 'AC'],
      objectives: [
        {
          id: 'prod-1',
          num: 1,
          title: 'Build & Track Go-Live and Bug-Free Rollout',
          status: 'On track',
          progress: 75,
          activityCount: 3,
          tag: 'T1',
          activities: [
            { code: '1.1', title: 'Fix Contractor Search on Reports Page', picName: 'Manisha', picInitials: 'MN', targetDate: '15-Day Milestone', status: 'Done' },
            { code: '1.2', title: 'Store Compliance & Play Store Submission', picName: 'Harshini', picInitials: 'HS', targetDate: 'Day 4 Milestone', status: 'Done' },
            { code: '1.3', title: 'Indirect Rewards & Payment History Export', picName: 'Alex C.', picInitials: 'AC', targetDate: 'Day 12 Milestone', status: 'In progress' }
          ]
        },
        {
          id: 'prod-2',
          num: 2,
          title: 'Executive Analytics & Reporting Suite',
          status: 'On track',
          progress: 80,
          activityCount: 2,
          tag: 'T2',
          activities: [
            { code: '2.1', title: 'Real-time roll-up dashboard sync', picName: 'Arjun Mehta', picInitials: 'AM', targetDate: 'Day 10', status: 'Done' }
          ]
        }
      ]
    },
    {
      id: 'ops',
      code: 'Ops',
      name: 'Operations',
      hodName: 'Sarah K.',
      hodInitials: 'SK',
      progress: 80,
      health: 'On track',
      team: ['LE', 'AR'],
      objectives: [
        {
          id: 'ops-1',
          num: 1,
          title: 'SLA Optimization & Payout Settlement Routing',
          status: 'On track',
          progress: 80,
          activityCount: 2,
          tag: 'T1',
          activities: [
            { code: '1.1', title: 'Automated retry mechanism for failed webhooks', picName: 'Sarah K.', picInitials: 'SK', targetDate: 'Day 8', status: 'Done' }
          ]
        }
      ]
    },
    {
      id: 'compliance',
      code: 'Compliance',
      name: 'Compliance & Legal',
      hodName: 'David R.',
      hodInitials: 'DR',
      progress: 90,
      health: 'Done',
      team: ['DR'],
      objectives: [
        {
          id: 'comp-1',
          num: 1,
          title: 'Play Store & Data Privacy Audit Compliance',
          status: 'Done',
          progress: 90,
          activityCount: 1,
          tag: 'T1',
          activities: [
            { code: '1.1', title: 'Submit signed compliance disclosure to Google', picName: 'David R.', picInitials: 'DR', targetDate: 'Day 5', status: 'Done' }
          ]
        }
      ]
    },
    {
      id: 'marketing',
      code: 'Marketing',
      name: 'Marketing & Growth',
      hodName: 'Harshini',
      hodInitials: 'HS',
      progress: 70,
      health: 'On track',
      team: ['HS'],
      objectives: [
        {
          id: 'mkt-1',
          num: 1,
          title: 'BuildTrack Launch Campaign & Social Proof',
          status: 'On track',
          progress: 70,
          activityCount: 3,
          tag: 'T1',
          activities: [
            { code: '1.1', title: 'Design 3 marketing posts for GMDI', picName: 'Harshini', picInitials: 'HS', targetDate: '28 Oct', status: 'In progress' },
            { code: '1.2', title: 'Competitor social benchmark report', picName: 'Harshini', picInitials: 'HS', targetDate: '28 Oct', status: 'Done' }
          ]
        }
      ]
    }
  ];

  const handleExpandAll = () => {
    const allD: Record<string, boolean> = {};
    const allO: Record<string, boolean> = {};
    departments.forEach(d => {
      allD[d.id] = true;
      d.objectives.forEach(o => {
        allO[o.id] = true;
      });
    });
    setExpandedDepts(allD);
    setExpandedObjectives(allO);
  };

  const handleCollapseAll = () => {
    setExpandedDepts({});
    setExpandedObjectives({});
  };

  const toggleDept = (id: string) => {
    setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Done':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'In progress':
      case 'On track':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'At risk':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Off track':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Controls (Matching localhost:4180 image 6) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GitFork className="w-6 h-6 text-blue-500 transform rotate-90" />
            Goal Map
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Q3 target → departments (HOD) → objectives 1–5 + Others → activities and the person in charge. Click to open a level.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={handleExpandAll}
              className="px-3 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expand all
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Collapse
            </button>
          </div>

          {/* Status Legend */}
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> On track
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> At risk
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Off track
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Done
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Tree View Container */}
      <div className="overflow-x-auto pb-8 pt-2">
        <div className="min-w-[900px] flex items-start gap-8">
          
          {/* Level 0: Root Company Goal Node */}
          <div className="w-72 shrink-0">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20 space-y-3 relative">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                Q3 FY 2026-27 Executive Target
              </div>
              <h2 className="text-base font-extrabold leading-snug">
                Make Nurofin the default payout partner for mid-market merchants
              </h2>

              <div className="pt-2 border-t border-blue-400/30">
                <div className="flex items-center justify-between text-xs font-bold mb-1 text-blue-100">
                  <span>64% complete</span>
                  <span>41 days left</span>
                </div>
                <div className="w-full bg-blue-900/60 rounded-full h-2 overflow-hidden">
                  <div className="bg-white h-2 rounded-full" style={{ width: '64%' }}></div>
                </div>
              </div>

              <div className="text-[10px] text-blue-200 font-medium pt-1">
                Connected to 7 department targets &amp; 15-day sprint cycles
              </div>
            </div>
          </div>

          {/* Level 1 & 2 & 3: Departments -> Objectives -> Activities Tree */}
          <div className="flex-1 space-y-6">
            {departments.map((dept) => {
              const isDeptExpanded = expandedDepts[dept.id];
              return (
                <div key={dept.id} className="relative flex items-start gap-6">
                  
                  {/* Connecting Line from Root */}
                  <div className="absolute -left-6 top-8 w-6 h-0.5 bg-slate-300 dark:bg-slate-700"></div>

                  {/* Level 1: Department Node Card */}
                  <div 
                    onClick={() => toggleDept(dept.id)}
                    className={`w-64 shrink-0 p-4 rounded-xl border transition cursor-pointer shadow-sm ${
                      isDeptExpanded
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/60 ring-1 ring-blue-500/30'
                        : 'bg-white dark:bg-[#12131c] border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                          {dept.hodInitials}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">{dept.code}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{dept.hodName}</div>
                        </div>
                      </div>

                      <span className="font-black text-xs text-slate-800 dark:text-slate-200">
                        {dept.progress}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${dept.progress >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${dept.progress}%` }}
                      ></div>
                    </div>

                    {/* Status Pill & Team Avatars */}
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(dept.health)}`}>
                        • {dept.health}
                      </span>

                      <div className="flex -space-x-1">
                        {dept.team.map((t, idx) => (
                          <span key={idx} className="w-4 h-4 rounded-full bg-slate-700 text-white text-[8px] font-bold flex items-center justify-center ring-1 ring-white dark:ring-slate-900">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Level 2: Objectives List (when department expanded) */}
                  {isDeptExpanded && (
                    <div className="flex-1 space-y-4">
                      {dept.objectives.map((obj) => {
                        const isObjExpanded = expandedObjectives[obj.id];
                        return (
                          <div key={obj.id} className="relative flex items-start gap-6">
                            
                            {/* Connector line to Department */}
                            <div className="absolute -left-6 top-6 w-6 h-0.5 bg-slate-300 dark:bg-slate-700"></div>

                            {/* Level 2 Node: Department Objective */}
                            <div
                              onClick={() => toggleObjective(obj.id)}
                              className={`w-72 shrink-0 p-3.5 rounded-xl border transition cursor-pointer shadow-sm ${
                                isObjExpanded
                                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/60 ring-1 ring-indigo-500/30'
                                  : 'bg-white dark:bg-[#12131c] border-slate-200 dark:border-slate-800 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                  {obj.num}
                                </span>
                                <div className="flex-1">
                                  <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                                    {obj.title}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                                    <span className={`px-1.5 py-0.5 rounded-full font-bold border ${getStatusBadge(obj.status)}`}>
                                      • {obj.status}
                                    </span>
                                    <span>{obj.progress}%</span>
                                    <span>•</span>
                                    <span>{obj.activityCount} activities</span>
                                    {obj.tag && (
                                      <span className="px-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300">
                                        {obj.tag}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Level 3: Activities Breakdown (when objective expanded) */}
                            {isObjExpanded && (
                              <div className="flex-1 space-y-2.5">
                                {obj.activities.map((act) => (
                                  <div
                                    key={act.code}
                                    onClick={() => onSelectActivity && onSelectActivity(act)}
                                    className="relative flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-slate-800 hover:border-blue-500 shadow-xs transition group cursor-pointer"
                                  >
                                    {/* Connector line to Objective */}
                                    <div className="absolute -left-6 top-5 w-6 h-0.5 bg-slate-300 dark:bg-slate-700"></div>

                                    <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 w-8">
                                      {act.code}
                                    </span>

                                    <div className="flex-1">
                                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {act.title}
                                      </div>
                                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold">
                                          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">
                                            {act.picInitials}
                                          </span>
                                          {act.picName}
                                        </span>
                                        <span>•</span>
                                        <span>{act.targetDate}</span>
                                      </div>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(act.status)}`}>
                                      • {act.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
}
