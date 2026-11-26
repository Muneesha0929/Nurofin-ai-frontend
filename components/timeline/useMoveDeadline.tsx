'use client';

// For the older one-click "move to tomorrow / next week" buttons.
// A task with no deadline gets the date straight away. A task that already has one
// opens the Move deadline dialog (date pre-filled), because every move needs a reason.
import React, { useCallback, useState } from 'react';
import { workcenterService } from '@/services/workcenter';
import { ExtendDeadlineDialog } from './ExtendDeadlineDialog';

export interface MovableTask { id: number; title?: string; deadline?: string | null }

export function useMoveDeadline() {
  const [pending, setPending] = useState<{ task: MovableTask; date: string; done?: () => void } | null>(null);

  /** Resolves true once the deadline is moved, false if cancelled or refused. */
  const moveDeadline = useCallback(async (task: MovableTask, date: string, done?: () => void) => {
    const current = task.deadline ? task.deadline.slice(0, 10) : '';
    if (current === date) { done?.(); return; }
    if (!current) {
      await workcenterService.updateTask(task.id, { deadline: date });
      done?.();
      return;
    }
    setPending({ task, date, done });
  }, []);

  const dialog = (
    <ExtendDeadlineDialog
      open={!!pending}
      onClose={() => setPending(null)}
      ids={pending ? [pending.task.id] : []}
      current={pending?.task.deadline ?? null}
      presetDate={pending?.date ?? null}
      title={pending?.task.title}
      onDone={() => { const cb = pending?.done; setPending(null); cb?.(); }}
    />
  );

  return { moveDeadline, deadlineDialog: dialog };
}
