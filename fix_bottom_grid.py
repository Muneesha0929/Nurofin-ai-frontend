path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# The user is annoyed that the bottom row has an empty space because it's grid-cols-5 but only has 4 items.
# Let's change the bottom row back to grid-cols-4!
# How to distinguish? The second grid is the bottom row.
parts = code.split('className="grid grid-cols-1 lg:grid-cols-5 gap-4"')
if len(parts) == 3:
    # Parts[0] is before first grid
    # Parts[1] is inside first grid (Today's schedule, etc.)
    # Parts[2] is inside second grid (Recent activity, etc.)
    # Change the second grid back to lg:grid-cols-4!
    code = parts[0] + 'className="grid grid-cols-1 lg:grid-cols-5 gap-4"' + parts[1] + 'className="grid grid-cols-1 lg:grid-cols-4 gap-4"' + parts[2]

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed bottom row grid!")
