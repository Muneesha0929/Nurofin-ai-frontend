import re

with open('app/(dashboard)/targets/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Trash2 to imports
content = content.replace(
    "Target as TargetIcon, CheckSquare, Plus, Globe, User as UserIcon",
    "Target as TargetIcon, CheckSquare, Plus, Globe, User as UserIcon, Trash2"
)

# Add handleDelete function
handle_delete = """
  const handleDelete = async (targetId: number) => {
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      await targetService.deleteTarget(targetId);
      fetchTargets();
    } catch (err: any) {
      alert('Failed to delete target: ' + err.message);
    }
  };
"""

if "const handleDelete =" not in content:
    content = content.replace("const handleToggleComplete =", handle_delete + "\n  const handleToggleComplete =")

# Add delete button to Individual Targets
ind_btn = """<div className="flex items-center flex-shrink-0">"""
new_ind_btn = """<div className="flex items-center flex-shrink-0 gap-2">
                        {String(target.created_by_id) === String(userProfile.id) && (
                          <button onClick={() => handleDelete(target.id)} className="p-2 text-text-muted hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}"""
content = content.replace(ind_btn, new_ind_btn)

# Add delete button to Global Targets
glob_btn = """<div className="flex items-center justify-between border-t border-border-subtle dark:border-[#1e2030] pt-3 mt-1">"""
new_glob_btn = """<div className="flex items-center justify-between border-t border-border-subtle dark:border-[#1e2030] pt-3 mt-1 gap-2">
                      {String(target.created_by_id) === String(userProfile.id) && (
                          <button onClick={() => handleDelete(target.id)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors mr-auto">
                            <Trash2 className="w-4 h-4" />
                          </button>
                      )}"""
content = content.replace(glob_btn, new_glob_btn)

with open('app/(dashboard)/targets/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated targets page with delete")
