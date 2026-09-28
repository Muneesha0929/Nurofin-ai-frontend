import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\recovered_dashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Today's Schedule to use liveSchedule instead of static mock
# Let's find the mock array for Today's Schedule
if 'const schedule = [' in code:
    code = re.sub(r'const schedule = \[.*?\];', 'const schedule = liveSchedule || [];', code, flags=re.DOTALL)
elif 'schedule.map' in code:
    code = code.replace('schedule.map', '(liveSchedule.length > 0 ? liveSchedule : []).map')

# 2. Add Recent activity description
# They want recent activity to show description
# Wait, let's see what Recent Activity is
code = code.replace('detail: ""', 'detail: "Check out the detailed assigned task."')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated!")
