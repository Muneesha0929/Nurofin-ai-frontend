import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace CEO schedule logic
target = '''            if (isCEO) {
              const todayStr = new Date().toISOString().split('T')[0];
              const ceoSched = [
                ...(tasksRes.tasks || []).filter((t: any) => t.deadline && t.deadline.startsWith(todayStr)).map((t: any) => ({ id: t.id, title: t.title, time: t.deadline.split('T')[1]?.substring(0,5) || 'All Day', duration: 'Task', assigned_to_id: t.assigned_to?.name || t.assigned_to_id || t.assignedTo?.name || t.assignee })),
                ...(meetingsData || []).filter((m: any) => m.start_time && m.start_time.startsWith(todayStr)).map((m: any) => ({ id: m.id, title: m.title, time: m.start_time.split('T')[1]?.substring(0,5) || 'All Day', duration: 'Meeting', assigned_to_id: m.host?.name || m.host_id }))
              ];
              setLiveSchedule(ceoSched);
            } else {'''

replacement = '''            if (isCEO) {
              const todayStr = new Date().toISOString().split('T')[0];
              plannerService.getUsers().then(users => {
                Promise.all(users.map(u => plannerService.getSchedule(u.id, todayStr, todayStr)))
                  .then(results => {
                    const allEvents = results.flatMap(r => 
                      (r.schedule || []).map(e => ({
                        id: Math.random().toString(),
                        title: e.title,
                        time: e.start_time?.substring(0,5) || 'All Day',
                        duration: e.type || 'Event',
                        assigned_to_id: r.user?.full_name || 'User'
                      }))
                    );
                    setLiveSchedule(allEvents.sort((a,b) => a.time.localeCompare(b.time)));
                  }).catch(()=>[]);
              }).catch(()=>[]);
            } else {'''

code = code.replace(target, replacement)

# Fix assignee tags to use assigned_to_id directly since it's already the name now!
# Wait, for myTasks it still needs the old fallback!
# But for m.assigned_to_id, it is now the full name!
# We also need to fix m.assigned_to?.name || m.assigned_to_id || m.assigned_to from my previous JS script!
code = code.replace('(m.assigned_to?.name || m.assigned_to_id || m.assigned_to)', 'm.assigned_to_id')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated CEO Schedule with all user planner schedules!")
