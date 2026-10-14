'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const HOLD_MS = 1500;

/**
 * Delete button that only fires after being held down for 1.5 s (mouse, touch, or Enter / Space).
 * Letting go early cancels. The red fill shows how far along the hold is.
 */
export function HoldToDelete({ onConfirm, label = 'Hold to delete', compact }: { onConfirm: () => void | Promise<void>; label?: string; compact?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    start.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  };

  const tick = () => {
    if (start.current === null) return;
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      stop();
      setBusy(true);
      Promise.resolve(onConfirm()).finally(() => setBusy(false));
    }
  };

  const begin = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || start.current !== null) return;
    start.current = performance.now();
    timer.current = setInterval(tick, 30);
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <button
      type="button"
      aria-label={label}
      title="Press and hold to delete"
      disabled={busy}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) begin(e); }}
      onKeyUp={e => { if (e.key === 'Enter' || e.key === ' ') stop(); }}
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      onContextMenu={e => e.preventDefault()}
      className={cn(
        'relative overflow-hidden select-none touch-none rounded-lg border font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50',
        'border-accent-red/40 text-accent-red bg-background-secondary hover:border-accent-red',
        compact ? 'px-2 py-1 text-[11.5px]' : 'px-3 py-1.5 text-[12.5px]',
      )}
    >
      <span className="absolute inset-y-0 left-0 bg-accent-red/20 pointer-events-none" style={{ width: `${progress * 100}%` }} />
      <Trash2 size={compact ? 12 : 13} className="relative" />
      <span className="relative">{busy ? 'Deleting…' : progress > 0 ? 'Keep holding…' : compact ? 'Hold to delete' : label}</span>
    </button>
  );
}
