// Common types used across the application

export interface DashboardStats {
  outstandingInvoices: number;
  overdueCount: number;
  activeLeads: number;
  avgEngagement: number;
  atRiskRenewals: number;
}

export interface InvoiceWithClient {
  id: number;
  client_id: number;
  invoice_number: string;
  amount: string;
  sent_date: string;
  payment_status: "pending" | "paid" | "overdue";
  last_reminder_sent?: string;
  created_at?: string;
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
  };
}

export interface ClientWithEngagement {
  id: number;
  name: string;
  company: string;
  email: string;
  subscription_type: string;
  renewal_date: string;
  engagement_rate: string;
  click_rate: string;
  interest_tags: string[];
  risk_level: "low" | "medium" | "high";
  notes?: string;
  created_at?: string;
}

export interface LeadWithDetails {
  id: number;
  name: string;
  email: string;
  company: string;
  stage: "prospect" | "qualified" | "proposal" | "closed_won" | "closed_lost";
  last_contact?: string;
  next_step?: string;
  notes?: string;
  interest_tags: string[];
  created_at?: string;
}

export interface ContentReportWithEngagement {
  id: number;
  title: string;
  type: string;
  published_date: string;
  open_rate: string;
  click_rate: string;
  engagement_level: "low" | "medium" | "high";
  tags: string[];
  created_at?: string;
}

export interface AIEmailResponse {
  subject: string;
  body: string;
  bestSendTime?: string;
  upgradeProb?: number;
}

export interface AISuggestionData {
  id: number;
  type: "follow_up" | "content_recommendation" | "lead_action" | "renewal_strategy";
  target_id: number;
  target_type: "client" | "lead";
  suggestion: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "dismissed";
  created_at?: string;
}

// Form types for creating/updating entities
export interface CreateInvoiceForm {
  client_id: number;
  invoice_number: string;
  amount: string;
  sent_date: string;
  payment_status?: "pending" | "paid" | "overdue";
}

export interface CreateLeadForm {
  name: string;
  email: string;
  company: string;
  stage?: string;
  next_step?: string;
  notes?: string;
  interest_tags?: string[];
}

export interface CreateClientForm {
  name: string;
  email: string;
  company: string;
  subscription_type?: string;
  renewal_date?: string;
  interest_tags?: string[];
  notes?: string;
}

export interface UpdateClientRisk {
  risk_level: "low" | "medium" | "high";
}

// Pipeline stage statistics
export interface PipelineStats {
  prospects: number;
  qualified: number;
  proposals: number;
  closed_won: number;
}

// Risk assessment types
export interface RiskAssessment {
  high: number;
  medium: number;
  low: number;
  upgrade: number;
}

// Email generation context
export interface EmailGenerationContext {
  invoice_number?: string;
  amount?: string;
  sent_date?: string;
  days_overdue?: number;
  subscription_type?: string;
  engagement_rate?: string;
  interest_tags?: string[];
  renewal_date?: string;
  stage?: string;
}

// Navigation and UI types
export interface NavigationItem {
  id: string;
  name: string;
  icon: any; // Lucide React icon component
}

export interface ActionItem {
  id: string;
  type: "urgent" | "warning" | "info";
  title: string;
  description: string;
  actionText: string;
  onClick: () => void;
}

// API response types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Filter and sort options
export interface FilterOptions {
  status?: string;
  risk_level?: string;
  stage?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

// Chart and analytics data
export interface EngagementMetrics {
  openRate: number;
  clickRate: number;
  totalReports: number;
  suggestions: number;
}

export interface PipelineMetrics {
  totalLeads: number;
  conversionRate: number;
  averageDealSize: number;
  timeToClose: number;
}

// Notification types
export interface NotificationData {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Activity feed
export interface ActivityItem {
  id: string;
  type: "ai_action" | "client_update" | "lead_progress" | "invoice_status";
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}
