import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# We need to find the else block where employee's events are fetched.
target = '''const events = r?.schedule || [];'''
rep = '''const events = (r?.schedule || []).map((e: any) => ({
                    id: Math.random().toString(),
                    title: e.title,
                    time: e.start_time?.substring(0,5) || e.start?.substring(11,16) || 'All Day',
                    duration: e.type || 'Event',
                    assignee_name: userProfile.name
                  }));'''

if target in c:
    c = c.replace(target, rep)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Fixed employee liveSchedule events mapping")
else:
    print("Could not find target")
