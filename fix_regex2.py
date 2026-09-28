import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(r'\(Assignee:\s*\)', r'(Assignee: )', code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Regex replace 2 done")
