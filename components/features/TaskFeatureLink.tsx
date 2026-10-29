'use client';

// The Task Center side of Product Features: a chip on each task that builds a feature (click it to
// open the feature), and the optional "Product feature" picker in the create / edit task dialog.
// The link is stored by the product-features API (cos_feature_task); the task table is not changed.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FeatureSummary, TaskFeatureLink, productFeaturesService as api } from '@/services/productFeatures';

/* Many chips render at once (one per task row), so lookups are batched into one request per tick
   and cached. refreshTaskFeatures() drops the cache after a link changes. */
const cache = new Map<number, TaskFeatureLink[]>();
const listeners = new Set<() => void>();
let queued = new Set<number>();
let timer: ReturnType<typeof setTimeout> | null = null;

function request(id: number) {
  queued.add(id);
  if (timer) return;
  timer = setTimeout(() => {
    const ids = [...queued]; queued = new Set(); timer = null;
    api.taskLinks(ids)
      .then(r => ids.forEach(i => cache.set(i, r[String(i)] || [])))
      .catch(() => ids.forEach(i => cache.set(i, [])))
      .finally(() => listeners.forEach(l => l()));
  }, 30);
}

export function refreshTaskFeatures(taskIds?: number[]) {
  (taskIds || [...cache.keys()]).forEach(i => cache.delete(i));
  listeners.forEach(l => l());
}

export function useTaskFeatures(taskId?: number): TaskFeatureLink[] {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  if (!taskId) return [];
  const hit = cache.get(taskId);
  if (hit === undefined) { request(taskId); return []; }
  return hit;
}

/** Small chip(s) on a task row or in the task dialog. Clicking opens the feature. */
export function TaskFeatureChips({ taskId, size = 'sm', className }: { taskId: number; size?: 'sm' | 'md'; className?: string }) {
  const links = useTaskFeatures(taskId);
  if (!links.length) return null;
  return (
    <>
      {links.map(f => (
        <Link key={f.id} href={`/features?id=${f.id}`} onClick={e => e.stopPropagation()}
          title={`Builds ${f.code}: ${f.title} (${f.status_label}). Click to see why.`}
          className={cn('inline-flex items-center gap-1 rounded-full border border-accent-orange/20 bg-accent-orange/10 text-accent-orange font-bold normal-case hover:bg-accent-orange/15 max-w-full',
            size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[11px] px-2 py-1 rounded-md', className)}>
          <Lightbulb size={size === 'sm' ? 10 : 12} className="shrink-0" />
          <span className="truncate">{f.code} · {f.title}</span>
        </Link>
      ))}
    </>
  );
}

/** Features a task can be linked to: everything still open (not shipped or dropped). */
export function useLinkableFeatures(open: boolean) {
  const [list, setList] = useState<FeatureSummary[]>([]);
  useEffect(() => {
    if (!open) return;
    api.list().then(r => setList(r.features.filter(f => f.status !== 'shipped' && f.status !== 'not_doing'))).catch(() => setList([]));
  }, [open]);
  return list;
}

export async function currentFeatureOf(taskId: number): Promise<string> {
  try { const r = await api.taskLinks([taskId]); return r[String(taskId)]?.[0] ? String(r[String(taskId)][0].id) : ''; } catch { return ''; }
}

/** After the Task Center creates or edits a task, attach / move / remove its feature link. */
export async function syncTaskFeature(taskId: number | undefined, next: string, prev: string) {
  if (!taskId || next === prev) return;
  if (prev) await api.unlinkTask(Number(prev), taskId);
  if (next) await api.linkTask(Number(next), taskId);
  refreshTaskFeatures([taskId]);
}

export function FeatureSelect({ features, value, onChange, className }: {
  features: FeatureSummary[]; value: string; onChange: (v: string) => void; className?: string;
}) {
  // Keep the current link visible even if that feature has since shipped.
  if (!features.length && !value) return null;
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-text-secondary uppercase">Product feature (optional)</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={className}>
        <option value="">Not linked</option>
        {value && !features.some(f => String(f.id) === value) && <option value={value}>Current feature (F-{value})</option>}
        {features.map(f => <option key={f.id} value={f.id}>{f.code} · {f.title}</option>)}
      </select>
    </div>
  );
}
