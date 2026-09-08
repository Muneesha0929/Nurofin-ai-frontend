import re

file_path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\planner\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject isCreatingEvent and isSchedulingTask states
target_state = "const [newEventOpen, setNewEventOpen] = useState(false);"
replacement_state = target_state + '''\n  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isSchedulingTask, setIsSchedulingTask] = useState(false);'''
content = content.replace(target_state, replacement_state)

# 2. Fix handleCreateEvent payload (start_time -> time) and add disabled state
target_create_event = '''  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventStartDate || !newEventStartTime || !newEventEndTime) return;
    if (conflictData) {
      alert("Please resolve the scheduling conflict by selecting an alternative time before creating the event.");
      return;
    }
    try {
      if (newEventTaskId !== 'none' && newEventProjectId !== 'none') {'''

replacement_create_event = '''  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventStartDate || !newEventStartTime || !newEventEndTime) return;
    if (conflictData) {
      alert("Please resolve the scheduling conflict by selecting an alternative time before creating the event.");
      return;
    }
    if (isCreatingEvent) return;
    setIsCreatingEvent(true);
    try {
      if (newEventTaskId !== 'none' && newEventProjectId !== 'none') {'''
content = content.replace(target_create_event, replacement_create_event)

target_create_payload = '''        const newEvent = await meetingsService.createMeeting({
          title: newEventTitle,
          date: newEventStartDate,
          start_time: newEventStartTime,
          end_time: newEventEndTime,
          participant_ids: newEventParticipantIds,
          project_id: newEventProjectId !== 'none' ? newEventProjectId : undefined,
          task_id: newEventTaskId !== 'none' ? newEventTaskId : undefined
        });'''

replacement_create_payload = '''        const newEvent = await meetingsService.createMeeting({
          title: newEventTitle,
          date: newEventStartDate,
          time: newEventStartTime,
          end_time: newEventEndTime,
          participant_ids: newEventParticipantIds,
          project_id: newEventProjectId !== 'none' ? newEventProjectId : undefined,
          task_id: newEventTaskId !== 'none' ? newEventTaskId : undefined
        });'''
content = content.replace(target_create_payload, replacement_create_payload)

target_create_finally = '''      loadSchedule();
    } catch (error: any) {
      if (error?.detail?.alternative_times) {
        setConflictData(error.detail);
      } else {
        console.error('Failed to create event:', error);
      }
    }
  };'''

replacement_create_finally = '''      loadSchedule();
    } catch (error: any) {
      if (error?.detail?.alternative_times) {
        setConflictData(error.detail);
      } else {
        console.error('Failed to create event:', error);
      }
    } finally {
      setIsCreatingEvent(false);
    }
  };'''
content = content.replace(target_create_finally, replacement_create_finally)

# 3. Fix handleScheduleTask and add disabled state
target_schedule_task = '''  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !taskScheduleDate || !taskScheduleStartTime || !taskScheduleEndTime) return;
    if (scheduleTaskConflictData) {
      alert("Please resolve the scheduling conflict by selecting an alternative time before scheduling the task.");
      return;
    }
    try {'''

replacement_schedule_task = '''  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !taskScheduleDate || !taskScheduleStartTime || !taskScheduleEndTime) return;
    if (scheduleTaskConflictData) {
      alert("Please resolve the scheduling conflict by selecting an alternative time before scheduling the task.");
      return;
    }
    if (isSchedulingTask) return;
    setIsSchedulingTask(true);
    try {'''
content = content.replace(target_schedule_task, replacement_schedule_task)

target_schedule_finally = '''      loadTasks();
      loadSchedule(); // Refresh timeline events
    } catch (error: any) {
      if (error?.detail?.alternative_times) {
        setScheduleTaskConflictData(error.detail);
      } else {
        console.error('Failed to schedule task:', error);
      }
    }
  };'''

replacement_schedule_finally = '''      loadTasks();
      loadSchedule(); // Refresh timeline events
    } catch (error: any) {
      if (error?.detail?.alternative_times) {
        setScheduleTaskConflictData(error.detail);
      } else {
        console.error('Failed to schedule task:', error);
      }
    } finally {
      setIsSchedulingTask(false);
    }
  };'''
content = content.replace(target_schedule_finally, replacement_schedule_finally)

# 4. Disable buttons in UI
content = content.replace('''<button type="submit" className="px-4 h-10 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Schedule
                  </button>''', '''<button type="submit" disabled={isSchedulingTask} className="px-4 h-10 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4" /> {isSchedulingTask ? 'Scheduling...' : 'Schedule'}
                  </button>''')

content = content.replace('''<button type="submit" className="px-4 h-10 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Create
                  </button>''', '''<button type="submit" disabled={isCreatingEvent} className="px-4 h-10 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4" /> {isCreatingEvent ? 'Creating...' : 'Create'}
                  </button>''')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated planner page fixes!")
