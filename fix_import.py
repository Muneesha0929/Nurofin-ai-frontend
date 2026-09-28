import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\planner\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Add import if missing
if 'useSearchParams' not in code or 'next/navigation' not in code:
    code = "import { useSearchParams } from 'next/navigation';\n" + code

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Added useSearchParams import")
