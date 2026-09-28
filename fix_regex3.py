path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

import re
code = re.sub(r'\(Assignee:\s*\)', r'(Assignee: )', code)

# Let's just find and replace all ? (Assignee: 
code = re.sub(r'\?\s*\(\s*Assignee:\s*\)\s*:', r'? (Assignee: ) :', code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Regex replace 3 done")
