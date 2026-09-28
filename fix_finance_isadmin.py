import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\finance\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

target = "const [financesLoading, setFinancesLoading] = useState(true);"
rep = "const isAdmin = userProfile && ['super_admin', 'ceo'].includes(userProfile.role);\n  " + target

if "const isAdmin = " not in c:
    c = c.replace(target, rep)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Added isAdmin to Finance")
else:
    print("Already there")
