'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Lightbulb, MessageSquare, Plus, Search, Star, ThumbsUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar, Panel } from '@/components/targets/ui';
import { FeaturePanel, StatusChip, SuggestDialog, fmtDate } from '@/components/features/FeaturePanel';
import { FeatureList, FeatureStatus, STATUS_LABEL, STATUS_ORDER, productFeaturesService } from '@/services/productFeatures';

/** Product Features: every idea the team raises, Sir's decision, and why. Nothing is deleted. */
export default function FeaturesPage() {
  const [data, setData] = useState<FeatureList | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<FeatureStatus | ''>('');
  const [area, setArea] = useState('');
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const load = useCallback(() => {
    productFeaturesService.list({ q, status, area, mine }).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [q, status, area, mine]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  // Notifications link here as /features?id=12.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    if (id) setOpen(id);
  }, []);
  const openFeature = (id: number | null) => {
    setOpen(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('id', String(id)); else url.searchParams.delete('id');
    window.history.replaceState(null, '', url.toString());
  };

  const counts = data?.counts;
  const all = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const chip = (active: boolean) => cn('px-3 py-1.5 text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap',
    active ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary');
  const filtered = !!(q || status || area || mine);

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 bg-background-primary min-h-screen text-text-primary normal-case">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[26px] font-extrabold">Product Features</div>
          <div className="text-[13.5px] text-text-secondary mt-1">Every idea the team raises, what Sir decided, and why. Search it to find out why something was built.</div>
        </div>
        <button onClick={() => setSuggesting(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold bg-accent-blue text-white hover:bg-accent-blue-hover">
          <Plus size={15} />Suggest a feature
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input value={q} onChange={e => setQ(e.target.value)} aria-label="Search features"
          placeholder='Search anything: what was noticed, solutions, the reason, comments. Try "animations" or F-12'
          className="w-full rounded-xl border border-border-subtle bg-background-secondary pl-10 pr-3 py-2.5 text-[14px] outline-none focus:border-accent-blue" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border-subtle overflow-x-auto bg-background-secondary max-w-full" role="group" aria-label="Status">
          <button onClick={() => setStatus('')} className={chip(status === '')}>All <span className="opacity-70">{all}</span></button>
          {STATUS_ORDER.map(s => (
            <button key={s} onClick={() => setStatus(s)} className={chip(status === s)}>{STATUS_LABEL[s]} <span className="opacity-70">{counts?.[s] ?? 0}</span></button>
          ))}
        </div>
        {!!data?.areas.length && (
          <select value={area} onChange={e => setArea(e.target.value)} aria-label="Area"
            className="rounded-lg border border-border-subtle bg-background-secondary px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary outline-none">
            <option value="">All areas</option>
            {data.areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <button onClick={() => setMine(m => !m)} aria-pressed={mine}
          className={cn('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold', mine ? 'border-accent-blue text-accent-blue bg-accent-blue/10' : 'border-border-subtle text-text-secondary bg-background-secondary hover:text-text-primary')}>
          Raised by me
        </button>
      </div>

      {error && (
        <Panel className="p-4 text-[13px] flex items-center justify-between gap-3">
          <span className="text-accent-red">{error}</span>
          <button onClick={load} className="rounded-lg border border-border-subtle px-3 py-1.5 font-semibold text-text-secondary hover:text-text-primary">Try again</button>
        </Panel>
      )}

      {data && data.features.length === 0 && (
        <Panel className="p-8 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 text-accent-blue flex items-center justify-center"><Lightbulb size={22} /></div>
          {filtered ? (
            <>
              <div className="text-[15px] font-bold">Nothing matches</div>
              <div className="text-[13px] text-text-secondary">Try other words, or clear the filters.</div>
            </>
          ) : (
            <>
              <div className="text-[15px] font-bold">No ideas yet</div>
              <div className="text-[13px] text-text-secondary max-w-md">When something in the app bothers you, write it down here. For example: “There are too many animations” led to a Reduce motion option. Sir decides, and the reason stays here for good.</div>
              <button onClick={() => setSuggesting(true)} className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold bg-accent-blue text-white hover:bg-accent-blue-hover"><Plus size={15} />Suggest the first one</button>
            </>
          )}
        </Panel>
      )}

      {data && data.features.length > 0 && (
        <Panel className="divide-y divide-border-subtle overflow-hidden">
          {data.features.map(f => (
            <button key={f.id} onClick={() => openFeature(f.id)} className="w-full text-left px-4 sm:px-5 py-4 hover:bg-surface-hover/40 transition-colors flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[11.5px] font-bold text-text-secondary tabular-nums">{f.code}</span>
                  <span className="text-[14.5px] font-bold break-words">{f.title}</span>
                </div>
                <div className="text-[13px] text-text-secondary mt-1 line-clamp-2 break-words">{f.problem}</div>
                {f.decision_note && f.status !== 'suggested' && (
                  <div className="text-[12.5px] mt-1.5 line-clamp-1 break-words"><b className="font-semibold">Why: </b><span className="text-text-secondary">{f.decision_note}</span></div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-text-secondary">
                  {f.area && <span className="rounded-md bg-[var(--bg-primary)] px-2 py-0.5 font-semibold">{f.area}</span>}
                  <span className="inline-flex items-center gap-1.5"><Avatar p={f.created_by} size={18} />{f.created_by?.name} · {fmtDate(f.created_at)}</span>
                  {f.me_too > 0 && <span className="inline-flex items-center gap-1" title="People who noticed this too"><ThumbsUp size={12} />{f.me_too}</span>}
                  {f.comments > 0 && <span className="inline-flex items-center gap-1" title="Comments"><MessageSquare size={12} />{f.comments}</span>}
                  {f.solutions > 0 && !f.chosen_solution && <span className="inline-flex items-center gap-1" title="Solutions suggested"><Lightbulb size={12} />{f.solutions} {f.solutions === 1 ? 'solution' : 'solutions'}</span>}
                  {f.chosen_solution && <span className="inline-flex items-center gap-1 font-semibold text-accent-green" title={f.chosen_solution.text}><Star size={12} className="fill-current" />Going with {f.chosen_solution.by?.name || 'a'}&rsquo;s solution</span>}
                  {f.tasks_total > 0 && <span className="inline-flex items-center gap-1" title="Task Center tasks done"><CheckSquare size={12} />{f.tasks_done}/{f.tasks_total} tasks</span>}
                </div>
              </div>
              <StatusChip s={f.status} />
            </button>
          ))}
        </Panel>
      )}

      {suggesting && (
        <SuggestDialog areas={data?.areas || []} onClose={() => setSuggesting(false)}
          onCreated={f => { setSuggesting(false); load(); openFeature(f.id); }} />
      )}
      {open && <FeaturePanel id={open} areas={data?.areas || []} onClose={() => openFeature(null)} onChanged={load} />}
    </div>
  );
}
