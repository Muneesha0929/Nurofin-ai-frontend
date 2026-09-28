import re
path='components/FinanceAlertsWidget.tsx'
with open(path,'r',encoding='utf-8') as f: c=f.read()
c=c.replace('DollarSign','IndianRupee').replace('>','>?')
with open(path,'w',encoding='utf-8') as f: f.write(c)
print('Updated')
