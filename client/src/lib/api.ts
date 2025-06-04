import { apiRequest } from './queryClient';

export interface DashboardOverview {
  stats: {
    outstandingInvoices: number;
    overdueCount: number;
    activeLeads: number;
    hotLeads: number;
    avgEngagement: number;
    atRiskRenewals: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
    icon: string;
  }>;
  priorityActions: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
  }>;
}

export interface EmailGenerationRequest {
  type: "follow_up" | "renewal" | "overdue" | "lead_nurture" | "upsell";
  recipientName: string;
  recipientCompany: string;
  context: {
    amount?: number;
    daysOverdue?: number;
    invoiceNumber?: string;
    renewalDate?: string;
    engagementRate?: number;
    interestTags?: string[];
    lastInteraction?: string;
    riskLevel?: string;
    reportTitle?: string;
    proposalAmount?: number;
    stage?: string;
  };
}

export interface EmailResponse {
  subject: string;
  body: string;
  tone: string;
  priority: "low" | "medium" | "high";
  bestSendTime?: string;
}

export interface ContentSuggestion {
  type: "high_engagement" | "low_engagement" | "topic_match" | "renewal_opportunity";
  title: string;
  description: string;
  action: string;
  priority: "low" | "medium" | "high";
  clientsAffected: number;
}

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await apiRequest('GET', '/api/dashboard/overview');
    return response.json();
  },

  getClients: async () => {
    const response = await apiRequest('GET', '/api/clients');
    return response.json();
  },

  getInvoices: async () => {
    const response = await apiRequest('GET', '/api/invoices');
    return response.json();
  },

  getReports: async () => {
    const response = await apiRequest('GET', '/api/reports');
    return response.json();
  },

  getLeads: async () => {
    const response = await apiRequest('GET', '/api/leads');
    return response.json();
  },

  getLeadsByStage: async (stage: string) => {
    const response = await apiRequest('GET', `/api/leads/stage/${stage}`);
    return response.json();
  },

  generateEmail: async (request: EmailGenerationRequest): Promise<EmailResponse> => {
    const response = await apiRequest('POST', '/api/ai/generate-email', request);
    return response.json();
  },

  getContentSuggestions: async (): Promise<ContentSuggestion[]> => {
    const response = await apiRequest('GET', '/api/ai/content-suggestions');
    return response.json();
  },

  sendEmail: async (templateId: number, recipientId: number, recipientType: string) => {
    const response = await apiRequest('POST', '/api/emails/send', {
      templateId,
      recipientId,
      recipientType
    });
    return response.json();
  },

  updateInvoice: async (id: number, updates: any) => {
    const response = await apiRequest('PUT', `/api/invoices/${id}`, updates);
    return response.json();
  },

  updateClient: async (id: number, updates: any) => {
    const response = await apiRequest('PUT', `/api/clients/${id}`, updates);
    return response.json();
  },

  updateLead: async (id: number, updates: any) => {
    const response = await apiRequest('PUT', `/api/leads/${id}`, updates);
    return response.json();
  },

  createEmailTemplate: async (template: any) => {
    const response = await apiRequest('POST', '/api/email-templates', template);
    return response.json();
  }
};
