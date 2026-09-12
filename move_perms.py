import re

with open('app/(dashboard)/targets/ceo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

active_perms_block = r'(<div className="mt-8 border-t border-border-subtle dark:border-\[#1e2030\] pt-6">\s*<h3 className="text-sm font-semibold text-text-secondary dark:text-slate-300 mb-4">Active Delegated Permissions</h3>.*?</div>\s*)(</section>\s*\{\/\* DELEGATE PERMISSIONS SECTION)'

# Wait, it's easier to just do string slicing.
start_str = '<div className="mt-8 border-t border-border-subtle dark:border-[#1e2030] pt-6">'
end_str = '            </div>\n          </section>'

# Let's see if we can find the block
if start_str in content:
    start_idx = content.find(start_str)
    # The end is the next </section>
    end_idx = content.find('</section>', start_idx)
    
    if start_idx != -1 and end_idx != -1:
        block = content[start_idx:end_idx]
        
        # Remove it from its current location
        content = content[:start_idx] + content[end_idx:]
        
        # Now insert it at the end of the DELEGATE PERMISSIONS SECTION
        # Let's find the end of DELEGATE PERMISSIONS SECTION
        # It ends with:
        #               <button type="submit" className="w-full mt-4 bg-accent-purple hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
        #                 Grant Permission
        #               </button>
        #             </form>
        #           </section>
        #         )}
        
        grant_btn_str = 'Grant Permission\n              </button>\n            </form>\n'
        grant_idx = content.find(grant_btn_str)
        if grant_idx != -1:
            insert_idx = grant_idx + len(grant_btn_str)
            content = content[:insert_idx] + block + content[insert_idx:]
            
            with open('app/(dashboard)/targets/ceo/page.tsx', 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully moved Active Delegated Permissions block.")
        else:
            print("Could not find Grant Permission button")
else:
    print("Could not find Active Delegated Permissions block start string")
