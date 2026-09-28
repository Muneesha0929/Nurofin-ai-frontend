import { useRouter } from 'next/navigation';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  IndianRupee,
  CreditCard,
  PiggyBank,
  Calendar,
  TrendingUp,
  Plus,
  Loader2,
  Pencil,
  Trash,
  Users,
  Award,
  RefreshCw,
  Lock,
  Wallet,
  AlertTriangle,
  Bell,
  Clock,
  Server,
  Building2,
  Receipt,
  Cloud,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { FinanceTracker, CostCategory } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { financeService } from '@/services/finance';
import { usersService } from '@/services/users';
import { FinanceRecord, FinanceRecordType, PerformanceReview, ProjectBudget, UserProfile as User } from '@/types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

function TrackerCard({ title, icon, items, count, emptyText }: {
  title: string;
  icon: React.ReactNode;
  items: FinanceRecord[];
  count: number;
  emptyText: string;
}) {
  const upcoming = items.filter(i => i.status !== 'paid' && i.status !== 'approved');
  return (
    <div className="bg-background-primary border border-border-subtle rounded-lg p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          {icon}{title}
        </span>
        <span className="text-2xs font-extrabold text-text-muted bg-surface-card px-2 py-0.5 rounded">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-text-muted italic py-3 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {upcoming.slice(0, 6).map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  item._urgency === 'overdue' ? 'bg-accent-red' :
                  item._urgency === 'critical' ? 'bg-accent-orange' :
                  item._urgency === 'warning' ? 'bg-accent-orange/60' : 'bg-text-muted'
                )} />
                <span className="font-semibold text-text-primary truncate">{item.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-text-muted flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{item.dueDate || '—'}</span>
                <span className="font-mono font-bold text-text-primary">{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          ))}
          {upcoming.length > 6 && (
            <p className="text-[9px] text-text-muted text-center pt-1">+{upcoming.length - 6} more</p>
          )}
          {upcoming.length === 0 && (
            <p className="text-[10px] text-accent-green italic py-2 text-center">All caught up ✓</p>
          )}
        </div>
      )}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  budget: 'Budget Allocation',
  expense: 'Expense',
  salary: 'Salary',
  vendor_payment: 'Vendor Payment',
  renewal: 'SaaS Renewal',
  revenue: 'Revenue',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  vendor_payment: 'text-accent-red bg-accent-red/10 border-accent-red/20',
  expense: 'text-accent-orange bg-accent-orange/10 border-accent-orange/20',
  budget: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  salary: 'text-accent-purple bg-accent-purple/10 border-accent-purple/20',
  renewal: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20',
  revenue: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  other: 'text-text-secondary bg-surface-card border-border-subtle',
};

const fmt = (n: number) => `₹${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancePage() {
  const { financeRecords, setFinanceRecords } = useStore();
  const [summary, setSummary] = useState<any>(null);
  const [projectBudgets, setProjectBudgets] = useState<ProjectBudget[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [myInfo, setMyInfo] = useState<any>(null);
  const [tracker, setTracker] = useState<FinanceTracker | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewUser, setReviewUser] = useState<User | null>(null);
  const [reviewScore, setReviewScore] = useState('80');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // New record form fields (manual state, simpler than react-hook-form here)
  const [recordForm, setRecordForm] = useState({
    title: '',
    description: '',
    record_type: 'expense' as FinanceRecordType,
    status: 'pending',
    amount: '',
    currency: 'INR',
    vendor: '',
    department: '',
    cost_category: '' as string,
    project_id: '',
    user_id: '',
    due_date: '',
    notes: '',
  });

  const { userProfile } = useStore();
  const isCEO = ['ceo', 'super_admin', 'admin'].includes(String(userProfile.role || '').toLowerCase());

  const loadAll = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const [records, summ, budgets, perf, userList, trk] = await Promise.all([
        financeService.getRecords(),
        financeService.getSummary(),
        financeService.getProjectBudgets(),
        financeService.getPerformanceReviews(),
        usersService.getUsers(),
        financeService.getTracker(),
      ]);
      setFinanceRecords(records);
      setSummary(summ);
      setProjectBudgets(budgets);
      setReviews(perf.reviews);
      setMyInfo(perf.mine);
      setUsers(userList);
      setTracker(trk);
    } catch (err: any) {
      if (!background) setError(err.message || 'Failed to load finance data');
    } finally {
      if (!background) setLoading(false);
    }
  }, [setFinanceRecords]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!recordModalOpen && !reviewOpen) loadAll(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAll, recordModalOpen, reviewOpen]);

  const resetRecordForm = () => {
    setEditingRecord(null);
    setRecordForm({
      title: '',
      description: '',
      record_type: 'expense',
      status: 'pending',
      amount: '',
      currency: 'INR',
      vendor: '',
      department: '',
      cost_category: '',
      project_id: '',
      user_id: '',
      due_date: '',
      notes: '',
    });
  };

  const openCreate = () => {
    resetRecordForm();
    setRecordModalOpen(true);
  };

  const openEdit = (rec: FinanceRecord) => {
    setEditingRecord(rec);
    setRecordForm({
      title: rec.title || '',
      description: rec.description || '',
      record_type: (rec.record_type || rec.category) as FinanceRecordType,
      status: rec.status,
      amount: String(rec.amount || 0),
      currency: rec.currency || 'INR',
      vendor: rec.vendor || '',
      department: rec.department || '',
      cost_category: rec.cost_category || '',
      project_id: rec.project_id || '',
      user_id: rec.user_id || '',
      due_date: rec.dueDate || '',
      notes: rec.notes || '',
    });
    setRecordModalOpen(true);
  };

  const submitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        title: recordForm.title,
        description: recordForm.description || undefined,
        record_type: recordForm.record_type,
        status: recordForm.status,
        amount: parseFloat(recordForm.amount) || 0,
        currency: recordForm.currency,
        vendor: recordForm.vendor || undefined,
        department: recordForm.department || undefined,
        cost_category: recordForm.cost_category || undefined,
        project_id: recordForm.project_id ? parseInt(recordForm.project_id) : undefined,
        user_id: recordForm.user_id ? parseInt(recordForm.user_id) : undefined,
        due_date: recordForm.due_date || undefined,
        notes: recordForm.notes || undefined,
      };
      if (editingRecord) {
        await financeService.updateRecord(parseInt(editingRecord.id), payload);
      } else {
        await financeService.createRecord(payload);
      }
      setRecordModalOpen(false);
      resetRecordForm();
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save finance record');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecord = async (rec: FinanceRecord) => {
    if (!confirm(`Delete "${rec.title}"? This cannot be undone.`)) return;
    try {
      await financeService.deleteRecord(parseInt(rec.id));
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  const openReview = (user: User) => {
    setReviewUser(user);
    const existing = reviews.find(r => r.user_id === user.id);
    setReviewScore(String(existing?.score ?? user.performance_score ?? '80'));
    setReviewComments(existing?.comments || '');
    setReviewOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewUser) return;
    setReviewSubmitting(true);
    try {
      await financeService.createPerformanceReview({
        user_id: parseInt(reviewUser.id),
        score: parseFloat(reviewScore) || 0,
        comments: reviewComments || undefined,
      });
      setReviewOpen(false);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save performance review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getRating = (score: number) => {
    if (score >= 90) return { label: 'Outstanding', inc: 15, color: 'text-accent-green' };
    if (score >= 80) return { label: 'Excellent', inc: 10, color: 'text-accent-green' };
    if (score >= 70) return { label: 'Good', inc: 7, color: 'text-accent-blue' };
    if (score >= 60) return { label: 'Satisfactory', inc: 5, color: 'text-accent-orange' };
    if (score >= 50) return { label: 'Needs Improvement', inc: 2, color: 'text-accent-orange' };
    return { label: 'Underperforming', inc: 0, color: 'text-accent-red' };
  };

  const filteredRecords = financeRecords.filter(r => {
    const type = (r.record_type || r.category) as string;
    const matchesType = typeFilter === 'all' || type === typeFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const allocationData = projectBudgets
    .filter(p => (p.budget || 0) > 0)
    .map(p => ({ name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name, value: p.budget || 0 }));

  const budgetTrendData = projectBudgets.map(p => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
    budget: p.budget || 0,
    spending: p.spending || 0,
  }));

  const salaryUsers = users.filter(u => ['employee', 'manager', 'team_lead', 'admin'].includes(String(u.role || '').toLowerCase()));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm font-medium">Loading finance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-md mx-auto text-center">
        <AlertTriangle className="w-10 h-10 text-accent-red" />
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-1">Failed to Load Finance</h3>
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
      {/* Finance Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background-secondary p-4 rounded-lg border border-border-subtle shadow-md">
        <div>
          <h2 className="text-base font-bold font-sans">Corporate Financial Control</h2>
          <p className="text-2xs text-text-secondary mt-0.5">Budgets, expenses, salaries, vendor payments, and performance-based compensation.</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCEO && (
            <span className="flex items-center gap-1 text-2xs text-text-muted font-semibold">
              <Lock className="w-3 h-3" /> Read-only — CEO can edit
            </span>
          )}
          <button
            onClick={() => loadAll()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {isCEO && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold rounded-md shadow transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Finance Record
            </button>
          )}
        </div>
      </div>

      {/* KPI metric grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background-secondary border border-border-subtle rounded-lg p-5 flex items-center gap-4 hover:border-text-muted transition-colors">
          <div className="p-3 bg-accent-green/10 rounded-lg text-accent-green">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Total Budget</span>
            <span className="text-xl font-extrabold">{fmt(summary?.total_budget)}</span>
          </div>
        </div>

        <div className="bg-background-secondary border border-border-subtle rounded-lg p-5 flex items-center gap-4 hover:border-text-muted transition-colors">
          <div className="p-3 bg-accent-blue/10 rounded-lg text-accent-blue">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Total Spend</span>
            <span className="text-xl font-extrabold">{fmt(summary?.total_spend)}</span>
            <span className="block text-[9px] text-text-muted font-semibold">Expenses + Vendor + Renewals</span>
          </div>
        </div>

        <div className="bg-background-secondary border border-border-subtle rounded-lg p-5 flex items-center gap-4 hover:border-text-muted transition-colors">
          <div className="p-3 bg-accent-purple/10 rounded-lg text-accent-purple">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Total Salaries</span>
            <span className="text-xl font-extrabold">{fmt(summary?.total_salaries)}</span>
            <span className="block text-[9px] text-text-muted font-semibold">Performance-based</span>
          </div>
        </div>

        <div className="bg-background-secondary border border-border-subtle rounded-lg p-5 flex items-center gap-4 hover:border-text-muted transition-colors">
          <div className="p-3 bg-accent-orange/10 rounded-lg text-accent-orange">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Budget Remaining</span>
            <span className="text-xl font-extrabold">{fmt(summary?.budget_remaining)}</span>
            <span className={cn("block text-[9px] font-semibold", (summary?.overdue_payments || 0) > 0 ? "text-accent-red" : "text-text-muted")}>
              Overdue: {fmt(summary?.overdue_payments)}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {[
          { label: 'Pending Payments', value: summary?.pending_payments || 0, color: 'text-accent-orange' },
          { label: 'Approved', value: summary?.approved_payments || 0, color: 'text-accent-blue' },
          { label: 'Paid', value: summary?.paid_payments || 0, color: 'text-accent-green' },
          { label: 'Total Revenue', value: summary?.total_revenue || 0, color: 'text-accent-green' },
        ].map(m => (
          <div key={m.label} className="bg-background-secondary border border-border-subtle rounded-lg p-3">
            <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block">{m.label}</span>
            <span className={cn("text-base font-extrabold", m.color)}>{fmt(m.value)}</span>
          </div>
        ))}
      </div>

      {/* CEO Deadline Alerts */}
      {isCEO && tracker && tracker.alerts.length > 0 && (
        <div className="bg-accent-red/[0.06] border border-accent-red/30 rounded-lg p-4 space-y-3 shadow-md">
          <h3 className="text-xs font-bold text-accent-red uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-4 h-4" /> Deadline Alerts — Action Required ({tracker.alerts.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tracker.alerts.map(a => (
              <div key={`${a.record_id}-${a.severity}`} className={cn(
                "bg-background-primary border rounded-lg p-3 flex flex-col gap-1",
                a.severity === 'overdue' ? 'border-accent-red/40' : 'border-accent-orange/30'
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{a.record_type.replace('_', ' ')}</span>
                  <span className={cn(
                    "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded",
                    a.severity === 'overdue' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-orange/20 text-accent-orange'
                  )}>
                    {a.severity === 'overdue' ? `${a.days_overdue}d overdue` : `in ${a.days_remaining}d`}
                  </span>
                </div>
                <span className="text-xs font-bold text-text-primary leading-tight">{a.title}</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-2xs font-mono font-bold text-text-primary">{a.currency} {(a.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-text-muted flex items-center gap-1"><Calendar className="w-3 h-3" />{a.due_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost & Financial Tracker */}
      {tracker && (
        <div className="bg-background-secondary border border-border-subtle rounded-lg p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-accent-blue" /> Cost & Financial Tracker
            </h3>
            <div className="flex items-center gap-4 text-2xs font-bold">
              <span className="text-accent-orange flex items-center gap-1"><Clock className="w-3 h-3" />Upcoming: {fmt(tracker.summary.upcoming_payments_total)}</span>
              <span className="text-accent-red flex items-center gap-1"><AlertCircle className="w-3 h-3" />Overdue: {fmt(tracker.summary.overdue_total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Vendor Payments */}
            <TrackerCard
              title="Vendor Payments"
              icon={<Receipt className="w-4 h-4 text-accent-red" />}
              items={tracker.vendor_payments}
              count={tracker.summary.vendor_payments_count}
              emptyText="No vendor payments recorded."
            />
            {/* Salaries */}
            <TrackerCard
              title="Salary Dates"
              icon={<IndianRupee className="w-4 h-4 text-accent-purple" />}
              items={tracker.salaries}
              count={tracker.summary.salaries_count}
              emptyText="No salary records."
            />
            {/* Subscription Renewals */}
            <TrackerCard
              title="Subscription Renewals"
              icon={<RefreshCw className="w-4 h-4 text-accent-blue" />}
              items={tracker.renewals}
              count={tracker.summary.renewals_count}
              emptyText="No renewals tracked."
            />
            {/* Cloud Costs */}
            <TrackerCard
              title="Cloud Costs"
              icon={<Cloud className="w-4 h-4 text-accent-blue" />}
              items={tracker.cloud_costs}
              count={tracker.summary.cloud_costs_count}
              emptyText="No cloud costs yet."
            />
            {/* Office Expenses */}
            <TrackerCard
              title="Office Expenses"
              icon={<Building2 className="w-4 h-4 text-accent-orange" />}
              items={tracker.office_expenses}
              count={tracker.summary.office_expenses_count}
              emptyText="No office expenses."
            />
            {/* Budget Commitments */}
            <TrackerCard
              title="Budget Commitments"
              icon={<PiggyBank className="w-4 h-4 text-accent-green" />}
              items={tracker.budget_commitments}
              count={tracker.summary.budget_commitments_count}
              emptyText="No budget allocations."
            />
          </div>

          {/* Outstanding Invoices */}
          {tracker.outstanding_invoices.length > 0 && (
            <div className="border border-border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-card/10 flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent-orange" /> Outstanding Invoices ({tracker.summary.outstanding_invoices_count})
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice / Record</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Project / Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracker.outstanding_invoices.map(inv => {
                    const type = (inv.record_type || inv.category || '') as string;
                    return (
                      <TableRow key={`inv-${inv.id}`}>
                        <TableCell className="text-xs font-semibold">{inv.title}</TableCell>
                        <TableCell>
                          <span className={cn("px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider", TYPE_COLORS[type] || TYPE_COLORS.other)}>
                            {TYPE_LABELS[type] || type}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{inv.currency || 'INR'} {(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-2xs flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-text-muted" />
                          <span className={cn(inv._urgency === 'overdue' && 'text-accent-red font-bold', inv._urgency === 'critical' && 'text-accent-orange font-bold')}>
                            {inv.dueDate || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-2xs font-bold capitalize", inv.status === 'overdue' ? 'text-accent-red' : inv.status === 'pending' ? 'text-accent-orange' : 'text-text-secondary')}>
                            {inv.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-2xs text-text-secondary">{inv.project_name || inv.vendor || inv.user_name || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Visual Chart grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-background-secondary border border-border-subtle rounded-lg p-5 shadow-md space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-accent-blue" /> Project Budget vs Spending
          </h3>
          {budgetTrendData.length === 0 ? (
            <p className="text-2xs text-text-muted italic py-10 text-center">No project budgets yet. Add a budget record to a project.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A364F" />
                  <XAxis dataKey="name" stroke="#8A99AD" fontSize={9} />
                  <YAxis stroke="#8A99AD" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A2332', borderColor: '#2A364F', borderRadius: '8px' }}
                    labelStyle={{ color: '#FFFFFF' }}
                    formatter={(value: any) => fmt(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="budget" name="Budget" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spending" name="Spending" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-background-secondary border border-border-subtle rounded-lg p-5 shadow-md space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <IndianRupee className="w-4 h-4 text-accent-green" /> Budget Allocation by Project
          </h3>
          {allocationData.length === 0 ? (
            <p className="text-2xs text-text-muted italic py-10 text-center">No allocations yet.</p>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1A2332', borderColor: '#2A364F', borderRadius: '8px' }} formatter={(value: any) => fmt(Number(value))} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Performance & Salary */}
      <div className="bg-background-secondary border border-border-subtle rounded-lg overflow-hidden shadow-md">
        <div className="p-4 border-b border-border-subtle bg-surface-card/10 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Award className="w-4 h-4 text-accent-green" /> Performance Marks & Salary (CEO Approved)
          </h3>
          <span className="text-2xs text-text-muted font-semibold">{isCEO ? 'You can give performance marks' : 'CEO sets your performance and salary'}</span>
        </div>

        {/* My own salary/score */}
        {myInfo && (
          <div className="p-4 border-b border-border-subtle bg-accent-blue/[0.03]">
            <div className="flex flex-wrap items-center gap-6 text-2xs">
              <div>
                <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Your Current Salary</span>
                <span className="text-lg font-extrabold text-accent-green">{fmt(myInfo.salary)}</span>
              </div>
              <div>
                <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Your Performance Score</span>
                <span className={cn("text-lg font-extrabold", getRating(myInfo.performance_score || 0).color)}>
                  {Math.round(myInfo.performance_score || 0)}/100
                </span>
              </div>
              <div>
                <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Rating</span>
                <span className="text-lg font-extrabold">{getRating(myInfo.performance_score || 0).label}</span>
              </div>
            </div>
          </div>
        )}

        {isCEO ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Salary Before</TableHead>
                <TableHead>Salary After</TableHead>
                <TableHead>Increment</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaryUsers.map(u => {
                const rev = reviews.find(r => r.user_id === u.id);
                const rating = getRating(rev?.score ?? 0);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-[10px] font-black text-accent-blue">
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-2xs text-text-secondary">{u.department || '—'}</TableCell>
                    <TableCell className="text-xs font-bold">
                      {rev ? (
                        <span className={rating.color}>{Math.round(rev.score)}/100</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-2xs">
                      <span className={cn("font-bold", rev ? rating.color : 'text-text-muted')}>
                        {rev ? rev.rating : 'Not reviewed'}
                      </span>
                    </TableCell>
                    <TableCell className="text-2xs text-text-secondary">{fmt(rev?.salary_before ?? 0)}</TableCell>
                    <TableCell className="text-2xs font-bold text-accent-green">{fmt(rev?.salary_after ?? 0)}</TableCell>
                    <TableCell className="text-2xs font-bold text-accent-orange">{rev ? `${rev.increment_pct}%` : '—'}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => openReview(u)}
                        className="px-2.5 py-1 bg-accent-green/10 border border-accent-green/20 text-accent-green text-2xs font-bold rounded hover:bg-accent-green/20 transition-colors"
                      >
                        {rev ? 'Re-review' : 'Review'}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {salaryUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-text-muted italic">No employees to review yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Salary Before</TableHead>
                <TableHead>Salary After</TableHead>
                <TableHead>Increment</TableHead>
                <TableHead>Reviewed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.filter(r => myInfo && r.user_id === String(myInfo.user_id)).map(rev => (
                <TableRow key={rev.id}>
                  <TableCell className="text-2xs text-text-secondary">{rev.quarter_name || 'Latest'}</TableCell>
                  <TableCell className="text-xs font-bold">
                    <span className={getRating(rev.score).color}>{Math.round(rev.score)}/100</span>
                  </TableCell>
                  <TableCell className="text-2xs"><span className={cn("font-bold", getRating(rev.score).color)}>{rev.rating}</span></TableCell>
                  <TableCell className="text-2xs text-text-secondary">{fmt(rev.salary_before ?? 0)}</TableCell>
                  <TableCell className="text-2xs font-bold text-accent-green">{fmt(rev.salary_after ?? 0)}</TableCell>
                  <TableCell className="text-2xs font-bold text-accent-orange">{rev.increment_pct}%</TableCell>
                  <TableCell className="text-2xs text-text-secondary">{rev.reviewed_by_name || 'CEO'}</TableCell>
                </TableRow>
              ))}
              {reviews.filter(r => myInfo && r.user_id === String(myInfo.user_id)).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-xs text-text-muted italic">No reviews recorded yet. Your salary is {fmt(myInfo?.salary)}.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Corporate Ledger */}
      <div className="bg-background-secondary border border-border-subtle rounded-lg overflow-hidden shadow-md">
        <div className="p-4 border-b border-border-subtle bg-surface-card/10 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-text-primary">Corporate Finance Ledger</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-background-primary border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none"
            >
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-background-primary border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Project / Employee</TableHead>
              <TableHead>Vendor / Dept</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              {isCEO && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((rec) => {
              const type = (rec.record_type || rec.category) as string;
              return (
                <TableRow key={rec.id}>
                  <TableCell className="font-semibold text-xs py-4">
                    <div>
                      <span>{rec.title}</span>
                      {rec.notes && <span className="text-[10px] text-text-secondary block font-normal">{rec.notes}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider", TYPE_COLORS[type] || TYPE_COLORS.other)}>
                      {TYPE_LABELS[type] || type}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-text-primary">
                    {rec.currency || 'INR'} {rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-2xs text-text-secondary">
                    {rec.project_name || rec.user_name || '—'}
                  </TableCell>
                  <TableCell className="text-2xs text-text-secondary">{rec.vendor || rec.department || '—'}</TableCell>
                  <TableCell className="text-2xs text-text-secondary">{rec.dueDate || '—'}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-2xs font-bold capitalize",
                      rec.status === 'overdue' ? 'text-accent-red' :
                      rec.status === 'paid' || rec.status === 'approved' ? 'text-accent-green' :
                      'text-accent-orange'
                    )}>
                      {rec.status}
                    </span>
                  </TableCell>
                  {isCEO && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(rec)} className="p-1.5 rounded hover:bg-background-primary text-text-muted hover:text-accent-blue transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteRecord(rec)} className="p-1.5 rounded hover:bg-background-primary text-text-muted hover:text-accent-red transition-colors" title="Delete">
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filteredRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={isCEO ? 8 : 7} className="text-center py-8 text-xs text-text-muted italic">
                  No finance records found. {isCEO && 'Use "Add Finance Record" to create one.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Finance Record Dialog */}
      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Finance Record' : 'Add Finance Record'}</DialogTitle>
            <DialogDescription>
              Only the CEO and super admin can add or edit money records. All changes are reflected immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRecord} className="space-y-4 pt-2 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Title</label>
              <Input
                type="text"
                required
                placeholder="e.g. Q3 Cloud Hosting Budget"
                value={recordForm.title}
                onChange={e => setRecordForm({ ...recordForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Type</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  value={recordForm.record_type}
                  onChange={e => setRecordForm({ ...recordForm, record_type: e.target.value as FinanceRecordType })}
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Status</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  value={recordForm.status}
                  onChange={e => setRecordForm({ ...recordForm, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {(recordForm.record_type === 'expense') && (
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Cost Category</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  value={recordForm.cost_category}
                  onChange={e => setRecordForm({ ...recordForm, cost_category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  <option value="cloud">Cloud Hosting (AWS/Azure/GCP)</option>
                  <option value="office">Office (Rent/Supplies/Utilities)</option>
                  <option value="internet">Internet / Telecom</option>
                  <option value="software">Software Licenses</option>
                  <option value="hardware">Hardware (Laptops/Equipment)</option>
                  <option value="marketing">Marketing / Ads</option>
                  <option value="travel">Business Travel</option>
                  <option value="legal">Legal / Compliance</option>
                  <option value="insurance">Insurance</option>
                  <option value="contractor">Contractor / Freelancer</option>
                  <option value="other_expense">Other Expense</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Amount</label>
                <Input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  value={recordForm.amount}
                  onChange={e => setRecordForm({ ...recordForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Currency</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  value={recordForm.currency}
                  onChange={e => setRecordForm({ ...recordForm, currency: e.target.value })}
                >
                  <option value="INR">INR</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {(recordForm.record_type === 'budget' || recordForm.record_type === 'expense' || recordForm.record_type === 'vendor_payment') && (
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Project</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  value={recordForm.project_id}
                  onChange={e => setRecordForm({ ...recordForm, project_id: e.target.value })}
                >
                  <option value="">No Project</option>
                  {projectBudgets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({fmt(p.budget)})</option>
                  ))}
                </select>
              </div>
            )}

            {recordForm.record_type === 'salary' && (
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Employee</label>
                <select
                  className="w-full h-10 bg-background-secondary border border-border-subtle rounded-md px-3 text-sm text-text-primary outline-none"
                  value={recordForm.user_id}
                  onChange={e => setRecordForm({ ...recordForm, user_id: e.target.value })}
                >
                  <option value="">Select Employee</option>
                  {salaryUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department || 'No dept'})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Vendor</label>
                <Input
                  type="text"
                  placeholder="Vendor name"
                  value={recordForm.vendor}
                  onChange={e => setRecordForm({ ...recordForm, vendor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Department</label>
                <Input
                  type="text"
                  placeholder="Department"
                  value={recordForm.department}
                  onChange={e => setRecordForm({ ...recordForm, department: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Due Date</label>
              <Input
                type="date"
                value={recordForm.due_date}
                onChange={e => setRecordForm({ ...recordForm, due_date: e.target.value })}
                className="bg-background-secondary border border-border-subtle"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Notes</label>
              <Textarea
                rows={2}
                placeholder="Additional context..."
                value={recordForm.notes}
                onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
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
                {editingRecord ? 'Save Changes' : 'Add Record'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Performance Review Dialog (CEO) */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Performance Review — {reviewUser?.name}</DialogTitle>
            <DialogDescription>
              Give a performance mark (0-100). The salary is recalculated automatically based on performance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReview} className="space-y-4 pt-2 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Performance Score (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                required
                value={reviewScore}
                onChange={e => setReviewScore(e.target.value)}
              />
              {reviewScore && (() => {
                const score = parseFloat(reviewScore);
                const rating = getRating(score);
                const currentSalary = reviews.find(r => r.user_id === reviewUser?.id)?.salary_after ?? 0;
                const projected = currentSalary * (1 + rating.inc / 100);
                return (
                  <div className="flex flex-wrap gap-4 text-2xs bg-background-primary rounded-lg border border-border-subtle p-3">
                    <span className={cn("font-extrabold", rating.color)}>Rating: {rating.label}</span>
                    <span className="text-text-secondary">Auto Increment: <span className="font-bold text-accent-orange">{rating.inc}%</span></span>
                    <span className="text-text-secondary">Current Salary: <span className="font-bold">{fmt(currentSalary)}</span></span>
                    <span className="text-text-secondary">Projected Salary: <span className="font-bold text-accent-green">{fmt(projected)}</span></span>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase">Comments</label>
              <Textarea
                rows={3}
                placeholder="Feedback for this review period..."
                value={reviewComments}
                onChange={e => setReviewComments(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="px-3 py-1.5 border border-border-subtle text-text-secondary hover:text-text-primary text-2xs font-semibold rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="px-3 py-1.5 bg-accent-green hover:bg-emerald-600 text-white text-2xs font-semibold rounded shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {reviewSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Review & Salary
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
