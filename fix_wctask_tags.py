path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('t.assignedTo?.name || (t as any).assigneeName', 't.assigned_to_name')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed assignee tags for WCTask!")
