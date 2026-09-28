path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# I will replace exactly what is in the file!
code = code.replace('isCEO && m.assigned_to_id', 'isCEO && m.assignee_name')
code = code.replace('Assignee: ', 'Assignee: ')

code = code.replace('isCEO && t.assigned_to_id', 'isCEO && (t.assignedTo?.name || (t as any).assigneeName)')
code = code.replace('Assignee: ', 'Assignee: ')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Replaced Assignee Tags without relying on formatting spaces!")
