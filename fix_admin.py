import re
path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

checkbox_html = '''
                <div className="space-y-1.5 flex flex-col justify-center">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Finance Access</label>
                  <label className="flex items-center gap-2 text-2xs text-white cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editUserForm.can_view_finance || false}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, can_view_finance: e.target.checked }))}
                      className="rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500/20"
                    />
                    Allow viewing Finance module
                  </label>
                </div>
'''

if "can_view_finance:" not in c:
    c = c.replace("{/* LinkedIn */}", checkbox_html + "\n                {/* LinkedIn */}")
    
    # Also add can_view_finance to editUserForm initial state when setting it
    c = c.replace("setEditUserForm({", "setEditUserForm({ can_view_finance: u.can_view_finance,")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated Admin page with checkbox")
