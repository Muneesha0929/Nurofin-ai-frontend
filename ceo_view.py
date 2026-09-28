import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Make CEO see assignee names on Tasks
code = code.replace('{t.title}', '{t.title} {isCEO && t.assigned_to_id ? (Assignee: ) : ""}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated CEO views")
