import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\components\layout\Sidebar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('DollarSign', 'IndianRupee')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
