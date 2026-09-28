import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\team-chat\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Make CEO see assignee names on Tasks in team-chat
code = code.replace('{task.title}', '{task.title} {(task.assignedTo?.name || task.assignedToId) ? (Assignee: ) : ""}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated team-chat CEO views")
