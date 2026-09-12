import re

with open('services/targetService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

delete_permission_func = """
  deletePermission: async (permissionId: number): Promise<{success: boolean}> => {
    const res = await fetch(`/api/v1/targets/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete permission' }));
      throw new Error(err.detail || 'Failed to delete permission');
    }
    return res.json();
  },
"""

if "deletePermission: async" not in content:
    content = content.replace("  getPermissions: async", delete_permission_func + "\n  getPermissions: async")

with open('services/targetService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated targetService.ts for permissions")
