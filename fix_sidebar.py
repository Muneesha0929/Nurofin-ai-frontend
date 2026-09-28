import re
path='components/layout/Sidebar.tsx'
with open(path,'r',encoding='utf-8') as f: c=f.read()
c=c.replace("{ label: 'Finance', href: '/finance', icon: DollarSign },","...(isAdmin || userProfile?.can_view_finance ? [{ label: 'Finance', href: '/finance', icon: DollarSign }] : []),")
with open(path,'w',encoding='utf-8') as f: f.write(c)
print('Updated Sidebar')
