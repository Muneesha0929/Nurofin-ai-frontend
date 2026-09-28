import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\components\layout\Sidebar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old_nav = "export const navSections: NavSection[] = ["
new_nav = "export const getNavSections = (isAdmin: boolean, userProfile: any): NavSection[] => ["

if old_nav in c:
    c = c.replace(old_nav, new_nav)
    
    # We must also replace the usage!
    # In Sidebar.tsx, it's used directly in the JSX.
    c = c.replace("navSections.map", "getNavSections(isAdmin, userProfile).map")
    
    # What about other files importing navSections?
    # Actually, does any other file import it? Let's check where navSections is used outside of Sidebar.tsx!
    
    # We'll just define both inside Sidebar to be safe:
    # Wait, the error is inside Sidebar.tsx itself.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Fixed navSections in Sidebar.tsx")
