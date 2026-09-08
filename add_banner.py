import re

file_path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\planner\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        {/* Header */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">'''

banner = '''        {scheduleEvents.some(e => e.source === 'google_error') && (
          <div className="bg-accent-red/10 border border-accent-red/30 p-4 rounded-xl shadow-sm flex items-center gap-3 z-10 relative">
            <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-accent-red tracking-tight">Google Calendar Disconnected</h4>
              <p className="text-xs text-text-secondary mt-0.5">Your Google Calendar connection expired or was revoked. Please reconnect to sync your events.</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">'''

content = content.replace(target, banner)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Added banner')
