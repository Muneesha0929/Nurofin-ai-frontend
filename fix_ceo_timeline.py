import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = '''plannerService.getSchedule(Number(userProfile.id), new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);'''

replacement = '''
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
                    setLiveSchedule(allEvents.sort((a,b) => a.time.localeCompare(b.time)));
                  }).catch(()=>[]);
              }).catch(()=>[]);
            } else {
              plannerService.getSchedule(Number(userProfile.id), todayStr, todayStr).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);
            }
'''

code = code.replace(target, replacement)

# Now, the user says "In the today's scheduled data, I want all the tasks from the daily timeline".
# Wait, the planner daily timeline DOES NOT USE plannerService.getSchedule for Tasks! It uses tasksService.getTasks!
# Wait, but Dashboard ALREADY HAS myTasks which has tasks filtered for today!
# I can just mix them into the llEvents!
# Or wait, "I want all the tasks from the daily timeline... based on every teammate."
# OK, I will also inject myTasks into liveSchedule before sorting!
# But myTasks might not be available right away. liveTasks is.

target2 = '''setLiveSchedule(allEvents.sort((a,b) => a.time.localeCompare(b.time)));'''
replacement2 = '''
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
'''

code = code.replace(target2, replacement2)

target3 = '''plannerService.getSchedule(Number(userProfile.id), todayStr, todayStr).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);'''
replacement3 = '''plannerService.getSchedule(Number(userProfile.id), todayStr, todayStr).then(r => {
                const events = r?.schedule || [];
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
              }).catch(()=>[]);'''

code = code.replace(target3, replacement3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated CEO logic to fetch from all users and include tasks!")
