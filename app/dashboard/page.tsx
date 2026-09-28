'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { 
  CheckSquare, Video, Clock, LayoutGrid, Users, AlertTriangle, 
  Sparkles, Info, UserPlus, GitBranch, Flag, MessageSquare 
} from 'lucide-react';
import { DailyCheckinModal } from '@/components/DailyCheckinModal';
import { FinanceAlertsWidget } from '@/components/FinanceAlertsWidget';
import { financeService } from '@/services/finance';
import { plannerService } from '@/services/planner';

import { 
  PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import { cn } from '@/utils/cn';

// Services for real live data
import { workcenterService, WCTask } from '@/services/workcenter';
import { projectsService } from '@/services/projects';
import { meetingsService } from '@/services/meetings';
import { Project, Meeting } from '@/types';

const priorityColor = (p: string) => p?.toLowerCase() === "high" || p?.toLowerCase() === "critical" ? 'text-accent-red' : p?.toLowerCase() === "medium" ? 'text-accent-orange' : 'text-accent-green';
const priorityBg = (p: string) => p?.toLowerCase() === "high" || p?.toLowerCase() === "critical" ? "bg-accent-red/10" : p?.toLowerCase() === "medium" ? "bg-accent-orange/10" : "bg-accent-green/10";
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const Badge = ({ children, colorClass, bgClass }: { children: React.ReactNode, colorClass?: string, bgClass?: string }) => (
  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap inline-block", colorClass || "text-text-muted", bgClass || "bg-surface-hover")}>
    {children}
  </span>
);

const PriorityBadge = ({ p }: { p: string }) => <Badge colorClass={priorityColor(p)} bgClass={priorityBg(p)}>{capitalize(p)}</Badge>;

const Card = ({ children, className, hover = true, onClick }: any) => {
  return (
    <div 
      onClick={onClick} 
      className={cn(
        "bg-surface-card border border-border-subtle rounded-2xl transition-all duration-200",
        hover && "hover:-translate-y-0.5 hover:shadow-lg hover:border-border-active",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
};

const SectionTitle = ({ title, href }: { title: string, href?: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-[13px] font-bold text-text-primary">{title}</span>
    {href && (
      <Link href={href} className="text-[11px] text-accent-blue font-semibold hover:text-accent-blue-hover transition-colors">View all &rarr;</Link>
    )}
  </div>
);

export default function DashboardPage() {
  const { userProfile, issues, notifications } = useStore();
  
  const [liveTasks, setLiveTasks] = useState<WCTask[]>([]);
  const [liveProjects, setLiveProjects] = useState<Project[]>([]);
  const [liveMeetings, setLiveMeetings] = useState<Meeting[]>([]);
    const [financialAlerts, setFinancialAlerts] = useState<any[]>([]);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [liveSchedule, setLiveSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskTab, setTaskTab] = useState("All");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      workcenterService.getTasks({ page_size: 100 }).catch(() => ({ tasks: [] })),
      projectsService.getProjects().catch(() => []),
      meetingsService.getMeetings().catch(() => [])
    ]).then(([tasksRes, projectsData, meetingsData]) => {
      if (mounted) {
        setLiveTasks(tasksRes.tasks || []);
        setLiveProjects(projectsData || []);
        setLiveMeetings(meetingsData || []);
        
          if (isCEO) {
            financeService.getTracker().then(t => setFinancialAlerts(t?.alerts || [])).catch(()=>[]);
          }
          
            const todayStr = new Date().toISOString().split('T')[0];
            if (userProfile?.role?.toLowerCase() === 'ceo') {
              plannerService.getUsers().then(users => {
                Promise.all(users.map(u => plannerService.getSchedule(u.id, todayStr, todayStr)))
                  .then(results => {
                    const allEvents = results.flatMap(r => 
                      (r.schedule || []).map((e: any) => ({
                        id: Math.random().toString(),
                        title: e.title,
                        time: e.start_time?.substring(0,5) || e.start?.substring(11,16) || 'All Day',
                        duration: e.type || 'Event',
                        assignee_name: r.user?.full_name || 'User'
                      }))
                    );
                    
                    const tasksForToday = (tasksRes.tasks || []).filter((t: any) => 
                      (t.deadline && t.deadline.startsWith(todayStr)) || 
                      (t.start_date && t.start_date.startsWith(todayStr))
                    ).map((t: any) => ({
                      id: Math.random().toString(),
                      title: t.title,
                      time: t.deadline?.split('T')[1]?.substring(0,5) || 'All Day',
                      duration: 'Task',
                      assignee_name: t.assigned_to_name || 'User'
                    }));
                    const combined = [...allEvents, ...tasksForToday];
                    setLiveSchedule(combined.sort((a,b) => a.time.localeCompare(b.time)));

                  }).catch(()=>[]);
              }).catch(()=>[]);
            } else {
              plannerService.getSchedule(Number(userProfile.id), todayStr, todayStr).then(r => {
                const events = (r?.schedule || []).map((e: any) => ({
                    id: Math.random().toString(),
                    title: e.title,
                    time: e.start_time?.substring(0,5) || e.start?.substring(11,16) || 'All Day',
                    duration: e.type || 'Event',
                    assignee_name: userProfile.name
                  }));
                const tasksForToday = (tasksRes.tasks || []).filter((t: any) => 
                  String(t.assigned_to_id) === String(userProfile.id) &&
                  ((t.deadline && t.deadline.startsWith(todayStr)) || (t.start_date && t.start_date.startsWith(todayStr)))
                ).map((t: any) => ({
                  id: Math.random().toString(),
                  title: t.title,
                  time: t.deadline?.split('T')[1]?.substring(0,5) || 'All Day',
                  duration: 'Task',
                  assignee_name: userProfile.name
                }));
                setLiveSchedule([...events, ...tasksForToday].sort((a:any,b:any) => (a.time||'').localeCompare(b.time||'')));
              }).catch(()=>[]);
            }

          setCheckinModalOpen(true);
          setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const isCEO = userProfile?.role?.toLowerCase() === 'ceo';
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter for the particular user (CEO sees all)
  const myTasks = isCEO ? liveTasks : liveTasks.filter(t => String(t.assigned_to_id) === String(userProfile?.id));
  const myMeetings = isCEO ? liveMeetings : liveMeetings.filter(m => m.attendees?.includes(userProfile?.name) || m.owner_name === userProfile?.name) || [];
  const myProjects = isCEO ? liveProjects : liveProjects.filter(p => p.members?.some(m => m.name === userProfile?.name)) || [];

  // Filter and sort Today's Meetings chronologically
  const todaysMeetings = myMeetings
    .filter(m => m.date === todayStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Filter and sort Upcoming Deadlines
  const upcomingDeadlines = myTasks
    .filter(t => t.status !== "completed" && t.deadline && t.deadline >= todayStr)
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    .slice(0, 4);

  // Real active stats
  const overdue = myTasks.filter((t) => t.status !== "completed" && t.deadline && new Date(t.deadline) < new Date()).length || 0;
  const pending = myTasks.filter((t) => t.status !== "completed").length || 0;
  
  const completedProjectsCount = myProjects.filter(p => p.status?.toLowerCase() === "completed").length || 0;
  const inProgressProjectsCount = myProjects.filter(p => p.status?.toLowerCase() === "active" || p.status?.toLowerCase() === "in progress").length || 0;
  const onHoldProjectsCount = myProjects.filter(p => p.status?.toLowerCase() === "on hold" || p.status?.toLowerCase() === "planning").length || 0;

  const donutData = [
    { name: "Completed", value: completedProjectsCount, color: '#22C55E' },
    { name: "In Progress", value: inProgressProjectsCount, color: '#3B82F6' },
    { name: "On Hold", value: onHoldProjectsCount, color: '#F59E0B' },
  ];
  
  // Statuses map to tabs: All, To Do (todo, pending), In Progress (in_progress), Done (completed)
  const filteredMy = taskTab === "All" 
    ? myTasks 
    : myTasks.filter((t) => {
        const s = t.status?.toLowerCase() || '';
        if (taskTab === 'Done') return s === 'completed' || s === 'done';
        if (taskTab === 'In Progress') return s === 'in_progress';
        if (taskTab === 'To Do') return s === 'todo' || s === 'planning' || s === 'pending';
        return true;
      });

  const stats = [
    { label: isCEO ? "All Tasks" : "My Tasks", sub: "Pending Tasks", value: pending, icon: CheckSquare, color: "text-accent-blue", bg: "bg-accent-blue/10", link: '/workcenter?status=pending' },
    { label: "Upcoming Meetings", sub: "Today", value: todaysMeetings.length, icon: Video, color: "text-accent-green", bg: "bg-accent-green/10", link: '/meetings' },
    { label: "Overdue", sub: "Action Required", value: overdue, icon: Clock, color: "text-accent-red", bg: "bg-accent-red/10", link: '/workcenter?status=overdue' },
    { label: isCEO ? "All Projects" : "My Projects", sub: "Active", value: inProgressProjectsCount, icon: LayoutGrid, color: "text-accent-green", bg: "bg-accent-green/10", link: '/projects' },
    { label: "Pending Issues", sub: "Needs review", value: issues?.filter(i => i.status !== "closed" && (isCEO || i.assigneeName === userProfile?.name || i.reporterName === userProfile?.name)).length || 0, icon: Users, color: "text-accent-orange", bg: "bg-accent-orange/10", link: '/issues' },
    ...(isCEO || userProfile?.can_view_finance ? [{ label: "Finance Alerts", sub: "Urgent", value: "Medium", icon: AlertTriangle, color: "text-accent-orange", bg: "bg-accent-orange/10", link: '/finance?view=alerts' }] : []),
  ];
  
  return (
    <div className="p-6 flex flex-col gap-5 bg-background-primary min-h-screen text-text-primary">
      
      <DailyCheckinModal 
        isOpen={checkinModalOpen} 
        onClose={() => setCheckinModalOpen(false)}
        overdueTasks={liveTasks.filter((t: any) => t.status === 'overdue')}
        yesterdayMeetings={[]}
        onTasksUpdate={() => {}}
      />
      {isCEO || userProfile?.can_view_finance ? <FinanceAlertsWidget alerts={financialAlerts} /> : null}
        <div className="flex justify-between items-end">
        <div>
          <div className="text-2xl font-extrabold flex items-center gap-2">
            Good Morning, {userProfile?.name?.split(" ")[0] || "User"} 👋 
            {loading && <span className="ml-2 text-xs font-normal text-text-muted animate-pulse">Loading live data...</span>}
          </div>
          <div className="text-[13px] text-text-muted mt-1">Here&apos;s what&apos;s happening with {isCEO ? "the team's" : "your"} work today.</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Link href={s.link} key={s.label} className="block">
            <Card className="p-4 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11.5px] text-text-muted font-semibold">{s.label}</div>
                  <div className="text-2xl font-extrabold mt-1">{loading ? '-' : s.value}</div>
                  <div className="text-[10.5px] text-text-secondary mt-0.5">{s.sub}</div>
                </div>
                <div className={cn("w-[34px] h-[34px] rounded-xl flex items-center justify-center", s.bg)}>
                  <s.icon size={16} className={s.color} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Today's schedule */}
        <Card className="p-4">
          <SectionTitle title="Today's Schedule" href="/planner?view=team" />
          <div className="flex flex-col gap-2.5 mt-3">
            {!loading && liveSchedule.slice(0, 4).map((m) => (
              <Link href="/meetings" key={m.id} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="flex gap-2.5 items-center cursor-pointer">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold truncate">{m.title} {isCEO && m.assignee_name ? `(Assignee: ${m.assignee_name})` : ""}</div>
                    <div className="text-[11px] text-text-secondary">{m.time} &middot; {m.duration}</div>
                  </div>
                </div>
              </Link>
            ))}
            {!loading && liveSchedule.length === 0 && <div className="text-[11.5px] text-text-secondary">No meetings today.</div>}
          </div>
        </Card>

        {/* Top priorities */}
        <Card className="p-4">
          <SectionTitle title="Top Priorities" href="/workcenter?status=pending" />
          <div className="flex flex-col gap-2 mt-3">
            {!loading && myTasks.filter((t) => t.status !== "completed").slice(0, 5).map((t) => (
              <Link href="/workcenter" key={t.id} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="flex justify-between items-center cursor-pointer">
                  <span className="text-[12.3px] truncate max-w-[150px]">{t.title} {isCEO && (t.assigned_to_name) ? `(Assignee: ${t.assigned_to_name})` : ""}</span>
                  <PriorityBadge p={t.priority || "medium"} />
                </div>
              </Link>
            ))}
            {!loading && myTasks.filter((t) => t.status !== "completed").length === 0 && (
              <div className="text-[11.5px] text-text-secondary">No pending priorities.</div>
            )}
          </div>
        </Card>

        {/* Project overview donut */}
        <Card className="p-4">
          <SectionTitle title={isCEO ? "All Projects Overview" : "My Projects Overview"} href="/projects" />
          <div className="flex items-center gap-2.5 h-[110px] mt-2.5">
            <div className="w-[110px] h-[110px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={3} stroke="none">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xl font-extrabold">{loading ? '-' : myProjects.length}</div>
                <div className="text-[8.5px] text-text-secondary">Total</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-text-muted">{d.value} {d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* AI recommendations */}
        <Card className="p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={14} className="text-accent-purple" />
            <span className="text-[13px] font-bold">AI Recommendations</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              `You have ${overdue} overdue tasks that need attention.`,
              `Unread notifications: ${notifications?.filter(n => !n.read).length || 0}.`,
              "3 tasks can be delegated to save your time."
            ].map((r, i) => (
              <div key={i} className="text-[11.5px] text-text-muted flex gap-1.5">
                <Info size={12} className="text-accent-purple shrink-0 mt-0.5" />
                {r}
              </div>
            ))}
          </div>
          <Link href="/chat" className="block text-[11.5px] text-accent-blue font-semibold mt-2.5 hover:text-accent-blue-hover transition-colors">
            Ask AI for more insights &rarr;
          </Link>
        </Card>
        {/* Team Chat Quick Access */}
        <Card className="p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Users size={14} className="text-accent-blue" />
            <span className="text-[13px] font-bold">Team Chat</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[11.5px] text-text-muted flex gap-1.5">
              <MessageSquare size={12} className="text-accent-blue shrink-0 mt-0.5" />
              Stay connected with your team and discuss tasks in real-time.
            </div>
          </div>
          <Link href="/team-chat" className="block text-[11.5px] text-accent-blue font-semibold mt-2.5 hover:text-accent-blue-hover transition-colors">
            Open Team Chat &rarr;
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Recent activity */}
        <Card className="p-4">
          <SectionTitle title="Recent Activity" href="/notifications" />
          <div className="flex flex-col gap-2.5 mt-3">
            {!loading && [...(notifications || []).map((n:any) => ({...n, type: 'Notification'})), ...(issues || []).map((i:any) => ({ title: `Issue: ${i.title}`, message: i.status, description: i.description, time: i.created_at || new Date().toISOString(), type: 'Issue', id: i.id }))].sort((a,b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime()).slice(0, 4).map((n: any, i: number) => (
              <Link href={n.type === 'Issue' ? "/issues" : "/notifications"} key={i} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-accent-blue/10">
                    <Info size={13} className="text-accent-blue" />
                  </div>
                  <div>
                    <div className="text-[12px]"><span className="font-bold">{n.title || "System"}</span></div>
                    {n.message && <div className="text-[11.5px] text-text-muted line-clamp-2">{n.message}</div>}
                    {n.description && <div className="text-[11.5px] text-text-muted line-clamp-2">{n.description}</div>}
                    <div className="text-[10.5px] text-text-secondary mt-0.5">{n.time || "Recently"}</div>
                  </div>
                </div>
              </Link>
            ))}
            {!loading && (notifications?.length === 0 && issues?.length === 0) && <div className="text-[11.5px] text-text-secondary text-center py-4">No recent activity.</div>}
          </div>
        </Card>

        {/* My tasks */}
        <Card className="p-4">
          <SectionTitle title={isCEO ? "All Tasks" : "My Tasks"} href="/workcenter?status=pending" />
          <div className="flex gap-1 my-2.5 bg-surface-hover p-0.5 rounded-lg">
            {["All", "To Do", "In Progress", "Done"].map((t) => (
              <button 
                key={t} 
                onClick={() => setTaskTab(t)} 
                className={cn(
                  "text-[10.5px] px-2 py-1 rounded-md font-semibold flex-1 transition-colors",
                  taskTab === t ? "bg-accent-blue text-white" : "text-text-muted hover:text-text-primary"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {!loading && filteredMy.slice(0, 4).map((t) => (
              <Link href="/workcenter" key={t.id} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="cursor-pointer">
                  <div className="flex justify-between">
                    <span className="text-[12px] font-medium">{t.title} {isCEO && (t.assigned_to_name) ? `(Assignee: ${t.assigned_to_name})` : ""}</span>
                    <PriorityBadge p={t.priority || "medium"} />
                  </div>
                  <div className="text-[10.5px] text-text-secondary mt-0.5">Due {t.deadline || 'No deadline'}</div>
                </div>
              </Link>
            ))}
            {!loading && filteredMy.length === 0 && <div className="text-[11.5px] text-text-secondary text-center py-4">Nothing here.</div>}
          </div>
        </Card>

        {/* Projects */}
        <Card className="p-4">
          <SectionTitle title={isCEO ? "All Projects" : "My Projects"} href="/projects" />
          <div className="flex flex-col gap-2.5 mt-3">
            {!loading && myProjects.slice(0, 4).map((p) => (
              <Link href="/projects" key={p.id} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="cursor-pointer">
                  <div className="flex justify-between text-[12px]">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-text-muted">{p.progress || 50}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full mt-1.5 overflow-hidden">
                    <div className={cn(
                      "h-full rounded-full",
                      p.status?.toLowerCase() === "completed" ? "bg-accent-green" : p.status?.toLowerCase() === "on hold" ? "bg-accent-orange" : "bg-accent-blue"
                    )} style={{ width: `${p.progress || 50}%` }} />
                  </div>
                </div>
              </Link>
            ))}
            {!loading && myProjects.length === 0 && <div className="text-[11.5px] text-text-secondary text-center py-4">No active projects.</div>}
          </div>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="p-4">
          <SectionTitle title="Upcoming Deadlines" href="/targets" />
          <div className="flex flex-col gap-2.5 mt-3">
            {!loading && upcomingDeadlines.map((t) => (
              <Link href="/workcenter" key={t.id} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="flex justify-between items-center cursor-pointer">
                  <div className="flex gap-2 items-center">
                    <Flag size={12} className={priorityColor(t.priority || "medium")} />
                    <span className="text-[12px] truncate max-w-[120px]">{t.title} {isCEO && (t.assigned_to_name) ? `(Assignee: ${t.assigned_to_name})` : ""}</span>
                  </div>
                  <span className="text-[11px] text-text-secondary">{t.deadline}</span>
                </div>
              </Link>
            ))}
            {!loading && upcomingDeadlines.length === 0 && <div className="text-[11.5px] text-text-secondary text-center py-4">No upcoming deadlines.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
