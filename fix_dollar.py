path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\finance\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('`$${(n || 0)', '`₹${(n || 0)')

if 'DollarSign' in c:
    c = c.replace('DollarSign', 'IndianRupee')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("Fixed dollar signs in Finance")
