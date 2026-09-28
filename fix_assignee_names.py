path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix assignee logic everywhere.
# First, replace isCEO && m.assigned_to_id ? ... with checking for ssigned_to object
code = code.replace('{isCEO && m.assigned_to_id ?  (Assignee: ) : ""}', '{isCEO && m.assigned_to_id ?  (Assignee: ) : ""}')

# Actually, the user says "assignee one, assignee two", which means they saw "Assignee: 1", "Assignee: 2" !!
# Because user IDs are integers like 1 and 2!
# Let's see what is currently in pp/dashboard/page.tsx for Assignee: 
import re
matches = re.findall(r'Assignee:[^}]+', code)
for m in matches:
    print(m)
