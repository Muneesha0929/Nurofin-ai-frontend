'use client';
// A small top-centre message (under the bulk bar when it is open) with an optional Undo. Disappears after about 6 seconds.
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ToastData {
  id: number;
  message: string;
  tone?: 'ok' | 'error';
  undo?: () => Promise<void> | void;
}

export function UndoToast({ toast, onDismiss, raised }: { toast: ToastData | null; onDismiss: () => void; raised?: boolean }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setBusy(false);
    const t = setTimeout(onDismiss, toast.tone === 'error' ? 8000 : 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-24px)] normal-case flex items-center gap-3 rounded-xl px-4 py-2.5 text-[12.5px] shadow-2xl border',
        raised ? 'top-[118px]' : 'top-[64px]',
        toast.tone === 'error' ? 'bg-accent-red text-white border-accent-red' : 'bg-[#1f2937] text-white border-white/10',
      )}
    >
      <span className="min-w-0 break-words">{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { await toast.undo!(); } finally { onDismiss(); }
          }}
          className="shrink-0 font-bold text-[#93c5fd] hover:text-white underline underline-offset-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
        >
          {busy ? 'Undoing…' : 'Undo'}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded">
        <X size={14} />
      </button>
    </div>
  );
}
