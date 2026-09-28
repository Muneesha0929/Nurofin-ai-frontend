import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\recovered_dashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Rename 'Business Risk' to 'Finance Alerts' (or remove it since FinanceAlertsWidget is better)
# The user said "swap it with Finance Alerts". I'll rename the card to Finance Alerts and set link to /finance
code = code.replace('"Business Risk"', '"Finance Alerts"')
code = code.replace('"Global Risk"', '"Urgent"')
code = code.replace('/admin\'', '/finance\'')

# 2. Rename 'All Meetings' / 'My Meetings' to 'Upcoming Meetings'
code = code.replace('label: isCEO ? "All Meetings" : "My Meetings"', 'label: "Upcoming Meetings"')
code = code.replace('label: "All Meetings"', 'label: "Upcoming Meetings"')

# 3. Mount DailyCheckinModal and FinanceAlertsWidget
import_statements = "import { DailyCheckinModal } from '@/components/DailyCheckinModal';\nimport { FinanceAlertsWidget } from '@/components/FinanceAlertsWidget';\n"
code = code.replace('import { aiService } from \'@/services/ai\';', 'import { aiService } from \'@/services/ai\';\n' + import_statements)

# Wait, this file might not have aiService. Let's just insert it after lucide-react.
code = code.replace('} from \'lucide-react\';', '} from \'lucide-react\';\nimport { DailyCheckinModal } from \'@/components/DailyCheckinModal\';\nimport { FinanceAlertsWidget } from \'@/components/FinanceAlertsWidget\';\nimport { financeService } from \'@/services/finance\';\nimport { plannerService } from \'@/services/planner\';\n')

# 4. Insert state for Finance alerts
state_insert = """  const [financialAlerts, setFinancialAlerts] = useState<any[]>([]);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [liveSchedule, setLiveSchedule] = useState<any[]>([]);
"""
code = code.replace('const [loading, setLoading] = useState(true);', state_insert + '  const [loading, setLoading] = useState(true);')

# 5. Add them to useEffect fetch
fetch_insert = """
          if (isCEO) {
            financeService.getTracker().then(t => setFinancialAlerts(t?.alerts || [])).catch(()=>[]);
          }
          plannerService.getSchedule(Number(userProfile.id), new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]).then(r => setLiveSchedule(r?.schedule || [])).catch(()=>[]);
          setCheckinModalOpen(true);
"""
code = code.replace('setLoading(false);', fetch_insert + '          setLoading(false);')

# 6. Mount the components in JSX
jsx_insert = """
      <DailyCheckinModal 
        isOpen={checkinModalOpen} 
        onClose={() => setCheckinModalOpen(false)}
        overdueTasks={tasks.filter((t: any) => t.status === 'overdue')}
        yesterdayMeetings={[]}
        onTasksUpdate={() => {}}
      />
      <FinanceAlertsWidget alerts={financialAlerts} />
"""
code = code.replace('<div className="flex justify-between items-end">', jsx_insert + '        <div className="flex justify-between items-end">')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Modifications done!")
