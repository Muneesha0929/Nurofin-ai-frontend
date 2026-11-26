'use client';
// Multi-select for the task lists: click, shift-click for a range, Cmd/Ctrl+A for everything visible, Esc to clear.
import { useCallback, useEffect, useRef, useState } from 'react';

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

export interface TaskSelection {
  selected: Set<number>;
  count: number;
  has: (id: number) => boolean;
  toggle: (id: number, shift?: boolean) => void;
  setAll: (ids: number[]) => void;
  clear: () => void;
}

export function useTaskSelection(orderedIds: number[], enabled = true): TaskSelection {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selRef = useRef(selected);
  selRef.current = selected;
  const orderRef = useRef(orderedIds);
  orderRef.current = orderedIds;
  const anchor = useRef<number | null>(null);

  const toggle = useCallback((id: number, shift = false) => {
    const prev = selRef.current;
    const next = new Set(prev);
    const order = orderRef.current;
    const a = anchor.current != null ? order.indexOf(anchor.current) : -1;
    const b = order.indexOf(id);
    if (shift && a >= 0 && b >= 0 && a !== b) {
      const on = !prev.has(id);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) (on ? next.add(order[i]) : next.delete(order[i]));
    } else {
      next.has(id) ? next.delete(id) : next.add(id);
    }
    anchor.current = id;
    setSelected(next);
  }, []);

  const setAll = useCallback((ids: number[]) => setSelected(new Set(ids)), []);
  const clear = useCallback(() => { anchor.current = null; setSelected(new Set()); }, []);

  // Forget tasks that are no longer on screen (deleted, filtered out, other view).
  const key = orderedIds.join(',');
  useEffect(() => {
    const visible = new Set(orderRef.current);
    setSelected(prev => {
      let drop = false;
      prev.forEach(id => { if (!visible.has(id)) drop = true; });
      return drop ? new Set([...prev].filter(id => visible.has(id))) : prev;
    });
  }, [key]);

  useEffect(() => {
    if (!enabled) { setSelected(prev => (prev.size ? new Set() : prev)); return; }
    // Capture phase, so we look at the page before any dialog closes itself on the same key press.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!selRef.current.size) return;
        if (document.querySelector('[role="dialog"], [data-cos-pop]')) return;
        clear();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        if (typing(e.target) || document.querySelector('[role="dialog"]')) return;
        if (!orderRef.current.length) return;
        e.preventDefault();
        setAll(orderRef.current);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [enabled, clear, setAll]);

  return { selected, count: selected.size, has: id => selected.has(id), toggle, setAll, clear };
}
