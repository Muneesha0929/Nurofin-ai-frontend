'use client';

// "Priorities" card on the Overview: open P1 and P2 objectives (P3 tucked away).
// The CEO sees everything that is prioritised across departments; everyone else sees what concerns them.
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PriorityItem, prioritiesService } from '@/services/timeline';
import { CodeChip } from '@/components/timeline/CodeChip';
import { PriorityBadge } from '@/components/timeline/PriorityChip';
import { DeadlineBadge } from '@/components/timeline/DeadlineBadge';

function Row({ item, onOpen }: { item: PriorityItem; onOpen: () => void }) {
  const pct = Math.max(0, Math.min(100, Math.round(item.progress || 0)));
  const done = item.status === 'done';
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}
      className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer hover:bg-[var(--bg-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40 transition-colors"
    >
      <PriorityBadge p={item.priority} />
      <span className="w-[76px] shrink-0"><CodeChip code={item.full_code} size="xs" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text-primary truncate" title={item.title}>{item.title}</p>
        <p className="text-[11.5px] text-text-secondary truncate">{item.department.name}{item.owner ? ` · ${item.owner.name}` : ''}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 w-[84px] shrink-0" title={`${pct}% done`}>
        <div className="h-1.5 flex-1 rounded-full bg-border-subtle/70 overflow-hidden">
          <div className={cn('h-full rounded-full', done ? 'bg-accent-green' : 'bg-accent-blue')} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-text-secondary tabular-nums w-7 text-right">{pct}%</span>
      </div>
      <div className="shrink-0" onClick={e => e.stopPropagation()}>
        <DeadlineBadge entity="objective" id={item.objective_id} deadline={item.deadline} done={done} canEdit={false} title={`${item.full_code} ${item.title}`} />
      </div>
      <ChevronRight size={14} className="shrink-0 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
    </div>
  );
}

export function PrioritiesCard({ isCeo }: { isCeo: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<PriorityItem[] | null>(null);
  const [showP3, setShowP3] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await prioritiesService.mine();
      setItems(r.items || []);
    } catch {
      setItems(prev => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('cos:changed', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('cos:changed', refresh); window.removeEventListener('focus', refresh); };
  }, [load]);

  if (items === null) return null; // still loading: no flash of an empty card
  const top = items.filter(i => i.priority === 'P1' || i.priority === 'P2');
  const low = items.filter(i => i.priority === 'P3');

  if (!isCeo && items.length === 0) return null;

  return (
    <section className="bg-background-secondary border border-border-subtle rounded-2xl p-3.5 sm:p-4 normal-case" aria-label="Priorities">
      <div className="flex items-center justify-between gap-3 px-1 mb-1.5">
        <h2 className="flex items-center gap-2 text-[14px] font-bold text-text-primary">
          <Flag size={14} className="text-accent-red" />Priorities
          {items.length > 0 && <span className="text-[11.5px] font-medium text-text-secondary">{isCeo ? 'across all departments' : 'for you'}</span>}
        </h2>
        {isCeo && (
          <Link href="/workcenter?tab=objectives" className="text-[12px] font-semibold text-accent-blue hover:underline">
            Set priorities on the Q3 board
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-1 py-2 text-[13px] text-text-secondary">Nothing is prioritised yet — set P1/P2/P3 on objectives in the Q3 board.</p>
      ) : (
        <div>
          {top.length === 0 && <p className="px-1 py-1.5 text-[13px] text-text-secondary">No P1 or P2 right now.</p>}
          {top.map(i => <Row key={i.objective_id} item={i} onOpen={() => router.push(i.link)} />)}
          {low.length > 0 && (
            <>
              <button type="button" onClick={() => setShowP3(v => !v)}
                className="mt-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-text-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40">
                {showP3 ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {showP3 ? 'Hide P3' : `+${low.length} P3`}
              </button>
              {showP3 && low.map(i => <Row key={i.objective_id} item={i} onOpen={() => router.push(i.link)} />)}
            </>
          )}
        </div>
      )}
    </section>
  );
}
