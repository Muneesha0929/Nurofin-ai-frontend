import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace any instance of ? (Assignee: ) : "" with ? \(Assignee: )\ : ""
# For t.title
code = re.sub(r'\{t\.title\}\s*\{isCEO\s*&&\s*t\.assigned_to_id\s*\?\s*\(Assignee:\s*\)\s*:\s*""\}', '{t.title} {isCEO && t.assigned_to_id ? (Assignee: ) : ""}', code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Regex replace done")
