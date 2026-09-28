import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\finance\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Let's find the lucide-react import block and remove duplicate IndianRupee
match = re.search(r"import\s+\{([^}]+)\}\s+from\s+'lucide-react'", c)
if match:
    imports_str = match.group(1)
    imports_list = [i.strip() for i in imports_str.split(',') if i.strip()]
    
    # Remove duplicates but preserve order
    seen = set()
    unique_imports = []
    for item in imports_list:
        if item not in seen:
            seen.add(item)
            unique_imports.append(item)
            
    new_imports_str = ",\n  ".join(unique_imports)
    new_import_block = f"import {{\n  {new_imports_str}\n}} from 'lucide-react'"
    
    c = c[:match.start()] + new_import_block + c[match.end():]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Removed duplicate imports")
else:
    print("Could not find import block")
