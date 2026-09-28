import re
path = 'app/finance/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

target = "const [financesLoading, setFinancesLoading] = useState(true);"
rep = target + "\n  const router = useRouter();\n  useEffect(() => { if (!isAdmin && !userProfile?.can_view_finance) router.push('/'); }, [isAdmin, userProfile, router]);"

if "router.push('/')" not in c:
    c = c.replace(target, rep)
    
    # ensure useRouter is imported
    if "import { useRouter } from 'next/navigation'" not in c:
        c = "import { useRouter } from 'next/navigation';\n" + c

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated Finance Page')
