import re

with open('app/(dashboard)/targets/ceo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The UI section starts with:
# <div className="mt-8 border-t border-border-subtle dark:border-[#1e2030] pt-6">
#   <h3 className="text-sm font-semibold text-text-secondary dark:text-slate-300 mb-4">Active Delegated Permissions</h3>
# and ends with:
#             </div>
#           </section>

# Let's count how many times "Active Delegated Permissions" appears
print("Count before:", content.count("Active Delegated Permissions"))

# We can just split by "Active Delegated Permissions" and reconstruct if there are 2
if content.count("Active Delegated Permissions") == 2:
    # Find the start of the first one
    first_idx = content.find('<div className="mt-8 border-t border-border-subtle dark:border-[#1e2030] pt-6">')
    # Find the start of the second one
    second_idx = content.find('<div className="mt-8 border-t border-border-subtle dark:border-[#1e2030] pt-6">', first_idx + 1)
    
    # We just need to keep the content before the second one, and then the </section> closing tag
    if second_idx != -1:
        # Actually, since it was inserted as:
        # </form>
        # <div className="..."> ... </div>
        # </section>
        # Let's just find the exact block and replace all occurrences with a single one.
        
        block_pattern = r'<div className="mt-8 border-t border-border-subtle dark:border-\[#1e2030\] pt-6">.*?Active Delegated Permissions.*?</div>\s*</section>'
        
        # wait, the pattern might be hard to match due to newlines
        pass

# A simpler way is to just read lines and remove the duplicate block manually
lines = content.split('\n')
new_lines = []
in_dup_block = False
seen_block = False

for line in lines:
    if '<h3 className="text-sm font-semibold text-text-secondary dark:text-slate-300 mb-4">Active Delegated Permissions</h3>' in line:
        if seen_block:
            in_dup_block = True
            # we need to remove this line and the preceding <div ... pt-6">
            if new_lines[-1].strip() == '<div className="mt-8 border-t border-border-subtle dark:border-[#1e2030] pt-6">':
                new_lines.pop()
            continue
        else:
            seen_block = True
    
    if in_dup_block:
        if '</section>' in line:
            in_dup_block = False
            new_lines.append(line)
        continue
        
    new_lines.append(line)

content_fixed = '\n'.join(new_lines)
print("Count after:", content_fixed.count("Active Delegated Permissions"))

with open('app/(dashboard)/targets/ceo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content_fixed)
