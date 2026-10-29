'use client';

// One product feature, told as a story: what was noticed, the idea, Sir's decision and why,
// the Task Center tasks that built it, and the full history (nothing is ever removed).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Heart, Link2, Pencil, Plus, Star, ThumbsUp, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/targets/ui';
import { workcenterService } from '@/services/workcenter';
import { departmentTargetsService } from '@/services/departmentTargets';
import { usersService } from '@/services/users';
import { refreshTaskFeatures } from './TaskFeatureLink';
import {
  FeatureDetail, FeatureEvent, FeatureInput, FeatureSolution, FeatureSource, FeatureStatus, NEEDS_REASON, SOURCE_LABEL,
  STATUS_LABEL, STATUS_ORDER, productFeaturesService,
} from '@/services/productFeatures';

export const STATUS_CLS: Record<FeatureStatus, string> = {
  suggested: 'text-text-secondary bg-[var(--bg-primary)]',
  planned: 'text-accent-blue bg-accent-blue/10',
  building: 'text-accent-orange bg-accent-orange/10',
  shipped: 'text-accent-green bg-accent-green/10',
  not_doing: 'text-accent-red bg-accent-red/10',
};

export const StatusChip = ({ s }: { s: FeatureStatus }) => (
  <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap', STATUS_CLS[s])}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />{STATUS_LABEL[s]}
  </span>
);

export const fmtDate = (iso?: string | null, time = false) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}) });
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary mb-1.5">{children}</div>
);
const input = 'w-full rounded-lg border border-border-subtle bg-background-secondary px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-accent-blue';
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50';
const primary = cn(btn, 'bg-accent-blue text-white hover:bg-accent-blue-hover');
const ghost = cn(btn, 'border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-hover');

const FIELD_LABEL: Record<string, string> = { solution: 'the solution', title: 'the name', problem: 'what was noticed', idea: 'the idea', area: 'the area', source: 'who raised it', source_note: 'the source note' };

/* ------------------------------------------------------------ the form (new + edit) */

export function FeatureFields({ value, onChange, areas, withIdea = true }: { value: FeatureInput; onChange: (v: FeatureInput) => void; areas: string[]; withIdea?: boolean }) {
  const set = (k: keyof FeatureInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>What did you notice? *</Label>
        <textarea rows={3} className={input} value={value.problem} onChange={set('problem')} autoFocus
          placeholder="In your own words. e.g. There are too many animations, it feels overwhelming after a while." />
      </div>
      <div>
        <Label>Name it *</Label>
        <input className={input} value={value.title} onChange={set('title')} maxLength={200} placeholder="e.g. Option to reduce motion" />
      </div>
      {withIdea && (
        <div>
          <Label>Your solution</Label>
          <textarea rows={2} className={input} value={value.idea || ''} onChange={set('idea')} placeholder="Optional. e.g. A Reduce motion switch in Account Settings. Others can add their own too." />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Where in the app</Label>
          <input className={input} list="feature-areas" value={value.area || ''} onChange={set('area')} maxLength={80} placeholder="e.g. Overview, Task Center" />
          <datalist id="feature-areas">{areas.map(a => <option key={a} value={a} />)}</datalist>
        </div>
        <div>
          <Label>Who raised it</Label>
          <select className={input} value={value.source || 'team'} onChange={set('source')}>
            {(Object.keys(SOURCE_LABEL) as FeatureSource[]).map(s => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Where it came from</Label>
        <input className={input} value={value.source_note || ''} onChange={set('source_note')} maxLength={200} placeholder="Optional. e.g. Team testing session, 28 Oct" />
      </div>
    </div>
  );
}

export function SuggestDialog({ areas, onClose, onCreated }: { areas: string[]; onClose: () => void; onCreated: (f: FeatureDetail) => void }) {
  const [v, setV] = useState<FeatureInput>({ title: '', problem: '', idea: '', area: '', source: 'team', source_note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const save = async () => {
    if (!v.problem.trim() || !v.title.trim()) { setError('Say what you noticed and give it a name.'); return; }
    setBusy(true); setError('');
    try { onCreated(await productFeaturesService.create(v)); } catch (e: any) { setError(e.message); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 normal-case" onClick={onClose}>
      <div role="dialog" aria-label="Suggest a feature" onClick={e => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-[92vh] overflow-y-auto bg-background-secondary rounded-2xl border border-border-subtle p-6 text-text-primary">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-1">
            <div className="text-lg font-extrabold">Suggest a feature</div>
            <div className="text-[13px] text-text-secondary mt-0.5">Nothing you notice goes to waste. Sir reads every one and writes down the decision.</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-hover"><X size={16} /></button>
        </div>
        <FeatureFields value={v} onChange={setV} areas={areas} />
        {error && <div className="mt-4 text-[13px] text-accent-red">{error}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={ghost}>Cancel</button>
          <button onClick={save} disabled={busy} className={primary}>{busy ? 'Saving…' : 'Suggest it'}</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ history */

function eventLine(e: FeatureEvent): React.ReactNode {
  const who = <b className="font-semibold text-text-primary">{e.user?.name || 'Someone'}</b>;
  switch (e.kind) {
    case 'created': return <>{who} raised this</>;
    case 'edited': return <>{who} changed {Object.keys(e.data?.changes || {}).map(k => FIELD_LABEL[k] || k).join(', ')}</>;
    case 'status': return e.data?.from === e.data?.to
      ? <>{who} added a note to the decision</>
      : <>{who} moved it from <b className="font-semibold">{STATUS_LABEL[e.data?.from as FeatureStatus] || e.data?.from}</b> to <b className="font-semibold">{STATUS_LABEL[e.data?.to as FeatureStatus] || e.data?.to}</b></>;
    case 'comment': return <>{who} commented</>;
    case 'me_too': return <>{who} noticed this too</>;
    case 'task_linked': return <>{who} linked the task “{e.data?.title}”</>;
    case 'task_unlinked': return <>{who} unlinked the task “{e.data?.title}”</>;
    case 'solution_added': return <>{who} suggested a solution</>;
    case 'solution_edited': return <>{who} reworded their solution</>;
    case 'solution_chosen': return <>{who} chose {e.data?.by ? <b className="font-semibold text-text-primary">{e.data.by}</b> : 'a'}{e.data?.by ? '’s' : ''} solution{e.data?.replaced ? ' instead' : ''}</>;
    default: return <>{who} {e.kind}</>;
  }
}

function History({ events }: { events: FeatureEvent[] }) {
  return (
    <ol className="flex flex-col">
      {[...events].reverse().map((e, i, all) => (
        <li key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Avatar p={e.user} size={24} />
            {i < all.length - 1 && <div className="w-px flex-1 bg-border-subtle my-1" />}
          </div>
          <div className="flex-1 min-w-0 pb-4">
            <div className="text-[13px] text-text-secondary">{eventLine(e)}</div>
            <div className="text-[11.5px] text-text-secondary/80">{fmtDate(e.created_at, true)}</div>
            {e.kind === 'solution_chosen' && e.data?.solution && (
              <div className="mt-1.5 text-[13px] rounded-lg px-3 py-2 bg-accent-green/5 border-l-2 border-accent-green break-words">{e.data.solution}</div>
            )}
            {e.text && (
              <div className={cn('mt-1.5 text-[13px] whitespace-pre-wrap break-words rounded-lg px-3 py-2',
                e.kind === 'status' ? 'bg-accent-blue/5 border-l-2 border-accent-blue text-text-primary' : 'bg-[var(--bg-primary)] text-text-primary')}>
                {(e.kind === 'status' || e.kind === 'solution_chosen') && <span className="font-semibold">Why: </span>}{e.text}
              </div>
            )}
            {e.kind === 'edited' && Object.entries(e.data?.changes || {}).map(([k, [was, now]]: any) => (
              <div key={k} className="mt-1.5 text-[12.5px] rounded-lg bg-[var(--bg-primary)] px-3 py-2 break-words">
                <div className="text-text-secondary"><span className="font-semibold">{FIELD_LABEL[k] || k}</span> was: <span className="line-through">{k === 'source' ? SOURCE_LABEL[was as FeatureSource] : was || '—'}</span></div>
                <div className="text-text-primary">now: {k === 'source' ? SOURCE_LABEL[now as FeatureSource] : now || '—'}</div>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------ decision (Director) */

function Decide({ f, onSaved }: { f: FeatureDetail; onSaved: (f: FeatureDetail) => void }) {
  const [to, setTo] = useState<FeatureStatus>(f.status);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needs = NEEDS_REASON.includes(to);
  const changed = to !== f.status || note.trim();
  const save = async () => {
    if (needs && !note.trim()) { setError('Write down why. It is what people will read later.'); return; }
    setBusy(true); setError('');
    try { onSaved(await productFeaturesService.setStatus(f.id, to, note)); setNote(''); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-border-subtle p-3.5 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Decision">
        {STATUS_ORDER.map(s => (
          <button key={s} role="radio" aria-checked={to === s} onClick={() => setTo(s)}
            className={cn('px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-colors',
              to === s ? cn(STATUS_CLS[s], 'border-current') : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <textarea rows={2} className={input} value={note} onChange={e => setNote(e.target.value)}
        placeholder={needs ? `Why ${to === 'not_doing' ? 'not' : 'yes'}? (needed)` : 'Why? (optional, but it helps whoever reads this later)'} />
      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
      <div className="flex justify-end"><button onClick={save} disabled={busy || !changed} className={primary}>{busy ? 'Saving…' : 'Save decision'}</button></div>
    </div>
  );
}

/* ------------------------------------------------------------ build tasks */

function Tasks({ f, onChanged }: { f: FeatureDetail; onChanged: (f: FeatureDetail) => void }) {
  const [mode, setMode] = useState<'none' | 'link' | 'new'>('none');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ id: number; title: string; status: string }[]>([]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'link') return;
    const t = setTimeout(() => productFeaturesService.linkableTasks(f.id, q).then(setFound).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [mode, q, f.id]);
  useEffect(() => {
    if (mode === 'new' && !users.length) usersService.getUsers().then(u => setUsers((u || []).map((x: any) => ({ id: String(x.id), name: x.name || x.full_name || x.email })))).catch(() => {});
  }, [mode, users.length]);

  const run = async (fn: () => Promise<FeatureDetail>) => {
    setBusy(true); setError('');
    try { onChanged(await fn()); refreshTaskFeatures(); setMode('none'); setQ(''); setTitle(''); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const create = () => run(async () => {
    // Put it in the current Task Center quarter, so it shows up there straight away.
    const quarter = await departmentTargetsService.ensureTaskQuarter().catch(() => null);
    const t = await workcenterService.createTask({
      title: title.trim(), description: `For ${f.code} · ${f.title}`,
      quarter_id: quarter?.id ?? undefined, assigned_to_id: assignee ? Number(assignee) : undefined, deadline: deadline || undefined,
    });
    return productFeaturesService.linkTask(f.id, t.id);
  });

  const allDone = f.tasks.length > 0 && f.tasks.every(t => t.done);
  return (
    <div className="flex flex-col gap-2">
      {f.tasks.length === 0 && mode === 'none' && <div className="text-[13px] text-text-secondary">No Task Center tasks yet.</div>}
      {f.tasks.map(t => (
        <div key={t.id} className="flex items-center gap-2.5 rounded-lg border border-border-subtle px-3 py-2">
          {t.done ? <CheckCircle2 size={16} className="text-accent-green shrink-0" /> : <Circle size={16} className="text-text-secondary shrink-0" />}
          <a href={`/workcenter?task=${t.id}`} title="Open this task in the Task Center" className={cn('flex-1 min-w-0 text-[13px] font-medium hover:text-accent-blue break-words', t.done && 'line-through text-text-secondary')}>{t.title}</a>
          <span className="text-[11.5px] text-text-secondary whitespace-nowrap">{t.status.replace('_', ' ')}</span>
          {t.assignee && <Avatar p={t.assignee} size={20} />}
          {t.can_unlink && (
            <button onClick={() => run(() => productFeaturesService.unlinkTask(f.id, t.id))} aria-label={`Unlink ${t.title}`} title="Unlink (the task stays in Task Center)"
              className="p-1 rounded text-text-secondary hover:text-accent-red"><X size={14} /></button>
          )}
        </div>
      ))}
      {allDone && f.status !== 'shipped' && <div className="text-[12.5px] text-accent-green">All tasks are done. {f.permissions.can_decide ? 'Mark it Shipped above when it is live.' : 'Sir can mark it Shipped.'}</div>}

      {f.permissions.can_link && mode === 'none' && (
        <div className="flex flex-wrap gap-2 mt-1">
          <button onClick={() => { setMode('new'); setTitle(f.title); }} className={ghost}><Plus size={14} />Send to Task Center</button>
          <button onClick={() => setMode('link')} className={ghost}><Link2 size={14} />Link an existing task</button>
        </div>
      )}
      {mode === 'link' && (
        <div className="rounded-xl border border-border-subtle p-3 flex flex-col gap-2">
          <input autoFocus className={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Search Task Center tasks" />
          <div className="max-h-56 overflow-y-auto flex flex-col">
            {found.length === 0 && <div className="text-[12.5px] text-text-secondary px-1 py-2">No matching tasks.</div>}
            {found.map(t => (
              <button key={t.id} disabled={busy} onClick={() => run(() => productFeaturesService.linkTask(f.id, t.id))}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover text-[13px] flex gap-2">
                <span className="flex-1 min-w-0 break-words">{t.title}</span><span className="text-[11.5px] text-text-secondary">{t.status.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end"><button onClick={() => setMode('none')} className={ghost}>Cancel</button></div>
        </div>
      )}
      {mode === 'new' && (
        <div className="rounded-xl border border-border-subtle p-3 flex flex-col gap-2.5">
          <input autoFocus className={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Task name" maxLength={200} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select className={input} value={assignee} onChange={e => setAssignee(e.target.value)} aria-label="Assign to">
              <option value="">Assign to… (optional)</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="date" className={input} value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Due date" />
          </div>
          <div className="text-[12px] text-text-secondary">It goes into the Task Center like any other task, with a {f.code} tag that links back here.</div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setMode('none')} className={ghost}>Cancel</button>
            <button onClick={create} disabled={busy || !title.trim()} className={primary}>{busy ? 'Creating…' : 'Create task'}</button>
          </div>
        </div>
      )}
      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ solutions */

function SolutionCard({ f, s, onChanged }: { f: FeatureDetail; s: FeatureSolution; onChanged: (f: FeatureDetail) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const run = async (fn: () => Promise<FeatureDetail>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { onChanged(await fn()); setEditing(null); setChoosing(null); } catch (e: any) { setError(e.message); } finally { inFlight.current = false; setBusy(false); }
  };
  return (
    <div className={cn('rounded-xl border px-3.5 py-3 flex flex-col gap-2', s.chosen ? 'border-accent-green bg-accent-green/5' : 'border-border-subtle')}>
      {s.chosen && (
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-accent-green">
          <Star size={13} className="fill-current" />We&rsquo;re going with this · thank you, {s.by?.name?.split(' ')[0] || 'team'}!
        </div>
      )}
      {editing !== null ? (
        <div className="flex flex-col gap-2">
          <textarea autoFocus rows={2} className={input} value={editing} onChange={e => setEditing(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className={ghost}>Cancel</button>
            <button disabled={busy || !editing.trim()} onClick={() => run(() => productFeaturesService.editSolution(f.id, s.id, editing))} className={primary}>Save</button>
          </div>
        </div>
      ) : (
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{s.text}</div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5"><Avatar p={s.by} size={18} />{s.by?.name || 'Someone'} · {fmtDate(s.created_at)}</span>
        <div className="flex-1" />
        {s.mine ? (
          <>
            <span className="inline-flex items-center gap-1" title={s.voters.map(v => v.name).join(', ') || 'No likes yet'}><Heart size={13} />{s.votes}</span>
            {editing === null && <button onClick={() => setEditing(s.text)} className="hover:text-text-primary inline-flex items-center gap-1"><Pencil size={12} />Edit</button>}
          </>
        ) : (
          <button disabled={busy} onClick={() => run(() => productFeaturesService.voteSolution(f.id, s.id))} aria-pressed={s.voted}
            title={s.voters.map(v => v.name).join(', ') || 'Be the first to like this'}
            className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-colors',
              s.voted ? 'text-accent-red bg-accent-red/10' : 'hover:text-text-primary hover:bg-surface-hover')}>
            <Heart size={13} className={cn(s.voted && 'fill-current')} />{s.votes > 0 ? s.votes : ''} {s.voted ? 'Liked' : 'Like'}
          </button>
        )}
        {f.permissions.can_decide && !s.chosen && choosing === null && (
          <button onClick={() => setChoosing('')} className="font-semibold text-accent-green hover:underline">Go with this</button>
        )}
      </div>
      {choosing !== null && (
        <div className="flex flex-col gap-2 pt-1">
          <textarea autoFocus rows={2} className={input} value={choosing} onChange={e => setChoosing(e.target.value)} placeholder="Why this one? (optional, but it helps whoever reads this later)" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setChoosing(null)} className={ghost}>Cancel</button>
            <button disabled={busy} onClick={() => run(() => productFeaturesService.chooseSolution(f.id, s.id, choosing))} className={cn(btn, 'bg-accent-green text-white hover:opacity-90')}>
              {busy ? 'Saving…' : `Go with ${s.by?.name?.split(' ')[0] || 'this'}’s solution`}
            </button>
          </div>
        </div>
      )}
      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
    </div>
  );
}

function Solutions({ f, onChanged }: { f: FeatureDetail; onChanged: (f: FeatureDetail) => void }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const add = async () => {
    if (inFlight.current || !text.trim()) return;
    inFlight.current = true; setBusy(true); setError('');
    try { onChanged(await productFeaturesService.addSolution(f.id, text)); setText(''); setOpen(false); } catch (e: any) { setError(e.message); } finally { inFlight.current = false; setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-2">
      {f.solutions_list.length === 0 && !open && <div className="text-[13px] text-text-secondary">No solutions yet. Have an idea? Add it.</div>}
      {f.solutions_list.map(s => <SolutionCard key={s.id} f={f} s={s} onChanged={onChanged} />)}
      {open ? (
        <div className="rounded-xl border border-border-subtle p-3 flex flex-col gap-2">
          <textarea autoFocus rows={3} className={input} value={text} onChange={e => setText(e.target.value)} placeholder="How would you fix it?" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setOpen(false); setText(''); }} className={ghost}>Cancel</button>
            <button onClick={add} disabled={busy || !text.trim()} className={primary}>{busy ? 'Adding…' : 'Add solution'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className={cn(ghost, 'self-start mt-1')}><Plus size={14} />{f.solutions_list.length ? 'I have another solution' : 'Add a solution'}</button>
      )}
      {error && <div className="text-[12.5px] text-accent-red">{error}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ the panel */

export function FeaturePanel({ id, areas, onClose, onChanged }: { id: number; areas: string[]; onClose: () => void; onChanged: () => void }) {
  const [f, setF] = useState<FeatureDetail | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<FeatureInput | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setF(null); setError(''); setEditing(null);
    productFeaturesService.get(id).then(setF).catch(e => setError(e.message));
  }, [id]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const update = useCallback((next: FeatureDetail) => { setF(next); onChanged(); }, [onChanged]);
  const inFlight = useRef(false);  // a double click lands before React re-renders, so busy alone can't stop it
  const act = async (fn: () => Promise<FeatureDetail>) => {
    if (inFlight.current) return false;
    inFlight.current = true; setBusy(true); setError('');
    try { update(await fn()); return true; } catch (e: any) { setError(e.message); return false; } finally { inFlight.current = false; setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end normal-case" onClick={onClose}>
      <aside role="dialog" aria-label={f?.title || 'Feature'} onClick={e => e.stopPropagation()}
        className="w-full max-w-[600px] h-full bg-background-secondary border-l border-border-subtle flex flex-col overflow-y-auto">
        <div className="sticky top-0 bg-background-secondary border-b border-border-subtle px-5 py-4 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary">{f ? `${f.code}${f.area ? ` · ${f.area}` : ''}` : 'Feature'}</div>
            <div className="text-lg font-extrabold mt-0.5 text-text-primary break-words">{f?.title || (error ? 'Could not open this feature' : 'Loading…')}</div>
          </div>
          {f?.permissions.can_edit && !editing && (
            <button onClick={() => setEditing({ title: f.title, problem: f.problem, area: f.area || '', source: f.source, source_note: f.source_note || '' })}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover" aria-label="Edit"><Pencil size={15} /></button>
          )}
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover"><X size={16} /></button>
        </div>

        {error && <div className="mx-5 mt-4 text-[13px] text-accent-red">{error}</div>}
        {f && (
          <div className="px-5 py-5 flex flex-col gap-6 text-text-primary">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-text-secondary">
              <StatusChip s={f.status} />
              <span>Raised by <b className="font-semibold text-text-primary">{f.created_by?.name || 'someone'}</b> on {fmtDate(f.created_at)}</span>
              {f.source !== 'team' && <span>· from {SOURCE_LABEL[f.source].toLowerCase()}</span>}
              {f.source_note && <span>· {f.source_note}</span>}
            </div>

            {editing ? (
              <div className="flex flex-col gap-3">
                <FeatureFields value={editing} onChange={setEditing} areas={areas} withIdea={false} />
                <div className="text-[12px] text-text-secondary">The old wording is kept in the history.</div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(null)} className={ghost}>Cancel</button>
                  <button disabled={busy} onClick={async () => { if (await act(() => productFeaturesService.edit(f.id, editing))) setEditing(null); }} className={primary}>Save</button>
                </div>
              </div>
            ) : (
              <>
                <section>
                  <Label>What we noticed</Label>
                  <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{f.problem}</div>
                </section>
              </>
            )}

            <section className="flex flex-wrap items-center gap-3">
              <button disabled={busy || f.me_too_mine} onClick={() => { if (!f.me_too_mine) act(() => productFeaturesService.meToo(f.id)); }}
                className={cn(btn, f.me_too_mine ? 'bg-accent-blue/10 text-accent-blue' : 'border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-hover')}>
                <ThumbsUp size={14} />{f.me_too_mine ? 'You noticed this too' : 'I noticed this too'}
              </button>
              {f.me_too_people.length > 0 && (
                <div className="flex items-center gap-2 text-[12.5px] text-text-secondary">
                  <div className="flex -space-x-1.5">{f.me_too_people.slice(0, 6).map(p => <Avatar key={p.id} p={p} size={22} ring />)}</div>
                  {f.me_too_people.length} {f.me_too_people.length === 1 ? 'person' : 'people'}
                </div>
              )}
            </section>

            <section>
              <Label>Solutions {f.solutions_list.length > 1 && <span className="normal-case tracking-normal font-semibold">· {f.solutions_list.length} ideas, {f.chosen_solution ? 'one chosen' : 'Sir picks one'}</span>}</Label>
              <Solutions f={f} onChanged={update} />
            </section>

            <section>
              <Label>Decision</Label>
              {f.status === 'suggested' && !f.decision_note
                ? <div className="text-[13px] text-text-secondary mb-2">Waiting for Sir to decide.</div>
                : (
                  <div className="rounded-xl bg-accent-blue/5 border-l-2 border-accent-blue px-3.5 py-2.5 mb-2">
                    <div className="text-[13px]"><StatusChip s={f.status} /> <span className="text-text-secondary ml-1">by {f.decided_by?.name || 'Sir'} on {fmtDate(f.decided_at)}</span></div>
                    {f.decision_note && <div className="text-[13.5px] mt-1.5 whitespace-pre-wrap break-words"><b className="font-semibold">Why: </b>{f.decision_note}</div>}
                  </div>
                )}
              {f.permissions.can_decide && <Decide key={f.status + f.decided_at} f={f} onSaved={update} />}
            </section>

            <section>
              <Label>Build tasks {f.tasks_total > 0 && <span className="normal-case tracking-normal font-semibold">· {f.tasks_done} of {f.tasks_total} done</span>}</Label>
              <Tasks f={f} onChanged={update} />
            </section>

            <section>
              <Label>History</Label>
              <div className="flex gap-2 mb-4">
                <textarea rows={2} className={input} value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment" />
                <button disabled={busy || !comment.trim()} onClick={async () => { if (await act(() => productFeaturesService.comment(f.id, comment))) setComment(''); }} className={cn(primary, 'self-end')}>Post</button>
              </div>
              <History events={f.events} />
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
