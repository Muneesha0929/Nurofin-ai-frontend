import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\planner\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

if "import { useSearchParams }" in lines[0] and "'use client'" in lines[1]:
    lines[0], lines[1] = lines[1], lines[0]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed use client directive")
