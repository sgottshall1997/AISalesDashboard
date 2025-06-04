import {
  clients,
  invoices,
  leads,
  contentReports,
  clientEngagement,
  aiEmails,
  type Client,
  type InsertClient,
  type Invoice,
  type InsertInvoice,
  type Lead,
  type InsertLead,
  type ContentReport,
  type InsertContentReport,
  type ClientEngagement,
  type InsertClientEngagement,
  type AiEmail,
  type InsertAiEmail,
  users,
  type User,
  type InsertUser,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;

  // Invoices
  getAllInvoices(): Promise<(Invoice & { clientName: string })[]>;
  getInvoicesByClient(clientId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;

  // Content Reports
  getAllContentReports(): Promise<ContentReport[]>;
  getContentReport(id: number): Promise<ContentReport | undefined>;
  createContentReport(report: InsertContentReport): Promise<ContentReport>;

  // Client Engagement
  getClientEngagement(clientId: number): Promise<ClientEngagement[]>;
  createClientEngagement(engagement: InsertClientEngagement): Promise<ClientEngagement>;

  // AI Emails
  getAllAiEmails(): Promise<AiEmail[]>;
  getAiEmail(id: number): Promise<AiEmail | undefined>;
  createAiEmail(email: InsertAiEmail): Promise<AiEmail>;
  updateAiEmail(id: number, email: Partial<InsertAiEmail>): Promise<AiEmail | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private invoices: Map<number, Invoice>;
  private leads: Map<number, Lead>;
  private contentReports: Map<number, ContentReport>;
  private clientEngagements: Map<number, ClientEngagement>;
  private aiEmails: Map<number, AiEmail>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.invoices = new Map();
    this.leads = new Map();
    this.contentReports = new Map();
    this.clientEngagements = new Map();
    this.aiEmails = new Map();
    this.currentId = 1;
    this.initializeData();
  }

  private initializeData() {
    // Initialize with sample data for a working prototype
    const sampleClients: Client[] = [
      {
        id: this.currentId++,
        name: "Acme Corp",
        contactEmail: "contact@acmecorp.com",
        industry: "Technology",
        interestTags: ["Tech", "Semiconductors"],
        riskLevel: "medium",
        engagementRate: "60",
        renewalDate: new Date("2025-08-15"),
        subscriptionValue: "15000",
        notes: "Interested in chip shortage analysis",
      },
      {
        id: this.currentId++,
        name: "Beta Fund",
        contactEmail: "info@betafund.com",
        industry: "Investment",
        interestTags: ["AI", "Energy"],
        riskLevel: "medium",
        engagementRate: "85",
        renewalDate: new Date("2025-06-15"),
        subscriptionValue: "25000",
        notes: "High engagement with AI and energy content",
      },
      {
        id: this.currentId++,
        name: "TechStart Inc",
        contactEmail: "team@techstart.com",
        industry: "Startup",
        interestTags: ["Tech", "AI"],
        riskLevel: "low",
        engagementRate: "90",
        renewalDate: new Date("2025-08-20"),
        subscriptionValue: "12000",
        notes: "Upgrade candidate for premium tier",
      },
      {
        id: this.currentId++,
        name: "GlobalFund LLC",
        contactEmail: "contact@globalfund.com",
        industry: "Investment",
        interestTags: ["Global Markets"],
        riskLevel: "low",
        engagementRate: "65",
        renewalDate: new Date("2025-07-10"),
        subscriptionValue: "24000",
        notes: "Standard renewal approach",
      },
      {
        id: this.currentId++,
        name: "Quantum Holdings",
        contactEmail: "admin@quantum.com",
        industry: "Investment",
        interestTags: ["Quantum", "Tech"],
        riskLevel: "high",
        engagementRate: "35",
        renewalDate: new Date("2025-06-08"),
        subscriptionValue: "18000",
        notes: "Low engagement, high churn risk",
      }
    ];

    sampleClients.forEach(client => this.clients.set(client.id, client));

    // Initialize sample invoices
    const sampleInvoices: Invoice[] = [
      {
        id: this.currentId++,
        clientId: 1, // Acme Corp
        amount: "15000",
        sentDate: new Date("2025-05-15"),
        dueDate: new Date("2025-06-14"),
        status: "overdue",
        remindersSent: 2,
        lastReminderDate: new Date("2025-06-01"),
      },
      {
        id: this.currentId++,
        clientId: 2, // Beta Fund
        amount: "8500",
        sentDate: new Date("2025-05-28"),
        dueDate: new Date("2025-06-27"),
        status: "pending",
        remindersSent: 0,
        lastReminderDate: null,
      },
      {
        id: this.currentId++,
        clientId: 4, // GlobalFund LLC
        amount: "24000",
        sentDate: new Date("2025-05-30"),
        dueDate: new Date("2025-06-29"),
        status: "paid",
        remindersSent: 0,
        lastReminderDate: null,
      }
    ];

    sampleInvoices.forEach(invoice => this.invoices.set(invoice.id, invoice));

    // Initialize sample leads
    const sampleLeads: Lead[] = [
      {
        id: this.currentId++,
        name: "Jane Doe",
        company: "ABC Capital",
        email: "jane@abccapital.com",
        stage: "qualified",
        source: "LinkedIn",
        interestTags: ["Precious metals", "Emerging markets"],
        lastContact: new Date("2025-05-20"),
        nextStep: "Schedule discovery call",
        proposalValue: "20000",
        notes: "Focuses on precious metals and emerging markets",
      },
      {
        id: this.currentId++,
        name: "John Smith",
        company: "Growth Partners",
        email: "john@growthpartners.com",
        stage: "qualified",
        source: "Referral",
        interestTags: ["Tech", "AI investing"],
        lastContact: new Date("2025-05-25"),
        nextStep: "Send proposal",
        proposalValue: "30000",
        notes: "High interest in AI investing and tech trends",
      },
      {
        id: this.currentId++,
        name: "Sarah Wilson",
        company: "Alpha Investments",
        email: "sarah@alphainv.com",
        stage: "proposal",
        source: "Website",
        interestTags: ["Finance", "Markets"],
        lastContact: new Date("2025-06-01"),
        nextStep: "Follow up on proposal",
        proposalValue: "25000",
        notes: "Proposal sent 3 days ago",
      },
      {
        id: this.currentId++,
        name: "Mike Brown",
        company: "Digital Ventures",
        email: "mike@digitalventures.com",
        stage: "prospect",
        source: "Cold outreach",
        interestTags: ["Digital", "Innovation"],
        lastContact: new Date("2025-06-02"),
        nextStep: "Send intro email",
        proposalValue: null,
        notes: "Initial contact made",
      }
    ];

    sampleLeads.forEach(lead => this.leads.set(lead.id, lead));

    // Initialize sample content reports
    const sampleReports: ContentReport[] = [
      {
        id: this.currentId++,
        title: "WILTW #66 – Global Tech Trends",
        publishDate: new Date("2025-05-10"),
        openRate: "72",
        clickRate: "35",
        totalSent: 156,
        category: "Technology",
      },
      {
        id: this.currentId++,
        title: "WILTW #65 – AI & Energy Markets",
        publishDate: new Date("2025-04-30"),
        openRate: "64",
        clickRate: "28",
        totalSent: 148,
        category: "Energy",
      },
      {
        id: this.currentId++,
        title: "WILTW #64 – Healthcare Innovation",
        publishDate: new Date("2025-04-15"),
        openRate: "45",
        clickRate: "18",
        totalSent: 145,
        category: "Healthcare",
      }
    ];

    sampleReports.forEach(report => this.contentReports.set(report.id, report));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Client methods
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentId++;
    const client: Client = { ...insertClient, id };
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

  // Invoice methods
  async getAllInvoices(): Promise<(Invoice & { clientName: string })[]> {
    const invoices = Array.from(this.invoices.values());
    return invoices.map(invoice => {
      const client = this.clients.get(invoice.clientId);
      return {
        ...invoice,
        clientName: client?.name || "Unknown Client",
      };
    });
  }

  async getInvoicesByClient(clientId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.clientId === clientId);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.currentId++;
    const invoice: Invoice = { ...insertInvoice, id };
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

  // Lead methods
  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.currentId++;
    const lead: Lead = { ...insertLead, id };
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

  // Content Report methods
  async getAllContentReports(): Promise<ContentReport[]> {
    return Array.from(this.contentReports.values()).sort((a, b) => 
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  }

  async getContentReport(id: number): Promise<ContentReport | undefined> {
    return this.contentReports.get(id);
  }

  async createContentReport(insertReport: InsertContentReport): Promise<ContentReport> {
    const id = this.currentId++;
    const report: ContentReport = { ...insertReport, id };
    this.contentReports.set(id, report);
    return report;
  }

  // Client Engagement methods
  async getClientEngagement(clientId: number): Promise<ClientEngagement[]> {
    return Array.from(this.clientEngagements.values()).filter(
      engagement => engagement.clientId === clientId
    );
  }

  async createClientEngagement(insertEngagement: InsertClientEngagement): Promise<ClientEngagement> {
    const id = this.currentId++;
    const engagement: ClientEngagement = { ...insertEngagement, id };
    this.clientEngagements.set(id, engagement);
    return engagement;
  }

  // AI Email methods
  async getAllAiEmails(): Promise<AiEmail[]> {
    return Array.from(this.aiEmails.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getAiEmail(id: number): Promise<AiEmail | undefined> {
    return this.aiEmails.get(id);
  }

  async createAiEmail(insertEmail: InsertAiEmail): Promise<AiEmail> {
    const id = this.currentId++;
    const email: AiEmail = { 
      ...insertEmail, 
      id,
      createdAt: insertEmail.createdAt || new Date(),
    };
    this.aiEmails.set(id, email);
    return email;
  }

  async updateAiEmail(id: number, updates: Partial<InsertAiEmail>): Promise<AiEmail | undefined> {
    const email = this.aiEmails.get(id);
    if (!email) return undefined;
    
    const updatedEmail = { ...email, ...updates };
    this.aiEmails.set(id, updatedEmail);
    return updatedEmail;
  }
}

export const storage = new MemStorage();
