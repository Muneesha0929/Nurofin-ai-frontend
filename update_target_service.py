import re

with open('services/targetService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

delete_target_func = """
  deleteTarget: async (targetId: number): Promise<{success: boolean}> => {
    const res = await fetch(`/api/v1/targets/${targetId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete target' }));
      throw new Error(err.detail || 'Failed to delete target');
    }
    return res.json();
  },
"""

if "deleteTarget: async" not in content:
    # insert before createPermission: async
    content = content.replace("  createPermission: async", delete_target_func + "\n  createPermission: async")

with open('services/targetService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated targetService.ts")
