path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\team-chat\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# isCEO is usually defined as userProfile?.role === 'CEO'
if 'const isCEO =' not in code:
    code = code.replace('const userProfile = useStore((state) => state.userProfile);', 'const userProfile = useStore((state) => state.userProfile);\n  const isCEO = userProfile?.role === "CEO" || userProfile?.role === "Admin";')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Defined isCEO in team-chat")
