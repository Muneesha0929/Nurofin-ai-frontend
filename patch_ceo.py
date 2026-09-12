import re

with open('app/(dashboard)/targets/ceo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update isCEO check to include team_lead
content = content.replace(
    "const isCEO = userProfile.role?.toLowerCase() === 'ceo' || userProfile.role?.toLowerCase() === 'super_admin';",
    "const isCEO = userProfile.role?.toLowerCase() === 'ceo' || userProfile.role?.toLowerCase() === 'super_admin';\n  const canManageTargets = isCEO || userProfile.role?.toLowerCase() === 'team_lead';"
)

content = content.replace(
    "if (isCEO) {",
    "if (canManageTargets) {"
)

content = content.replace(
    "if (targetForm.is_global && isCEO) {",
    "if (targetForm.is_global && isCEO) {"
)

content = content.replace(
    "const showAssignSection = isCEO || addableUsers.length > 0;",
    "const showAssignSection = canManageTargets || addableUsers.length > 0;"
)
content = content.replace(
    "const showScoreSection = isCEO || scoreableUsers.length > 0;",
    "const showScoreSection = canManageTargets || scoreableUsers.length > 0;"
)
content = content.replace(
    "!showAssignSection && !showScoreSection && !isCEO",
    "!showAssignSection && !showScoreSection && !canManageTargets"
)

# Update score rendering in the table
score_th = """<th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider text-right">Score</th>"""
new_score_th = """<th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider text-right">Aggregate Score</th>
                    <th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider text-right">Your Score</th>"""
content = content.replace(score_th, new_score_th)

score_td = """<td className="p-4 text-right">
                        <input 
                          type="number" 
                          step="0.1" 
                          defaultValue={t.score || ''}
                          onBlur={e => handleScoreUpdate(t.id, e.target.value)}
                          className="w-24 bg-white dark:bg-[#12131c] border border-border-subtle dark:border-[#2a2d3d] rounded-md p-1.5 text-sm text-right text-text-primary dark:text-white outline-none focus:border-accent-blue transition-colors font-medium"
                          placeholder="e.g. 8.5"
                        />
                      </td>"""
                      
new_score_td = """<td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold">{t.average_score != null ? t.average_score.toFixed(1) : '-'}</span>
                          <span className="text-[10px] text-text-muted">{t.score_count} reviews</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <input 
                          type="number" 
                          step="0.1" 
                          defaultValue={t.my_score || ''}
                          onBlur={e => handleScoreUpdate(t.id, e.target.value)}
                          className="w-24 bg-white dark:bg-[#12131c] border border-border-subtle dark:border-[#2a2d3d] rounded-md p-1.5 text-sm text-right text-text-primary dark:text-white outline-none focus:border-accent-blue transition-colors font-medium"
                          placeholder="e.g. 8.5"
                        />
                      </td>"""
                      
content = content.replace(score_td, new_score_td)

with open('app/(dashboard)/targets/ceo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched targets ceo page")
