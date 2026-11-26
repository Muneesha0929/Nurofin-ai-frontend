// Drag and drop for tasks: one task or every selected task, onto a status group or a calendar day.
import type React from 'react';

export const DND_ONE = 'application/x-nurofin-task-id';   // the original "make subtask" drag
export const DND_MANY = 'application/x-nurofin-task-ids';  // JSON array of the ids being moved

let dragging: number[] = [];
export const draggingIds = () => dragging;

/** Call from onDragStart. Dragging a selected task drags the whole selection. */
export function startTaskDrag(e: React.DragEvent, id: number, selected?: Set<number>) {
  const ids = selected && selected.has(id) && selected.size > 1 ? [...selected] : [id];
  dragging = ids;
  e.dataTransfer.setData(DND_ONE, String(id));
  e.dataTransfer.setData(DND_MANY, JSON.stringify(ids));
  e.dataTransfer.setData('text/plain', String(id));
  e.dataTransfer.effectAllowed = 'move';
  return ids;
}
export const endTaskDrag = () => { dragging = []; };

export const isTaskDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types || []).includes(DND_MANY);

export function readDraggedIds(e: React.DragEvent): number[] {
  try {
    const raw = e.dataTransfer.getData(DND_MANY);
    if (raw) return (JSON.parse(raw) as number[]).map(Number).filter(Boolean);
  } catch { /* fall through */ }
  const one = Number(e.dataTransfer.getData(DND_ONE) || e.dataTransfer.getData('text/plain'));
  return one ? [one] : [];
}

/** Scroll a row into view and flash it for about 2 seconds. */
export function flashElement(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const prev = { s: el.style.boxShadow, b: el.style.backgroundColor, t: el.style.transition };
  el.style.transition = 'box-shadow .35s ease, background-color .35s ease';
  el.style.boxShadow = 'inset 0 0 0 2px rgba(59,130,246,.9)';
  el.style.backgroundColor = 'rgba(59,130,246,.14)';
  setTimeout(() => {
    el.style.boxShadow = prev.s;
    el.style.backgroundColor = prev.b;
    setTimeout(() => { el.style.transition = prev.t; }, 400);
  }, 2000);
}

/** Wait for the row to be on screen (it may still be loading or expanding), then flash it. */
export function revealTaskElement(id: number, tries = 14) {
  const look = (left: number) => {
    const el = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
    if (el) flashElement(el);
    else if (left > 0) setTimeout(() => look(left - 1), 150);
  };
  look(tries);
}
