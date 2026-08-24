export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department?: string;
  skills: string[];
  github?: string;
  linkedin?: string;
  phone?: string;
  username?: string;
  is_active?: boolean;
  salary?: number;
  performance_score?: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface ProjectActivity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'delayed' | 'on_hold' | 'cancelled';
  progress: number;
  startDate: string;
  endDate: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  gitUrl?: string;
  budget?: number;
  spending?: number;
  members: ProjectMember[];
  activities: ProjectActivity[];
  tasks?: Task[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId?: string;
  assignedTo: {
    id?: string;
    name: string;
    avatar: string;
  };
  projectId?: string;
  projectName?: string;
  project?: { id?: string; name?: string };
  labels?: string[];
  estimatedHours?: number;
  completedAt?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  extended_time?: number;
  pushed_to_next_day?: boolean;
  comments?: TaskComment[];
}

export interface MeetingParticipant {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  status: 'pending' | 'accepted' | 'declined' | 'maybe';
}

export interface MeetingTimelineEvent {
  id: string;
  meeting_id: string;
  action: string;
  description: string;
  user_id?: string;
  user_name?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface MeetingExtractedTask {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  priority: string;
  suggested_owner?: string;
  deadline?: string;
  dependencies?: string[];
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  real_task_id?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  attendees: string[];
  notes?: string;
  momText?: string;
  type: string;
  status?: string;
  owner_id?: string;
  owner_name?: string;
  owner_avatar?: string;
  participants?: MeetingParticipant[];
  participants_count?: number;
  mom_summary?: string;
  mom_file_path?: string;
  created_at?: string;
  agenda?: string;
  meeting_link?: string;
  project_id?: string | number;
  task_id?: string | number;
  location?: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  mom_executive_summary?: string;
  mom_decisions?: string[];
  mom_action_items?: string[];
  mom_risks?: string[];
  mom_blockers?: string[];
  mom_followups?: string[];
  mom_deadlines?: string[];
  mom_important_dates?: string[];
  timeline?: MeetingTimelineEvent[];
  extracted_tasks?: MeetingExtractedTask[];
  transcript?: string;
  ai_summary?: string;
  minutes_of_meeting?: string;
  analysis_status?: 'uploaded' | 'processing' | 'completed' | 'failed';
  metadata_json?: string;
  document_file_path?: string;
  document_filename?: string;
  mom_questions?: string[];
}

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IssueFollowup {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  message: string;
  created_at: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  severity: IssueSeverity;
  assignedTo: string;
  createdAt: string;
  category?: string;
  deadline?: string;
  priority?: string;
  projectId?: string;
  projectName?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  reporterId?: string;
  reporterName?: string;
  reporterAvatar?: string;
  followupCount?: number;
  followups?: IssueFollowup[];
  assignmentStatus?: string;
  assignedUserId?: string;
  attachments?: string[];
}

export type FinanceRecordType = 'budget' | 'expense' | 'salary' | 'vendor_payment' | 'renewal' | 'revenue' | 'other';

export interface FinanceRecord {
  id: string;
  title: string;
  description?: string;
  record_type?: FinanceRecordType;
  category?: FinanceRecordType;
  amount: number;
  dueDate: string;
  status: string;
  currency?: string;
  vendor?: string;
  department?: string;
  cost_category?: string;
  project_id?: string;
  project_name?: string;
  user_id?: string;
  user_name?: string;
  notes?: string;
  createdAt?: string;
  chartData?: { name: string; value: number }[];
  _urgency?: 'normal' | 'warning' | 'critical' | 'overdue';
}

export type CostCategory =
  | 'cloud'
  | 'office'
  | 'internet'
  | 'software'
  | 'hardware'
  | 'marketing'
  | 'travel'
  | 'legal'
  | 'insurance'
  | 'contractor'
  | 'other_expense';

export interface FinanceAlert {
  severity: 'overdue' | 'upcoming';
  record_id: number;
  title: string;
  record_type: string;
  amount: number;
  currency: string;
  due_date: string;
  days_overdue?: number;
  days_remaining?: number;
}

export interface FinanceTracker {
  vendor_payments: FinanceRecord[];
  salaries: FinanceRecord[];
  renewals: FinanceRecord[];
  cloud_costs: FinanceRecord[];
  office_expenses: FinanceRecord[];
  budget_commitments: FinanceRecord[];
  outstanding_invoices: FinanceRecord[];
  alerts: FinanceAlert[];
  summary: {
    upcoming_payments_total: number;
    overdue_total: number;
    vendor_payments_count: number;
    salaries_count: number;
    renewals_count: number;
    cloud_costs_count: number;
    office_expenses_count: number;
    budget_commitments_count: number;
    outstanding_invoices_count: number;
    alerts_count: number;
  };
}

export interface ProjectBudget {
  id: string;
  project_id: string;
  name: string;
  status?: string;
  budget: number;
  spending: number;
  remaining: number;
}

export interface PerformanceReview {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  user_role?: string;
  user_department?: string;
  quarter_id?: number;
  quarter_name?: string;
  score: number;
  rating?: string;
  comments?: string;
  salary_before?: number;
  salary_after?: number;
  increment_pct?: number;
  reviewed_by_id?: number;
  reviewed_by_name?: string;
  created_at?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  category: 'general' | 'tasks' | 'meetings' | 'finance' | 'alerts';
  link?: string;
  notification_type?: string;
}

export interface MeetingStructuredData {
  meeting_id: number;
  decisions: string[];
  risks: string[];
  blockers: string[];
  followups: string[];
  questions: string[];
  deadlines: string[];
  important_dates: string[];
}

export interface KnowledgeChunk {
  id: number;
  source_type: string;
  source_id: number;
  source_title: string;
  title: string;
  content: string;
  chunk_type: string;
  project_id?: number;
  meeting_id?: number;
  task_id?: number;
  conversation_id?: number;
  score?: number;
  chunk_metadata?: Record<string, any>;
  created_at?: string;
}

export interface KnowledgeSearchResult {
  chunk_id: number;
  score: number;
  title: string;
  content: string;
  source_type: string;
  source_id: number;
  source_title: string;
  chunk_type: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeStats {
  total_chunks: number;
  by_source: Record<string, number>;
  by_type: Record<string, number>;
}
