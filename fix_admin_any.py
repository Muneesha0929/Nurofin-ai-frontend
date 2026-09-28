import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('const handleStartEditUser = (user: User) => {', 'const handleStartEditUser = (user: any) => {')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
