import re

with open('app/(dashboard)/targets/ceo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Trash2
content = content.replace(
    "Target as TargetIcon, CheckSquare, Plus, Shield, User as UserIcon",
    "Target as TargetIcon, CheckSquare, Plus, Shield, User as UserIcon, Trash2"
)

# Add handleDelete function
handle_delete = """
  const handleDelete = async (targetId: number) => {
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      await targetService.deleteTarget(targetId);
      if (selectedDashboardUser) loadUserTargets(selectedDashboardUser);
    } catch (err: any) {
      alert('Failed to delete target: ' + err.message);
    }
  };
"""

if "const handleDelete =" not in content:
    content = content.replace("const handleScoreUpdate =", handle_delete + "\n  const handleScoreUpdate =")

# Add Action column
action_th = """<th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider text-right">Your Score</th>"""
new_action_th = """<th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider text-right">Your Score</th>
                    <th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider text-right">Action</th>"""
content = content.replace(action_th, new_action_th)

action_td = """placeholder="e.g. 8.5"
                        />
                      </td>"""
new_action_td = """placeholder="e.g. 8.5"
                        />
                      </td>
                      <td className="p-4 text-right">
                        {String(t.created_by_id) === String(userProfile.id) && (
                          <button onClick={() => handleDelete(t.id)} className="p-2 text-text-muted hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors inline-flex">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>"""
content = content.replace(action_td, new_action_td)

with open('app/(dashboard)/targets/ceo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated targets ceo page with delete")
