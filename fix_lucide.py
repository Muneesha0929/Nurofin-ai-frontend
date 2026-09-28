import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\finance\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('CircleIndianRupee', 'IndianRupee')
c = c.replace('BadgeIndianRupee', 'IndianRupee')
c = c.replace('FileIndianRupee', 'IndianRupee')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("Fixed invalid Lucide icons")
