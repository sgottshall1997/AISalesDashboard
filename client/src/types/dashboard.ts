export interface DashboardStats {
  outstandingInvoices: number;
  overdueCount: number;
  activeLeads: number;
  hotLeads: number;
  avgEngagement: number;
  atRiskRenewals: number;
}

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface PriorityAction {
  type: string;
  title: string;
  description: string;
  action: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  company: string;
  subscriptionType: string;
  renewalDate?: string;
  engagementRate?: number;
  riskLevel: string;
  interestTags: string[];
  notes?: string;
  createdAt: Date;
}

export interface Invoice {
  id: number;
  clientId: number;
  clientName?: string;
  clientCompany?: string;
  amount: number;
  sentDate: string;
  status: string;
  daysOverdue?: number;
  lastFollowUpDate?: string;
  createdAt: Date;
}

export interface WiltwReport {
  id: number;
  title: string;
  publishDate: string;
  openRate?: number;
  clickRate?: number;
  engagementLevel: string;
  topics: string[];
  createdAt: Date;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  company: string;
  stage: string;
  lastContactDate?: string;
  nextStepDate?: string;
  nextStepAction?: string;
  interestTags: string[];
  notes?: string;
  proposalAmount?: number;
  temperature?: string;
  createdAt: Date;
}

export interface EmailTemplate {
  id: number;
  type: string;
  subject: string;
  body: string;
  recipientId: number;
  recipientType: string;
  aiGenerated?: boolean;
  sent?: boolean;
  sentDate?: string;
  createdAt: Date;
}
