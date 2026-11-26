'use client';
// The status of a task as a pill. Click it to change the status where you are (no editor needed).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const OPTIONS = [
  { value: 'in_progress', label: 'In Progress', dot: 'bg-accent-blue', pill: 'text-accent-blue bg-accent-blue/10 border-accent-blue/25' },
  { value: 'completed', label: 'Done', dot: 'bg-accent-green', pill: 'text-accent-green bg-accent-green/10 border-accent-green/25' },
  { value: 'blocked', label: 'On Hold', dot: 'bg-accent-red', pill: 'text-accent-red bg-accent-red/10 border-accent-red/25' },
] as const;

export const statusKey = (s?: string | null) => (s === 'completed' || s === 'done' ? 'completed' : s === 'blocked' ? 'blocked' : 'in_progress');

export function StatusPill({ status, onChange, className, disabled }: { status: string; onChange: (s: string) => void; className?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0, up: false });
  const cur = OPTIONS.find(o => o.value === statusKey(status))!;

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const up = r.bottom + 150 > window.innerHeight;
    setPos({ left: Math.max(8, Math.min(window.innerWidth - 168, r.left)), top: up ? r.top - 4 : r.bottom + 4, up });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (btn.current?.contains(t) || t.closest?.('[data-status-menu]')) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <span onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="inline-block" draggable={false}>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Click to change the status"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'normal-case inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap transition-colors hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue disabled:opacity-60',
          cur.pill, className,
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', cur.dot)} />
        {cur.label}
        <ChevronDown size={11} className="opacity-70" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          data-status-menu
          data-cos-pop
          role="listbox"
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', left: pos.left, top: pos.top, transform: pos.up ? 'translateY(-100%)' : undefined, width: 160 }}
          className="z-[75] normal-case rounded-xl border border-border-subtle bg-background-secondary shadow-2xl p-1"
        >
          {OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === cur.value}
              autoFocus={o.value === cur.value}
              onClick={() => { setOpen(false); if (o.value !== cur.value || status !== o.value) onChange(o.value); }}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-text-primary hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:bg-[var(--bg-primary)] text-left"
            >
              <span className={cn('w-2 h-2 rounded-full', o.dot)} />
              <span className="flex-1">{o.label}</span>
              {o.value === cur.value && <Check size={13} className="text-text-secondary" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </span>
  );
}
