import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix Top Priorities layout to not truncate names
# Replace max-w-[150px] with flex-1 min-w-0, and restructure
old_top_priorities = '''                <div className="flex justify-between items-center cursor-pointer">
                  <span className="text-[12.3px] truncate max-w-[150px]">{t.title} {isCEO && (t.assigned_to_name) ? (Assignee: ) : ""}</span>
                  <PriorityBadge p={t.priority || "medium"} />
                </div>'''
new_top_priorities = '''                <div className="flex items-center gap-2 cursor-pointer">
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[12.3px] font-medium truncate">{t.title}</span>
                    {isCEO && t.assigned_to_name && <span className="text-[10.5px] text-text-secondary truncate">Assignee: {t.assigned_to_name}</span>}
                  </div>
                  <PriorityBadge p={t.priority || "medium"} />
                </div>'''
code = code.replace(old_top_priorities, new_top_priorities)

# Do the same for Recent Tasks in the 4-grid!
old_recent_tasks = '''                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-medium">{t.title} {isCEO && (t.assigned_to_name) ? (Assignee: ) : ""}</span>
                      <PriorityBadge p={t.priority || "medium"} />
                    </div>'''
new_recent_tasks = '''                    <div className="flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[12px] font-medium truncate">{t.title}</span>
                        {isCEO && t.assigned_to_name && <span className="text-[10.5px] text-text-secondary truncate">Assignee: {t.assigned_to_name}</span>}
                      </div>
                      <PriorityBadge p={t.priority || "medium"} />
                    </div>'''
code = code.replace(old_recent_tasks, new_recent_tasks)

old_upcoming = '''                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      <span className="mt-0.5 text-text-muted"><Calendar size={12}/></span>
                      <span className="text-[12px] truncate max-w-[120px]">{t.title} {isCEO && (t.assigned_to_name) ? (Assignee: ) : ""}</span>
                    </div>
                    <span className="text-[11px] text-text-secondary">{t.deadline}</span>
                  </div>'''
new_upcoming = '''                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-2 flex-1 min-w-0">
                      <span className="mt-0.5 text-text-muted shrink-0"><Calendar size={12}/></span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] truncate">{t.title}</span>
                        {isCEO && t.assigned_to_name && <span className="text-[10px] text-text-secondary truncate">Assignee: {t.assigned_to_name}</span>}
                      </div>
                    </div>
                    <span className="text-[11px] text-text-secondary shrink-0">{t.deadline}</span>
                  </div>'''
code = code.replace(old_upcoming, new_upcoming)

# 2. Fix Team Chat
# Check if team chat is already there. If not, append it after AI Recommendations
team_chat_code = '''
        {/* Team Chat Quick Access */}
        <Card className="p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Users size={14} className="text-accent-blue" />
            <span className="text-[13px] font-bold">Team Chat</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[11.5px] text-text-muted flex gap-1.5">
              <MessageSquare size={12} className="text-accent-blue shrink-0 mt-0.5" />
              Stay connected with your team and discuss tasks in real-time.
            </div>
          </div>
          <Link href="/team-chat" className="block text-[11.5px] text-accent-blue font-semibold mt-2.5 hover:text-accent-blue-hover transition-colors">
            Open Team Chat &rarr;
          </Link>
        </Card>'''

if 'Team Chat Quick Access' not in code:
    code = code.replace('Ask AI for more insights &rarr;\n          </Link>\n        </Card>', 'Ask AI for more insights &rarr;\n          </Link>\n        </Card>' + team_chat_code)

# 3. Fix Recent Activity Description
old_recent_act = '''{n.message && <div className="text-[11.5px] text-text-muted">{n.message}</div>}'''
new_recent_act = '''{n.message && <div className="text-[11.5px] text-text-muted line-clamp-2">{n.message}</div>}
                    {n.description && <div className="text-[11.5px] text-text-muted line-clamp-2">{n.description}</div>}'''
code = code.replace(old_recent_act, new_recent_act)

# And fix the issues map to have .description explicitly!
code = code.replace("message: i.description || i.status,", "message: i.status, description: i.description,")

# 4. Fix CEO Schedule fetching 
# Sometimes e.start_time is missing, but Planner shows it. We need to handle e.date and push tasks.
old_ceo_sched = '''                    const allEvents = results.flatMap(r => 
                      (r.schedule || []).map(e => ({
                        id: Math.random().toString(),
                        title: e.title,
                        time: e.start_time?.substring(0,5) || 'All Day',
                        duration: e.type || 'Event',
                        assignee_name: r.user?.full_name || 'User'
                      }))
                    );'''
new_ceo_sched = '''                    const allEvents = results.flatMap(r => 
                      (r.schedule || []).map(e => ({
                        id: Math.random().toString(),
                        title: e.title,
                        time: e.start_time?.substring(0,5) || (e as any).start?.substring(11,16) || 'All Day',
                        duration: e.type || 'Event',
                        assignee_name: r.user?.full_name || 'User'
                      }))
                    );'''
code = code.replace(old_ceo_sched, new_ceo_sched)

# 5. Fix Assignee rendering in Today's Schedule (it was squished on the same line)
old_schedule_ui = '''                    <div className="text-[12.5px] font-semibold truncate">{m.title} {isCEO && m.assignee_name ? (Assignee: ) : ""}</div>
                    <div className="text-[11px] text-text-secondary">{m.time} &middot; {m.duration}</div>'''
new_schedule_ui = '''                    <div className="text-[12.5px] font-semibold truncate">{m.title}</div>
                    {isCEO && m.assignee_name && <div className="text-[10.5px] text-accent-blue truncate">Assignee: {m.assignee_name}</div>}
                    <div className="text-[11px] text-text-secondary">{m.time} &middot; {m.duration}</div>'''
code = code.replace(old_schedule_ui, new_schedule_ui)

if 'MessageSquare' not in code:
    code = code.replace('Info, UserPlus, GitBranch, Flag', 'Info, UserPlus, GitBranch, Flag, MessageSquare')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Applied all fixes!")
