import { FinanceRecord, PerformanceReview, ProjectBudget, FinanceTracker } from '../types';

const getHeaders = () => {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token') || '';
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const BASE = '/api/v1/finance';

export interface FinanceSummary {
  total_budget: number;
  project_budgets: number;
  allocated_budget: number;
  total_expenses: number;
  total_vendor_payments: number;
  total_renewals: number;
  total_salaries: number;
  total_revenue: number;
  other_spending: number;
  total_spend: number;
  pending_payments: number;
  overdue_payments: number;
  approved_payments: number;
  paid_payments: number;
  budget_remaining: number;
}

export interface CreateFinanceRecordPayload {
  title: string;
  amount: number;
  record_type?: string;
  status?: string;
  description?: string;
  currency?: string;
  vendor?: string;
  department?: string;
  cost_category?: string;
  project_id?: number;
  user_id?: number;
  due_date?: string;
  notes?: string;
}

export interface CreatePerformanceReviewPayload {
  user_id: number;
  score: number;
  comments?: string;
}

function mapRecord(raw: any): FinanceRecord {
  return {
    id: String(raw.id),
    title: raw.title || '',
    description: raw.description || undefined,
    record_type: raw.record_type || 'expense',
    category: raw.record_type || 'expense',
    amount: raw.amount || 0,
    dueDate: raw.due_date || raw.transaction_date || '',
    status: raw.status || 'pending',
    currency: raw.currency || undefined,
    vendor: raw.vendor || undefined,
    department: raw.department || undefined,
    project_id: raw.project_id != null ? String(raw.project_id) : undefined,
    project_name: raw.project_name || undefined,
    user_id: raw.user_id != null ? String(raw.user_id) : undefined,
    user_name: raw.user_name || undefined,
    notes: raw.notes || undefined,
    createdAt: raw.created_at || '',
  };
}

function mapReview(raw: any): PerformanceReview {
  return {
    id: String(raw.id),
    user_id: raw.user_id != null ? String(raw.user_id) : '',
    user_name: raw.user_name || undefined,
    user_avatar: raw.user_avatar || undefined,
    user_role: raw.user_role || undefined,
    user_department: raw.user_department || undefined,
    quarter_id: raw.quarter_id || undefined,
    quarter_name: raw.quarter_name || undefined,
    score: raw.score || 0,
    rating: raw.rating || '',
    comments: raw.comments || undefined,
    salary_before: raw.salary_before || 0,
    salary_after: raw.salary_after || 0,
    increment_pct: raw.increment_pct || 0,
    reviewed_by_id: raw.reviewed_by_id || undefined,
    reviewed_by_name: raw.reviewed_by_name || undefined,
    created_at: raw.created_at || '',
  };
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  burnRate: number;
  runway: number;
  mr: number;
  arr: number;
  cac: number;
  ltv: number;
}

export const financeService = {
  getMetrics: async (): Promise<FinancialMetrics> => {
    return {
      totalRevenue: 100000,
      totalExpenses: 50000,
      netProfit: 50000,
      burnRate: 10000,
      runway: 12,
      mr: 10000,
      arr: 120000,
      cac: 100,
      ltv: 1000,
    };
  },
  getRecords: async (params?: {
    record_type?: string;
    status?: string;
    project_id?: number;
    user_id?: number;
  }): Promise<FinanceRecord[]> => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const q = qs.toString();
    const res = await fetch(`${BASE}${q ? `?${q}` : ''}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch finance records');
    const json = await res.json();
    const data = json.data || { records: [] };
    return (data.records || []).map(mapRecord);
  },

  getSummary: async (): Promise<FinanceSummary> => {
    const res = await fetch(`${BASE}/summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch finance summary');
    const json = await res.json();
    return (json.data || {}) as FinanceSummary;
  },

  getProjectBudgets: async (): Promise<ProjectBudget[]> => {
    const res = await fetch(`${BASE}/projects/budget`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch project budgets');
    const json = await res.json();
    return (json.data || []).map((p: any) => ({
      id: String(p.id),
      project_id: String(p.id),
      name: p.name || '',
      status: p.status,
      budget: p.budget || 0,
      spending: p.spending || 0,
      remaining: p.remaining || 0,
    }));
  },

  getPerformanceReviews: async (): Promise<{
    reviews: PerformanceReview[];
    mine?: { user_id: number; name: string; salary: number; performance_score: number };
  }> => {
    const res = await fetch(`${BASE}/performance`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch performance reviews');
    const json = await res.json();
    const data = json.data || { reviews: [] };
    return {
      reviews: (data.reviews || []).map(mapReview),
      mine: data.mine || undefined,
    };
  },

  createRecord: async (payload: CreateFinanceRecordPayload): Promise<FinanceRecord> => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create record' }));
      throw new Error(err.detail || err.message || 'Failed to create record');
    }
    const json = await res.json();
    return mapRecord(json.data);
  },

  updateRecord: async (recordId: number, payload: Partial<CreateFinanceRecordPayload>): Promise<FinanceRecord> => {
    const res = await fetch(`${BASE}/${recordId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update record' }));
      throw new Error(err.detail || err.message || 'Failed to update record');
    }
    const json = await res.json();
    return mapRecord(json.data);
  },

  deleteRecord: async (recordId: number): Promise<void> => {
    const res = await fetch(`${BASE}/${recordId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete record');
  },

  createPerformanceReview: async (payload: CreatePerformanceReviewPayload): Promise<PerformanceReview> => {
    const res = await fetch(`${BASE}/performance/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to save performance review' }));
      throw new Error(err.detail || err.message || 'Failed to save performance review');
    }
    const json = await res.json();
    return mapReview(json.data);
  },

  getTracker: async (): Promise<FinanceTracker> => {
    const res = await fetch(`${BASE}/tracker`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch finance tracker');
    const json = await res.json();
    const d = json.data || {};
    const mapItems = (arr: any[] = []) =>
      (arr || []).map((raw: any) => ({
        id: String(raw.id),
        title: raw.title || '',
        description: raw.description || undefined,
        record_type: raw.record_type,
        category: raw.record_type,
        amount: raw.amount || 0,
        dueDate: raw.due_date || '',
        status: raw.status || 'pending',
        currency: raw.currency || undefined,
        vendor: raw.vendor || undefined,
        department: raw.department || undefined,
        cost_category: raw.cost_category || undefined,
        project_id: raw.project_id != null ? String(raw.project_id) : undefined,
        project_name: raw.project_name || undefined,
        user_id: raw.user_id != null ? String(raw.user_id) : undefined,
        user_name: raw.user_name || undefined,
        notes: raw.notes || undefined,
        createdAt: raw.created_at || '',
        _urgency: raw._urgency || 'normal',
      }));
    return {
      vendor_payments: mapItems(d.vendor_payments),
      salaries: mapItems(d.salaries),
      renewals: mapItems(d.renewals),
      cloud_costs: mapItems(d.cloud_costs),
      office_expenses: mapItems(d.office_expenses),
      budget_commitments: mapItems(d.budget_commitments),
      outstanding_invoices: mapItems(d.outstanding_invoices),
      alerts: d.alerts || [],
      summary: {
        upcoming_payments_total: d.summary?.upcoming_payments_total || 0,
        overdue_total: d.summary?.overdue_total || 0,
        vendor_payments_count: d.summary?.vendor_payments_count || 0,
        salaries_count: d.summary?.salaries_count || 0,
        renewals_count: d.summary?.renewals_count || 0,
        cloud_costs_count: d.summary?.cloud_costs_count || 0,
        office_expenses_count: d.summary?.office_expenses_count || 0,
        budget_commitments_count: d.summary?.budget_commitments_count || 0,
        outstanding_invoices_count: d.summary?.outstanding_invoices_count || 0,
        alerts_count: d.summary?.alerts_count || 0,
      },
    };
  },
};
