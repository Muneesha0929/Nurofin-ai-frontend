import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('isAdmin || userProfile?.can_view_finance', 'isCEO || userProfile?.can_view_finance')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed Dashboard isAdmin reference')
