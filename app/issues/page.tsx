'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import * as z from 'zod';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { Issue } from '@/types';
import { issuesService } from '@/services/issues';
import { usersService } from '@/services/users';
import { projectsService } from '@/services/projects';
import { UserProfile } from '@/types';
import {
  ShieldAlert,
  Plus,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Send,
  Calendar,
  FolderKanban,
  Flag,
  RefreshCw,
  Paperclip,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const issueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long'),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const),
  category: z.string().optional(),
  assigned_user_id: z.string().optional(),
  project_id: z.string().optional(),
  deadline: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type IssueFormValues = z.infer<typeof issueSchema>;

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'] as const;
const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;
const CATEGORY_OPTIONS = ['Bug', 'Feature Request', 'Security', 'Infrastructure', 'Database', 'UI/UX', 'Performance', 'Other'];

export default function IssueCenterPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IssueCenterPage />
    </Suspense>
  );
}

function IssueCenterPage() {
  const { issues, setIssues } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editIssueId, setEditIssueId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'assigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchParams = useSearchParams();
  const urlProject = searchParams?.get('project');
  const urlCategory = searchParams?.get('category');

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [followupText, setFollowupText] = useState('');
  const [followupSending, setFollowupSending] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { userProfile } = useStore();
  const currentUserId = userProfile.id ? String(userProfile.id) : '';
  const isCEO = ['ceo', 'super_admin', 'admin'].includes(String(userProfile.role || '').toLowerCase());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      severity: 'medium',
      category: urlCategory || 'Bug',
    },
  });

  const loadData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const [issuesData, usersData, projectsData] = await Promise.all([
        issuesService.getIssues(),
        usersService.getUsers(),
        projectsService.getProjects(),
      ]);
      setIssues(issuesData.issues);
      setUsers(usersData);
      setProjects(projectsData);
      
      // Auto-set project if passed in URL
      if (urlProject && projectsData) {
        const p = projectsData.find((proj: any) => proj.name.toLowerCase() === urlProject.toLowerCase() || proj.id.toString() === urlProject);
        if (p) {
          setValue('project_id', String(p.id));
        }
      }
      
    } catch (err: any) {
      if (!background) setError(err.message || 'Failed to load issues');
    } finally {
      if (!background) setLoading(false);
    }
  }, [setIssues, urlProject, setValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [pendingAssignment, setPendingAssignment] = useState<Issue | null>(null);

  useEffect(() => {
    // Check if any issue is pending acceptance for the current user
    if (issues.length > 0 && currentUserId) {
      const pending = issues.find(i => (i as any).assignmentStatus === 'pending_acceptance' && String((i as any).assignedUserId) === currentUserId);
      if (pending && !pendingAssignment && !detailOpen) {
        setPendingAssignment(pending);
      } else if (!pending) {
        setPendingAssignment(null);
      }
    }
  }, [issues, currentUserId, detailOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!createOpen && !detailOpen) loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData, createOpen, detailOpen]);

  const onSubmit = async (data: IssueFormValues) => {
    setSubmitting(true);
    try {
      if (editIssueId) {
        await issuesService.updateIssue(editIssueId, {
          title: data.title,
          description: data.description,
          priority: data.severity,
          category: data.category || 'Bug',
          deadline: data.deadline || undefined,
          assigned_user_id: data.assigned_user_id ? parseInt(data.assigned_user_id) : undefined,
          project_id: data.project_id ? parseInt(data.project_id) : undefined,
          attachments: data.attachments || undefined,
        } as any);
      } else {
        await issuesService.createIssue({
          title: data.title,
          description: data.description,
          priority: data.severity,
          category: data.category || 'Bug',
          deadline: data.deadline || undefined,
          assigned_user_id: data.assigned_user_id ? parseInt(data.assigned_user_id) : undefined,
          project_id: data.project_id ? parseInt(data.project_id) : undefined,
          attachments: data.attachments || undefined,
        });
      }
      reset({
        title: '',
        description: '',
        severity: 'medium',
        category: urlCategory || 'Bug',
        assigned_user_id: '',
        project_id: '',
        deadline: '',
        attachments: [],
      });
      setCreateOpen(false);
      setEditIssueId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save issue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (issue: Issue, newStatus: string) => {
    try {
      await issuesService.updateStatus(parseInt(issue.id), newStatus);
      await loadData();
      if (selectedIssue && selectedIssue.id === issue.id) {
        const fresh = await issuesService.getIssue(parseInt(issue.id));
        setSelectedIssue(fresh);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDeleteIssue = async (issueId: number) => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      await issuesService.deleteIssue(issueId);
      if (selectedIssue && selectedIssue.id === String(issueId)) {
        setDetailOpen(false);
        setSelectedIssue(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete issue');
    }
  };

  const handleAssignmentAction = async (issue: Issue, action: 'accept' | 'decline' | 'transfer') => {
    try {
      if (action === 'transfer') {
        setTransferOpen(true);
        return;
      } else if (action === 'accept') {
        await issuesService.acceptIssue(parseInt(issue.id));
      } else if (action === 'decline') {
        await issuesService.declineIssue(parseInt(issue.id));
      }
      
      await loadData();
      setDetailOpen(false);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const submitTransfer = async () => {
    if (!selectedIssue || !transferUserId) return;
    setSubmitting(true);
    try {
      await issuesService.transferIssue(parseInt(selectedIssue.id), parseInt(transferUserId), transferReason);
      setTransferOpen(false);
      setTransferUserId('');
      setTransferReason('');
      setDetailOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (issue: Issue) => {
    setSelectedIssue(issue);
    setDetailOpen(true);
    setDetailLoading(true);
    setFollowupText('');
    try {
      const fresh = await issuesService.getIssue(parseInt(issue.id));
      setSelectedIssue(fresh);
    } catch {
    } finally {
      setDetailLoading(false);
    }
  };

  const addFollowup = async () => {
    if (!selectedIssue || !followupText.trim()) return;
    setFollowupSending(true);
    try {
      await issuesService.addFollowup(parseInt(selectedIssue.id), followupText.trim());
      setFollowupText('');
      const fresh = await issuesService.getIssue(parseInt(selectedIssue.id));
      setSelectedIssue(fresh);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add follow-up');
    } finally {
      setFollowupSending(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical': return 'text-accent-red bg-accent-red/10 border-accent-red/30 font-extrabold animate-pulse';
      case 'high': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20 font-bold';
      case 'medium': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
      default: return 'text-text-secondary bg-surface-card border-border-subtle';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed': return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-accent-blue" />;
      default: return <AlertCircle className="w-4 h-4 text-accent-red" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed': return 'text-accent-green';
      case 'in_progress': return 'text-accent-blue';
      default: return 'text-accent-red';
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchesSearch = !searchQuery ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.assigneeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.reporterName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesView =
      viewFilter === 'all' ? true :
      viewFilter === 'mine' ? (issue.reporterId && issue.reporterId === currentUserId) :
      (issue.assigneeId && issue.assigneeId === currentUserId);
    return matchesStatus && matchesSeverity && matchesSearch && matchesView;
  });

  const counts = {
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm font-medium">Loading issue center...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-md mx-auto text-center">
        <AlertCircle className="w-10 h-10 text-accent-red" />
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-1">Failed to Load Issues</h3>
          <p className="text-xs text-text-muted leading-relaxed">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-md shadow transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-text-primary">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background-secondary p-4 rounded-lg border border-border-subtle shadow-md">
        <div>
          <h2 className="text-base font-bold font-sans">Nurofin Issue & Bug Center</h2>
          <p className="text-2xs text-text-secondary mt-0.5">Report issues, track assignments, and follow up on every ticket.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => {
              setEditIssueId(null);
              reset({
                title: '',
                description: '',
                severity: 'medium',
                category: 'Bug',
                assigned_user_id: '',
                project_id: '',
                deadline: '',
                attachments: [],
              });
              setCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-md shadow transition-colors"
          >
            <Plus className="w-4 h-4" /> Report Issue
          </button>
        </div>
      </div>

      {/* Filter and stats Toolbar */}
      <div className="bg-background-secondary p-4 rounded-lg border border-border-subtle flex flex-wrap gap-4 items-center justify-between shadow-sm text-xs">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-semibold">View:</span>
            <select
              value={viewFilter}
              onChange={e => setViewFilter(e.target.value as any)}
              className="bg-background-primary border border-border-subtle rounded px-2.5 py-1 text-xs text-text-primary outline-none"
            >
              <option value="all">All Issues</option>
              <option value="mine">Reported by Me</option>
              <option value="assigned">Assigned to Me</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-background-primary border border-border-subtle rounded px-2.5 py-1 text-xs text-text-primary outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-semibold">Severity:</span>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-background-primary border border-border-subtle rounded px-2.5 py-1 text-xs text-text-primary outline-none"
            >
              <option value="all">All Severities</option>
              {SEVERITY_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-background-primary border border-border-subtle rounded px-2.5 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>

        <div className="flex gap-4 text-2xs text-text-secondary font-bold">
          <span className="text-accent-red">Open: {counts.open}</span>
          <span className="text-accent-blue">In Progress: {counts.in_progress}</span>
          <span className="text-accent-green">Resolved: {counts.resolved}</span>
        </div>
      </div>

      {/* Issue Table list */}
      <div className="bg-background-secondary border border-border-subtle rounded-lg overflow-hidden shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status Tracker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIssues.map((issue) => (
              <TableRow
                key={issue.id}
                className="cursor-pointer hover:bg-background-primary/50 transition-colors"
                onClick={() => openDetail(issue)}
              >
                <TableCell className="font-semibold text-xs py-4">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5">
                      {issue.title}
                      {issue.followupCount ? (
                        <span className="flex items-center gap-0.5 text-accent-blue text-[10px] font-bold">
                          <MessageSquare className="w-3 h-3" /> {issue.followupCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[10px] text-text-secondary block font-normal leading-relaxed line-clamp-1">
                      {issue.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-2xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <FolderKanban className="w-3 h-3 text-text-muted" />
                    {issue.projectName || '—'}
                  </span>
                </TableCell>
                <TableCell className="text-2xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-text-muted" />
                    {issue.reporterName || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell className="text-2xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-text-muted" />
                    {issue.assigneeName || 'Unassigned'}
                  </span>
                </TableCell>
                <TableCell className="text-2xs text-text-secondary">
                  <span className={cn("flex items-center gap-1", issue.deadline && "font-bold")}>
                    <Calendar className="w-3 h-3 text-text-muted" />
                    {issue.deadline || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn("px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider", getSeverityBadge(issue.severity))}>
                    {issue.severity}
                  </span>
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(issue.status)}
                    <select
                      value={issue.status}
                      onChange={(e) => handleStatusChange(issue, e.target.value)}
                      className={cn(
                        "bg-background-primary border border-border-subtle text-xs rounded p-1 font-bold outline-none cursor-pointer",
                        getStatusColor(issue.status)
                      )}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredIssues.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-text-muted italic">
                  No issues match the selected filters. Click {'"Report Issue"'} to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Report New Issue Dialog Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editIssueId ? 'Edit Issue' : 'Report Issue'}</DialogTitle>
            <DialogDescription>
              {editIssueId ? 'Update issue details.' : 'Report a bug, feature request, or blocker. The assignee will be notified immediately.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Issue Title</label>
              <Input
                type="text"
                placeholder="e.g. Ledger export fails with 500 error"
                {...register('title')}
                className={errors.title ? 'border-accent-red' : ''}
              />
              {errors.title && <span className="text-[10px] text-accent-red">{errors.title.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Description & Reproduction Steps</label>
              <Textarea
                placeholder="Detail what happened, impact, and steps to reproduce..."
                rows={3}
                {...register('description')}
                className={errors.description ? 'border-accent-red' : ''}
              />
              {errors.description && <span className="text-[10px] text-accent-red">{errors.description.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Project</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  {...register('project_id')}
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Category</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  {...register('category')}
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Severity Level</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  {...register('severity')}
                >
                  {SEVERITY_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Assign To (Optional)</label>
                <select
                  className={cn(
                    "w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none",
                    errors.assigned_user_id ? 'border-accent-red' : ''
                  )}
                  {...register('assigned_user_id')}
                >
                  <option value="">Auto-Assign to Available Teammate</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} {u.department ? `(${u.department})` : ''}</option>
                  ))}
                </select>
                {errors.assigned_user_id && <span className="text-[10px] text-accent-red">{errors.assigned_user_id.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Deadline</label>
                <Input
                  type="date"
                  {...register('deadline')}
                  className="bg-background-secondary border border-border-subtle"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Screenshot (Optional)</label>
                <Input
                  type="file"
                  accept="image/*"
                  className="bg-background-secondary border border-border-subtle pt-1.5"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setValue('attachments', [reader.result as string]);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setValue('attachments', []);
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-2xs font-semibold rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-2xs font-semibold rounded shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                {editIssueId ? 'Save Changes' : 'Submit Issue'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issue Detail + Follow-ups Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base">{selectedIssue.title}</DialogTitle>
                    <span className={cn("px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider", getSeverityBadge(selectedIssue.severity))}>
                      {selectedIssue.severity}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider", getStatusColor(selectedIssue.status))}>
                      {selectedIssue.status.replace('_', ' ')}
                    </span>
                  </div>
                  {(String(selectedIssue.reporterId) === currentUserId || String(selectedIssue.assigneeId) === currentUserId) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditIssueId(parseInt(selectedIssue.id));
                          reset({
                            title: selectedIssue.title,
                            description: selectedIssue.description,
                            severity: selectedIssue.severity,
                            category: selectedIssue.category || 'Bug',
                            assigned_user_id: String(selectedIssue.assigneeId || ''),
                            project_id: String(selectedIssue.projectId || ''),
                            deadline: selectedIssue.deadline || '',
                            attachments: selectedIssue.attachments || [],
                          });
                          setDetailOpen(false);
                          setCreateOpen(true);
                        }}
                        className="p-1.5 text-text-secondary hover:text-accent-blue bg-background-primary border border-border-subtle hover:border-accent-blue rounded-md transition-colors"
                        title="Edit Issue"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteIssue(parseInt(selectedIssue.id))}
                        className="p-1.5 text-text-secondary hover:text-accent-red bg-background-primary border border-border-subtle hover:border-accent-red rounded-md transition-colors"
                        title="Delete Issue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <DialogDescription>
                  {selectedIssue.description}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-2xs bg-background-primary rounded-lg border border-border-subtle p-3">
                <div>
                  <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Project</span>
                  <span className="flex items-center gap-1 mt-0.5 font-bold"><FolderKanban className="w-3 h-3" /> {selectedIssue.projectName || '—'}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Reported By</span>
                  <span className="flex items-center gap-1 mt-0.5 font-bold"><User className="w-3 h-3" /> {selectedIssue.reporterName || '—'}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Assigned To</span>
                  <span className="flex items-center gap-1 mt-0.5 font-bold"><User className="w-3 h-3" /> {selectedIssue.assigneeName || '—'}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Deadline</span>
                  <span className="flex items-center gap-1 mt-0.5 font-bold"><Calendar className="w-3 h-3" /> {selectedIssue.deadline || '—'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Update Status</label>
                <select
                  value={selectedIssue.status}
                  onChange={(e) => handleStatusChange(selectedIssue, e.target.value)}
                  className={cn(
                    "w-full h-9 bg-background-primary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none font-bold",
                    getStatusColor(selectedIssue.status)
                  )}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Assignment Actions */}
              {(selectedIssue as any).assignmentStatus === 'pending_acceptance' && String((selectedIssue as any).assignedUserId) === currentUserId && (
                <div className="flex items-center gap-3 bg-accent-blue/5 p-3 rounded-md border border-accent-blue/20 flex-wrap">
                  <span className="flex-1 text-xs text-text-primary font-semibold min-w-[200px]">
                    You have been assigned this issue. Please accept or decline.
                  </span>
                  <button
                    onClick={() => handleAssignmentAction(selectedIssue, 'accept')}
                    className="px-3 py-1.5 bg-accent-blue text-white text-xs font-bold rounded shadow hover:bg-accent-blue-hover"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleAssignmentAction(selectedIssue, 'decline')}
                    className="px-3 py-1.5 bg-background-primary border border-border-subtle text-text-secondary text-xs font-bold rounded shadow hover:bg-background-secondary"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAssignmentAction(selectedIssue, 'transfer')}
                    className="px-3 py-1.5 bg-background-primary border border-border-subtle text-text-secondary text-xs font-bold rounded shadow hover:bg-background-secondary"
                  >
                    Transfer
                  </button>
                </div>
              )}

              {/* Attachments */}
              {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary uppercase tracking-wider">
                    <Paperclip className="w-4 h-4 text-accent-blue" /> Attachments
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedIssue.attachments.map((url, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.startsWith('data:image/')) {
                            setPreviewImage(url);
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                        className="block border border-border-subtle rounded hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        {url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.startsWith('data:image/') ? (
                          <img src={url} alt={`Attachment ${i}`} className="w-32 h-32 object-cover rounded" />
                        ) : (
                          <div className="w-32 h-32 flex items-center justify-center bg-background-secondary rounded text-xs text-text-secondary break-all p-2 text-center">
                            {url.split('/').pop() || 'File'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Discussion */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-accent-blue" /> Team Discussion
                  {selectedIssue.followups ? ` (${selectedIssue.followups.length})` : ''}
                </div>

                {detailLoading ? (
                  <div className="flex items-center justify-center py-4 text-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(selectedIssue.followups || []).length === 0 && (
                      <p className="text-2xs text-text-muted italic">No follow-ups yet. Add the first update below.</p>
                    )}
                    {(selectedIssue.followups || []).map(f => (
                      <div key={f.id} className="flex gap-2.5 items-start bg-background-primary border border-border-subtle rounded-lg p-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-accent-blue" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-text-primary">{f.user_name || 'User'}</span>
                            <span className="text-[9px] text-text-muted">
                              {f.created_at ? new Date(f.created_at).toLocaleString() : ''}
                            </span>
                          </div>
                          <p className="text-2xs text-text-secondary leading-relaxed mt-0.5">{f.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Add a follow-up... (notifies the other party)"
                    rows={2}
                    value={followupText}
                    onChange={e => setFollowupText(e.target.value)}
                    className="flex-1 text-xs"
                  />
                  <button
                    onClick={addFollowup}
                    disabled={followupSending || !followupText.trim()}
                    className="px-3 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {followupSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md bg-background-primary border-border-subtle z-[10000]">
          <DialogHeader>
            <DialogTitle>Transfer Issue</DialogTitle>
            <DialogDescription>
              Select a teammate to transfer this issue to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-secondary">Teammate</label>
              <select 
                className="w-full bg-background-secondary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
              >
                <option value="">Select a user...</option>
                {users.filter(u => String(u.id) !== currentUserId && String(u.role).toLowerCase() !== 'ceo').map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.department ? `(${user.department})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-secondary">Reason (Optional)</label>
              <textarea 
                className="w-full bg-background-secondary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                rows={3}
                placeholder="Why are you transferring this issue?"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 justify-end">
            <button
              onClick={() => setTransferOpen(false)}
              className="px-4 py-2 text-sm font-bold text-text-secondary hover:bg-background-secondary rounded-md transition-all"
            >
              Cancel
            </button>
            <button
              onClick={submitTransfer}
              disabled={!transferUserId || submitting}
              className="px-4 py-2 text-sm font-bold bg-accent-blue text-white rounded-md hover:bg-accent-blue-hover disabled:opacity-50 transition-all"
            >
              {submitting ? 'Transferring...' : 'Transfer'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none z-[11000] flex justify-center p-0">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
