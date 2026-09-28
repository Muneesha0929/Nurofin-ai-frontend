import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\components\layout\Sidebar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

target = "const unreadNotificationsCount = notifications.filter(n => !n.read).length;"
rep = target + "\n  const isAdmin = userProfile && ['super_admin', 'ceo'].includes(userProfile.role);"

if "const isAdmin =" not in c:
    c = c.replace(target, rep)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Added isAdmin")
else:
    print("Already exists")
