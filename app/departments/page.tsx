'use client';

import React, { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2, Plus, ChevronRight, ChevronLeft, Pencil, Trash2, X, Users, Target, Calendar, CheckCircle2, AlertCircle, FolderKanban, MessageSquare, Send, PanelRight, ChevronDown,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { HoldToDelete } from '@/components/HoldToDelete';
import { cn } from '@/utils/cn';
import { formatISTDate, formatISTTime } from '@/utils/date';
import { usersService } from '@/services/users';
import { projectsService } from '@/services/projects';
import { Project } from '@/types';
import { ProgressBar } from '@/components/QuarterGoalHero';
import { ObjectivePanel, TaskPanel } from '@/components/SidePanel';
import { ObjectiveTasks } from '@/components/targets/ObjectiveTasks';
import { DeptCard, Panel, QuarterPills, StatusSelect, OBJECTIVE_STATUS_OPTIONS, codeOf, deptPrefix, p1Accent, scrollAndFlash, useOptimistic } from '@/components/targets/ui';
import { fetchNextCode } from '@/components/targets/TaskObjectiveLink';
import { CodeChip } from '@/components/timeline/CodeChip';
import { PriorityPicker, canSetPriority } from '@/components/timeline/PriorityChip';
import { DeadlineBadge } from '@/components/timeline/DeadlineBadge';
import type { Priority } from '@/services/timeline';
import { workcenterService, WCTask } from '@/services/workcenter';

// Opens the objective side panel or task side panel from anywhere inside a department page.
const OpenObjective = createContext<(id: number) => void>(() => {});
const OpenTask = createContext<(taskId: number) => void>(() => {});
// ?objective=ID: the objective a code link points at (opened and highlighted on arrival)
const FocusObjective = createContext<number | null>(null);
const hasFocus = (o: ObjectiveNode, id: number | null): boolean => !!id && (o.id === id || o.children.some(c => hasFocus(c, id)));
import {
  departmentTargetsService as api, DepartmentDetail, DepartmentQuarter, ObjectiveNode,
  Outcome, OUTCOME_LABEL, PersonBrief, QuarterOverview, TargetDepartment,
} from '@/services/departmentTargets';

type Person = { id: number; name: string; avatar?: string | null };

const isDirectorRole = (role?: string) => ['ceo', 'super_admin', 'director', 'admin'].includes((role || '').toLowerCase());
const fmtDate = (iso?: string | null) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const paragraphs = (t: string) => t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

const Avatar = ({ p, size = 28 }: { p: PersonBrief | Person | null; size?: number }) => {
  if (!p) return <span style={{ width: size, height: size }} className="rounded-full bg-[var(--bg-primary)] text-text-secondary inline-flex items-center justify-center text-[10px] font-bold shrink-0">?</span>;
  if (p.avatar) return <img src={p.avatar} alt={p.name} title={p.name} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  const initials = p.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  return <span title={p.name} style={{ width: size, height: size, fontSize: size * 0.38 }} className="rounded-full bg-accent-blue/15 text-accent-blue inline-flex items-center justify-center font-bold shrink-0">{initials}</span>;
};

const Chip = ({ tone, children }: { tone: 'blue' | 'green' | 'orange' | 'red' | 'muted'; children: React.ReactNode }) => (
  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1', {
    blue: 'text-accent-blue bg-accent-blue/10', green: 'text-accent-green bg-accent-green/10', orange: 'text-accent-orange bg-accent-orange/10',
    red: 'text-accent-red bg-accent-red/10', muted: 'text-text-secondary bg-[var(--bg-primary)]',
  }[tone])}>{children}</span>
);
const outcomeTone = (o: Outcome | null) => (o === 'achieved' ? 'green' : o === 'met_partly' ? 'orange' : o === 'not_met' ? 'red' : 'muted');

const Btn = ({ kind = 'plain', className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'plain' | 'ghost' | 'danger' }) => (
  <button {...rest} className={cn('px-3 py-1.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed', {
    primary: 'bg-accent-blue text-white hover:bg-accent-blue-hover',
    plain: 'border border-border-subtle bg-background-secondary text-text-primary hover:border-border-active',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
    danger: 'text-accent-red hover:bg-accent-red/10',
  }[kind], className)} />
);

const inputCls = 'w-full rounded-lg border border-border-subtle bg-background-primary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-blue';

function useAllUsers() {
  const [users, setUsers] = useState<Person[]>([]);
  useEffect(() => {
    usersService.getUsers().then(us => setUsers(us.map((u: any) => ({ id: Number(u.id), name: u.name, avatar: u.avatar || u.profile_picture })))).catch(() => setUsers([]));
  }, []);
  return users;
}

/* ============================================================ page */

export default function DepartmentsPage() {
  return <Suspense fallback={null}><DepartmentsRouter /></Suspense>;
}

function DepartmentsRouter() {
  const params = useSearchParams();
  const id = Number(params.get('id'));
  const view = params.get('view');
  const focus = Number(params.get('objective')) || null;
  return (
    <div className="flex flex-col gap-5 text-text-primary normal-case">
      {view === 'targets' ? <QuarterTargetsView /> : id ? <DepartmentView id={id} focusId={focus} /> : <DepartmentList />}
    </div>
  );
}

/* ============================================================ list */

function DepartmentList() {
  const { userProfile, searchQuery } = useStore();
  const director = isDirectorRole(userProfile?.role);
  const [data, setData] = useState<QuarterOverview | null>(null);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  // Set after a delete (here or from a department page): offers Undo for 15 seconds.
  const [undo, setUndo] = useState<{ id: number; name: string } | null>(null);

  const isHod = data?.departments?.some(d => String(d.hod?.id) === String(userProfile?.id));
  const canManageTargets = director || isHod;

  const load = useCallback(() => {
    api.overview().then(setData).catch(e => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('app:refresh', onRefresh);
    window.addEventListener('objective:updated', onRefresh);
    window.addEventListener('task:created', onRefresh);
    return () => {
      window.removeEventListener('app:refresh', onRefresh);
      window.removeEventListener('objective:updated', onRefresh);
      window.removeEventListener('task:created', onRefresh);
    };
  }, [load]);

  const filteredDepartments = useMemo(() => {
    if (!data?.departments) return [];
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return data.departments;
    return data.departments.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.short_code && d.short_code.toLowerCase().includes(q)) ||
      (d.hod?.name && d.hod.name.toLowerCase().includes(q)) ||
      d.members.some(m => m.name.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);
  useEffect(() => {
    const id = Number(params.get('undo'));
    if (id) { setUndo({ id, name: params.get('name') || 'Department' }); router.replace('/departments'); }
  }, [params, router]);

  const remove = async (d: { id: number; name: string }) => {
    setError('');
    try { await api.deleteDepartment(d.id); setUndo({ id: d.id, name: d.name }); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold">Departments</div>
          <div className="text-[13px] text-text-secondary mt-1 max-w-2xl">
            Each quarter the Director writes one target per department. The HOD reads it and sets the objectives.
          </div>
        </div>
        {canManageTargets && (
          <div className="flex gap-2">
            <Link href="/departments?view=targets" className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 bg-accent-blue text-white hover:bg-accent-blue-hover"><Target size={14} /> Set quarter targets</Link>
            {director && <Btn onClick={() => setFormOpen(true)}><Plus size={14} /> New department</Btn>}
            {director && <SetupCheck />}
          </div>
        )}
      </div>

      {undo && <UndoBar key={undo.id} item={undo} onDone={() => setUndo(null)} onUndone={load} onError={setError} />}
      {error && <ErrorNote text={error} />}
      {!data && !error && <div className="text-[13px] text-text-secondary animate-pulse">Loading departments…</div>}

      {data && data.departments.length === 0 && (
        <div className="bg-background-secondary border border-border-subtle rounded-2xl p-10 flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-accent-blue/10 text-accent-blue flex items-center justify-center"><Building2 size={22} /></span>
          <div className="text-lg font-extrabold">{director ? 'No departments yet' : 'No departments to show'}</div>
          <div className="text-[13px] text-text-secondary max-w-md">
            {director ? 'Create the first department. A name is enough to start; you can add the HOD and members later.' : 'You are not part of a department yet. The Director adds people to departments.'}
          </div>
          {director && <Btn kind="primary" onClick={() => setFormOpen(true)}><Plus size={14} /> New department</Btn>}
        </div>
      )}

      {data && data.departments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDepartments.map(d => (
            <div key={d.id} className="relative group/card">
              <DeptCard d={d} quarter={data.quarter} />
              {director && (
                <div className="absolute bottom-3 right-3 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity">
                  <HoldToDelete compact label={`Delete ${d.name}`} onConfirm={() => remove(d)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && <DepartmentForm onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />}
    </>
  );
}

/* ============================================================ department form */

function DepartmentForm({ dept, onClose, onSaved, onDeleted }: { dept?: TargetDepartment; onClose: () => void; onSaved: () => void; onDeleted?: () => void }) {
  const users = useAllUsers();
  const [name, setName] = useState(dept?.name || '');
  const [shortCode, setShortCode] = useState(dept?.short_code || '');
  const [hodId, setHodId] = useState<number | ''>(dept?.hod?.id || '');
  const [members, setMembers] = useState<Set<number>>(new Set(dept?.members.map(m => m.id) || []));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [codeError, setCodeError] = useState('');
  const previewPrefix = shortCode.trim() ? shortCode.trim().toUpperCase() : deptPrefix({ name });

  const visible = users.filter(u => u.id !== hodId && u.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give the department a name.');
    setBusy(true); setError(''); setCodeError('');
    const cleanCode = shortCode.trim().replace(/^#+/, '').toUpperCase();
    const payload = {
      name: name.trim(),
      short_code: cleanCode || null,
      hod_id: hodId || null,
      member_ids: [...members].filter(id => id !== hodId),
    };
    try {
      if (dept) await api.updateDepartment(dept.id, payload); else await api.createDepartment(payload);
      onSaved();
    } catch (err: any) {
      // a clash on the shortcut code is refused with a clear message: show it under that field
      if (/##|short ?code|already used/i.test(err.message || '')) setCodeError(err.message); else setError(err.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!dept) return;
    setBusy(true);
    try { await api.deleteDepartment(dept.id); onDeleted?.(); } catch (err: any) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md h-full bg-background-secondary border-l border-border-subtle flex flex-col">
        <div className="p-5 border-b border-border-subtle flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary">{dept ? 'Edit department' : 'New department'}</div>
            <div className="text-lg font-extrabold mt-0.5">{dept ? dept.name : 'Create a department'}</div>
          </div>
          <Btn type="button" kind="ghost" onClick={onClose} aria-label="Close"><X size={16} /></Btn>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Department name</span>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="e.g. Business Development" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Shortcut code for ## (optional, e.g. PROD, BD)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-bold text-accent-blue">##</span>
              <input value={shortCode} onChange={e => { setShortCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()); setCodeError(''); }} maxLength={10} placeholder="Auto (e.g. PROD)"
                aria-invalid={!!codeError} aria-describedby="dept-code-hint"
                className={cn(inputCls, codeError && 'border-accent-red focus:border-accent-red')} />
            </div>
            <span id="dept-code-hint" className="text-[12px] text-text-secondary">
              Codes will look like <b className="font-mono text-text-primary">{previewPrefix}-1.2</b>{!shortCode.trim() && ' (taken from the name until you set one)'}. Each code is used by one department only.
            </span>
            {codeError && <span role="alert" className="flex items-center gap-1.5 text-[12.5px] text-accent-red font-medium"><AlertCircle size={13} /> {codeError}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Head of department (optional)</span>
            <select value={hodId} onChange={e => setHodId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
              <option value="">No HOD yet</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Members (optional) · {[...members].filter(id => id !== hodId).length} selected</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people" className={inputCls} />
            <div className="flex flex-col border border-border-subtle rounded-lg max-h-72 overflow-y-auto">
              {visible.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer hover:bg-surface-hover border-t border-border-subtle first:border-t-0">
                  <input type="checkbox" checked={members.has(u.id)} onChange={() => {
                    const next = new Set(members); next.has(u.id) ? next.delete(u.id) : next.add(u.id); setMembers(next);
                  }} className="accent-[var(--accent-blue)]" />
                  <Avatar p={u} size={22} /> {u.name}
                </label>
              ))}
              {!visible.length && <div className="px-3 py-3 text-[12px] text-text-secondary">No people found.</div>}
            </div>
          </div>
          {error && <ErrorNote text={error} />}
        </div>
        <div className="p-5 border-t border-border-subtle flex items-center gap-2">
          <Btn type="submit" kind="primary" disabled={busy}>{busy ? 'Saving…' : dept ? 'Save changes' : 'Create department'}</Btn>
          <Btn type="button" kind="ghost" onClick={onClose}>Cancel</Btn>
          {dept && <span className="ml-auto"><HoldToDelete label="Hold to delete" onConfirm={remove} /></span>}
        </div>
      </form>
    </div>
  );
}

/* ============================================================ department page */

function DepartmentView({ id, focusId }: { id: number; focusId: number | null }) {
  const { inspectMode, setInspectMode } = useStore();
  const [fy, setFy] = useState<number | undefined>(undefined);
  const [data, setData] = useState<DepartmentDetail | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [panelId, setPanelId] = useState<number | null>(null);
  const [taskPanel, setTaskPanel] = useState<WCTask | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();
  const deleted = () => router.push(`/departments?undo=${id}&name=${encodeURIComponent(data?.name || '')}`);
  const removeHere = async () => {
    try { await api.deleteDepartment(id); deleted(); } catch (e: any) { setError(e.message); }
  };

  useEffect(() => {
    projectsService.getProjects().then(setProjects).catch(() => {});
  }, []);

  const openTaskPanel = useCallback((taskId: number) => {
    workcenterService.getTask(taskId).then(setTaskPanel).catch(() => {});
  }, []);

  const load = useCallback(() => {
    api.getDepartment(id, fy).then(d => {
      setData(d);
      setOpen(prev => prev.size ? prev : new Set(d.fiscal_year === d.current.fiscal_year ? [d.current.quarter_number] : []));
    }).catch(e => setError(e.message));
  }, [id, fy]);
  useEffect(load, [load]);

  // ?objective=ID: open its quarter, scroll to it and flash it for 2 s (once per link)
  const flashedFor = React.useRef<number | null>(null);
  useEffect(() => {
    if (!focusId || !data || flashedFor.current === focusId) return;
    const q = data.quarters.find(x => x.objectives_tree.some(o => hasFocus(o, focusId)));
    if (!q) {
      // not in this financial year: find out which one it belongs to
      api.getObjective(focusId).then(o => { if (o.quarter.fiscal_year !== data.fiscal_year) setFy(o.quarter.fiscal_year); }).catch(() => {});
      return;
    }
    flashedFor.current = focusId;
    setOpen(prev => (prev.has(q.quarter_number) ? prev : new Set(prev).add(q.quarter_number)));
    return scrollAndFlash(`objective-${focusId}`);
  }, [focusId, data]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('app:refresh', onRefresh);
    window.addEventListener('objective:updated', onRefresh);
    window.addEventListener('task:created', onRefresh);
    return () => {
      window.removeEventListener('app:refresh', onRefresh);
      window.removeEventListener('objective:updated', onRefresh);
      window.removeEventListener('task:created', onRefresh);
    };
  }, [load]);

  if (error) return <><BackLink /><ErrorNote text={error} /></>;
  if (!data) return <div className="text-[13px] text-text-secondary animate-pulse">Loading department…</div>;

  const cur = data.quarters.find(q => q.status === 'current');
  const toggle = (q: number) => { const n = new Set(open); n.has(q) ? n.delete(q) : n.add(q); setOpen(n); };

  return (
    <OpenObjective.Provider value={setPanelId}>
    <OpenTask.Provider value={openTaskPanel}>
    <FocusObjective.Provider value={focusId}>
      <BackLink />
      <div className="bg-background-secondary border border-border-subtle rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5 md:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary">Department</span>
            {data.short_code && (
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue">
                ##{data.short_code}
              </span>
            )}
          </div>
          <div className="text-2xl md:text-3xl font-extrabold mt-1">{data.name}</div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Avatar p={data.hod} size={40} />
              <div>
                <div className="text-[13.5px] font-bold">{data.hod ? data.hod.name : 'No HOD yet'}</div>
                <div className="text-[12px] text-text-secondary">Head of department</div>
              </div>
            </div>
            <span className="hidden sm:block w-px h-9 bg-border-subtle" />
            {data.members.length ? (
              <div>
                <div className="flex -space-x-2">{data.members.slice(0, 8).map(m => <span key={m.id} className="ring-2 ring-[var(--surface-card)] rounded-full"><Avatar p={m} size={28} /></span>)}</div>
                <div className="text-[12px] text-text-secondary mt-1">{data.members.map(m => m.name).join(', ')}</div>
              </div>
            ) : <span className="text-[12.5px] text-text-secondary">No members yet</span>}
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          {(data.permissions.is_director || data.permissions.is_hod) && (
            <div className="flex gap-2">
              <Link href="/departments?view=targets" className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 bg-accent-blue text-white hover:bg-accent-blue-hover"><Target size={13} /> Set quarter targets</Link>
              {data.permissions.is_director && (
                <>
                  <Btn onClick={() => setEditOpen(true)}><Pencil size={13} /> Edit department</Btn>
                  <HoldToDelete label="Hold to delete" onConfirm={removeHere} />
                </>
              )}
            </div>
          )}
          {cur && (
            <div className="flex gap-6">
              <Fact label={`${cur.short} progress`} value={cur.progress === null ? '—' : `${Math.round(cur.progress)}%`} />
              <Fact label="Objectives" value={String(cur.objectives)} />
              <Fact label="Overdue" value={String(cur.overdue)} tone={cur.overdue ? 'red' : undefined} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
        <div>
          <div className="text-[15px] font-extrabold">Quarters · {data.fy_label}</div>
          <div className="text-[12.5px] text-text-secondary">Click the left arrow (▸) on any objective to reveal its tasks and follow-ups.</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-background-secondary border border-border-subtle rounded-lg p-0.5 text-[11.5px]" title="Choose how task & objective details open">
            <button
              type="button"
              onClick={() => setInspectMode('drawer')}
              className={cn('px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer', inspectMode === 'drawer' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary')}
            >
              <PanelRight size={12} /> Drawer
            </button>
            <button
              type="button"
              onClick={() => setInspectMode('dropdown')}
              className={cn('px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer', inspectMode === 'dropdown' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary')}
            >
              <ChevronDown size={12} /> Dropdown
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Btn kind="ghost" onClick={() => { setOpen(new Set()); setFy(data.fiscal_year - 1); }} aria-label="Previous financial year"><ChevronLeft size={14} /> FY {data.fiscal_year - 1}-{String(data.fiscal_year).slice(-2)}</Btn>
            <Btn kind="ghost" onClick={() => { setOpen(new Set()); setFy(data.fiscal_year + 1); }} aria-label="Next financial year">FY {data.fiscal_year + 1}-{String(data.fiscal_year + 2).slice(-2)} <ChevronRight size={14} /></Btn>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {data.quarters.map(q => (
          <QuarterBlock key={q.quarter_number} dept={data} q={q} projects={projects} open={open.has(q.quarter_number)} onToggle={() => toggle(q.quarter_number)} reload={load} />
        ))}
      </div>

      {editOpen && (
        <DepartmentForm dept={data} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); }} onDeleted={deleted} />
      )}
      {panelId !== null && <ObjectivePanel id={panelId} onClose={() => setPanelId(null)} onChanged={load} onOpen={setPanelId} />}
      {taskPanel && <TaskPanel task={taskPanel} canChange onClose={() => setTaskPanel(null)} onChanged={load} />}
    </FocusObjective.Provider>
    </OpenTask.Provider>
    </OpenObjective.Provider>
  );
}

const BackLink = () => <Link href="/departments" className="text-[12.5px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1 w-fit"><ChevronLeft size={14} /> All departments</Link>;
const Fact = ({ label, value, tone }: { label: string; value: string; tone?: 'red' }) => (
  <div className="flex flex-col">
    <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-text-secondary">{label}</span>
    <span className={cn('text-xl font-extrabold', tone === 'red' && 'text-accent-red')}>{value}</span>
  </div>
);
const ErrorNote = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 text-[12.5px] text-accent-red bg-accent-red/10 rounded-lg px-3 py-2"><AlertCircle size={14} /> {text}</div>
);

/* ============================================================ one quarter */

function QuarterBlock({ dept, q, projects, open, onToggle, reload }: { dept: DepartmentDetail; q: DepartmentQuarter; projects: Project[]; open: boolean; onToggle: () => void; reload: () => void }) {
  const { is_director, can_plan, is_hod } = dept.permissions;
  const canEditTarget = is_director || can_plan;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showObjectives, setShowObjectives] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The HOD opening a quarter with an unread message marks it read (clears the dashboard banner).
  useEffect(() => {
    if (open && is_hod && q.new_for_me) api.markSeen(dept.id, q.fiscal_year, q.quarter_number).catch(() => {});
  }, [open, is_hod, q.new_for_me, dept.id, q.fiscal_year, q.quarter_number]);

  const saveMessage = async () => {
    setBusy(true); setError('');
    try { await api.updateQuarter(dept.id, q.fiscal_year, q.quarter_number, { message: draft }); setEditing(false); reload(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const setOutcome = async (outcome: Outcome | null) => {
    setError('');
    try { await api.updateQuarter(dept.id, q.fiscal_year, q.quarter_number, { outcome }); reload(); } catch (e: any) { setError(e.message); }
  };

  const statusChip = q.outcome ? <Chip tone={outcomeTone(q.outcome)}>{q.outcome_label}</Chip>
    : q.status === 'current' ? <Chip tone="blue">In progress</Chip>
    : q.status === 'upcoming' ? <Chip tone="muted">Not started</Chip>
    : <Chip tone="muted">No result yet</Chip>;

  return (
    <div className={cn('bg-background-secondary border rounded-2xl overflow-hidden', open ? 'border-border-active' : 'border-border-subtle')}>
      <button onClick={onToggle} aria-expanded={open} className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-surface-hover transition-colors">
        <ChevronRight size={16} className={cn('text-text-secondary transition-transform shrink-0', open && 'rotate-90 text-accent-blue')} />
        <span className="text-2xl font-extrabold text-accent-blue w-10 shrink-0">{q.short}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-bold">{q.range}{q.status === 'current' && <span className="text-text-secondary font-semibold"> · this quarter</span>}</span>
          <span className="block text-[12px] text-text-secondary truncate">{q.message ? q.message.split('\n')[0] : 'No target written'} · {q.objectives} {q.objectives === 1 ? 'objective' : 'objectives'}</span>
        </span>
        {q.progress !== null && <span className="hidden md:flex items-center gap-2 w-40"><ProgressBar value={q.progress} className="flex-1" /><span className="text-[12px] font-bold w-9 text-right">{Math.round(q.progress)}%</span></span>}
        {q.new_for_me && <Chip tone="blue">New</Chip>}
        {statusChip}
      </button>

      {open && (
        <div className="border-t border-border-subtle p-5 flex flex-col gap-4">
          {/* Department target */}
          <div className="rounded-xl bg-background-primary border border-border-subtle p-4 md:p-5">
            <div className="flex items-center gap-2 text-[12px] text-text-secondary mb-2">
              <Target size={13} className="text-accent-blue" /> Department target for {dept.name} · {q.short}
              {q.message_updated_at && <span>· updated {new Date(q.message_updated_at + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
              {canEditTarget && !editing && q.message && <Btn kind="ghost" className="ml-auto" onClick={() => { setDraft(q.message || ''); setEditing(true); }}><Pencil size={12} /> Edit</Btn>}
            </div>
            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={8} maxLength={20000}
                  placeholder={`What does ${dept.name} have to achieve in ${q.short}? Write it the way you would explain it in a meeting.`}
                  className={cn(inputCls, 'text-[14px] leading-relaxed')} />
                <div className="flex gap-2 items-center">
                  <Btn kind="primary" onClick={saveMessage} disabled={busy}>{busy ? 'Saving…' : dept.hod ? `Save and notify ${dept.hod.name.split(' ')[0]}` : 'Save target'}</Btn>
                  <Btn kind="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : q.message ? (
              <div className="flex flex-col gap-2 max-w-3xl">{paragraphs(q.message).map((p, i) => <p key={i} className="text-[14px] leading-relaxed whitespace-pre-line">{p}</p>)}</div>
            ) : (
              <div className="flex flex-col gap-2 items-start">
                <div className="text-[13px] text-text-secondary">
                  {canEditTarget ? `No target written for ${q.short} yet.` : 'No target written for this quarter yet.'}
                </div>
                {canEditTarget && <Btn kind="primary" onClick={() => { setDraft(''); setEditing(true); }}><Pencil size={12} /> Write the {q.short} target</Btn>}
              </div>
            )}
          </div>

          {/* Quarter result (Director only) */}
          {(q.status !== 'upcoming' || q.outcome) && (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="font-semibold text-text-secondary">Quarter result:</span>
              {is_director ? (
                <>
                  {(['achieved', 'met_partly', 'not_met'] as Outcome[]).map(o => (
                    <button key={o} onClick={() => setOutcome(q.outcome === o ? null : o)}
                      className={cn('px-2.5 py-1 rounded-full border text-[12px] font-semibold transition-colors',
                        q.outcome === o ? 'border-transparent ' + { achieved: 'bg-accent-green text-white', met_partly: 'bg-accent-orange text-white', not_met: 'bg-accent-red text-white' }[o] : 'border-border-subtle text-text-secondary hover:text-text-primary')}>
                      {OUTCOME_LABEL[o]}
                    </button>
                  ))}
                  <span className="text-text-secondary">Only you can mark this.</span>
                </>
              ) : q.outcome ? <Chip tone={outcomeTone(q.outcome)}>{q.outcome_label}</Chip> : <span className="text-text-secondary">The Director marks this at the end of the quarter.</span>}
            </div>
          )}

          {error && <ErrorNote text={error} />}

          {/* Objectives */}
          {(q.objectives > 0 || can_plan) && (
            <div>
              <Btn onClick={() => setShowObjectives(!showObjectives)} aria-expanded={showObjectives}>
                <ChevronRight size={14} className={cn('transition-transform', showObjectives && 'rotate-90')} />
                {showObjectives ? 'Hide' : 'View'} objectives ({q.objectives})
              </Btn>
            </div>
          )}
          {showObjectives && <ObjectiveList dept={dept} q={q} projects={projects} reload={reload} />}
        </div>
      )}
    </div>
  );
}

/* ============================================================ objectives */

function ObjectiveList({ dept, q, projects, reload }: { dept: DepartmentDetail; q: DepartmentQuarter; projects: Project[]; reload: () => void }) {
  const [adding, setAdding] = useState(false);
  const people = useMemo(() => [dept.hod, ...dept.members].filter(Boolean) as PersonBrief[], [dept]);
  const { can_plan } = dept.permissions;

  return (
    <div className="flex flex-col gap-2.5">
      {q.objectives_tree.map((o, i) => <ObjectiveCard key={o.id} o={o} n={i + 1} dept={dept} q={q} people={people} projects={projects} reload={reload} />)}
      {!q.objectives_tree.length && (
        <div className="text-[13px] text-text-secondary">
          No objectives yet.{can_plan && q.message ? ' Read the target above and add the first one.' : ''}
        </div>
      )}
      {can_plan && (adding
        ? <ObjectiveForm people={people} projects={projects} defaultOwner={dept.hod?.id} q={q} onCancel={() => setAdding(false)}
            onSubmit={async v => { await api.createObjective({ department_id: dept.id, fiscal_year: q.fiscal_year, quarter_number: q.quarter_number, ...v }); setAdding(false); reload(); }} />
        : <div><Btn onClick={() => setAdding(true)}><Plus size={13} /> Add objective</Btn></div>)}
    </div>
  );
}

function ObjectiveCard({ o, n, dept, q, people, projects, reload }: { o: ObjectiveNode; n: number; dept: DepartmentDetail; q: DepartmentQuarter; people: PersonBrief[]; projects: Project[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [showFollowups, setShowFollowups] = useState(false);
  const [objUpdateText, setObjUpdateText] = useState('');
  const [postingObjUpdate, setPostingObjUpdate] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const { userProfile, inspectMode } = useStore();
  const me = dept.me ?? userProfile?.id;
  const { can_plan } = dept.permissions;
  const canEditProj = can_plan || (o.owner && String(o.owner.id) === String(me));
  const openPanel = useContext(OpenObjective);
  const openTask = useContext(OpenTask);
  const focusId = useContext(FocusObjective);
  const prefix = deptPrefix(dept);
  const objCode = codeOf(o, prefix, String(n));
  const [prio, setPrio] = useOptimistic<Priority | null>(o.priority ?? null);
  const canPrio = canSetPriority(userProfile);
  const canMoveDate = can_plan || (!!o.owner && String(o.owner.id) === String(me));
  // a link to a sub-objective opens its parent too
  const holdsFocus = hasFocus(o, focusId);
  useEffect(() => { if (holdsFocus) setOpen(true); }, [holdsFocus]);

  const updates = o.updates || [];
  const updateCount = o.update_count ?? updates.length;

  const postObjUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objUpdateText.trim()) return;
    setPostingObjUpdate(true);
    try {
      await api.postUpdate(o.id, objUpdateText.trim());
      setObjUpdateText('');
      reload();
    } catch {} finally {
      setPostingObjUpdate(false);
    }
  };

  if (editing) {
    return <ObjectiveForm people={people} projects={projects} initial={o} code={objCode} q={q} onCancel={() => setEditing(false)}
      onSubmit={async v => { await api.updateObjective(o.id, v); setEditing(false); reload(); }} />;
  }

  return (
    <div id={`objective-${o.id}`} className="border border-border-subtle rounded-xl overflow-hidden scroll-mt-24">
      <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3', p1Accent(prio))}>
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Show tasks and sub-objectives" title={open ? 'Hide tasks & sub-objectives' : 'Show tasks & sub-objectives'} className="text-text-secondary hover:text-text-primary cursor-pointer">
          <ChevronRight size={15} className={cn('transition-transform', open && 'rotate-90')} />
        </button>
        <CodeChip code={objCode} />
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <button onClick={() => (inspectMode === 'dropdown' ? setOpen(!open) : openPanel(o.id))} title={o.title} className="text-[13.5px] font-bold text-left hover:text-accent-blue cursor-pointer min-w-0 max-w-full break-words">{o.title}</button>
            <PriorityPicker objectiveId={o.id} value={prio} canEdit={canPrio} onChanged={p => { setPrio(p); reload(); }} />
            {updateCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (inspectMode === 'drawer') openPanel(o.id);
                  else { setOpen(true); setShowFollowups(!showFollowups); }
                }}
                className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 cursor-pointer"
              >
                <MessageSquare size={10} /> {updateCount} {updateCount === 1 ? 'follow-up' : 'follow-ups'}
              </button>
            )}
            {editingProject ? (
              <select
                autoFocus
                aria-label="Select project for objective"
                value={o.own_project_id ?? o.project_id ?? ''}
                onBlur={() => setEditingProject(false)}
                onChange={async e => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  await api.updateObjective(o.id, { project_id: val });
                  setEditingProject(false);
                  reload();
                }}
                className="text-[11px] rounded-md border border-accent-blue bg-background-primary px-1.5 py-0.5 text-text-primary"
              >
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : o.project_name ? (
              <button
                type="button"
                onClick={() => canEditProj && setEditingProject(true)}
                title={canEditProj ? 'Click to change project' : o.project_name}
                className={cn(
                  'inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400',
                  canEditProj && 'hover:bg-purple-500/20 cursor-pointer'
                )}
              >
                <FolderKanban size={10} /> {o.project_name}
              </button>
            ) : canEditProj ? (
              <button
                type="button"
                onClick={() => setEditingProject(true)}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full border border-dashed border-border-subtle text-text-secondary hover:text-purple-600 hover:border-purple-400 cursor-pointer"
              >
                <FolderKanban size={10} /> + Project
              </button>
            ) : null}
          </div>
          <div className="text-[12px] text-text-secondary flex flex-wrap items-center gap-x-1.5">
            <span>{o.owner ? o.owner.name : 'Unassigned'}</span>
            <span>·</span>
            <DeadlineBadge entity="objective" id={o.id} deadline={o.deadline} originalDeadline={o.original_deadline} changes={o.deadline_changes}
              done={o.status === 'done'} canEdit={canMoveDate} title={`${objCode} ${o.title}`} onChanged={reload} className="-mx-1" />
            <span>· {o.children.length} {o.children.length === 1 ? 'sub-objective' : 'sub-objectives'}</span>
          </div>
        </div>
        <ItemProgress item={o} dept={dept} reload={reload} />
        {can_plan && <RowActions onEdit={() => setEditing(true)} onDelete={async () => { await api.deleteObjective(o.id); reload(); }} />}
      </div>
      {open && (
        <div className="border-t border-border-subtle">
          {/* Objective Follow-ups / Updates */}
          {(updates.length > 0 || showFollowups) && (
            <div className="px-4 py-2.5 pl-12 bg-background-primary/40 border-b border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                  <MessageSquare size={11} className="text-accent-blue" /> Objective Follow-ups ({updateCount})
                </span>
                <button type="button" onClick={() => openPanel(o.id)} className="text-[11px] font-semibold text-accent-blue hover:underline cursor-pointer">
                  Open in Drawer
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {updates.map(u => (
                  <div key={u.id} className="rounded-lg border border-border-subtle bg-background-secondary px-2.5 py-2 text-[12px] space-y-0.5">
                    <div className="text-[11px] text-text-secondary flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-text-primary">{formatISTDate(u.created_at)}</span>
                      <span className="font-mono">· {formatISTTime(u.created_at, { withTimezone: false })}</span>
                      <span className="font-bold text-accent-blue">· {u.user?.name || 'Teammate'}</span>
                    </div>
                    <div className="text-text-primary whitespace-pre-line">{u.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={postObjUpdate} className="flex items-center gap-1.5">
                <input
                  value={objUpdateText}
                  onChange={e => setObjUpdateText(e.target.value)}
                  placeholder={`Post follow-up on Objective ${objCode}...`}
                  className="flex-1 rounded-md border border-border-subtle bg-background-primary px-2.5 py-1 text-[11.5px] outline-none focus:border-accent-blue"
                />
                <button type="submit" disabled={postingObjUpdate || !objUpdateText.trim()} className="px-2.5 py-1 rounded-md bg-accent-blue text-white text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer">
                  <Send size={10} /> Post
                </button>
              </form>
            </div>
          )}
          {o.children.map((c, j) => <SubRow key={c.id} c={c} code={codeOf(c, prefix, `${o.code || n}.${j + 1}`)} dept={dept} q={q} people={people} projects={projects} reload={reload} />)}
          <div className="px-4 py-1.5 border-t border-border-subtle first:border-t-0 pl-12">
            {o.tasks.length > 0 && <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-text-secondary pt-1">Tasks directly on this objective</div>}
            <ObjectiveTasks
              objectiveId={o.id}
              tasks={o.tasks}
              people={people}
              onChanged={reload}
              parentCode={objCode}
              startIndex={o.children.length ? o.children.length + 1 : 1}
              projectId={o.project_id}
              onOpenTask={openTask}
              canPlan={can_plan}
            />
          </div>
          {can_plan && (adding
            ? <div className="p-3 border-t border-border-subtle bg-background-primary">
                <ObjectiveForm people={people} projects={projects} defaultProject={o.project_id ?? undefined} q={q} sub parentId={o.id} onCancel={() => setAdding(false)}
                  onSubmit={async v => { await api.createObjective({ department_id: dept.id, fiscal_year: q.fiscal_year, quarter_number: q.quarter_number, parent_id: o.id, ...v }); setAdding(false); reload(); }} />
              </div>
            : <div className="px-4 py-2 border-t border-border-subtle first:border-t-0"><Btn kind="ghost" onClick={() => setAdding(true)}><Plus size={13} /> Add sub-objective</Btn></div>)}
          {!o.children.length && !can_plan && <div className="px-4 py-2.5 text-[12px] text-text-secondary">No sub-objectives yet.</div>}
        </div>
      )}
    </div>
  );
}

function SubRow({ c, code, dept, q, people, projects, reload }: { c: ObjectiveNode; code: string; dept: DepartmentDetail; q: DepartmentQuarter; people: PersonBrief[]; projects: Project[]; reload: () => void }) {
  const [openTasks, setOpenTasks] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const { userProfile, inspectMode } = useStore();
  const me = dept.me ?? userProfile?.id;
  const canEditProj = dept.permissions.can_plan || (c.owner && String(c.owner.id) === String(me));
  const openPanel = useContext(OpenObjective);
  const openTask = useContext(OpenTask);
  const [prio, setPrio] = useOptimistic<Priority | null>(c.priority ?? null);
  const canPrio = canSetPriority(userProfile);
  const canMoveDate = dept.permissions.can_plan || (!!c.owner && String(c.owner.id) === String(me));
  const updates = c.updates || [];
  const updateCount = c.update_count ?? updates.length;
  if (editing) {
    return <div className="p-3 border-t border-border-subtle first:border-t-0 bg-background-primary">
      <ObjectiveForm people={people} projects={projects} initial={c} code={code} q={q} sub onCancel={() => setEditing(false)} onSubmit={async v => { await api.updateObjective(c.id, v); setEditing(false); reload(); }} />
    </div>;
  }
  return (
    <div id={`objective-${c.id}`} className="border-t border-border-subtle first:border-t-0 scroll-mt-24">
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 pl-10 text-[13px]', p1Accent(prio))}>
      <button type="button" onClick={() => setOpenTasks(!openTasks)} aria-expanded={openTasks} title={openTasks ? 'Hide tasks' : 'Show tasks & follow-ups'} className="text-text-secondary hover:text-text-primary cursor-pointer">
        <ChevronRight size={13} className={cn('transition-transform', openTasks && 'rotate-90')} />
      </button>
      <CodeChip code={code} />
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button onClick={() => (inspectMode === 'dropdown' ? setOpenTasks(!openTasks) : openPanel(c.id))} title={c.title} className="font-medium text-left hover:text-accent-blue cursor-pointer min-w-0 max-w-full break-words">{c.title}</button>
          <PriorityPicker objectiveId={c.id} value={prio} canEdit={canPrio} onChanged={p => { setPrio(p); reload(); }} />
          {updateCount > 0 && (
            <button
              type="button"
              onClick={() => (inspectMode === 'drawer' ? openPanel(c.id) : setOpenTasks(!openTasks))}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue cursor-pointer"
            >
              <MessageSquare size={9} /> {updateCount}
            </button>
          )}
          {editingProject ? (
            <select
              autoFocus
              aria-label="Select project for sub-objective"
              value={c.own_project_id ?? c.project_id ?? ''}
              onBlur={() => setEditingProject(false)}
              onChange={async e => {
                const val = e.target.value ? Number(e.target.value) : null;
                await api.updateObjective(c.id, { project_id: val });
                setEditingProject(false);
                reload();
              }}
              className="text-[10.5px] rounded-md border border-accent-blue bg-background-primary px-1.5 py-0.5 text-text-primary"
            >
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : c.project_name ? (
            <button
              type="button"
              onClick={() => canEditProj && setEditingProject(true)}
              title={canEditProj ? 'Click to change project' : c.project_name}
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400',
                canEditProj && 'hover:bg-purple-500/20 cursor-pointer'
              )}
            >
              <FolderKanban size={9} /> {c.project_name}
            </button>
          ) : canEditProj ? (
            <button
              type="button"
              onClick={() => setEditingProject(true)}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-dashed border-border-subtle text-text-secondary hover:text-purple-600 hover:border-purple-400 cursor-pointer"
            >
              <FolderKanban size={9} /> + Project
            </button>
          ) : null}
        </div>
        <div className="text-[11.5px] text-text-secondary flex flex-wrap items-center gap-x-2">
          <span className="inline-flex items-center gap-1 min-w-0"><Avatar p={c.owner} size={16} /> <span className="truncate max-w-[160px]">{c.owner ? c.owner.name : 'Unassigned'}</span></span>
          <DeadlineBadge entity="objective" id={c.id} deadline={c.deadline} originalDeadline={c.original_deadline} changes={c.deadline_changes}
            done={c.status === 'done'} canEdit={canMoveDate} title={`${code} ${c.title}`} onChanged={reload} className="-mx-1" />
        </div>
      </div>
      <ItemProgress item={c} dept={dept} reload={reload} />
      {dept.permissions.can_plan && <RowActions onEdit={() => setEditing(true)} onDelete={async () => { await api.deleteObjective(c.id); reload(); }} />}
    </div>
    {openTasks && (
      <div className="pl-[84px] pr-4 pb-2.5 space-y-2">
        {updates.length > 0 && (
          <div className="rounded-lg border border-border-subtle bg-background-primary/50 p-2 space-y-1 max-h-36 overflow-y-auto">
            {updates.map(u => (
              <div key={u.id} className="text-[11.5px] border-b border-border-subtle/50 last:border-b-0 pb-1 last:pb-0">
                <span className="font-semibold text-text-primary">{formatISTDate(u.created_at)}</span>
                <span className="text-text-secondary font-mono"> · {formatISTTime(u.created_at, { withTimezone: false })}</span>
                <span className="font-bold text-accent-blue"> · {u.user?.name || 'Teammate'}</span>
                <span className="text-text-primary"> — {u.text}</span>
              </div>
            ))}
          </div>
        )}
        <ObjectiveTasks objectiveId={c.id} tasks={c.tasks} people={people} onChanged={reload} parentCode={code} startIndex={1} projectId={c.project_id} onOpenTask={openTask} canPlan={dept.permissions.can_plan} />
      </div>
    )}
    </div>
  );
}

/** Progress for one item. Leaf items can be updated as a percentage by planners or assigned members. */
function ItemProgress({ item, dept, reload }: { item: ObjectiveNode; dept: DepartmentDetail; reload: () => void }) {
  const { userProfile } = useStore();
  const me = dept.me ?? userProfile?.id;
  const mine = item.owner && String(item.owner.id) === String(me);
  const assignedTask = item.tasks.some(t => t.assignee && String(t.assignee.id) === String(me));
  const fromTasks = item.progress_from === 'tasks';
  const editable = !item.children.length && (item.can_update_progress ?? (dept.permissions.can_plan || mine || assignedTask));
  const [error, setError] = useState('');
  const [customPct, setCustomPct] = useState(String(Math.round(item.progress)));
  useEffect(() => { setCustomPct(String(Math.round(item.progress))); }, [item.progress]);

  const applyProgress = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setError('');
    try {
      await api.updateObjective(item.id, { progress: clamped });
      reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canStatus = dept.permissions.can_plan || editable;
  // changes at once; the server's refusal (if any) shows in the tooltip and under the control
  const status = (
    <StatusSelect value={item.status} options={OBJECTIVE_STATUS_OPTIONS} canEdit={canStatus} label="Status"
      onSave={async v => { await api.updateObjective(item.id, { status: v as ObjectiveNode['status'] }); reload(); }} onError={setError} />
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 max-w-full">
      {/* Bar + one percent field: reads like "40%", click it to type a new value. */}
      <span className="hidden sm:flex items-center gap-2 w-28"><ProgressBar value={item.progress} className="flex-1" />
        {!editable && <span className="text-[11.5px] font-bold w-8 text-right">{Math.round(item.progress)}%</span>}
      </span>
      {editable && (
        <label className="inline-flex items-center rounded-md border border-transparent hover:border-border-subtle focus-within:border-accent-blue px-1 py-0.5 cursor-text" title={error || 'Click to change progress'}>
          <input
            type="number"
            min={0}
            max={100}
            value={customPct}
            onChange={e => setCustomPct(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={() => {
              const n = Number(customPct);
              if (!Number.isNaN(n) && n !== Math.round(item.progress)) applyProgress(n);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
              else if (e.key === 'Escape') { setCustomPct(String(Math.round(item.progress))); (e.target as HTMLInputElement).blur(); }
            }}
            aria-label="Progress %"
            className="w-8 text-[11.5px] font-bold text-right bg-transparent outline-none text-text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-[11.5px] font-bold text-text-primary">%</span>
        </label>
      )}
      {fromTasks && <Chip tone={item.status === 'done' ? 'green' : 'muted'}>{item.tasks.filter(t => t.done).length}/{item.tasks.length} tasks</Chip>}
      {!editable && item.overdue && item.status !== 'done' && <Chip tone="red">Overdue</Chip>}
      {status}
      {error && <span role="alert" className="basis-full text-right text-[11.5px] text-accent-red font-medium">{error}</span>}
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <span className="flex items-center gap-1 text-[11.5px] shrink-0">Delete?
      <Btn kind="danger" className="px-2 py-1" onClick={() => onDelete().catch(() => setConfirm(false))}>Yes</Btn>
      <Btn kind="ghost" className="px-2 py-1" onClick={() => setConfirm(false)}>No</Btn>
    </span>
  );
  return (
    <span className="flex items-center shrink-0">
      <Btn kind="ghost" className="px-1.5" onClick={onEdit} aria-label="Edit"><Pencil size={12} /></Btn>
      <Btn kind="ghost" className="px-1.5" onClick={() => setConfirm(true)} aria-label="Delete"><Trash2 size={12} /></Btn>
    </span>
  );
}

function ObjectiveForm({ people, projects, initial, defaultOwner, defaultProject, q, sub, code, parentId, onSubmit, onCancel }: {
  people: PersonBrief[]; projects: Project[]; initial?: ObjectiveNode; defaultOwner?: number; defaultProject?: number; q: DepartmentQuarter; sub?: boolean;
  /** the existing code, when editing */ code?: string; /** the parent, when adding a sub-objective: its next free code comes from the API */ parentId?: number;
  onSubmit: (v: { title: string; owner_id: number | null; project_id: number | null; deadline: string | null }) => Promise<void>; onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [owner, setOwner] = useState<number | ''>(initial?.owner?.id ?? defaultOwner ?? '');
  const [projectId, setProjectId] = useState<number | ''>(initial?.own_project_id ?? initial?.project_id ?? defaultProject ?? '');
  const [deadline, setDeadline] = useState(initial?.deadline || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nextCode, setNextCode] = useState<string | null>(null);
  useEffect(() => {
    if (initial || !parentId) return;
    let alive = true;
    fetchNextCode(parentId).then(c => alive && setNextCode(c));
    return () => { alive = false; };
  }, [initial, parentId]);
  const shownCode = code || nextCode;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(sub ? 'Name the sub-objective.' : 'Name the objective.');
    setBusy(true); setError('');
    try { await onSubmit({ title: title.trim(), owner_id: owner || null, project_id: projectId || null, deadline: deadline || null }); }
    catch (err: any) { setError(err.message); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-background-secondary p-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_165px_165px_145px] gap-2">
        <div className="flex items-center gap-2">
          {shownCode && <CodeChip code={shownCode} title={initial ? 'Its code. It never changes.' : 'The code this will get'} />}
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={300} aria-label="Title"
            placeholder={sub ? 'Sub-objective, e.g. Proposals to 15 merchants' : 'Objective, e.g. Sign 12 new merchants'} className={inputCls} />
        </div>
        <select value={owner} onChange={e => setOwner(e.target.value ? Number(e.target.value) : '')} aria-label="Person in charge" className={inputCls}>
          <option value="">Unassigned</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={projectId} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')} aria-label="Project" className={inputCls}>
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Deadline" className={inputCls} />
      </div>
      {!deadline && <div className="text-[11.5px] text-text-secondary">{q.short} runs {fmtDate(q.start)} – {fmtDate(q.end)}.</div>}
      {error && <ErrorNote text={error} />}
      <div className="flex gap-2">
        <Btn type="submit" kind="primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save' : sub ? 'Add sub-objective' : 'Add objective'}</Btn>
        <Btn type="button" kind="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </form>
  );
}

/* ============================================================ quarter targets (Director) */

/** One screen to write the company line and every department's target for a quarter, then save once. */
function QuarterTargetsView() {
  const { userProfile } = useStore();
  const director = isDirectorRole(userProfile?.role);
  const [sel, setSel] = useState<{ fy: number; q: number } | null>(null);
  const [data, setData] = useState<QuarterOverview | null>(null);
  const [headline, setHeadline] = useState('');
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.overview(sel?.fy, sel?.q).then(d => {
      setData(d);
      if (!sel) setSel({ fy: d.quarter.fiscal_year, q: d.quarter.quarter_number });
      setHeadline(d.headline || '');
      setMessages(Object.fromEntries(d.departments.map(x => [x.id, x.message || ''])));
      setNote(null);
    }).catch(e => setNote({ ok: false, text: e.message }));
  }, [sel]);

  if (!data || !sel) return <div className="text-[13px] text-text-secondary animate-pulse">Loading…</div>;

  const isHod = data.departments.some(d => String(d.hod?.id) === String(userProfile?.id));
  if (!director && !isHod) return <><BackLink /><ErrorNote text="Only the Director and HODs manage quarter targets." /></>;

  // This financial year's four quarters, plus Q1 of the next one.
  const options = [1, 2, 3, 4].map(q => ({ fy: data.quarter.fiscal_year, q })).concat([{ fy: data.quarter.fiscal_year + 1, q: 1 }]);
  const label = (o: { fy: number; q: number }) => `Q${o.q} FY ${o.fy}-${String(o.fy + 1).slice(-2)}`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setNote(null);
    try {
      if (director && (data.headline || '') !== headline.trim()) await api.setHeadline(sel.fy, sel.q, headline);
      const changed = data.departments.filter(d => (d.message || '') !== (messages[d.id] || '').trim());
      for (const d of changed) await api.updateQuarter(d.id, sel.fy, sel.q, { message: messages[d.id] || '' });
      const notified = changed.filter(d => d.hod && (messages[d.id] || '').trim()).length;
      setNote({ ok: true, text: changed.length ? `Saved. ${notified ? `${notified} ${notified === 1 ? 'HOD has' : 'HODs have'} been notified.` : ''}` : 'Saved.' });
      setData({ ...data, headline: director ? (headline.trim() || null) : data.headline, departments: data.departments.map(d => ({ ...d, message: (messages[d.id] || '').trim() || null })) });
    } catch (err: any) { setNote({ ok: false, text: err.message }); } finally { setBusy(false); }
  };

  return (
    <>
      <BackLink />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[26px] font-extrabold">Quarter targets</div>
          <div className="text-[13.5px] text-text-secondary mt-1 max-w-2xl">Quarter targets and objectives for each department. Set the target message and review objectives.</div>
        </div>
        <div className="flex flex-wrap rounded-lg border border-border-subtle overflow-hidden bg-background-secondary">
          {options.map(o => (
            <button key={label(o)} onClick={() => setSel(o)}
              className={cn('px-3 py-1.5 text-[12.5px] font-semibold', o.fy === sel.fy && o.q === sel.q ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary')}>
              {label(o)}
            </button>
          ))}
        </div>
      </div>
      <QuarterPills quarter={data.quarter} />

      <form onSubmit={save} className="flex flex-col gap-4">
        {director ? (
          <Panel className="p-5 flex flex-col gap-2">
            <label htmlFor="qt-headline" className="text-[12.5px] font-semibold text-text-secondary">{data.quarter.label} · {data.quarter.range} · the one-line target for the company</label>
            <input id="qt-headline" value={headline} onChange={e => setHeadline(e.target.value)} maxLength={500}
              placeholder="e.g. Make Nurofin the default payout partner for mid-market merchants"
              className={cn(inputCls, 'text-[20px] font-extrabold py-3')} />
          </Panel>
        ) : data.headline ? (
          <Panel className="p-5 flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{data.quarter.label} · {data.quarter.range} · Company Target</span>
            <span className="text-[17px] font-extrabold text-text-primary">{data.headline}</span>
          </Panel>
        ) : null}

        {data.departments.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.departments.map(d => (
              <Panel key={d.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <Avatar p={d.hod} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-extrabold truncate">{d.name}</div>
                    <div className="text-[12.5px] text-text-secondary">{d.hod ? `Goes to ${d.hod.name}` : 'No HOD yet'}</div>
                  </div>
                  {d.objectives > 0 && <Chip tone="muted">{d.objectives} {d.objectives === 1 ? 'objective' : 'objectives'} set</Chip>}
                </div>
                <textarea aria-label={`Target for ${d.name}`} rows={4} maxLength={20000} value={messages[d.id] || ''}
                  onChange={e => setMessages({ ...messages, [d.id]: e.target.value })}
                  placeholder={`What does ${d.name} have to achieve in ${data.quarter.short}? Write it the way you would explain it in a meeting.`}
                  className={cn(inputCls, 'text-[14px] leading-relaxed')} />

                {/* Objectives under this target */}
                {d.objectives_tree && d.objectives_tree.length > 0 ? (
                  <div className="mt-1 pt-3 border-t border-border-subtle flex flex-col gap-2">
                    <div className="text-[12px] font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                      <span>Objectives ({d.objectives_tree.length})</span>
                      <Link href={`/departments?id=${d.id}`} className="text-accent-blue hover:underline text-[11.5px] font-semibold">View department →</Link>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                      {d.objectives_tree.map((obj, idx) => (
                        <div key={obj.id} className="text-[12.5px] bg-background-primary/60 border border-border-subtle rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <CodeChip code={codeOf(obj, deptPrefix(d), String(idx + 1))} size="xs" />
                            <span className="font-semibold truncate" title={obj.title}>{obj.title}</span>
                            {obj.children?.length > 0 && <span className="text-[11px] text-text-secondary shrink-0">({obj.children.length} sub)</span>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[11.5px] text-text-secondary">
                            {obj.owner && <span className="truncate max-w-[100px]">{obj.owner.name}</span>}
                            <span className="font-bold text-text-primary">{Math.round(obj.progress || 0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 pt-2 border-t border-border-subtle/50 text-[12px] text-text-secondary flex items-center justify-between">
                    <span>No objectives set for {data.quarter.short} yet.</span>
                    <Link href={`/departments?id=${d.id}`} className="text-accent-blue hover:underline text-[11.5px] font-semibold">Add objectives in department →</Link>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        ) : (
          <Panel className="p-6 text-[13.5px] text-text-secondary">No departments yet. <Link href="/departments" className="text-accent-blue font-semibold">Create one first</Link>.</Panel>
        )}

        <div className="flex items-center justify-end gap-3">
          {note && <span className={cn('text-[13px] font-semibold', note.ok ? 'text-accent-green' : 'text-accent-red')}>{note.text}</span>}
          <Btn type="submit" kind="primary" disabled={busy}>{busy ? 'Saving…' : director ? 'Save and notify HODs' : 'Save targets'}</Btn>
        </div>
      </form>
    </>
  );
}

/* ============================================================ undo after delete */

const UNDO_SECONDS = 15;

function UndoBar({ item, onDone, onUndone, onError }: { item: { id: number; name: string }; onDone: () => void; onUndone: () => void; onError: (m: string) => void }) {
  const [left, setLeft] = useState(UNDO_SECONDS);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);
  const undo = async () => {
    setBusy(true);
    try { await api.restoreDepartment(item.id); onUndone(); onDone(); } catch (e: any) { onError(e.message); setBusy(false); }
  };
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl bg-text-primary text-background-secondary px-4 py-3 shadow-lg">
      <Trash2 size={15} className="shrink-0" />
      <span className="flex-1 text-[13.5px]"><b>{item.name}</b> deleted.</span>
      <span className="text-[12px] opacity-70 tabular-nums">{left}s</span>
      <button onClick={undo} disabled={busy} className="px-3 py-1 rounded-lg bg-background-secondary text-text-primary text-[12.5px] font-bold disabled:opacity-60">{busy ? 'Restoring…' : 'Undo'}</button>
    </div>
  );
}

/* ============================================================ setup check (Director) */

/** Runs the backend self-check: every table matches the code and a test write succeeds (and is rolled back). */
function SetupCheck() {
  const [state, setState] = useState<{ busy: boolean; text?: string; ok?: boolean }>({ busy: false });
  const run = async () => {
    setState({ busy: true });
    try {
      const r = await api.selfCheck();
      if (r.ok) return setState({ busy: false, ok: true, text: 'Everything can be saved.' });
      const bad = Object.entries(r.tables || {}).filter(([, t]: any) => !t.ok).map(([n, t]: any) => `${n}: ${t.problem || [...(t.missing_columns || []), ...(t.unknown_required_columns || [])].join(', ')}`);
      const w = r.write_test && !r.write_test.ok ? `Saving a ${r.write_test.failed_at} failed: ${r.write_test.error}` : '';
      setState({ busy: false, ok: false, text: [...bad, w].filter(Boolean).join(' · ') });
    } catch (e: any) { setState({ busy: false, ok: false, text: e.message }); }
  };
  return (
    <span className="flex items-center gap-2">
      <Btn kind="ghost" onClick={run} disabled={state.busy}>{state.busy ? 'Checking…' : 'Check setup'}</Btn>
      {state.text && <span className={cn('text-[12px] font-semibold max-w-[420px]', state.ok ? 'text-accent-green' : 'text-accent-red')}>{state.text}</span>}
    </span>
  );
}
