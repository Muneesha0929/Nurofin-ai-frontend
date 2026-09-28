import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Assignee syntax to use Name instead of ID
code = code.replace('', '')
code = code.replace('', '')

# 2. Add Team Chat widget below AI Recommendations
team_chat_widget = """
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
"""
# Currently there is a </div> after AI recommendations card.
# Let's insert the widget before it.
# Actually, if I add a 5th card to a 4-col grid, it will wrap perfectly.
if '{/* AI recommendations */}' in code:
    code = code.replace('</Card>\n      </div>\n\n      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">', '</Card>\n' + team_chat_widget + '\n      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">')
    # Wait, the first grid is lg:grid-cols-4 or lg:grid-cols-5? Let's check.
    # It has 5 cards now: Today's schedule, Top priorities, Tasks, Projects, AI Recs.
    # Wait, 5 cards! So adding Team Chat makes it 6 cards?
    # No, it currently has Today's schedule, Top priorities, Tasks, Projects, AI Recs. Wait, Today's schedule is in the SECOND grid!
    # First grid has: Top priorities, Tasks, Projects, AI Recs. (4 cards).
    # If I add Team Chat, it makes 5. I'll just change the first grid to grid-cols-5!
    code = code.replace('<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">', '<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">')
    code = code.replace('<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">', '<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">')

# 3. CEO live schedule
ceo_logic = """
          if (isCEO) {
            financeService.getTracker().then(t => setFinancialAlerts(t?.alerts || [])).catch(()=>[]);
            
            // Build CEO schedule from all tasks and meetings today
            const todayStr = new Date().toISOString().split('T')[0];
            const ceoSched = [
              ...tasksRes.tasks.filter((t: any) => t.deadline && t.deadline.startsWith(todayStr)).map((t: any) => ({ id: t.id, title: t.title, time: t.deadline.split('T')[1]?.slice(0,5) || 'All Day', duration: 'Task', assigned_to: t.assigned_to })),
              ...meetingsData.filter((m: any) => m.start_time && m.start_time.startsWith(todayStr)).map((m: any) => ({ id: m.id, title: m.title, time: m.start_time.split('T')[1]?.slice(0,5) || 'All Day', duration: 'Meeting', assigned_to: m.host }))
            ];
            setLiveSchedule(ceoSched);
          } else {
            plannerService.getSchedule(Number(userProfile.id), new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);
          }
"""
# Replace the current plannerService call inside useEffect
if 'plannerService.getSchedule(' in code:
    code = re.sub(r'plannerService\.getSchedule\(.*?\)\.catch\(\(\)=>\[\]\);', ceo_logic, code, flags=re.DOTALL)

# Also fix m.assigned_to_id in Today's schedule to use m.assigned_to
code = code.replace('m.assigned_to_id', 'm.assigned_to')

# 4. Recent Activity mapping issues + notifications
# It maps 
otifications.slice(0, 4). Let's mix issues into notifications.
mixed_logic = """
          const mixedActivity = [...notifications.map((n:any) => ({...n, type: 'Notification'})), ...issues.map((i:any) => ({ title: i.title, message: i.description || i.status, time: i.created_at, type: 'Issue' }))].sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());
          
          return (
"""
if 'const mixedActivity' not in code:
    code = code.replace('return (', mixed_logic, 1)

# And use mixedActivity instead of 
otifications in Recent Activity
code = code.replace('notifications.slice(0, 4).map((n, i) => (', 'mixedActivity.slice(0, 4).map((n, i) => (')
code = code.replace('notifications.length === 0', 'mixedActivity.length === 0')

# Don't forget to import MessageSquare
if 'MessageSquare' not in code:
    code = code.replace('Info, UserPlus, GitBranch, Flag', 'Info, UserPlus, GitBranch, Flag, MessageSquare')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Finished overhaul")
