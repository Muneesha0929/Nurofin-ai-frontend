// Runs a parsed quick-bar command against the backend. Returns a plain message and, where cheap, an Undo.
import { workcenterService } from '@/services/workcenter';
import { departmentTargetsService, ObjectiveStatus } from '@/services/departmentTargets';
import { ResolvedCode, fmtDay, prioritiesService, timelineService } from '@/services/timeline';
import { ParsedCommand } from './parseCommand';

export interface RunResult {
  message: string;
  undo?: () => Promise<void>;
}

export const announceChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('task:created'));
  window.dispatchEvent(new CustomEvent('cos:changed'));
};

const taskStatusLabel = (s: string) => (s === 'completed' ? 'done' : s === 'in_progress' ? 'in progress' : s === 'blocked' ? 'on hold' : s.replace('_', ' '));

export async function runCommand(r: ResolvedCode, cmd: ParsedCommand, extra?: { reason?: string }): Promise<RunResult> {
  const taskId = r.task_id ?? null;
  const objId = r.objective_id ?? null;
  const isTask = r.kind === 'task' && taskId != null;
  const isObj = r.kind === 'objective' && objId != null;
  if (!isTask && !isObj) throw new Error('Only objectives and tasks can be changed from here. Press Enter to open it.');
  const code = r.full_code;

  switch (cmd.type) {
    case 'status': {
      if (isTask) {
        const prev = r.status || 'todo';
        await workcenterService.updateStatus(taskId!, cmd.status);
        return {
          message: `${code} is now ${taskStatusLabel(cmd.status)}`,
          undo: async () => { await workcenterService.updateStatus(taskId!, prev); },
        };
      }
      const next: ObjectiveStatus = cmd.status === 'completed' ? 'done' : 'in_progress';
      const prev = (r.status as ObjectiveStatus) || 'not_started';
      await departmentTargetsService.updateObjective(objId!, { status: next });
      return {
        message: `${code} is now ${next === 'done' ? 'done' : 'in progress'}`,
        undo: async () => { await departmentTargetsService.updateObjective(objId!, { status: prev }); },
      };
    }
    case 'progress': {
      const prev = r.progress ?? 0;
      if (isTask) {
        await workcenterService.updateTask(taskId!, { progress: cmd.value });
        return { message: `${code} progress is ${cmd.value}%`, undo: async () => { await workcenterService.updateTask(taskId!, { progress: prev }); } };
      }
      await departmentTargetsService.updateObjective(objId!, { progress: cmd.value });
      return { message: `${code} progress is ${cmd.value}%`, undo: async () => { await departmentTargetsService.updateObjective(objId!, { progress: prev }); } };
    }
    case 'priority': {
      if (!isObj) throw new Error('Priorities apply to objectives, not tasks.');
      const prev = r.priority ?? null;
      await prioritiesService.set(objId!, cmd.priority);
      return {
        message: cmd.priority ? `${code} is now ${cmd.priority}` : `Priority removed from ${code}`,
        undo: async () => { await prioritiesService.set(objId!, prev); },
      };
    }
    case 'move': {
      const reason = (extra?.reason ?? cmd.reason ?? '').trim();
      if (!cmd.date) throw new Error('Type the new date first, e.g. "→ 10 Dec".');
      if (reason.length < 3) throw new Error('Please say why the date is moving.');
      if (isTask) await timelineService.extendTask(taskId!, cmd.date, reason);
      else await timelineService.extendObjective(objId!, cmd.date, reason);
      return { message: `${code} deadline moved to ${fmtDay(cmd.date)}. Your reason is on its timeline.` };
    }
    case 'note': {
      if (!cmd.text.trim()) throw new Error('Type the update after "note:".');
      await timelineService.post(isTask ? 'task' : 'objective', (isTask ? taskId : objId)!, { kind: 'update', text: cmd.text.trim() });
      return { message: `Update added to ${code}` };
    }
    case 'ask': {
      if (!cmd.person) throw new Error('Pick who to ask, e.g. "ask @Name".');
      await timelineService.post(isTask ? 'task' : 'objective', (isTask ? taskId : objId)!, { kind: 'handover', text: cmd.text.trim(), person_id: cmd.person.id });
      return { message: `${cmd.person.name} has been asked to look after ${code}` };
    }
    default:
      throw new Error(cmd.type === 'unknown' && cmd.error ? cmd.error : 'Nothing to do.');
  }
}
