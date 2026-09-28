import re

path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\nurofin-ai-backend\app\models\user.py'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = "performance_score = Column(Float, default=0.0)"
rep = target + "\n    can_view_finance = Column(Boolean, default=False)"

if "can_view_finance =" not in code:
    code = code.replace(target, rep)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Added can_view_finance to User model")
else:
    print("Already exists")
