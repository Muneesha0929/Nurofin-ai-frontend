path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# For schedule events (m): assigned_to_id contains the full_name because we mapped it in the Promise.all
# Wait! In CEO liveSchedule mapping, we mapped it to ssigned_to_id. Let's rename it to ssignee_name so it's clearer.
code = code.replace("assigned_to_id: r.user?.full_name || 'User'", "assignee_name: r.user?.full_name || 'User'")
code = code.replace('{isCEO && m.assigned_to_id ?  (Assignee: ) : ""}', '{isCEO && m.assignee_name ?  (Assignee: ) : ""}')

# For tasks (t): they use 	.assignedTo?.name || (t as any).assigneeName
code = code.replace('{isCEO && t.assigned_to_id ?  (Assignee: ) : ""}', '{isCEO && (t.assignedTo?.name || (t as any).assigneeName) ?  (Assignee: ) : ""}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed assignee names")
