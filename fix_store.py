import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\store\index.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = "is_active: boolean;"
rep = target + "\n  can_view_finance?: boolean;"

if "can_view_finance" not in code:
    code = code.replace(target, rep)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Added to store")
