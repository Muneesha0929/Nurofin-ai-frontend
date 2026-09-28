import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\planner\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. activeTab to 'day'
code = code.replace("const [activeTab, setActiveTab] = useState('week');", "const [activeTab, setActiveTab] = useState('day');")

# 2. initial viewTeamSchedule
code = code.replace("useState(searchParams.get('view') === 'team');", "useState(searchParams.get('view') === 'team' || ['super_admin', 'ceo'].includes(useStore.getState().userProfile?.role || ''));")

# Wait, useStore.getState() is not standard in Zustand if not imported, but we can just use isAdmin since it's defined right above it!
# Let's check where viewTeamSchedule is defined.
