import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\nurofin-ai-backend\app\schemas\user.py'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = "is_active: Optional[bool] = True"
rep = target + "\n    can_view_finance: Optional[bool] = False"

if "can_view_finance" not in code:
    code = code.replace(target, rep)
    
    # Check UserResponse
    target2 = "is_active: bool"
    rep2 = target2 + "\n    can_view_finance: bool"
    code = code.replace(target2, rep2)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Added can_view_finance to User schema")
else:
    print("Already exists")
