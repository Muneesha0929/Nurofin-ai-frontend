'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Target, ExternalLink, Search, FolderKanban } from 'lucide-react';
import { cn } from '@/utils/cn';
import { departmentTargetsService as api, BoardDepartment, ObjectiveNode, ObjectivesBoard as Board, PersonBrief } from '@/services/departmentTargets';
import { projectsService } from '@/services/projects';
import { Project } from '@/types';
import { ObjectivePanel, TaskPanel } from '@/components/SidePanel';
import { workcenterService, WCTask } from '@/services/workcenter';
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
// Fiscal quarters (Indian FY): Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar of the next year.
function quarterDates(fy: number, q: number) {
  const y = q === 4 ? fy + 1 : fy, m = { 1: 4, 2: 7, 3: 10, 4: 1 }[q]!;
  const start = new Date(y, m - 1, 1), end = new Date(y, m + 2, 0);
  const label = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return { start, end, startLabel: label(start), range: `${start.toLocaleDateString('en-GB', { month: 'short' })} – ${end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` };
}
const SHOW_DEPTS_KEY = 'nurofin-objectives-show-departments';

export function ObjectivesBoard({ selectedProjectId = '' }: { selectedProjectId?: string } = {}) {
  const [current, setCurrent] = useState<{ fy: number; q: number } | null>(null);
  const [quarter, setQuarter] = useState<{ fy: number; q: number } | null>(null);
  const [data, setData] = useState<Board | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>(selectedProjectId);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dept, setDept] = useState<number | 'all'>('all');
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<number | null>(null);
  const [showDepts, setShowDepts] = useState(true);
  const [taskPanel, setTaskPanel] = useState<WCTask | null>(null);
  useEffect(() => { setProjectFilter(selectedProjectId); }, [selectedProjectId]);
  useEffect(() => { projectsService.getProjects().then(setProjects).catch(() => {}); }, []);
  useEffect(() => { try { setShowDepts(localStorage.getItem(SHOW_DEPTS_KEY) !== 'off'); } catch { /* storage blocked */ } }, []);
  const toggleDepts = () => { const v = !showDepts; setShowDepts(v); try { localStorage.setItem(SHOW_DEPTS_KEY, v ? 'on' : 'off'); } catch { /* storage blocked */ } };

  const load = useCallback(() => {
    setLoading(true);
    // one quiet retry: a dropped connection should not show up as an error
    const get = () => api.board(quarter?.fy, quarter?.q);
    get().catch(() => new Promise(r => setTimeout(r, 800)).then(get))
      .then(d => {
        setData(d); setFailed(false);
        if (!quarter) { const c = { fy: d.quarter.fiscal_year, q: d.quarter.quarter_number }; setQuarter(c); setCurrent(c); }
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [quarter]);
  useEffect(load, [load]);

  const showing = data && quarter && data.quarter.fiscal_year === quarter.fy && data.quarter.quarter_number === quarter.q ? data : null;
  const activeProjId = projectFilter ? Number(projectFilter) : null;

  const depts = useMemo(() => {
    if (!showing) return [];
    const term = search.trim().toLowerCase();
    const deptCodeMatch = term.startsWith('##') ? term.slice(2).trim() : '';
    const matchesProj = (n: ObjectiveNode): boolean =>
      !activeProjId ||
      n.project_id === activeProjId ||
      n.children.some(matchesProj) ||
      n.tasks.some(t => t.project_id === activeProjId);
    const keep = (n: ObjectiveNode): boolean =>
      matchesProj(n) &&
      (!mine || n.owner?.id === showing.me || n.tasks.some(t => t.assignee?.id === showing.me) || n.children.some(keep)) &&
      (!term || deptCodeMatch !== '' || n.title.toLowerCase().includes(term) || n.children.some(c => c.title.toLowerCase().includes(term)) || n.tasks.some(t => t.title.toLowerCase().includes(term) || (t.description || '').toLowerCase().includes(term)));
    return showing.departments
      .filter(d => (dept === 'all' || d.id === dept) && (!deptCodeMatch || (d.short_code || '').toLowerCase().includes(deptCodeMatch) || d.name.toLowerCase().includes(deptCodeMatch)))
      .map(d => ({ ...d, numbers: Object.fromEntries(d.objectives_tree.map((o, i) => [o.id, i + 1])), objectives_tree: d.objectives_tree.filter(keep) }))
      .filter(d => d.objectives_tree.length || (!mine && !term && !activeProjId) || deptCodeMatch !== '');
  }, [showing, dept, mine, search, activeProjId]);

  if (!quarter) {
    return failed
      ? <Notice tone="error" title="Couldn’t load the objectives" text="Check your connection and try again." action={<button onClick={load} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold">Try again</button>} />
      : <div className="text-[13px] text-text-secondary animate-pulse normal-case">Loading objectives…</div>;
  }

  const fy = current?.fy ?? quarter.fy;
  const quarters = [1, 2, 3, 4].map(q => ({ fy, q }));
  const chip = (on: boolean) => cn('px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors whitespace-nowrap', on ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary');
  const qd = quarterDates(quarter.fy, quarter.q);
  const isFuture = !!current && (quarter.fy > current.fy || (quarter.fy === current.fy && quarter.q > current.q));
  const isPast = !!current && !isFuture && !(quarter.fy === current.fy && quarter.q === current.q);
  const totalObjectives = showing ? showing.departments.reduce((n, d) => n + d.objectives, 0) : 0;
  const deptList = (showing || data)?.departments || [];
  const director = (showing || data)?.is_director;

  let body: React.ReactNode;
  if (loading && !showing) body = <div className="text-[13px] text-text-secondary animate-pulse">Loading Q{quarter.q}…</div>;
  else if (isFuture && (!showing || totalObjectives === 0)) body = <ComingSoon q={quarter.q} fy={quarter.fy} startLabel={qd.startLabel} start={qd.start} director={!!director} />;
  else if (!showing) body = <Notice tone="error" title={`Couldn’t load Q${quarter.q}`} text="This is usually a dropped connection. Your data is safe." action={<button onClick={load} className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold">Try again</button>} />;
  else if (!showing.departments.length) body = <Notice title="No departments to show" text="You are not part of a department yet. The Director adds people to departments." />;
  else if (isPast && totalObjectives === 0) body = <Notice title={`No objectives were set for Q${quarter.q}`} text={`${qd.range}. Past quarters stay here for reference once they have objectives.`} />;
  else if (!depts.length) body = <Notice title="Nothing matches" text="Try clearing the search or the “Only mine” filter." />;
  else body = depts.map(d => (
    <DeptSection
      key={d.id}
      d={d}
      me={showing.me}
      onlyMine={mine}
      activeProjId={activeProjId}
      projects={projects}
      quarterInfo={showing.quarter}
      open={setPanel}
      onOpenTask={taskId => workcenterService.getTask(taskId).then(setTaskPanel).catch(() => {})}
      reload={load}
      defaultOpen={depts.length <= 3 || mine || !!search || !!activeProjId}
    />
  ));

  return (
    <div className="flex flex-col gap-4 normal-case">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-background-secondary p-1 border border-border-subtle rounded-xl">
          {quarters.map(o => <button key={o.q} onClick={() => setQuarter(o)} className={chip(o.q === quarter.q)}>Q{o.q}</button>)}
        </div>
        <button onClick={toggleDepts} aria-pressed={showDepts} className={cn('px-3 py-2 text-[12px] font-semibold rounded-xl border', showDepts ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border-subtle bg-background-secondary text-text-secondary')}>
          {showDepts ? 'Hide departments' : 'Show departments'}
        </button>
        {showDepts && deptList.length > 1 && (
          <div className="flex flex-wrap bg-background-secondary p-1 border border-border-subtle rounded-xl max-w-full">
            <button onClick={() => setDept('all')} className={chip(dept === 'all')}>All departments</button>
            {deptList.map(d => <button key={d.id} onClick={() => setDept(d.id)} className={chip(dept === d.id)}>{d.name}</button>)}
          </div>
        )}
        {showDepts && projects.length > 0 && (
          <select
            aria-label="Filter objectives by project"
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="px-3 py-2 text-[12px] font-semibold rounded-xl border border-border-subtle bg-background-secondary text-text-primary cursor-pointer"
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>Project: {p.name}</option>)}
          </select>
        )}
        {showDepts && (
          <button onClick={() => setMine(!mine)} className={cn('px-3 py-2 text-[12px] font-semibold rounded-xl border', mine ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border-subtle bg-background-secondary text-text-secondary')}>
            Only mine
          </button>
        )}
        <label className="flex items-center gap-2 bg-background-secondary border border-border-subtle rounded-xl px-3 py-2 min-w-[200px] flex-1 max-w-xs">
          <Search size={13} className="text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search objectives and tasks" className="bg-transparent outline-none text-[12.5px] w-full text-text-primary" />
        </label>
      </div>

      {showDepts && (
        <>
          <div className="text-[12.5px] text-text-secondary">
            Q{quarter.q} FY {quarter.fy}-{String(quarter.fy + 1).slice(-2)} · {qd.range}. Objectives come from each department page; the numbered tasks under them (1.1, 1.2 …) are the department’s plan for that objective.
          </div>
          {body}
        </>
      )}

      <OtherTasks me={(showing || data)?.me} search={search} objectives={showing && !isPast ? showing.departments : []} onOpen={setTaskPanel} onLinked={load} />

      {panel !== null && <ObjectivePanel id={panel} onClose={() => setPanel(null)} onChanged={load} onOpen={setPanel} />}
      {taskPanel && <TaskPanel task={taskPanel} canChange onClose={() => setTaskPanel(null)} onChanged={load} />}
    </div>
  );
}

function Notice({ title, text, tone, action }: { title: string; text: string; tone?: 'error'; action?: React.ReactNode }) {
  return (
    <div className={cn('bg-background-secondary border rounded-2xl p-8 flex flex-col items-center text-center gap-2 normal-case', tone === 'error' ? 'border-accent-red/30' : 'border-border-subtle')}>
      <div className="text-[15px] font-extrabold text-text-primary">{title}</div>
      <div className="text-[13px] text-text-secondary max-w-md">{text}</div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** A future quarter with nothing planned yet: a small illustration instead of an empty or broken page. */
function ComingSoon({ q, fy, startLabel, start, director }: { q: number; fy: number; startLabel: string; start: Date; director: boolean }) {
  const days = Math.max(0, Math.ceil((start.getTime() - Date.now()) / 86400000));
  return (
    <div className="bg-background-secondary border border-border-subtle rounded-2xl p-8 md:p-10 flex flex-col items-center text-center gap-3">
      <svg width="132" height="112" viewBox="0 0 132 112" role="img" aria-label="Calendar with the next quarter coming up">
        <rect x="18" y="18" width="96" height="80" rx="12" fill="var(--bg-primary)" stroke="var(--border-subtle)" strokeWidth="2" />
        <rect x="18" y="18" width="96" height="22" rx="12" fill="var(--accent-blue)" opacity="0.9" />
        <rect x="18" y="30" width="96" height="10" fill="var(--accent-blue)" opacity="0.9" />
        <rect x="38" y="10" width="6" height="16" rx="3" fill="var(--text-secondary)" />
        <rect x="88" y="10" width="6" height="16" rx="3" fill="var(--text-secondary)" />
        <text x="66" y="77" textAnchor="middle" fill="var(--text-primary)" style={{ font: '800 26px var(--font-family)' }}>Q{q}</text>
        <circle cx="108" cy="92" r="14" fill="var(--bg-secondary)" stroke="var(--accent-blue)" strokeWidth="2.5" />
        <path d="M108 85v7l5 3" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M14 58l3 -6 3 6 -3 6z M120 46l2 -4 2 4 -2 4z" fill="var(--accent-orange)" opacity="0.8" />
      </svg>
      <div className="text-[18px] font-extrabold text-text-primary">Q{q} FY {fy}-{String(fy + 1).slice(-2)} is yet to come</div>
      <div className="text-[13px] text-text-secondary max-w-md">
        It starts on {startLabel}{days ? `, ${days} days from now` : ''}. Objectives and their tasks will show here once departments plan them.
      </div>
      {director && <Link href="/departments?view=targets" className="mt-1 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12.5px] font-semibold">Set Q{q} targets</Link>}
    </div>
  );
}

/**
 * "My other tasks": the caller's existing Task Center tasks that are not linked to any objective,
 * with their sub-tasks. Nothing changes unless someone picks an objective to link one to.
 */
function OtherSubtaskRow({ s, depth = 1, isDone, onOpen }: { s: any; depth?: number; isDone: (t: any) => boolean; onOpen: (t: any) => void }) {
  const childSubs = s.subtasks || [];
  return (
    <React.Fragment key={s.id}>
      <div className="flex items-center gap-3 pr-4 py-1.5 text-[12.5px] border-t border-border-subtle/60" style={{ paddingLeft: `${depth * 16 + 32}px` }}>
        <button onClick={() => onOpen(s)} className="flex-1 min-w-0 text-left hover:text-accent-blue">
          <span className={cn('truncate', isDone(s) && 'line-through text-text-secondary')}>{depth > 1 ? '↳ '.repeat(depth) : '↳ '}{s.title}</span>
        </button>
        <span className="text-[11.5px] text-text-secondary truncate max-w-[140px]">{s.assigned_to_name || ''}</span>
        <span className="text-[11.5px] text-text-secondary w-14 text-right">{fmt(s.deadline?.slice(0, 10))}</span>
      </div>
      {childSubs.map((child: any) => (
        <OtherSubtaskRow key={child.id} s={child} depth={depth + 1} isDone={isDone} onOpen={onOpen} />
      ))}
    </React.Fragment>
  );
}

function OtherTasks({ me, search, objectives, onOpen, onLinked }: { me?: number; search: string; objectives: BoardDepartment[]; onOpen: (t: WCTask) => void; onLinked: () => void }) {
  const [tasks, setTasks] = useState<WCTask[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!me) return;
    workcenterService.getTasks({ assignee_id: me, page_size: 200 })
      .then(async r => {
        const mineTop = (r.tasks || []).filter(t => String(t.assigned_to_id) === String(me) || t.subtasks?.some(s => String(s.assigned_to_id) === String(me)));
        const links = await api.taskLinks(mineTop.map(t => t.id)).catch(() => ({} as Record<string, unknown>));
        setTasks(mineTop.filter(t => !links[String(t.id)]));
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [me]);
  useEffect(load, [load]);

  const options = objectives.flatMap(d => d.objectives_tree.flatMap((o, i) => [
    { id: o.id, label: `${o.code || i + 1}. ${o.title}`, dept: d.short_code ? `##${d.short_code} · ${d.name}` : d.name },
    ...o.children.map((c, j) => ({ id: c.id, label: `${c.code || `${i + 1}.${j + 1}`} ${c.title}`, dept: d.short_code ? `##${d.short_code} · ${d.name}` : d.name })),
  ]));
  const byDept = options.reduce<Record<string, typeof options>>((m, o) => ((m[o.dept] = m[o.dept] || []).push(o), m), {});

  const link = async (taskId: number, objectiveId: string) => {
    if (!objectiveId) return;
    setBusy(taskId); setError('');
    try { await api.linkTask(Number(objectiveId), taskId); load(); onLinked(); } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  };

  const term = search.trim().toLowerCase();
  const isDone = (t: { status: string }) => t.status === 'completed' || t.status === 'done';
  const list = (tasks || []).filter(t => !term || t.title.toLowerCase().includes(term));
  const openList = list.filter(t => !isDone(t)), doneList = list.filter(isDone);
  const shown = showDone ? list : openList;
  const n = new Date(), today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;

  return (
    <section className="bg-background-secondary border border-border-subtle rounded-2xl overflow-hidden normal-case">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-extrabold text-text-primary">My other tasks</div>
          <div className="text-[12px] text-text-secondary">Your Task Center tasks that are not linked to an objective. They stay exactly as they are on the Task Board.</div>
        </div>
        {doneList.length > 0 && <button onClick={() => setShowDone(!showDone)} className="text-[12px] font-semibold text-accent-blue">{showDone ? 'Hide done' : `Show ${doneList.length} done`}</button>}
      </div>
      {error && <div className="px-4 py-2 text-[12px] text-accent-red">{error}</div>}
      {failed ? <div className="px-4 py-4 text-[13px] text-text-secondary">Couldn’t load your tasks. <button onClick={load} className="text-accent-blue font-semibold">Try again</button></div>
        : !tasks ? <div className="px-4 py-4 text-[13px] text-text-secondary animate-pulse">Loading your tasks…</div>
        : !shown.length ? <div className="px-4 py-4 text-[13px] text-text-secondary">{term ? 'No tasks match.' : 'Nothing open outside the objectives.'}</div>
        : shown.map(t => {
          const due = t.deadline?.slice(0, 10);
          const late = !!due && due < today && !isDone(t);
          const subs = t.subtasks || [];
          const expanded = open.has(t.id);
          return (
            <div
              key={t.id}
              draggable={!isDone(t)}
              onDragStart={e => {
                e.dataTransfer.setData('application/x-nurofin-task-id', String(t.id));
                e.dataTransfer.setData('text/plain', String(t.id));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="border-t border-border-subtle first:border-t-0"
            >
              <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px]">
                <button onClick={() => { const n = new Set(open); n.has(t.id) ? n.delete(t.id) : n.add(t.id); setOpen(n); }} disabled={!subs.length} aria-label="Show sub-tasks"
                  className={cn('w-5 text-text-secondary', !subs.length && 'opacity-0')}><ChevronRight size={14} className={cn('transition-transform', expanded && 'rotate-90')} /></button>
                <button onClick={() => onOpen(t)} className="flex-1 min-w-[180px] text-left">
                  <span className={cn('font-medium text-text-primary hover:text-accent-blue', isDone(t) && 'line-through text-text-secondary')}>{t.title}</span>
                  <span className="block text-[11.5px] text-text-secondary">{t.project_name || 'No project'}{subs.length ? ` · ${subs.filter(isDone).length}/${subs.length} sub-tasks` : ''}</span>
                </button>
                <span className={cn('w-16 text-[12px] text-right', late ? 'text-accent-red font-semibold' : 'text-text-secondary')}>{fmt(due)}</span>
                <span className={cn('text-[11.5px] font-semibold rounded-full px-2.5 py-0.5', isDone(t) ? 'text-accent-green bg-accent-green/10' : late ? 'text-accent-red bg-accent-red/10' : t.status === 'in_progress' ? 'text-accent-blue bg-accent-blue/10' : 'text-text-secondary bg-[var(--bg-primary)]')}>
                  {isDone(t) ? 'Done' : late ? 'Overdue' : t.status === 'in_progress' ? 'In progress' : t.status === 'blocked' ? 'Blocked' : t.status === 'review' ? 'In review' : 'To do'}
                </span>
                {options.length > 0 && !isDone(t) && (
                  <select value="" disabled={busy === t.id} onChange={e => link(t.id, e.target.value)} aria-label="Link to objective"
                    className="text-[11.5px] rounded-md border border-border-subtle bg-background-primary px-1.5 py-1 text-text-primary max-w-[190px]">
                    <option value="">{busy === t.id ? 'Linking…' : 'Link to objective…'}</option>
                    {Object.entries(byDept).map(([d, list]) => <optgroup key={d} label={d}>{list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>)}
                  </select>
                )}
              </div>
              {expanded && subs.map(s => (
                <OtherSubtaskRow key={s.id} s={s} depth={1} isDone={isDone} onOpen={onOpen} />
              ))}
            </div>
          );
        })}
    </section>
  );
}

function PercentProgressControl({
  objectiveId,
  value,
  onSaved,
  onError,
}: {
  objectiveId: number;
  value: number;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  useEffect(() => { setDraft(String(Math.round(value))); }, [value]);

  const apply = async (pct: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    onError('');
    try {
      await api.updateObjective(objectiveId, { progress: clamped });
      onSaved();
    } catch (e: any) {
      onError(e.message || 'Could not update progress.');
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
      <select
        aria-label="Update progress preset"
        value={Math.round(value / 5) * 5}
        onChange={e => apply(Number(e.target.value))}
        className="text-[11px] font-semibold rounded-md border border-border-subtle bg-background-primary px-1.5 py-0.5 text-text-primary cursor-pointer"
      >
        {Array.from({ length: 21 }, (_, i) => i * 5).map(v => (
          <option key={v} value={v}>{v === 100 ? '100% Done' : `${v}%`}</option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft);
          if (!Number.isNaN(n) && n !== Math.round(value)) apply(n);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const n = Number(draft);
            if (!Number.isNaN(n)) apply(n);
          }
        }}
        aria-label="Custom progress %"
        className="w-11 text-[11px] text-right rounded-md border border-border-subtle bg-background-primary px-1 py-0.5 text-text-primary"
      />
      <span className="text-[10.5px] text-text-secondary">%</span>
    </div>
  );
}

function ProjectBadgeEditor({
  item,
  canEdit,
  projects,
  onSaved,
  onError,
}: {
  item: ObjectiveNode;
  canEdit: boolean;
  projects: Project[];
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <select
        autoFocus
        aria-label="Select project"
        value={item.own_project_id ?? item.project_id ?? ''}
        onBlur={() => setEditing(false)}
        onClick={e => e.stopPropagation()}
        onChange={async e => {
          e.stopPropagation();
          onError('');
          try {
            await api.updateObjective(item.id, { project_id: e.target.value ? Number(e.target.value) : null });
            setEditing(false);
            onSaved();
          } catch (err: any) {
            onError(err.message || 'Could not update project.');
          }
        }}
        className="text-[10.5px] rounded-md border border-accent-blue bg-background-primary px-1.5 py-0.5 text-text-primary"
      >
        <option value="">No project</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    );
  }
  if (item.project_name) {
    return (
      <button
        type="button"
        onClick={e => { e.stopPropagation(); if (canEdit) setEditing(true); }}
        title={canEdit ? 'Click to edit project' : item.project_name}
        className={cn(
          'inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0',
          canEdit && 'hover:bg-purple-500/20 cursor-pointer'
        )}
      >
        <FolderKanban size={10} /> {item.project_name}
      </button>
    );
  }
  if (!canEdit) return null;
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-dashed border-border-subtle text-text-secondary hover:text-purple-600 hover:border-purple-400 cursor-pointer shrink-0"
    >
      <FolderKanban size={9} /> + Project
    </button>
  );
}

function DeptSection({ d, me, onlyMine, activeProjId, projects, quarterInfo, open, onOpenTask, reload, defaultOpen }: { d: BoardDepartment & { numbers: Record<number, number> }; me: number; onlyMine: boolean; activeProjId: number | null; projects: Project[]; quarterInfo: Board['quarter']; open: (id: number) => void; onOpenTask: (taskId: number) => void; reload: () => void; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [addingObj, setAddingObj] = useState(false);
  useEffect(() => setExpanded(defaultOpen), [defaultOpen]);
  const people = [d.hod, ...d.members].filter((p, i, a): p is PersonBrief => !!p && a.findIndex(x => x?.id === p.id) === i);
  const pace = quarterInfo.status === 'current' ? quarterPace(quarterInfo) : undefined;
  const nextObjNum = d.objectives_tree.length + 1;
  return (
    <section className="bg-background-secondary border border-border-subtle rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="w-full text-left flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-hover">
        <ChevronRight size={16} className={cn('text-text-secondary transition-transform', expanded && 'rotate-90 text-accent-blue')} />
        <Avatar p={d.hod} size={28} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[15px] font-extrabold text-text-primary truncate">{d.name}</span>
            {d.short_code && (
              <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue shrink-0">
                ##{d.short_code}
              </span>
            )}
          </span>
          <span className="block text-[12px] text-text-secondary">{d.hod ? `${d.hod.name} · HOD` : 'No HOD yet'} · {d.objectives} {d.objectives === 1 ? 'objective' : 'objectives'} · {d.done}/{d.items} done{d.overdue ? ` · ` : ''}{d.overdue ? <b className="text-accent-red">{d.overdue} overdue</b> : null}</span>
        </span>
        {d.progress !== null && <span className="flex items-center gap-2 w-44"><PaceBar value={d.progress} pace={pace} className="flex-1" /><b className="text-[13px] w-10 text-right">{Math.round(d.progress)}%</b></span>}
        <Link href={`/departments?id=${d.id}`} onClick={e => e.stopPropagation()} className="text-[12px] font-semibold text-accent-blue inline-flex items-center gap-1"><ExternalLink size={12} /> Department</Link>
      </button>
      {expanded && (
        <div className="border-t border-border-subtle">
          {d.objectives_tree.map((o, i) => <ObjectiveBlock key={o.id} o={o} n={d.numbers[o.id] ?? i + 1} d={d} me={me} onlyMine={onlyMine} activeProjId={activeProjId} projects={projects} people={people} open={open} onOpenTask={onOpenTask} reload={reload} quarterInfo={quarterInfo} />)}
          {!d.objectives_tree.length && <div className="px-4 py-4 text-[13px] text-text-secondary">No objectives for {quarterInfo.short} yet.</div>}
          {d.can_plan && quarterInfo.status !== 'past' && (
            addingObj ? (
              <AddRow nextNum={String(nextObjNum)} d={d} people={people} projects={projects} quarterInfo={quarterInfo} done={() => { setAddingObj(false); reload(); }} />
            ) : (
              <div className="px-4 py-2.5 border-t border-border-subtle">
                <button onClick={() => setAddingObj(true)} className="text-[12.5px] font-semibold text-accent-blue inline-flex items-center gap-1 cursor-pointer">
                  <Plus size={13} /> Add objective {nextObjNum}
                </button>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function ObjectiveBlock({ o, n, d, me, onlyMine, activeProjId, projects, people, open, onOpenTask, reload, quarterInfo }: { o: ObjectiveNode; n: number; d: BoardDepartment & { numbers: Record<number, number> }; me: number; onlyMine: boolean; activeProjId: number | null; projects: Project[]; people: PersonBrief[]; open: (id: number) => void; onOpenTask: (taskId: number) => void; reload: () => void; quarterInfo: Board['quarter'] }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const objCode = o.code || String(n);
  const nextSubCode = `${objCode}.${o.children.length + 1}`;
  const canUpdateObjPct = !o.children.length && (o.can_update_progress ?? (d.can_plan || o.owner?.id === me || o.tasks.some(t => t.assignee?.id === me)));
  const canEditProj = d.can_plan || o.owner?.id === me;
  return (
    <div className="border-t border-border-subtle first:border-t-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[var(--bg-primary)]/40">
        <span className="w-7 h-7 rounded-lg bg-accent-blue/10 text-accent-blue font-extrabold text-[14px] flex items-center justify-center shrink-0">{objCode}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => open(o.id)} className="text-left flex items-center gap-1.5 text-[14px] font-bold text-text-primary hover:text-accent-blue">
              <Target size={13} className="text-accent-blue shrink-0" /><span className="truncate">{o.title}</span>
            </button>
            <ProjectBadgeEditor item={o} canEdit={canEditProj} projects={projects} onSaved={reload} onError={setError} />
          </div>
          <span className="block text-[12px] text-text-secondary">
            {o.owner?.name || 'Unassigned'}
            {o.deadline ? <> · <span className={cn(o.overdue && 'text-accent-red font-semibold')}>due {fmt(o.deadline)}</span></> : null}
            {' · '}{o.children.length} {o.children.length === 1 ? 'target' : 'targets'}
            {error && <span className="ml-2 text-accent-red">{error}</span>}
          </span>
        </div>
        {o.health && <HealthChip h={o.health} />}
        <span className="flex items-center gap-2 w-36"><PaceBar value={o.progress} h={o.health} className="flex-1" /><b className="text-[12px] w-9 text-right">{Math.round(o.progress)}%</b></span>
        {canUpdateObjPct && <PercentProgressControl objectiveId={o.id} value={o.progress} onSaved={reload} onError={setError} />}
      </div>

      {/* numbers stay as on the department page even when "Only mine" or project filter hides unrelated rows */}
      {o.children.map((c, j) => {
        const matchesMine = !onlyMine || c.owner?.id === me || c.tasks.some(t => t.assignee?.id === me);
        const matchesProj = !activeProjId || c.project_id === activeProjId || c.tasks.some(t => t.project_id === activeProjId);
        return matchesMine && matchesProj
          ? <TaskRow key={c.id} c={c} num={c.code || `${objCode}.${j + 1}`} d={d} me={me} defaultExpanded={!!activeProjId} projects={projects} people={people} open={open} onOpenTask={onOpenTask} reload={reload} />
          : null;
      })}

      {/* tasks linked straight to the objective, if any */}
      <div className="pl-14 pr-4 py-1.5 border-t border-border-subtle">
        <ObjectiveTasks
          objectiveId={o.id}
          tasks={activeProjId && o.project_id !== activeProjId ? o.tasks.filter(t => t.project_id === activeProjId) : o.tasks}
          people={people}
          onChanged={reload}
          parentCode={objCode}
          startIndex={o.children.length ? o.children.length + 1 : 1}
          projectId={o.project_id}
          defaultExpanded={!!activeProjId}
          onOpenTask={onOpenTask}
          compact
        />
      </div>

      {d.can_plan && quarterInfo.status !== 'past' && (
        adding ? <AddRow objective={o} nextNum={nextSubCode} d={d} people={people} projects={projects} quarterInfo={quarterInfo} done={() => { setAdding(false); reload(); }} />
          : <div className="pl-14 pr-4 py-2 border-t border-border-subtle"><button onClick={() => setAdding(true)} className="text-[12.5px] font-semibold text-accent-blue inline-flex items-center gap-1 cursor-pointer"><Plus size={13} /> Add target {nextSubCode}</button></div>
      )}
    </div>
  );
}

function TaskRow({ c, num, d, me, defaultExpanded, projects, people, open, onOpenTask, reload }: { c: ObjectiveNode; num: string; d: BoardDepartment; me: number; defaultExpanded?: boolean; projects: Project[]; people: PersonBrief[]; open: (id: number) => void; onOpenTask: (taskId: number) => void; reload: () => void }) {
  const [showTasks, setShowTasks] = useState(c.tasks.length > 0 || !!defaultExpanded);
  const [error, setError] = useState('');
  const canUpdatePct = !c.children.length && (c.can_update_progress ?? (d.can_plan || c.owner?.id === me || c.tasks.some(t => t.assignee?.id === me)));
  const canEditProj = d.can_plan || c.owner?.id === me;
  const cycle = async () => {
    setError('');
    try { await api.updateObjective(c.id, { status: NEXT[c.status] || 'in_progress' }); reload(); } catch (e: any) { setError(e.message); }
  };
  return (
    <div className="border-t border-border-subtle">
      <div className="flex flex-wrap items-center gap-3 pl-6 pr-4 py-2.5 text-[13px] hover:bg-surface-hover">
        <span className="font-mono text-[12px] font-bold text-accent-blue w-10 text-right shrink-0">{num}</span>
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => open(c.id)} className="text-left">
              <span className={cn('font-medium text-text-primary hover:text-accent-blue', c.status === 'done' && 'line-through text-text-secondary')}>{c.title}</span>
            </button>
            <ProjectBadgeEditor item={c} canEdit={canEditProj} projects={projects} onSaved={reload} onError={setError} />
          </div>
          {(c.tasks.length > 0 || error) && <span className="block text-[11.5px] text-text-secondary">{error ? <span className="text-accent-red">{error}</span> : `${c.tasks.filter(t => t.done).length}/${c.tasks.length} Task Center tasks done`}</span>}
        </div>
        <span className="flex items-center gap-1.5 w-36 text-[12px] text-text-secondary truncate"><Avatar p={c.owner} size={20} />{c.owner?.name || 'Unassigned'}</span>
        <span className={cn('w-16 text-[12px] text-right', c.overdue ? 'text-accent-red font-semibold' : 'text-text-secondary')}>{fmt(c.deadline)}</span>
        <span className="text-[11.5px] font-bold w-9 text-right text-text-primary">{Math.round(c.progress)}%</span>
        {canUpdatePct ? (
          <PercentProgressControl objectiveId={c.id} value={c.progress} onSaved={reload} onError={setError} />
        ) : (
          <button type="button" onClick={d.can_plan ? cycle : undefined} className={cn('text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 w-24 text-center', pillCls(c.status, c.overdue))}>
            {c.overdue && c.status !== 'done' ? 'Overdue' : STATUS[c.status as keyof typeof STATUS] || 'To do'}
          </button>
        )}
        <button onClick={() => setShowTasks(!showTasks)} aria-expanded={showTasks} className="text-[12px] font-semibold text-accent-blue w-20 text-right cursor-pointer">{showTasks ? 'Hide' : c.tasks.length ? `${c.tasks.length} ${c.tasks.length === 1 ? 'task' : 'tasks'}` : '+ Task'}</button>
      </div>
      {showTasks && (
        <div className="pl-[80px] pr-4 pb-2">
          <ObjectiveTasks objectiveId={c.id} tasks={c.tasks} people={people} onChanged={reload} parentCode={num} startIndex={1} projectId={c.project_id} defaultExpanded={!!defaultExpanded} onOpenTask={onOpenTask} />
        </div>
      )}
    </div>
  );
}

function AddRow({ objective, nextNum, d, people, projects, quarterInfo, done }: { objective?: ObjectiveNode; nextNum?: string; d: BoardDepartment; people: PersonBrief[]; projects: Project[]; quarterInfo: Board['quarter']; done: () => void }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<number | ''>(objective?.project_id ?? '');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(objective ? 'Name the target.' : 'Name the objective.');
    setBusy(true); setError('');
    try {
      await api.createObjective({
        department_id: d.id,
        fiscal_year: quarterInfo.fiscal_year,
        quarter_number: quarterInfo.quarter_number,
        parent_id: objective?.id ?? null,
        title: title.trim(),
        owner_id: owner || null,
        project_id: projectId || null,
        deadline: deadline || null,
      });
      done();
    } catch (err: any) { setError(err.message); setBusy(false); }
  };
  const field = 'rounded-md border border-border-subtle bg-background-primary px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none focus:border-accent-blue';
  return (
    <form onSubmit={submit} className={cn('pr-4 py-2.5 border-t border-border-subtle flex flex-col gap-1.5', objective ? 'pl-14' : 'pl-4')}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_150px_140px_auto] gap-1.5">
        <div className="flex items-center gap-1.5">
          {nextNum && (
            <span className="font-mono text-[11.5px] font-bold px-2 py-1 rounded bg-accent-blue/10 text-accent-blue shrink-0">
              {nextNum}
            </span>
          )}
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={300}
            placeholder={objective ? `Target ${nextNum || ''} for “${objective.title}”` : `Objective ${nextNum || ''} for ${d.name}`}
            aria-label={objective ? 'Target' : 'Objective'} className={cn(field, 'flex-1')} />
        </div>
        <select value={owner} onChange={e => setOwner(e.target.value ? Number(e.target.value) : '')} aria-label="Owner" className={field}>
          <option value="">Unassigned</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={projectId} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')} aria-label="Project" className={field}>
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Due date" className={field} />
        <span className="flex gap-1.5">
          <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-[12px] font-semibold disabled:opacity-60 cursor-pointer">{busy ? 'Adding…' : 'Add'}</button>
          <button type="button" onClick={done} className="px-2 py-1.5 text-[12px] text-text-secondary cursor-pointer">Cancel</button>
        </span>
      </div>
      {error && <div className="text-[12px] text-accent-red">{error}</div>}
    </form>
  );
}
