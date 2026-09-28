import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\nurofin-ai-backend\app\schemas\user.py'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target3 = "class UserUpdate(UserBase):"
rep3 = target3 + "\n    can_view_finance: Optional[bool] = None"
if "can_view_finance: Optional[bool]" not in code:
    code = code.replace(target3, rep3)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Added to UserUpdate")
