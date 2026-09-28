import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\workcenter\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = "const now = new Date().toISOString();"
rep = "const now = new Date().toISOString().split('T')[0];"
code = code.replace(target, rep)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed overdue date logic")
