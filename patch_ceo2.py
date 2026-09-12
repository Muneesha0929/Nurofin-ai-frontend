import re

with open('app/(dashboard)/targets/ceo/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i == 103:  # Line 104 is index 103
        lines[i] = line.replace('isCEO', 'canManageTargets')
    elif i == 240: # Line 241 is index 240
        lines[i] = line.replace('isCEO', 'canManageTargets')
    elif i == 257: # Line 258 is index 257
        lines[i] = line.replace('isCEO', 'canManageTargets')
    elif i == 296: # Line 297 is index 296
        lines[i] = line.replace('isCEO', 'canManageTargets')

with open('app/(dashboard)/targets/ceo/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
