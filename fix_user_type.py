import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\types\index.ts'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('performance_score?: number;', 'performance_score?: number;\n  can_view_finance?: boolean;')
c = c.replace('role: string;\n  avatar: string;', 'role: string;\n  avatar: string;\n  can_view_finance?: boolean;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Added can_view_finance to User types")
