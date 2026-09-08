import re
file_path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\meetings\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<div className="space-y-1.5">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Time</label>
                  <Input type="time" {...register('time')} className={errors.time ? 'border-accent-red' : ''} />
                </div>'''

replacement = target + '''
                <div className="space-y-1.5">
                  <label className="text-2xs font-bold text-text-secondary uppercase">End Time (Optional)</label>
                  <Input type="time" {...register('end_time')} />
                </div>'''

if target in content:
    content = content.replace(target, replacement)
    # Also adjust the grid columns from grid-cols-2 to grid-cols-3 so they fit nicely
    content = content.replace('grid grid-cols-2 gap-4', 'grid grid-cols-3 gap-4', 1)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced")
else:
    print("Not found")
