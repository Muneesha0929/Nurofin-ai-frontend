import re

with open('app/(dashboard)/targets/ceo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activePermissions state
if "const [activePermissions, setActivePermissions] = useState" not in content:
    content = content.replace(
        "const [scoreableUsers, setScoreableUsers] = useState<any[]>([]);",
        "const [scoreableUsers, setScoreableUsers] = useState<any[]>([]);\n  const [activePermissions, setActivePermissions] = useState<any[]>([]);"
    )

# 2. Store perms in state inside loadInitialData
# The code currently does:
# const perms = await targetService.getPermissions();
# Let's replace `const perms = await targetService.getPermissions();` 
# wait, it does it inside an else branch for non-CEO:
# if (canManageTargets) { ... } else { const perms = ... }
# We want to do it always to show them to the CEO.
load_initial = """
    try {
      setLoadingUsers(true);
      const allUsers = await usersService.getUsers();
      const filtered = allUsers.filter(u => u.role?.toLowerCase() !== 'ceo');
      setUsers(filtered);
      
      const perms = await targetService.getPermissions();
      setActivePermissions(perms);

      if (canManageTargets) {
        setScoreableUsers(filtered);
        setAddableUsers(filtered);
      } else {
        const scoreIds = new Set<number>();
        const addIds = new Set<number>();
        perms.forEach(p => {
          if (p.can_score) scoreIds.add(p.target_user_id);
          if (p.can_add_targets) addIds.add(p.target_user_id);
        });
"""

if "const perms = await targetService.getPermissions();\n      setActivePermissions(perms);" not in content:
    content = re.sub(r'try \{\s*setLoadingUsers\(true\);\s*const allUsers = await usersService\.getUsers\(\);\s*const filtered = allUsers\.filter\(u => u\.role\?\.toLowerCase\(\) !== \'ceo\'\);\s*setUsers\(filtered\);\s*if \(canManageTargets\) \{\s*setScoreableUsers\(filtered\);\s*setAddableUsers\(filtered\);\s*\} else \{\s*const perms = await targetService\.getPermissions\(\);', load_initial, content)


# 3. Add handleRevokePermission
handle_revoke = """
  const handleRevokePermission = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this permission?')) return;
    try {
      await targetService.deletePermission(id);
      loadInitialData();
    } catch (err: any) {
      alert('Failed to revoke permission: ' + err.message);
    }
  };
"""
if "const handleRevokePermission =" not in content:
    content = content.replace("const handleDelete = async", handle_revoke + "\n  const handleDelete = async")


# 4. Add UI for active permissions
ui_section = """
            <form onSubmit={handleDelegatePermission}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
"""
# I'll insert a new section below the form
active_perms_ui = """
            <div className="mt-8 border-t border-border-subtle dark:border-[#1e2030] pt-6">
              <h3 className="text-sm font-semibold text-text-secondary dark:text-slate-300 mb-4">Active Delegated Permissions</h3>
              {activePermissions.length === 0 ? (
                <div className="text-xs text-text-muted">No delegated permissions found.</div>
              ) : (
                <div className="space-y-3">
                  {activePermissions.map(perm => {
                    const grantee = users.find(u => Number(u.id) === perm.grantee_id);
                    const targetU = users.find(u => Number(u.id) === perm.target_user_id);
                    return (
                      <div key={perm.id} className="flex items-center justify-between bg-background-secondary dark:bg-[#1c1d29] p-3 rounded-lg border border-border-subtle dark:border-[#2a2d3d]">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-medium text-text-primary dark:text-white">
                            <span className="font-bold text-accent-blue">{grantee?.name || grantee?.username || 'Unknown'}</span> 
                            <span className="text-text-muted mx-2">can manage</span> 
                            <span className="font-bold text-accent-purple">{targetU?.name || targetU?.username || 'Unknown'}</span>
                          </div>
                          <div className="flex gap-2">
                            {perm.can_score && <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">Score</span>}
                            {perm.can_add_targets && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">Add Targets</span>}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRevokePermission(perm.id)}
                          className="p-2 text-text-muted hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Revoke Permission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
"""

if "Active Delegated Permissions" not in content:
    content = content.replace("</form>\n          </section>", "</form>\n" + active_perms_ui)

with open('app/(dashboard)/targets/ceo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated targets ceo page with active perms UI")
