import { 
  clients, invoices, leads, content_reports, client_engagements, ai_suggestions, email_history,
  type Client, type InsertClient, type Invoice, type InsertInvoice,
  type Lead, type InsertLead, type ContentReport, type InsertContentReport,
  type ClientEngagement, type InsertClientEngagement,
  type AiSuggestion, type InsertAiSuggestion, type EmailHistory, type InsertEmailHistory,
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
  deleteInvoice(id: number): Promise<boolean>;

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

  // Invoice detail methods
  getInvoiceWithClient(id: number): Promise<(Invoice & { client: Client }) | undefined>;
  
  // Email history methods
  getEmailHistory(invoiceId: number): Promise<EmailHistory[]>;
  createEmailHistory(emailData: InsertEmailHistory): Promise<EmailHistory>;
  deleteEmailHistory(emailId: number): Promise<boolean>;
  deleteAllEmailHistory(invoiceId: number): Promise<boolean>;
  
  // AI suggestions for invoices
  getInvoiceAISuggestion(invoiceId: number): Promise<any>;
  generateInvoiceFollowUp(invoice: any, emailHistory: EmailHistory[]): Promise<any>;
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
    const result = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.client_id, clients.id));
    
    return result.map(row => {
      const invoice = row.invoices;
      const client = row.clients!;
      
      // Calculate days overdue from due date
      const currentDate = new Date();
      const dueDate = new Date(invoice.due_date);
      const timeDiff = currentDate.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      return {
        ...invoice,
        payment_status: `${Math.max(0, daysOverdue)} days`,
        client: client
      };
    });
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

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(eq(invoices.id, id));
    return (result.rowCount || 0) > 0;
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

  async getInvoiceWithClient(id: number): Promise<(Invoice & { client: Client }) | undefined> {
    const [result] = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.client_id, clients.id))
      .where(eq(invoices.id, id));

    if (!result || !result.clients) {
      return undefined;
    }

    return {
      ...result.invoices,
      client: result.clients
    };
  }

  async getEmailHistory(invoiceId: number): Promise<EmailHistory[]> {
    return await db
      .select()
      .from(email_history)
      .where(eq(email_history.invoice_id, invoiceId))
      .orderBy(desc(email_history.sent_date));
  }

  async createEmailHistory(emailData: InsertEmailHistory): Promise<EmailHistory> {
    const [email] = await db
      .insert(email_history)
      .values(emailData)
      .returning();
    return email;
  }

  async deleteEmailHistory(emailId: number): Promise<boolean> {
    const result = await db
      .delete(email_history)
      .where(eq(email_history.id, emailId));
    return true;
  }

  async deleteAllEmailHistory(invoiceId: number): Promise<boolean> {
    const result = await db
      .delete(email_history)
      .where(eq(email_history.invoice_id, invoiceId));
    return true;
  }

  async getInvoiceAISuggestion(invoiceId: number): Promise<any> {
    const invoice = await this.getInvoiceWithClient(invoiceId);
    const emailHistory = await this.getEmailHistory(invoiceId);
    
    if (!invoice) {
      return null;
    }

    return this.generateInvoiceFollowUp(invoice, emailHistory);
  }

  async generateInvoiceFollowUp(invoice: any, emailHistory: EmailHistory[]): Promise<any> {
    // Fix NaN calculation by using due_date instead of sent_date
    const daysOverdue = invoice.due_date ? 
      Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    const lastEmail = emailHistory[0];
    const daysSinceLastEmail = lastEmail ? 
      Math.floor((Date.now() - new Date(lastEmail.sent_date).getTime()) / (1000 * 60 * 60 * 24)) : null;

    // Format amount with commas and no decimal places for whole numbers
    const formatAmount = (amount: string) => {
      const num = parseFloat(amount);
      return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    };

    let suggestion = {
      subject: `Follow up on Invoice ${invoice.invoice_number}`,
      body: `Dear ${invoice.client.name},\n\nI hope this message finds you well. I wanted to follow up regarding your outstanding invoice (${invoice.client.company} - ${invoice.invoice_number}) for ${formatAmount(invoice.amount)}, which is now ${daysOverdue} days overdue.`,
      reason: `Invoice is ${daysOverdue} days overdue`,
      priority: "medium" as const
    };

    if (daysOverdue > 60) {
      suggestion.priority = "high";
      suggestion.body += `\n\nThis invoice is now significantly overdue (${daysOverdue} days). We would appreciate your immediate attention to resolve this matter.`;
      suggestion.reason = `Critical: ${daysOverdue} days overdue`;
    } else if (daysOverdue > 30) {
      suggestion.priority = "high";
      suggestion.body += `\n\nThis invoice is ${daysOverdue} days overdue. Please let us know when we can expect payment or if there are any issues we can help resolve.`;
    } else if (daysOverdue > 0) {
      suggestion.body += `\n\nThis invoice is ${daysOverdue} days past due. We would appreciate payment at your earliest convenience.`;
    }

    if (lastEmail && daysSinceLastEmail) {
      suggestion.body += `\n\nI notice our last communication was ${daysSinceLastEmail} days ago. Please don't hesitate to reach out if you have any questions or concerns.`;
      suggestion.reason += `, last email ${daysSinceLastEmail} days ago`;
    }

    suggestion.body += `\n\nThank you for your prompt attention to this matter.\n\nBest regards`;

    return suggestion;
  }
}

export const storage = new DatabaseStorage();