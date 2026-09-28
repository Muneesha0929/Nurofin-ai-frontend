path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('m.assigned_to_id})', 'm.assignee_name})')
code = code.replace('t.assigned_to_id})', 't.assignedTo?.name || (t as any).assigneeName})')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Finally replaced assignee tags.")
