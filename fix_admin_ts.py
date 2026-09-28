import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add can_view_finance to initial state
target_initial = "const [editUserForm, setEditUserForm] = useState({"
rep_initial = "const [editUserForm, setEditUserForm] = useState({ can_view_finance: false,"
c = c.replace(target_initial, rep_initial)

# Fix 'u.can_view_finance'
c = c.replace('u.can_view_finance', 'user.can_view_finance')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("Fixed editUserForm in admin page")
