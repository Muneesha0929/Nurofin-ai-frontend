import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\components\DailyCheckinModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("I'll do this later", "I&apos;ll do this later")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("Fixed unescaped quote")
