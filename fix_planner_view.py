import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\planner\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("const [activeTab, setActiveTab] = useState('week');", "const [activeTab, setActiveTab] = useState('day');")

code = code.replace("const [viewTeamSchedule, setViewTeamSchedule] = useState(searchParams.get('view') === 'team');", "const [viewTeamSchedule, setViewTeamSchedule] = useState(searchParams.get('view') === 'team' || isAdmin);")

target_fn = "const getEventsForDate = (dateStr: string) => {"
rep_fn = '''const getEventsForDate = (dateStr: string) => {
      const effectiveViewTeam = viewTeamSchedule && activeTab === 'day';'''
code = code.replace(target_fn, rep_fn)

code = code.replace("if (viewTeamSchedule) {\n        local = allLocalEvents", "if (effectiveViewTeam) {\n        local = allLocalEvents")
code = code.replace("const isTargetUser = viewTeamSchedule || String(t.assignedTo?.id || t.assigneeId) === String(selectedUserId);", "const isTargetUser = effectiveViewTeam || String(t.assignedTo?.id || t.assigneeId) === String(selectedUserId);")
code = code.replace("const isTargetUser = viewTeamSchedule || String(i.assignedTo?.id || i.assigneeId || i.reporterId) === String(selectedUserId);", "const isTargetUser = effectiveViewTeam || String(i.assignedTo?.id || i.assigneeId || i.reporterId) === String(selectedUserId);")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied fix")
