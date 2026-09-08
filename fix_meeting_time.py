import re

file_path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\meetings\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add timeOptions definition inside MeetingsPage
target_time_options = '''const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | 'delete' | null>(null);'''
replacement_time_options = target_time_options + '''\n  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    const val = ${hour.toString().padStart(2, '0')}:;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    let h = hour % 12;
    if (h === 0) h = 12;
    const label = ${h}: ;
    return { value: val, label };
  });'''

if target_time_options in content:
    content = content.replace(target_time_options, replacement_time_options)
else:
    print('Could not find target_time_options')

# Replace Time input
target_time_input = '''<Input type="time" {...register('time')} className={errors.time ? 'border-accent-red' : ''} />'''
replacement_time_input = '''<select
                  {...register('time')}
                  className={w-full h-10 bg-background-primary border rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all }
                >
                  <option value="">Select Time</option>
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>'''
if target_time_input in content:
    content = content.replace(target_time_input, replacement_time_input)
else:
    print('Could not find target_time_input')

# Replace End Time input
target_end_time_input = '''<Input type="time" {...register('end_time')} />'''
replacement_end_time_input = '''<select
                  {...register('end_time')}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                >
                  <option value="">Select End Time</option>
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>'''
if target_end_time_input in content:
    content = content.replace(target_end_time_input, replacement_end_time_input)
else:
    print('Could not find target_end_time_input')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated meetings page with dropdowns!")
