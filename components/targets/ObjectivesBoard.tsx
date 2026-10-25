'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Target, ExternalLink, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService as api, BoardDepartment, ObjectiveNode, ObjectivesBoard as Board, PersonBrief } from '@/services/departmentTargets';
import { ObjectivePanel } from '@/components/SidePanel';
import { ObjectiveTasks } from '@/components/targets/ObjectiveTasks';
import { Avatar, PaceBar, HealthChip, quarterPace } from '@/components/targets/ui';

const fmt = (iso?: string | null) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const STATUS = { not_started: 'To do', in_progress: 'In progress', done: 'Done' } as const;
const NEXT: Record<string, 'not_started' | 'in_progress' | 'done'> = { not_started: 'in_progress', in_progress: 'done', done: 'not_started' };
const pillCls = (s: string, overdue: boolean) => overdue ? 'text-accent-red bg-accent-red/10'
  : s === 'done' ? 'text-accent-green bg-accent-green/10' : s === 'in_progress' ? 'text-accent-blue bg-accent-blue/10' : 'text-text-secondary bg-[var(--bg-primary)]';

/**
 * Task Center → "Objectives" tab. Department → objective (1, 2 …) → its tasks (1.1, 1.2 … the
 * sub-objectives), each with owner, due date and status, plus any Task Center tasks under them.
 * Reads the same data as the Departments page; nothing is copied into the task list.
 */
export function ObjectivesBoard() {
  const [quarter, setQuarter] = useState<{ fy: number; q: number } | null>(null);
  const [data, setData] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [dept, setDept] = useState<number | 'all'>('all');
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<number | null>(null);

  const load = useCallback(() => {
    api.board(quarter?.fy, quarter?.q).then(d => { setData(d); setError(''); if (!quarter) setQuarter({ fy: d.quarter.fiscal_year, q: d.quarter.quarter_number }); })
      .catch(e => setError(e.message));
  }, [quarter]);
  useEffect(load, [load]);

  const depts = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const keep = (n: ObjectiveNode): boolean =>
      (!mine || n.owner?.id === data.me || n.tasks.some(t => t.assignee?.id === data.me) || n.children.some(keep)) &&
      (!term || n.title.toLowerCase().includes(term) || n.children.some(c => c.title.toLowerCase().includes(term)) || n.tasks.some(t => t.title.toLowerCase().includes(term)));
    return data.departments
      .filter(d => dept === 'all' || d.id === dept)
      .map(d => ({ ...d, numbers: Object.fromEntries(d.objectives_tree.map((o, i) => [o.id, i + 1])), objectives_tree: d.objectives_tree.filter(keep) }))
      .filter(d => d.objectives_tree.length || (!mine && !term));
  }, [data, dept, mine, search]);

  if (error) return <div className="text-[13px] text-accent-red bg-accent-red/10 rounded-lg px-3 py-2 normal-case">{error}</div>;
  if (!data || !quarter) return <div className="text-[13px] text-text-secondary animate-pulse normal-case">Loading objectives…</div>;

  const fy = data.quarter.fiscal_year;
  const quarters = [1, 2, 3, 4].map(q => ({ fy, q }));
  const chip = (on: boolean) => cn('px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors whitespace-nowrap', on ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary');

  return (
    <div className="flex flex-col gap-4 normal-case">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-background-secondary p-1 border border-border-subtle rounded-xl">
          {quarters.map(o => <button key={o.q} onClick={() => setQuarter(o)} className={chip(o.q === quarter.q)}>Q{o.q}</button>)}
        </div>
        <div className="flex flex-wrap bg-background-secondary p-1 border border-border-subtle rounded-xl max-w-full">
          <button onClick={() => setDept('all')} className={chip(dept === 'all')}>All departments</button>
          {data.departments.map(d => <button key={d.id} onClick={() => setDept(d.id)} className={chip(dept === d.id)}>{d.name}</button>)}
        </div>
        <button onClick={() => setMine(!mine)} className={cn('px-3 py-2 text-[12px] font-semibold rounded-xl border', mine ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border-subtle bg-background-secondary text-text-secondary')}>
          Only mine
        </button>
        <label className="flex items-center gap-2 bg-background-secondary border border-border-subtle rounded-xl px-3 py-2 min-w-[200px] flex-1 max-w-xs">
          <Search size={13} className="text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search objectives and tasks" className="bg-transparent outline-none text-[12.5px] w-full text-text-primary" />
        </label>
      </div>

      <div className="text-[12.5px] text-text-secondary">
        {data.quarter.label} · {data.quarter.range}. Objectives come from each department page; the numbered tasks under them (1.1, 1.2 …) are the department’s plan for that objective.
      </div>

      {!data.departments.length && (
        <div className="bg-background-secondary border border-border-subtle rounded-2xl p-8 text-center text-[13.5px] text-text-secondary">
          You are not part of a department yet, so there are no objectives to show.
        </div>
      )}
      {data.departments.length > 0 && !depts.length && (
        <div className="bg-background-secondary border border-border-subtle rounded-2xl p-6 text-center text-[13px] text-text-secondary">Nothing matches.</div>
      )}

      {depts.map(d => <DeptSection key={d.id} d={d} me={data.me} onlyMine={mine} quarterInfo={data.quarter} open={setPanel} reload={load} defaultOpen={depts.length <= 3 || mine || !!search} />)}

      {panel !== null && <ObjectivePanel id={panel} onClose={() => setPanel(null)} onChanged={load} onOpen={setPanel} />}
    </div>
  );
}

function DeptSection({ d, me, onlyMine, quarterInfo, open, reload, defaultOpen }: { d: BoardDepartment & { numbers: Record<number, number> }; me: number; onlyMine: boolean; quarterInfo: Board['quarter']; open: (id: number) => void; reload: () => void; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  useEffect(() => setExpanded(defaultOpen), [defaultOpen]);
  const people = [d.hod, ...d.members].filter((p, i, a): p is PersonBrief => !!p && a.findIndex(x => x?.id === p.id) === i);
  const pace = quarterInfo.status === 'current' ? quarterPace(quarterInfo) : undefined;
  return (
    <section className="bg-background-secondary border border-border-subtle rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="w-full text-left flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-hover">
        <ChevronRight size={16} className={cn('text-text-secondary transition-transform', expanded && 'rotate-90 text-accent-blue')} />
        <Avatar p={d.hod} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold text-text-primary truncate">{d.name}</span>
          <span className="block text-[12px] text-text-secondary">{d.hod ? `${d.hod.name} · HOD` : 'No HOD yet'} · {d.objectives} {d.objectives === 1 ? 'objective' : 'objectives'} · {d.done}/{d.items} done{d.overdue ? ` · ` : ''}{d.overdue ? <b className="text-accent-red">{d.overdue} overdue</b> : null}</span>
        </span>
        {d.progress !== null && <span className="flex items-center gap-2 w-44"><PaceBar value={d.progress} pace={pace} className="flex-1" /><b className="text-[13px] w-10 text-right">{Math.round(d.progress)}%</b></span>}
        <Link href={`/departments?id=${d.id}`} onClick={e => e.stopPropagation()} className="text-[12px] font-semibold text-accent-blue inline-flex items-center gap-1"><ExternalLink size={12} /> Department</Link>
      </button>
      {expanded && (
        <div className="border-t border-border-subtle">
          {d.objectives_tree.map((o, i) => <ObjectiveBlock key={o.id} o={o} n={d.numbers[o.id] ?? i + 1} d={d} me={me} onlyMine={onlyMine} people={people} open={open} reload={reload} quarterInfo={quarterInfo} />)}
          {!d.objectives_tree.length && <div className="px-4 py-4 text-[13px] text-text-secondary">No objectives for {quarterInfo.short} yet.{d.can_plan ? <> <Link href={`/departments?id=${d.id}`} className="text-accent-blue font-semibold">Add them on the department page</Link>.</> : ''}</div>}
        </div>
      )}
    </section>
  );
}

function ObjectiveBlock({ o, n, d, me, onlyMine, people, open, reload, quarterInfo }: { o: ObjectiveNode; n: number; d: BoardDepartment & { numbers: Record<number, number> }; me: number; onlyMine: boolean; people: PersonBrief[]; open: (id: number) => void; reload: () => void; quarterInfo: Board['quarter'] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="border-t border-border-subtle first:border-t-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[var(--bg-primary)]/40">
        <span className="w-7 h-7 rounded-lg bg-accent-blue/10 text-accent-blue font-extrabold text-[14px] flex items-center justify-center shrink-0">{n}</span>
        <button onClick={() => open(o.id)} className="flex-1 min-w-0 text-left">
          <span className="flex items-center gap-1.5 text-[14px] font-bold text-text-primary hover:text-accent-blue"><Target size={13} className="text-accent-blue shrink-0" /><span className="truncate">{o.title}</span></span>
          <span className="block text-[12px] text-text-secondary">{o.owner?.name || 'Unassigned'}{o.deadline ? <> · <span className={cn(o.overdue && 'text-accent-red font-semibold')}>due {fmt(o.deadline)}</span></> : null} · {o.children.length} {o.children.length === 1 ? 'task' : 'tasks'}</span>
        </button>
        {o.health && <HealthChip h={o.health} />}
        <span className="flex items-center gap-2 w-36"><PaceBar value={o.progress} h={o.health} className="flex-1" /><b className="text-[12px] w-9 text-right">{Math.round(o.progress)}%</b></span>
      </div>

      {/* numbers stay as on the department page even when "Only mine" hides other people's rows */}
      {o.children.map((c, j) => (!onlyMine || c.owner?.id === me || c.tasks.some(t => t.assignee?.id === me))
        ? <TaskRow key={c.id} c={c} num={`${n}.${j + 1}`} d={d} me={me} people={people} open={open} reload={reload} /> : null)}

      {/* tasks linked straight to the objective, if any */}
      {o.tasks.length > 0 && (
        <div className="pl-14 pr-4 py-1.5 border-t border-border-subtle">
          <ObjectiveTasks objectiveId={o.id} tasks={o.tasks} people={people} onChanged={reload} compact />
        </div>
      )}

      {d.can_plan && quarterInfo.status !== 'past' && (
        adding ? <AddRow objective={o} d={d} people={people} quarterInfo={quarterInfo} done={() => { setAdding(false); reload(); }} />
          : <div className="pl-14 pr-4 py-2 border-t border-border-subtle"><button onClick={() => setAdding(true)} className="text-[12.5px] font-semibold text-accent-blue inline-flex items-center gap-1"><Plus size={13} /> Add task {n}.{o.children.length + 1}</button></div>
      )}
    </div>
  );
}

function TaskRow({ c, num, d, me, people, open, reload }: { c: ObjectiveNode; num: string; d: BoardDepartment; me: number; people: PersonBrief[]; open: (id: number) => void; reload: () => void }) {
  const [showTasks, setShowTasks] = useState(false);
  const [error, setError] = useState('');
  const fromTasks = c.progress_from === 'tasks';
  // the HOD / Director, or the person the task is assigned to; the server checks the same rule
  const canChange = !fromTasks && (d.can_plan || c.owner?.id === me);
  const cycle = async () => {
    setError('');
    try { await api.updateObjective(c.id, { status: NEXT[c.status] || 'in_progress' }); reload(); } catch (e: any) { setError(e.message); }
  };
  return (
    <div className="border-t border-border-subtle">
      <div className="flex flex-wrap items-center gap-3 pl-6 pr-4 py-2.5 text-[13px] hover:bg-surface-hover">
        <span className="font-mono text-[12px] text-text-secondary w-10 text-right shrink-0">{num}</span>
        <button onClick={() => open(c.id)} className="flex-1 min-w-[160px] text-left">
          <span className={cn('font-medium text-text-primary hover:text-accent-blue', c.status === 'done' && 'line-through text-text-secondary')}>{c.title}</span>
          {(c.tasks.length > 0 || error) && <span className="block text-[11.5px] text-text-secondary">{error ? <span className="text-accent-red">{error}</span> : `${c.tasks.filter(t => t.done).length}/${c.tasks.length} Task Center tasks done`}</span>}
        </button>
        <span className="flex items-center gap-1.5 w-36 text-[12px] text-text-secondary truncate"><Avatar p={c.owner} size={20} />{c.owner?.name || 'Unassigned'}</span>
        <span className={cn('w-16 text-[12px] text-right', c.overdue ? 'text-accent-red font-semibold' : 'text-text-secondary')}>{fmt(c.deadline)}</span>
        {canChange ? (
          <button onClick={cycle} title="Click to change status" className={cn('text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 w-24', pillCls(c.status, c.overdue))}>{c.overdue && c.status !== 'done' ? 'Overdue' : STATUS[c.status as keyof typeof STATUS] || 'To do'}</button>
        ) : (
          <span className={cn('text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 w-24 text-center', pillCls(c.status, c.overdue))}>{fromTasks ? `${Math.round(c.progress)}%` : STATUS[c.status as keyof typeof STATUS] || 'To do'}</span>
        )}
        <button onClick={() => setShowTasks(!showTasks)} aria-expanded={showTasks} className="text-[12px] font-semibold text-accent-blue w-20 text-right">{showTasks ? 'Hide' : c.tasks.length ? `${c.tasks.length} ${c.tasks.length === 1 ? 'task' : 'tasks'}` : '+ Task'}</button>
      </div>
      {showTasks && (
        <div className="pl-[88px] pr-4 pb-2">
          <ObjectiveTasks objectiveId={c.id} tasks={c.tasks} people={people} onChanged={reload} />
        </div>
      )}
    </div>
  );
}

function AddRow({ objective, d, people, quarterInfo, done }: { objective: ObjectiveNode; d: BoardDepartment; people: PersonBrief[]; quarterInfo: Board['quarter']; done: () => void }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Name the task.');
    setBusy(true); setError('');
    try {
      await api.createObjective({ department_id: d.id, fiscal_year: quarterInfo.fiscal_year, quarter_number: quarterInfo.quarter_number, parent_id: objective.id, title: title.trim(), owner_id: owner || null, deadline: deadline || null });
      done();
    } catch (err: any) { setError(err.message); setBusy(false); }
  };
  const field = 'rounded-md border border-border-subtle bg-background-primary px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue';
  return (
    <form onSubmit={submit} className="pl-14 pr-4 py-2.5 border-t border-border-subtle flex flex-col gap-1.5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_150px_auto] gap-1.5">
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={300} placeholder={`Task for “${objective.title}”`} aria-label="Task" className={field} />
        <select value={owner} onChange={e => setOwner(e.target.value ? Number(e.target.value) : '')} aria-label="Owner" className={field}>
          <option value="">Unassigned</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Due date" className={field} />
        <span className="flex gap-1.5">
          <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-[12px] font-semibold disabled:opacity-60">{busy ? 'Adding…' : 'Add'}</button>
          <button type="button" onClick={done} className="px-2 py-1.5 text-[12px] text-text-secondary">Cancel</button>
        </span>
      </div>
      {error && <div className="text-[12px] text-accent-red">{error}</div>}
    </form>
  );
}
