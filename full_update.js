const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update Assignee syntax to use Name instead of ID
code = code.replace(/\$\{m\.assigned_to_id\}/g, '');
code = code.replace(/\$\{t\.assigned_to_id\}/g, '');
code = code.replace(/m\.assigned_to_id/g, '(m.assigned_to?.name || m.assigned_to_id || m.assigned_to)');

// 2. Add Team Chat widget below AI Recommendations
const teamChatWidget = 
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
;
code = code.replace('</Card>\n      </div>\n\n      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">', '</Card>\n' + teamChatWidget + '\n      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">');
code = code.replace('<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">', '<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">');

// 3. CEO live schedule
const ceoLogic = 
          if (isCEO) {
            financeService.getTracker().then(t => setFinancialAlerts(t?.alerts || [])).catch(()=>[]);
            
            // Build CEO schedule from all tasks and meetings today
            const todayStr = new Date().toISOString().split('T')[0];
            const ceoSched = [
              ...tasksRes.tasks.filter((t: any) => t.deadline && t.deadline.startsWith(todayStr)).map((t: any) => ({ id: t.id, title: t.title, time: t.deadline.split('T')[1]?.substring(0,5) || 'All Day', duration: 'Task', assigned_to: t.assigned_to })),
              ...meetingsData.filter((m: any) => m.start_time && m.start_time.startsWith(todayStr)).map((m: any) => ({ id: m.id, title: m.title, time: m.start_time.split('T')[1]?.substring(0,5) || 'All Day', duration: 'Meeting', assigned_to: m.host }))
            ];
            setLiveSchedule(ceoSched);
          } else {
            plannerService.getSchedule(Number(userProfile.id), new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);
          }
;
code = code.replace(/plannerService\.getSchedule\([^)]+\)\.then\([^)]+\)\.catch\(\(\)=>\[\]\);/, ceoLogic);

// 4. Recent Activity mapping issues + notifications
const mixedLogic = 
  const mixedActivity = [...(notifications || []).map((n:any) => ({...n, type: 'Notification'})), ...(issues || []).map((i:any) => ({ title: i.title, message: i.description || i.status, time: i.created_at, type: 'Issue' }))].sort((a,b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
  
  return (
;
if (!code.includes('const mixedActivity')) {
    code = code.replace('return (', mixedLogic);
}

code = code.replace('notifications.slice(0, 4).map((n, i) => (', 'mixedActivity.slice(0, 4).map((n: any, i: number) => (');
code = code.replace('notifications.length === 0', 'mixedActivity.length === 0');

if (!code.includes('MessageSquare')) {
    code = code.replace('Info, UserPlus, GitBranch, Flag', 'Info, UserPlus, GitBranch, Flag, MessageSquare');
}

fs.writeFileSync(filePath, code);
console.log("Finished overhaul");
