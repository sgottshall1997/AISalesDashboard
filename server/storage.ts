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
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(insertClient)
      .returning();
    return client;
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning();
    return client || undefined;
  }

  async getAllInvoices(): Promise<(Invoice & { client: Client })[]> {
    return await db
      .select({
        id: invoices.id,
        client_id: invoices.client_id,
        invoice_number: invoices.invoice_number,
        amount: invoices.amount,
        sent_date: invoices.sent_date,
        payment_status: invoices.payment_status,
        last_reminder_sent: invoices.last_reminder_sent,
        created_at: invoices.created_at,
        client: clients
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.client_id, clients.id));
  }

  async getInvoicesByClient(clientId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.client_id, clientId));
  }

  async getOverdueInvoices(): Promise<(Invoice & { client: Client })[]> {
    return await db
      .select({
        id: invoices.id,
        client_id: invoices.client_id,
        invoice_number: invoices.invoice_number,
        amount: invoices.amount,
        sent_date: invoices.sent_date,
        payment_status: invoices.payment_status,
        last_reminder_sent: invoices.last_reminder_sent,
        created_at: invoices.created_at,
        client: clients
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.client_id, clients.id))
      .where(eq(invoices.payment_status, "overdue"));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.stage, stage));
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values(insertLead)
      .returning();
    return lead;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async getAllContentReports(): Promise<ContentReport[]> {
    return await db.select().from(content_reports);
  }

  async getRecentReports(limit = 5): Promise<ContentReport[]> {
    return await db
      .select()
      .from(content_reports)
      .orderBy(desc(content_reports.published_date))
      .limit(limit);
  }

  async createContentReport(insertReport: InsertContentReport): Promise<ContentReport> {
    const [report] = await db
      .insert(content_reports)
      .values(insertReport)
      .returning();
    return report;
  }

  async getClientEngagements(clientId: number): Promise<(ClientEngagement & { report: ContentReport })[]> {
    return await db
      .select({
        id: client_engagements.id,
        client_id: client_engagements.client_id,
        report_id: client_engagements.report_id,
        opened: client_engagements.opened,
        clicked: client_engagements.clicked,
        engagement_date: client_engagements.engagement_date,
        report: content_reports
      })
      .from(client_engagements)
      .leftJoin(content_reports, eq(client_engagements.report_id, content_reports.id))
      .where(eq(client_engagements.client_id, clientId));
  }

  async createClientEngagement(insertEngagement: InsertClientEngagement): Promise<ClientEngagement> {
    const [engagement] = await db
      .insert(client_engagements)
      .values(insertEngagement)
      .returning();
    return engagement;
  }

  async getAiSuggestions(targetType?: string, priority?: string): Promise<AiSuggestion[]> {
    let query = db.select().from(ai_suggestions);
    
    if (targetType && priority) {
      return await query.where(and(eq(ai_suggestions.target_type, targetType), eq(ai_suggestions.priority, priority)));
    } else if (targetType) {
      return await query.where(eq(ai_suggestions.target_type, targetType));
    } else if (priority) {
      return await query.where(eq(ai_suggestions.priority, priority));
    }
    
    return await query;
  }

  async createAiSuggestion(insertSuggestion: InsertAiSuggestion): Promise<AiSuggestion> {
    const [suggestion] = await db
      .insert(ai_suggestions)
      .values(insertSuggestion)
      .returning();
    return suggestion;
  }

  async updateAiSuggestion(id: number, updates: Partial<InsertAiSuggestion>): Promise<AiSuggestion | undefined> {
    const [suggestion] = await db
      .update(ai_suggestions)
      .set(updates)
      .where(eq(ai_suggestions.id, id))
      .returning();
    return suggestion || undefined;
  }

  async getDashboardStats(): Promise<{
    outstandingInvoices: number;
    overdueCount: number;
    activeLeads: number;
    avgEngagement: number;
    atRiskRenewals: number;
  }> {
    const [outstandingResult] = await db
      .select({ sum: sql`COALESCE(SUM(CAST(${invoices.amount} AS DECIMAL)), 0)` })
      .from(invoices)
      .where(sql`${invoices.payment_status} != 'paid'`);

    const [overdueResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(invoices)
      .where(eq(invoices.payment_status, "overdue"));

    const [activeLeadsResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(leads)
      .where(sql`${leads.stage} IN ('prospect', 'qualified', 'proposal')`);

    const [avgEngagementResult] = await db
      .select({ avg: sql`COALESCE(AVG(CAST(${clients.engagement_rate} AS DECIMAL)), 0)` })
      .from(clients)
      .where(sql`${clients.engagement_rate} IS NOT NULL`);

    const [atRiskResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(clients)
      .where(eq(clients.risk_level, "high"));

    return {
      outstandingInvoices: Number(outstandingResult.sum) || 0,
      overdueCount: Number(overdueResult.count) || 0,
      activeLeads: Number(activeLeadsResult.count) || 0,
      avgEngagement: Number(avgEngagementResult.avg) || 0,
      atRiskRenewals: Number(atRiskResult.count) || 0
    };
  }
}

export const storage = new DatabaseStorage();