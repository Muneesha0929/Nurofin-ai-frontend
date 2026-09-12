import re

with open('services/targetService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update interface Target
content = content.replace(
    '  score?: number;\n  scored_by_id?: number;',
    '  average_score?: number;\n  score_count?: number;\n  my_score?: number;\n  reviewer_scores?: {reviewer_id: number, score: number}[];'
)

# Update scoreTarget url
content = content.replace(
    '`/api/v1/targets/${targetId}/score`',
    '`/api/v1/targets/${targetId}/scores/me`'
)

# Update PATCH to PUT for scoreTarget
content = content.replace(
    'method: \'PATCH\'',
    'method: \'PUT\'',
    1 # Wait, only the second one?
)
# Since I can't guarantee replacing the correct one, I will do a regex
content = re.sub(
    r'(scoreTarget: async.*?method:\s*\')PATCH(\')',
    r'\1PUT\2',
    content,
    flags=re.DOTALL
)

with open('services/targetService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched targetService")
