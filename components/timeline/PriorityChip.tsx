'use client';

// P1 / P2 / P3 on objectives and sub-objectives. Only the CEO can change it (the backend enforces this too).
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { Priority, prioritiesService } from '@/services/timeline';

export const PRIORITY_META: Record<Priority, { label: string; hint: string; cls: string; dot: string }> = {
  P1: { label: 'P1', hint: 'Top priority — focus here first', cls: 'bg-accent-red/10 text-accent-red border-accent-red/30', dot: 'bg-accent-red' },
  P2: { label: 'P2', hint: 'High priority', cls: 'bg-accent-orange/10 text-accent-orange border-accent-orange/30', dot: 'bg-accent-orange' },
  P3: { label: 'P3', hint: 'Normal priority', cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30', dot: 'bg-accent-blue' },
};

const ROLES_CAN_SET = ['ceo', 'super_admin'];
export const canSetPriority = (profile?: { id?: string | number; role?: string } | null) =>
  !!profile && (ROLES_CAN_SET.includes(String(profile.role || '').toLowerCase()) || String(profile.id) === '1');

/** Read-only chip (renders nothing when there is no priority). */
export function PriorityBadge({ p, className }: { p?: Priority | null; className?: string }) {
  const m = p ? PRIORITY_META[p] : undefined;
  if (!m) return null; // only P1-P3; ignore anything else (e.g. a task's high/medium/low)
  return (
    <span title={m.hint} className={cn('normal-case inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px] text-[10.5px] font-bold shrink-0', m.cls, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />{m.label}
    </span>
  );
}

/** Chip that becomes a picker for the CEO. Others see the read-only badge. */
export function PriorityPicker({
  objectiveId, value, canEdit, onChanged, className,
}: { objectiveId: number; value?: Priority | null; canEdit: boolean; onChanged?: (p: Priority | null) => void; className?: string }) {
  value = value && PRIORITY_META[value] ? value : null;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);

  if (!canEdit) return <PriorityBadge p={value} className={className} />;

  const pick = async (p: Priority | null) => {
    setSaving(true); setErr('');
    try {
      await prioritiesService.set(objectiveId, p);
      onChanged?.(p);
      setOpen(false);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className={cn('relative inline-flex', className)} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen(o => !o)}
        title={value ? `${PRIORITY_META[value].hint} — click to change` : 'Set a priority'}
        className={cn(
          'normal-case inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px] text-[10.5px] font-bold transition-colors',
          value ? PRIORITY_META[value].cls : 'border-dashed border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary',
        )}
      >
        {value ? <><span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_META[value].dot)} />{value}</> : '+ P'}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-56 rounded-xl border border-border-subtle bg-background-secondary shadow-xl p-1.5 normal-case">
          {(['P1', 'P2', 'P3'] as Priority[]).map(p => (
            <button key={p} type="button" onClick={() => pick(p)}
              className={cn('w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] hover:bg-[var(--bg-primary)]', value === p && 'bg-[var(--bg-primary)]')}>
              <PriorityBadge p={p} />
              <span className="text-text-secondary">{PRIORITY_META[p].hint}</span>
            </button>
          ))}
          {value && (
            <button type="button" onClick={() => pick(null)} className="w-full rounded-lg px-2 py-1.5 text-left text-[12.5px] text-text-secondary hover:bg-[var(--bg-primary)]">
              Remove priority
            </button>
          )}
          {err && <p className="px-2 pt-1 text-[11.5px] text-accent-red">{err}</p>}
        </div>
      )}
    </div>
  );
}
