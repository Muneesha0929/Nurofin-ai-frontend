path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\components\FinanceAlertsWidget.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('>?', '>')
# Also we need to actually fix the dollar sign!
c = c.replace('>${alert.amount', '>₹{alert.amount')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed file')
