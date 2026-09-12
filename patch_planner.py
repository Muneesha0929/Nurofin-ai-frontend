import re

with open('app/planner/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """
  useEffect(() => {
    if (!newEventStartDate || !newEventStartTime) {
      setConflictData(null);
      return;
    }
    const controller = new AbortController();
    
    const checkAvailability = async () => {
      const computedEndTime = newEventEndTime || (() => {
        try {
          const parts = newEventStartTime.split(':');
          const endH = (parseInt(parts[0]) + 1).toString().padStart(2, '0');
          return `${endH}:${parts[1] || '00'}`;
        } catch(e) {
          return newEventStartTime;
        }
      })();
      
      const idsToCheck = Array.from(new Set([selectedUserId, ...newEventParticipants]));
      let foundConflict = false;
      let allAlternatives: any[] = [];
      let conflictMessages: string[] = [];
      
      for (const id of idsToCheck) {
        try {
          const res = await fetch(`/api/v1/users/${id}/availability?date=${newEventStartDate}&start_time=${newEventStartTime}&end_time=${computedEndTime}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
            },
            signal: controller.signal
          });
          const json = await res.json();
          if (json.data && json.data.is_busy) {
            foundConflict = true;
            const user = teammates.find((t: any) => t.id === id) || { full_name: id === currentUserId ? 'You' : 'Participant' };
            if (json.data.conflicts && json.data.conflicts.length > 0) {
              json.data.conflicts.forEach((c: any) => {
                const titleStr = c.title ? ` — ${c.title}` : '';
                conflictMessages.push(`${user.full_name} is busy from ${c.start_time} to ${c.end_time}${titleStr}`);
              });
            } else {
              conflictMessages.push(`${user.full_name} is busy: ${json.data.reasons.join(', ')}`);
            }
            if (json.data.alternative_times && json.data.alternative_times.length > 0 && allAlternatives.length === 0) {
              allAlternatives = json.data.alternative_times; 
            }
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error('Availability check failed', e);
        }
      }
      
      if (foundConflict) {
        setConflictData({
          message: `Overlap detected! ${conflictMessages.join('. ')}. Can we schedule it at another time?`,
          alternative_times: allAlternatives
        });
      } else {
        setConflictData(null);
      }
    };
    
    const timeoutId = setTimeout(() => {
      checkAvailability();
    }, 400);
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [newEventStartDate, newEventStartTime, newEventEndTime, newEventParticipants, selectedUserId, teammates]);

  useEffect(() => {
    if (!taskScheduleDate || !taskScheduleStartTime) {
      setScheduleTaskConflictData(null);
      return;
    }
    const controller = new AbortController();
    
    const checkAvailability = async () => {
      const fallbackEnd = (() => {
        try {
          const parts = taskScheduleStartTime.split(':');
          const endH = (parseInt(parts[0]) + 1).toString().padStart(2, '0');
          return `${endH}:${parts[1] || '00'}`;
        } catch(e) {
          return taskScheduleStartTime;
        }
      })();
      let computedEndTime = taskScheduleEndTime || fallbackEnd;
      if (computedEndTime <= taskScheduleStartTime) {
        computedEndTime = fallbackEnd;
      }
      
      try {
        const excludeParam = selectedTaskId ? `&exclude_task_id=${selectedTaskId}` : '';
        const res = await fetch(`/api/v1/users/${selectedUserId}/availability?date=${taskScheduleDate}&start_time=${taskScheduleStartTime}&end_time=${computedEndTime}${excludeParam}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
          },
          signal: controller.signal
        });
        const json = await res.json();
        if (json.data && json.data.is_busy) {
          let conflictMsgs: string[] = [];
          if (json.data.conflicts && json.data.conflicts.length > 0) {
            json.data.conflicts.forEach((c: any) => {
              const titleStr = c.title ? ` — ${c.title}` : '';
              conflictMsgs.push(`You are busy from ${c.start_time} to ${c.end_time}${titleStr}`);
            });
          } else {
            conflictMsgs.push(`You are busy: ${json.data.reasons.join(', ')}`);
          }
          setScheduleTaskConflictData({
            message: `Overlap detected! ${conflictMsgs.join('. ')}. Can we schedule it at another time?`,
            alternative_times: json.data.alternative_times || []
          });
        } else {
          setScheduleTaskConflictData(null);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error('Availability check failed', e);
      }
    };
    
    const timeoutId = setTimeout(() => {
      checkAvailability();
    }, 400);
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [taskScheduleDate, taskScheduleStartTime, taskScheduleEndTime, selectedUserId, selectedTaskId]);
"""

start_str = "  useEffect(() => {\n    if (!newEventStartDate || !newEventStartTime) {"
end_str = "  const handleAddEvent = async (e: React.FormEvent) => {"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement + "\n" + content[end_idx:]
    with open('app/planner/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched planner page")
else:
    print("Could not find patch points")
