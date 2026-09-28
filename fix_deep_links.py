import re
import os

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
    for target, rep in replacements:
        code = code.replace(target, rep)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

base = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app'

# 1. Update Dashboard Links
dash_path = os.path.join(base, 'dashboard', 'page.tsx')
dash_replacements = [
    # Top stats
    ('link: \'/workcenter\'', 'link: \'/workcenter?status=pending\''),
    ('{ label: "Overdue", sub: "Action Required", value: overdue, icon: Clock, color: "text-accent-red", bg: "bg-accent-red/10", link: \'/workcenter?status=pending\' }',
     '{ label: "Overdue", sub: "Action Required", value: overdue, icon: Clock, color: "text-accent-red", bg: "bg-accent-red/10", link: \'/workcenter?status=overdue\' }'),
    ('link: \'/finance\'', 'link: \'/finance?view=alerts\''),
    # Section links
    ('<SectionTitle title="Today\'s Schedule" href="/planner" />', '<SectionTitle title="Today\'s Schedule" href="/planner?view=team" />'),
    ('<SectionTitle title="Top Priorities" href="/workcenter" />', '<SectionTitle title="Top Priorities" href="/workcenter?status=pending" />'),
    ('<SectionTitle title={isCEO ? "All Tasks" : "My Tasks"} href="/workcenter" />', '<SectionTitle title={isCEO ? "All Tasks" : "My Tasks"} href="/workcenter?status=pending" />'),
]
update_file(dash_path, dash_replacements)

# 2. Update Workcenter to handle ?status=pending and ?status=overdue
wc_path = os.path.join(base, 'workcenter', 'page.tsx')
with open(wc_path, 'r', encoding='utf-8') as f:
    wc_code = f.read()

# Add Suspense for useSearchParams if Next.js complains? No, Next 13+ app router client components use useSearchParams without Suspense if it's not statically generated, but we can just use the value.
wc_target = '''          workcenterService.getTasks({
            quarter_id: selectedQuarterId ?? undefined,
            search: searchQuery || undefined,
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
            page_size: 200
          })'''
wc_rep = '''          workcenterService.getTasks({
            quarter_id: selectedQuarterId ?? undefined,
            search: searchQuery || undefined,
            status: (statusFilter && statusFilter !== 'pending' && statusFilter !== 'overdue') ? statusFilter : undefined,
            priority: priorityFilter || undefined,
            page_size: 200
          })'''
wc_code = wc_code.replace(wc_target, wc_rep)

# We need to filter manually for pending/overdue AFTER fetching if the backend doesn't support comma separated or custom statuses.
wc_target2 = '''setTasks(tasksRes.tasks || []);'''
wc_rep2 = '''let filtered = tasksRes.tasks || [];
        if (statusFilter === 'pending') {
          filtered = filtered.filter((t:any) => t.status !== 'completed' && t.status !== 'done');
        } else if (statusFilter === 'overdue') {
          const now = new Date().toISOString();
          filtered = filtered.filter((t:any) => t.status !== 'completed' && t.status !== 'done' && t.deadline && t.deadline < now);
        }
        setTasks(filtered);'''
wc_code = wc_code.replace(wc_target2, wc_rep2)

with open(wc_path, 'w', encoding='utf-8') as f:
    f.write(wc_code)

# 3. Update Planner to read ?view=team
plan_path = os.path.join(base, 'planner', 'page.tsx')
with open(plan_path, 'r', encoding='utf-8') as f:
    plan_code = f.read()

if 'useSearchParams' not in plan_code:
    plan_code = plan_code.replace('import { useRouter } from', 'import { useRouter, useSearchParams } from')

plan_target = '''const [viewTeamSchedule, setViewTeamSchedule] = useState(false);'''
plan_rep = '''const searchParams = useSearchParams();
  const [viewTeamSchedule, setViewTeamSchedule] = useState(searchParams.get('view') === 'team');'''
plan_code = plan_code.replace(plan_target, plan_rep)

with open(plan_path, 'w', encoding='utf-8') as f:
    f.write(plan_code)

print("Updated links and logic!")
