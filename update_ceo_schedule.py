path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = '''            plannerService.getSchedule(Number(userProfile.id), new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);'''

replacement = '''            if (isCEO) {
              const todayStr = new Date().toISOString().split('T')[0];
              const ceoSched = [
                ...(tasksRes.tasks || []).filter((t: any) => t.deadline && t.deadline.startsWith(todayStr)).map((t: any) => ({ id: t.id, title: t.title, time: t.deadline.split('T')[1]?.substring(0,5) || 'All Day', duration: 'Task', assigned_to_id: t.assigned_to?.name || t.assigned_to_id || t.assignedTo?.name || t.assignee })),
                ...(meetingsData || []).filter((m: any) => m.start_time && m.start_time.startsWith(todayStr)).map((m: any) => ({ id: m.id, title: m.title, time: m.start_time.split('T')[1]?.substring(0,5) || 'All Day', duration: 'Meeting', assigned_to_id: m.host?.name || m.host_id }))
              ];
              setLiveSchedule(ceoSched);
            } else {
              plannerService.getSchedule(Number(userProfile.id), new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);
            }'''

code = code.replace(target, replacement)
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated CEO Schedule")
