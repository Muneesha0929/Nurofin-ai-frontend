import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# The user wants "Today's Schedule" to show the daily timeline (liveSchedule).
# In the original code, it maps todaysMeetings.slice(0,4).map((m) => ...)
# Let's replace todaysMeetings with liveSchedule in that specific block.

code = code.replace(
    'todaysMeetings.slice(0, 4).map((m) => (',
    'liveSchedule.slice(0, 4).map((m) => ('
)
# And in liveSchedule, the title is m.title, time is m.start (or whatever daily timeline uses)
# In Planner, timeline is { title, start, end, type }
# The code currently might be expecting Meeting object.
code = code.replace('{m.title}', '{m.title} {isCEO && m.assigned_to_id ? (Assignee: ) : ""}')

# Also handle "no meetings today message" when it should be tasks too
code = code.replace('todaysMeetings.length === 0', 'liveSchedule.length === 0')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated Today's Schedule to liveSchedule")
