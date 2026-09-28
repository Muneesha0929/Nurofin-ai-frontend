import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\workcenter\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = '''          } else if (statusFilter === 'overdue') {
            const now = new Date().toISOString().split('T')[0];
            filtered = filtered.filter((t:any) => t.status !== 'completed' && t.status !== 'done' && t.deadline && t.deadline < now);
          }'''

rep = '''          } else if (statusFilter === 'overdue') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filtered = filtered.filter((t:any) => {
              if (t.status === 'completed' || t.status === 'done') return false;
              if (!t.deadline) return false;
              const d = new Date(t.deadline);
              return d < today;
            });
          }'''

code = code.replace(target, rep)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed overdue strict date parsing")
