import { 
  clients, invoices, leads, content_reports, client_engagements, ai_suggestions,
  type Client, type InsertClient, type Invoice, type InsertInvoice,
  type Lead, type InsertLead, type ContentReport, type InsertContentReport,
  type ClientEngagement, type InsertClientEngagement,
  type AiSuggestion, type InsertAiSuggestion,
  users, type User, type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined>;

  // Invoices
  getAllInvoices(): Promise<(Invoice & { client: Client })[]>;
  getInvoicesByClient(clientId: number): Promise<Invoice[]>;
  getOverdueInvoices(): Promise<(Invoice & { client: Client })[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  getLeadsByStage(stage: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined>;

  // Content Reports
  getAllContentReports(): Promise<ContentReport[]>;
  getRecentReports(limit?: number): Promise<ContentReport[]>;
  createContentReport(report: InsertContentReport): Promise<ContentReport>;

  // Client Engagements
  getClientEngagements(clientId: number): Promise<(ClientEngagement & { report: ContentReport })[]>;
  createClientEngagement(engagement: InsertClientEngagement): Promise<ClientEngagement>;

  // AI Suggestions
  getAiSuggestions(targetType?: string, priority?: string): Promise<AiSuggestion[]>;
  createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion>;
  updateAiSuggestion(id: number, updates: Partial<InsertAiSuggestion>): Promise<AiSuggestion | undefined>;

  // Dashboard Analytics
  getDashboardStats(): Promise<{
    outstandingInvoices: number;
    overdueCount: number;
    activeLeads: number;
    avgEngagement: number;
    atRiskRenewals: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private clients: Map<number, Client> = new Map();
  private invoices: Map<number, Invoice> = new Map();
  private leads: Map<number, Lead> = new Map();
  private contentReports: Map<number, ContentReport> = new Map();
  private clientEngagements: Map<number, ClientEngagement> = new Map();
  private aiSuggestions: Map<number, AiSuggestion> = new Map();
  
  private currentUserId = 1;
  private currentClientId = 1;
  private currentInvoiceId = 1;
  private currentLeadId = 1;
  private currentReportId = 1;
  private currentEngagementId = 1;
  private currentSuggestionId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create sample clients
    const sampleClients: InsertClient[] = [
      {
        name: "Acme Corp",
        email: "contact@acme.com",
        company: "Acme Corp",
        subscription_type: "standard",
        renewal_date: new Date("2025-07-15"),
        engagement_rate: "75.5",
        click_rate: "32.0",
        interest_tags: ["Tech", "Semiconductors"],
        risk_level: "medium",
        notes: "High engagement with tech content"
      },
      {
        name: "Beta Fund",
        email: "info@betafund.com", 
        company: "Beta Fund",
        subscription_type: "premium",
        renewal_date: new Date("2025-06-15"),
        engagement_rate: "85.0",
        click_rate: "42.0",
        interest_tags: ["AI", "Energy", "CleanTech"],
        risk_level: "medium",
        notes: "Interested in AI and energy markets"
      },
      {
        name: "TechStart Inc",
        email: "hello@techstart.com",
        company: "TechStart Inc", 
        subscription_type: "standard",
        renewal_date: new Date("2025-08-20"),
        engagement_rate: "90.0",
        click_rate: "45.0",
        interest_tags: ["Tech", "AI", "Innovation"],
        risk_level: "low",
        notes: "Upgrade candidate - high engagement"
      },
      {
        name: "GlobalFund LLC",
        email: "contact@globalfund.com",
        company: "GlobalFund LLC",
        subscription_type: "standard", 
        renewal_date: new Date("2025-07-10"),
        engagement_rate: "65.0",
        click_rate: "28.0",
        interest_tags: ["Healthcare", "Biotech"],
        risk_level: "low",
        notes: "Steady engagement"
      },
      {
        name: "Quantum Holdings",
        email: "info@quantum.com",
        company: "Quantum Holdings",
        subscription_type: "premium",
        renewal_date: new Date("2025-06-08"),
        engagement_rate: "35.0", 
        click_rate: "15.0",
        interest_tags: ["Finance"],
        risk_level: "high",
        notes: "Low engagement - at risk"
      }
    ];

    sampleClients.forEach(client => this.createClient(client));

    // Create sample invoices
    const sampleInvoices: InsertInvoice[] = [
      {
        client_id: 1,
        invoice_number: "INV-12345",
        amount: "15000.00",
        sent_date: new Date("2025-05-15"),
        payment_status: "overdue"
      },
      {
        client_id: 3,
        invoice_number: "INV-12346", 
        amount: "8500.00",
        sent_date: new Date("2025-05-28"),
        payment_status: "pending"
      },
      {
        client_id: 4,
        invoice_number: "INV-12347",
        amount: "24000.00",
        sent_date: new Date("2025-05-30"),
        payment_status: "paid"
      }
    ];

    sampleInvoices.forEach(invoice => this.createInvoice(invoice));

    // Create sample leads
    const sampleLeads: InsertLead[] = [
      {
        name: "Jane Doe",
        email: "jane@abccapital.com",
        company: "ABC Capital",
        stage: "qualified",
        last_contact: new Date("2025-05-20"),
        next_step: "Schedule discovery call",
        notes: "Focuses on precious metals and emerging markets",
        interest_tags: ["Precious Metals", "Emerging Markets"]
      },
      {
        name: "Growth Partners",
        email: "contact@growthpartners.com", 
        company: "Growth Partners",
        stage: "qualified",
        last_contact: new Date("2025-05-25"),
        next_step: "Send proposal",
        notes: "Needs assessment complete - high interest",
        interest_tags: ["Tech", "AI Investing"]
      },
      {
        name: "Digital Ventures",
        email: "info@digitalventures.com",
        company: "Digital Ventures", 
        stage: "prospect",
        last_contact: new Date("2025-06-02"),
        next_step: "Send intro email",
        notes: "Initial contact made",
        interest_tags: []
      },
      {
        name: "Alpha Investments",
        email: "contact@alphainv.com",
        company: "Alpha Investments",
        stage: "proposal",
        last_contact: new Date("2025-06-01"),
        next_step: "Follow up on proposal",
        notes: "$25K proposal sent - awaiting response",
        interest_tags: ["Tech", "Healthcare"]
      }
    ];

    sampleLeads.forEach(lead => this.createLead(lead));

    // Create sample content reports
    const sampleReports: InsertContentReport[] = [
      {
        title: "Report #66 – Global Tech Trends",
        type: "Report",
        published_date: new Date("2025-05-10"),
        open_rate: "72.0",
        click_rate: "35.0", 
        engagement_level: "high",
        tags: ["Tech", "Global", "Trends"]
      },
      {
        title: "Report #65 – AI & Energy Markets",
        type: "Report",
        published_date: new Date("2025-04-30"),
        open_rate: "64.0",
        click_rate: "28.0",
        engagement_level: "medium", 
        tags: ["AI", "Energy", "Markets"]
      },
      {
        title: "Report #64 – Healthcare Innovation",
        type: "Report",
        published_date: new Date("2025-04-15"),
        open_rate: "45.0",
        click_rate: "18.0",
        engagement_level: "low",
        tags: ["Healthcare", "Innovation", "Biotech"]
      }
    ];

    sampleReports.forEach(report => this.createContentReport(report));
  }

  // Users implementation
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Clients implementation
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = { 
      ...insertClient, 
      id,
      created_at: new Date()
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...updates };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  // Invoices implementation  
  async getAllInvoices(): Promise<(Invoice & { client: Client })[]> {
    const invoices = Array.from(this.invoices.values());
    return invoices.map(invoice => ({
      ...invoice,
      client: this.clients.get(invoice.client_id)!
    }));
  }

  async getInvoicesByClient(clientId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.client_id === clientId);
  }

  async getOverdueInvoices(): Promise<(Invoice & { client: Client })[]> {
    const invoices = Array.from(this.invoices.values()).filter(
      invoice => invoice.payment_status === "overdue"
    );
    return invoices.map(invoice => ({
      ...invoice,
      client: this.clients.get(invoice.client_id)!
    }));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.currentInvoiceId++;
    const invoice: Invoice = {
      ...insertInvoice,
      id,
      created_at: new Date()
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...updates };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  // Leads implementation
  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.stage === stage);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.currentLeadId++;
    const lead: Lead = {
      ...insertLead,
      id,
      created_at: new Date()
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    
    const updatedLead = { ...lead, ...updates };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  // Content Reports implementation
  async getAllContentReports(): Promise<ContentReport[]> {
    return Array.from(this.contentReports.values());
  }

  async getRecentReports(limit = 5): Promise<ContentReport[]> {
    return Array.from(this.contentReports.values())
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
      .slice(0, limit);
  }

  async createContentReport(insertReport: InsertContentReport): Promise<ContentReport> {
    const id = this.currentReportId++;
    const report: ContentReport = {
      ...insertReport,
      id,
      created_at: new Date()
    };
    this.contentReports.set(id, report);
    return report;
  }

  // Client Engagements implementation
  async getClientEngagements(clientId: number): Promise<(ClientEngagement & { report: ContentReport })[]> {
    const engagements = Array.from(this.clientEngagements.values()).filter(
      engagement => engagement.client_id === clientId
    );
    return engagements.map(engagement => ({
      ...engagement,
      report: this.contentReports.get(engagement.report_id)!
    }));
  }

  async createClientEngagement(insertEngagement: InsertClientEngagement): Promise<ClientEngagement> {
    const id = this.currentEngagementId++;
    const engagement: ClientEngagement = {
      ...insertEngagement,
      id
    };
    this.clientEngagements.set(id, engagement);
    return engagement;
  }

  // AI Suggestions implementation
  async getAiSuggestions(targetType?: string, priority?: string): Promise<AiSuggestion[]> {
    let suggestions = Array.from(this.aiSuggestions.values());
    
    if (targetType) {
      suggestions = suggestions.filter(s => s.target_type === targetType);
    }
    
    if (priority) {
      suggestions = suggestions.filter(s => s.priority === priority);
    }
    
    return suggestions.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
  }

  async createAiSuggestion(insertSuggestion: InsertAiSuggestion): Promise<AiSuggestion> {
    const id = this.currentSuggestionId++;
    const suggestion: AiSuggestion = {
      ...insertSuggestion,
      id,
      created_at: new Date()
    };
    this.aiSuggestions.set(id, suggestion);
    return suggestion;
  }

  async updateAiSuggestion(id: number, updates: Partial<InsertAiSuggestion>): Promise<AiSuggestion | undefined> {
    const suggestion = this.aiSuggestions.get(id);
    if (!suggestion) return undefined;
    
    const updatedSuggestion = { ...suggestion, ...updates };
    this.aiSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }

  // Dashboard Analytics implementation
  async getDashboardStats(): Promise<{
    outstandingInvoices: number;
    overdueCount: number;
    activeLeads: number;
    avgEngagement: number;
    atRiskRenewals: number;
  }> {
    const invoices = Array.from(this.invoices.values());
    const clients = Array.from(this.clients.values());
    const leads = Array.from(this.leads.values());

    const outstandingInvoices = invoices
      .filter(inv => inv.payment_status !== "paid")
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    const overdueCount = invoices.filter(inv => inv.payment_status === "overdue").length;
    
    const activeLeads = leads.filter(lead => 
      ["prospect", "qualified", "proposal"].includes(lead.stage)
    ).length;

    const avgEngagement = clients.reduce((sum, client) => 
      sum + parseFloat(client.engagement_rate || "0"), 0
    ) / clients.length;

    const atRiskRenewals = clients.filter(client => client.risk_level === "high").length;

    return {
      outstandingInvoices,
      overdueCount,
      activeLeads,
      avgEngagement,
      atRiskRenewals
    };
  }
}

export const storage = new DatabaseStorage();
