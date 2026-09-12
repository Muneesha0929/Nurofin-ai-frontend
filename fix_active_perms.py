import re

with open('app/(dashboard)/targets/ceo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activePermissions state
if "const [activePermissions, setActivePermissions]" not in content:
    content = content.replace(
        "const [addableUsers, setAddableUsers] = useState<UserProfile[]>([]);",
        "const [addableUsers, setAddableUsers] = useState<UserProfile[]>([]);\n  const [activePermissions, setActivePermissions] = useState<any[]>([]);"
    )

# 2. Add fetching to loadUsers
fetch_code = """      const filtered = allUsers.filter(u => u.role?.toLowerCase() !== 'ceo');
      setUsers(filtered);
      
      let perms: any[] = [];
      try {
        perms = await targetService.getPermissions();
        setActivePermissions(perms);
      } catch (e) {
        console.error("Failed to load perms", e);
      }
"""
if "setActivePermissions(perms)" not in content:
    content = content.replace(
        "const filtered = allUsers.filter(u => u.role?.toLowerCase() !== 'ceo');\n      setUsers(filtered);",
        fetch_code
    )

# 3. Fix loadInitialData to loadUsers in handleRevokePermission
content = content.replace("loadInitialData();", "loadUsers();")

with open('app/(dashboard)/targets/ceo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed missing activePermissions and loadUsers")
