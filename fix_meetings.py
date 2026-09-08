import re

file_path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\meetings\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add end_time to schema
content = content.replace("time: z.string().min(1, 'Time is required'),", "time: z.string().min(1, 'Start Time is required'),\n  end_time: z.string().optional(),")

# 2. Add end_time to form reset
content = content.replace("time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),", "time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),\n      end_time: '',")

# 3. Add end_time to create payload
content = content.replace("time: data.time, \n        type: data.type,", "time: data.time, \n        end_time: data.end_time,\n        type: data.type,")
content = content.replace("time: data.time,\n        type: data.type,", "time: data.time,\n        end_time: data.end_time,\n        type: data.type,")

# 4. Filter meetings by owner/participant
target_fetch = '''const data = filter === 'all'
          ? await meetingsService.getMeetings(undefined, search || undefined)
          : await meetingsService.getMeetings(filter as any, search || undefined);'''

replacement_fetch = '''const data = filter === 'all'
          ? await meetingsService.getMeetings(undefined, search || undefined)
          : await meetingsService.getMeetings(filter as any, search || undefined);
        
        // Filter to only show meetings created by the user or where the user is a participant
        const filteredData = data.filter((m: any) => 
          String(m.owner_id) === String(userProfile?.id) || 
          m.participants?.some((p: any) => String(p.user_id) === String(userProfile?.id))
        );'''

content = content.replace(target_fetch, replacement_fetch)
content = content.replace("setMeetings(data);", "setMeetings(filteredData);")
content = content.replace("if (data.length > 0 && !selectedId) {", "if (filteredData.length > 0 && !selectedId) {")
content = content.replace("setSelectedId(data[0].id);", "setSelectedId(filteredData[0].id);")

# 5. Fix Decline button and Host accepting/declining.
# Decline button hover: look for group-hover or something that hides it
# Also "The meeting host is incorrectly shown the Accept/Decline options"
target_accept_decline = '''{selectedMeeting?.participants?.find(p => p.user_id === userProfile?.id)?.status === 'pending' && (
                      <>
                        <button onClick={handleAccept} disabled={actionLoading === 'accept'} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green hover:bg-accent-green/80 text-white text-xs font-semibold rounded-md shadow disabled:opacity-50 transition-colors">
                          {actionLoading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Accept
                        </button>
                        <button onClick={handleDecline} disabled={actionLoading === 'decline'} className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-red/30 text-accent-red hover:bg-accent-red/10 text-xs font-semibold rounded-md disabled:opacity-50 transition-colors">
                          {actionLoading === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Decline
                        </button>
                      </>
                    )}'''

replacement_accept_decline = '''{selectedMeeting?.participants?.find(p => p.user_id === userProfile?.id)?.status === 'pending' && String(selectedMeeting?.owner_id) !== String(userProfile?.id) && (
                      <>
                        <button onClick={handleAccept} disabled={actionLoading === 'accept'} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green hover:bg-accent-green/80 text-white text-xs font-semibold rounded-md shadow disabled:opacity-50 transition-colors">
                          {actionLoading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Accept
                        </button>
                        <button onClick={handleDecline} disabled={actionLoading === 'decline'} className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-red text-accent-red hover:bg-accent-red/10 text-xs font-semibold rounded-md disabled:opacity-50 transition-colors">
                          {actionLoading === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Decline
                        </button>
                      </>
                    )}'''
content = content.replace(target_accept_decline, replacement_accept_decline)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated meetings page logic!")
