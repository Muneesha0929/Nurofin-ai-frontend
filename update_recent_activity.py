path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = '''          <SectionTitle title="Recent Activity" href="/notifications" />
          <div className="flex flex-col gap-2.5 mt-3">
            {!loading && notifications.slice(0, 4).map((n, i) => (
              <Link href="/notifications" key={i} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-accent-blue/10">
                    <Info size={13} className="text-accent-blue" />
                  </div>
                  <div>
                    <div className="text-[12px]"><span className="font-bold">{n.title || "System"}</span></div>
                    {n.message && <div className="text-[11.5px] text-text-muted">{n.message}</div>}
                    <div className="text-[10.5px] text-text-secondary mt-0.5">{n.time || "Recently"}</div>
                  </div>
                </div>
              </Link>
            ))}
            {!loading && notifications.length === 0 && <div className="text-[11.5px] text-text-secondary text-center py-4">No recent activity.</div>}'''

replacement = '''          <SectionTitle title="Recent Activity" href="/notifications" />
          <div className="flex flex-col gap-2.5 mt-3">
            {!loading && [...(notifications || []).map((n:any) => ({...n, type: 'Notification'})), ...(issues || []).map((i:any) => ({ title: Issue: , message: i.description || i.status, time: i.created_at || new Date().toISOString(), type: 'Issue', id: i.id }))].sort((a,b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime()).slice(0, 4).map((n: any, i: number) => (
              <Link href={n.type === 'Issue' ? "/issues" : "/notifications"} key={i} className="block hover:bg-surface-hover p-1.5 -mx-1.5 rounded-lg transition-colors">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-accent-blue/10">
                    <Info size={13} className="text-accent-blue" />
                  </div>
                  <div>
                    <div className="text-[12px]"><span className="font-bold">{n.title || "System"}</span></div>
                    {n.message && <div className="text-[11.5px] text-text-muted">{n.message}</div>}
                    <div className="text-[10.5px] text-text-secondary mt-0.5">{n.time || "Recently"}</div>
                  </div>
                </div>
              </Link>
            ))}
            {!loading && (notifications?.length === 0 && issues?.length === 0) && <div className="text-[11.5px] text-text-secondary text-center py-4">No recent activity.</div>}'''

code = code.replace(target, replacement)
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated Recent Activity")
