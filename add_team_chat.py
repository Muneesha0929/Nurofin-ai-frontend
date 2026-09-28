path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = '''          </Card>
        </div>'''
replacement = '''          </Card>
        
        {/* Team Chat Quick Access */}
        <Card className="p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Users size={14} className="text-accent-blue" />
            <span className="text-[13px] font-bold">Team Chat</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[11.5px] text-text-muted flex gap-1.5">
              <MessageSquare size={12} className="text-accent-blue shrink-0 mt-0.5" />
              Stay connected with your team and discuss tasks in real-time.
            </div>
          </div>
          <Link href="/team-chat" className="block text-[11.5px] text-accent-blue font-semibold mt-2.5 hover:text-accent-blue-hover transition-colors">
            Open Team Chat &rarr;
          </Link>
        </Card>
        
        </div>'''

code = code.replace(target, replacement, 1)

# Now fix the grid col to 5!
code = code.replace('<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">', '<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">', 1)

# Ensure MessageSquare is imported
if 'MessageSquare' not in code:
    code = code.replace('Info, UserPlus, GitBranch, Flag', 'Info, UserPlus, GitBranch, Flag, MessageSquare')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Added Team Chat")
