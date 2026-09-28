import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace for m.assigned_to_id -> m.assignee_name
code = re.sub(r'isCEO && m\.assigned_to_id \? \(Assignee: \$\{m\.assigned_to_id\}\) : ""', 'isCEO && m.assignee_name ? (Assignee: ) : ""', code)

# Replace for t.assigned_to_id -> t.assignedTo?.name
code = re.sub(r'isCEO && t\.assigned_to_id \? \(Assignee: \$\{t\.assigned_to_id\}\) : ""', 'isCEO && (t.assignedTo?.name || (t as any).assigneeName) ? (Assignee: ) : ""', code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed assignee tags using regex!")
