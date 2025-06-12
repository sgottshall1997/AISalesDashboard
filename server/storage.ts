import { 
  clients, invoices, leads, content_reports, client_engagements, ai_suggestions, email_history, reading_history, lead_email_history, report_summaries, tasks,
  ai_generated_content, ai_content_feedback, feedback,
  type Client, type InsertClient, type Invoice, type InsertInvoice,
  type Lead, type InsertLead, type ContentReport, type InsertContentReport,
  type ClientEngagement, type InsertClientEngagement,
  type AiSuggestion, type InsertAiSuggestion, type EmailHistory, type InsertEmailHistory,
  type ReadingHistory, type InsertReadingHistory, type LeadEmailHistory, type InsertLeadEmailHistory,
  type ReportSummary, type InsertReportSummary, type Task, type InsertTask,
  type AiGeneratedContent, type InsertAiGeneratedContent, type AiContentFeedback, type InsertAiContentFeedback,
  type Feedback, type InsertFeedback,
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
  deleteLead(id: number): Promise<boolean>;

  // Content Reports
  getAllContentReports(): Promise<ContentReport[]>;
  getRecentReports(limit?: number): Promise<ContentReport[]>;
  createContentReport(report: InsertContentReport): Promise<ContentReport>;
  deleteContentReport(id: number): Promise<boolean>;
  getContentReportsWithoutSummaries(reportType?: string): Promise<ContentReport[]>;

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
  
  // Invoice aging analytics
  getInvoiceAging(): Promise<{
    bucket_0_29: { count: number; amount: number };
    bucket_30_59: { count: number; amount: number };
    bucket_60_89: { count: number; amount: number };
    bucket_90_plus: { count: number; amount: number };
  }>;

  // Invoice detail methods
  getInvoiceWithClient(id: number): Promise<(Invoice & { client: Client }) | undefined>;
  
  // Email history methods
  getEmailHistory(invoiceId: number): Promise<EmailHistory[]>;
  createEmailHistory(emailData: InsertEmailHistory): Promise<EmailHistory>;
  deleteEmailHistory(emailId: number): Promise<boolean>;
  deleteAllEmailHistory(invoiceId: number): Promise<boolean>;
  
  // Reading history methods
  getAllReadingHistory(): Promise<(ReadingHistory & { client: Client })[]>;
  createReadingHistory(data: InsertReadingHistory): Promise<ReadingHistory>;
  deleteReadingHistory(id: number): Promise<boolean>;
  
  // Lead email history methods
  getLeadEmailHistory(leadId: number): Promise<LeadEmailHistory[]>;
  createLeadEmailHistory(emailData: InsertLeadEmailHistory): Promise<LeadEmailHistory>;
  deleteLeadEmailHistory(emailId: number): Promise<boolean>;
  deleteAllLeadEmailHistory(leadId: number): Promise<boolean>;
  
  // Report summaries
  getReportSummary(contentReportId: number): Promise<ReportSummary | undefined>;
  createReportSummary(summary: InsertReportSummary): Promise<ReportSummary>;
  updateReportSummary(id: number, updates: Partial<InsertReportSummary>): Promise<ReportSummary | undefined>;
  getAllReportSummaries(): Promise<(ReportSummary & { report: ContentReport })[]>;

  // AI suggestions for invoices and leads
  getInvoiceAISuggestion(invoiceId: number): Promise<any>;
  generateInvoiceFollowUp(invoice: any, emailHistory: EmailHistory[]): Promise<any>;
  getLeadAISuggestion(leadId: number): Promise<any>;
  generateLeadFollowUp(lead: any, emailHistory: LeadEmailHistory[], contentReports: ContentReport[], reportSummaries?: ReportSummary[]): Promise<any>;

  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // AI Feedback Loop
  createAiGeneratedContent(content: InsertAiGeneratedContent): Promise<AiGeneratedContent>;
  saveAIContent(content: { type: string; content: string; metadata?: any }): Promise<AiGeneratedContent>;
  createAiContentFeedback(feedback: InsertAiContentFeedback): Promise<AiContentFeedback>;
  getAiGeneratedContentWithFeedback(contentId: number): Promise<(AiGeneratedContent & { feedback: AiContentFeedback[] }) | undefined>;
  getAiFeedbackAnalytics(): Promise<{
    totalContent: number;
    totalFeedback: number;
    thumbsUpCount: number;
    thumbsDownCount: number;
    avgRating: number;
    feedbackByType: { [key: string]: number };
  }>;

  // General Feedback System
  addFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedbackAnalytics(): Promise<{
    totalFeedback: number;
    thumbsUpCount: number;
    thumbsDownCount: number;
    avgRating: number;
    feedbackByType: { [key: string]: number };
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
        due_date: invoices.due_date,
        payment_status: invoices.payment_status,
        last_reminder_sent: invoices.last_reminder_sent,
        notes: invoices.notes,
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
    // First delete all email history records for this invoice
    await db
      .delete(email_history)
      .where(eq(email_history.invoice_id, id));
    
    // Then delete the invoice
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

  async deleteLead(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(leads)
        .where(eq(leads.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting lead:', error);
      return false;
    }
  }

  async getAllContentReports(): Promise<ContentReport[]> {
    return await db
      .select()
      .from(content_reports)
      .orderBy(desc(content_reports.published_date), desc(content_reports.created_at));
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

  async deleteContentReport(id: number): Promise<boolean> {
    try {
      // First delete related report summaries
      await db
        .delete(report_summaries)
        .where(eq(report_summaries.content_report_id, id));
      
      // Then delete related client engagements
      await db
        .delete(client_engagements)
        .where(eq(client_engagements.report_id, id));
      
      // Finally delete the content report
      const result = await db
        .delete(content_reports)
        .where(eq(content_reports.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting content report:', error);
      return false;
    }
  }

  async getContentReportsWithoutSummaries(reportType?: string): Promise<ContentReport[]> {
    // Use a subquery to find reports without summaries
    let query = db
      .select()
      .from(content_reports)
      .where(sql`${content_reports.id} NOT IN (SELECT content_report_id FROM report_summaries WHERE content_report_id IS NOT NULL)`);

    // Exclude parsed summaries
    query = query.where(sql`${content_reports.title} NOT LIKE 'Parsed Summary%'`);

    // Filter by report type if specified
    if (reportType) {
      query = query.where(sql`${content_reports.title} LIKE ${'%' + reportType + '%'}`);
    }

    const reportsWithoutSummaries = await query.orderBy(desc(content_reports.published_date));
    return reportsWithoutSummaries;
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
      .select({
        id: invoices.id,
        client_id: invoices.client_id,
        invoice_number: invoices.invoice_number,
        amount: invoices.amount,
        due_date: invoices.due_date,
        payment_status: invoices.payment_status,
        last_reminder_sent: invoices.last_reminder_sent,
        notes: invoices.notes,
        created_at: invoices.created_at,
        client: clients
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.client_id, clients.id))
      .where(eq(invoices.id, id));

    if (!result || !result.client) {
      return undefined;
    }

    return {
      id: result.id,
      client_id: result.client_id,
      invoice_number: result.invoice_number,
      amount: result.amount,
      due_date: result.due_date,
      payment_status: result.payment_status,
      last_reminder_sent: result.last_reminder_sent,
      notes: result.notes,
      created_at: result.created_at,
      client: result.client
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
    const daysOverdue = invoice.due_date ? 
      Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Format amount with commas and no decimal places for whole numbers
    const formatAmount = (amount: string) => {
      const num = parseFloat(amount);
      return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    };

    // If there's email history, analyze it for context
    if (emailHistory.length > 0) {
      const conversationText = emailHistory.map(email => {
        const date = email.sent_date ? new Date(email.sent_date).toLocaleDateString() : 'Unknown date';
        return `Date: ${date}\n${email.email_type === 'incoming' ? 'From' : 'To'}: ${email.from_email}\nSubject: ${email.subject}\n${email.content}`;
      }).join('\n\n---\n\n');

      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are an expert business communication specialist. Generate a professional follow-up email for an invoice that is ${daysOverdue} days overdue. Use the conversation history to craft a personalized, contextual response that acknowledges previous communications and addresses any concerns raised.`
            },
            {
              role: "user",
              content: `Generate a follow-up email for:
- Invoice: ${invoice.invoice_number}
- Client: ${invoice.client.name} at ${invoice.client.company}
- Amount: ${formatAmount(invoice.amount)}
- Days overdue: ${daysOverdue}

Previous conversation history:
${conversationText}

Please provide:
1. A professional subject line
2. A personalized email body that references the conversation history appropriately
3. An assessment of priority level (low/medium/high)
4. A brief reason for the follow-up

Format as JSON: {"subject": "...", "body": "...", "priority": "...", "reason": "..."}`
            }
          ],
          max_tokens: 600,
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        const aiSuggestion = JSON.parse(response.choices[0].message.content || '{}');
        return {
          subject: aiSuggestion.subject || `Follow up on Invoice ${invoice.invoice_number}`,
          body: aiSuggestion.body || `Dear ${invoice.client.name},\n\nI wanted to follow up regarding your outstanding invoice.`,
          priority: aiSuggestion.priority || "medium",
          reason: aiSuggestion.reason || `Invoice is ${daysOverdue} days overdue`
        };
      } catch (error) {
        console.error("AI follow-up generation error:", error);
        // Fall back to basic template if AI fails
      }
    }

    // Fallback to basic template when no email history or AI fails
    const lastEmail = emailHistory[0];
    const daysSinceLastEmail = lastEmail ? 
      Math.floor((Date.now() - new Date(lastEmail.sent_date).getTime()) / (1000 * 60 * 60 * 24)) : null;

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

  async getInvoiceAging(): Promise<{
    bucket_0_29: { count: number; amount: number };
    bucket_30_59: { count: number; amount: number };
    bucket_60_89: { count: number; amount: number };
    bucket_90_plus: { count: number; amount: number };
  }> {
    try {
      const currentDate = new Date();
      
      const results = await db
        .select({
          id: invoices.id,
          amount: invoices.amount,
          due_date: invoices.due_date,
          payment_status: invoices.payment_status
        })
        .from(invoices)
        .where(sql`${invoices.payment_status} != 'paid'`);

      const aging = {
        bucket_0_29: { count: 0, amount: 0 },
        bucket_30_59: { count: 0, amount: 0 },
        bucket_60_89: { count: 0, amount: 0 },
        bucket_90_plus: { count: 0, amount: 0 }
      };

      results.forEach(invoice => {
        try {
          const daysOverdue = Math.floor((currentDate.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
          const amount = parseFloat(invoice.amount) || 0;

          if (daysOverdue >= 0 && daysOverdue <= 29) {
            aging.bucket_0_29.count++;
            aging.bucket_0_29.amount += amount;
          } else if (daysOverdue >= 30 && daysOverdue <= 59) {
            aging.bucket_30_59.count++;
            aging.bucket_30_59.amount += amount;
          } else if (daysOverdue >= 60 && daysOverdue <= 89) {
            aging.bucket_60_89.count++;
            aging.bucket_60_89.amount += amount;
          } else if (daysOverdue >= 90) {
            aging.bucket_90_plus.count++;
            aging.bucket_90_plus.amount += amount;
          }
        } catch (error) {
          console.log(`Error processing invoice ${invoice.id}:`, error);
        }
      });

      return aging;
    } catch (error) {
      console.log("Error in getInvoiceAging:", error);
      return {
        bucket_0_29: { count: 0, amount: 0 },
        bucket_30_59: { count: 0, amount: 0 },
        bucket_60_89: { count: 0, amount: 0 },
        bucket_90_plus: { count: 0, amount: 0 }
      };
    }
  }

  async getAllReadingHistory(): Promise<(ReadingHistory & { client: Client })[]> {
    const result = await db
      .select()
      .from(reading_history)
      .leftJoin(clients, eq(reading_history.client_id, clients.id))
      .orderBy(desc(reading_history.created_at));

    return result.map(row => ({
      ...row.reading_history,
      client: row.clients!
    }));
  }

  async createReadingHistory(data: InsertReadingHistory): Promise<ReadingHistory> {
    const [result] = await db
      .insert(reading_history)
      .values(data)
      .returning();
    return result;
  }

  async deleteReadingHistory(id: number): Promise<boolean> {
    try {
      await db.delete(reading_history).where(eq(reading_history.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting reading history:', error);
      return false;
    }
  }

  async getReportSummary(contentReportId: number): Promise<ReportSummary | undefined> {
    const [summary] = await db.select().from(report_summaries).where(eq(report_summaries.content_report_id, contentReportId));
    return summary || undefined;
  }

  async createReportSummary(insertSummary: InsertReportSummary): Promise<ReportSummary> {
    const [summary] = await db
      .insert(report_summaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  async updateReportSummary(id: number, updates: Partial<InsertReportSummary>): Promise<ReportSummary | undefined> {
    const [summary] = await db
      .update(report_summaries)
      .set(updates)
      .where(eq(report_summaries.id, id))
      .returning();
    return summary || undefined;
  }

  async getAllReportSummaries(): Promise<(ReportSummary & { report: ContentReport })[]> {
    const summaries = await db
      .select()
      .from(report_summaries)
      .leftJoin(content_reports, eq(report_summaries.content_report_id, content_reports.id))
      .orderBy(desc(report_summaries.created_at));
    
    return summaries.map(row => ({
      ...row.report_summaries,
      report: row.content_reports!
    }));
  }

  async getLeadEmailHistory(leadId: number): Promise<LeadEmailHistory[]> {
    return await db
      .select()
      .from(lead_email_history)
      .where(eq(lead_email_history.lead_id, leadId))
      .orderBy(desc(lead_email_history.sent_date));
  }

  async createLeadEmailHistory(emailData: InsertLeadEmailHistory): Promise<LeadEmailHistory> {
    const [email] = await db
      .insert(lead_email_history)
      .values(emailData)
      .returning();
    return email;
  }

  async deleteLeadEmailHistory(emailId: number): Promise<boolean> {
    try {
      await db.delete(lead_email_history).where(eq(lead_email_history.id, emailId));
      return true;
    } catch (error) {
      console.error('Error deleting lead email history:', error);
      return false;
    }
  }

  async deleteAllLeadEmailHistory(leadId: number): Promise<boolean> {
    try {
      await db.delete(lead_email_history).where(eq(lead_email_history.lead_id, leadId));
      return true;
    } catch (error) {
      console.error('Error deleting all lead email history:', error);
      return false;
    }
  }

  async getLeadAISuggestion(leadId: number): Promise<any> {
    const lead = await this.getLead(leadId);
    const emailHistory = await this.getLeadEmailHistory(leadId);
    const contentReports = await this.getRecentReports(5);
    
    if (!lead) {
      return null;
    }

    return this.generateLeadFollowUp(lead, emailHistory, contentReports);
  }

  async generateLeadFollowUp(lead: any, emailHistory: LeadEmailHistory[], contentReports: ContentReport[]): Promise<any> {
    const daysSinceLastContact = lead.last_contact ? 
      Math.floor((Date.now() - new Date(lead.last_contact).getTime()) / (1000 * 60 * 60 * 24)) : null;

    // Find relevant content based on lead's interest tags
    const relevantReports = contentReports.filter(report => 
      report.tags && lead.interest_tags && 
      report.tags.some((tag: string) => lead.interest_tags.includes(tag))
    );

    // Simple template-based response - AI email generation handled in routes
    return {
      subject: `Follow-up: ${lead.company} - Investment Research Opportunities`,
      body: `Hi ${lead.name},\n\nI wanted to follow up on our previous conversation regarding investment research opportunities for ${lead.company}.\n\nBased on your interests in ${lead.interest_tags?.join(', ')}, I thought you might find our recent research valuable.\n\nBest regards,\nSpencer`,
      reason: `Lead in ${lead.stage} stage${daysSinceLastContact ? ` with ${daysSinceLastContact} days since last contact` : ''}`,
      priority: daysSinceLastContact && daysSinceLastContact > 14 ? "high" : "medium",
      relevantReports: relevantReports.slice(0, 3),
      suggestedReports: relevantReports.map(report => ({
        title: report.title,
        summary: report.content_summary,
        relevance: `Matches interest in ${report.tags?.filter(tag => lead.interest_tags?.includes(tag)).join(', ')}`
      }))
    };
  }

  // Task methods
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.created_at));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // AI Feedback Loop Implementation
  async createAiGeneratedContent(content: InsertAiGeneratedContent): Promise<AiGeneratedContent> {
    const [result] = await db
      .insert(ai_generated_content)
      .values(content)
      .returning();
    return result;
  }

  async createAiContentFeedback(feedback: InsertAiContentFeedback): Promise<AiContentFeedback> {
    const [result] = await db
      .insert(ai_content_feedback)
      .values(feedback)
      .returning();
    return result;
  }

  async getAiGeneratedContentWithFeedback(contentId: number): Promise<(AiGeneratedContent & { feedback: AiContentFeedback[] }) | undefined> {
    const content = await db
      .select()
      .from(ai_generated_content)
      .where(eq(ai_generated_content.id, contentId));

    if (content.length === 0) return undefined;

    const feedback = await db
      .select()
      .from(ai_content_feedback)
      .where(eq(ai_content_feedback.content_id, contentId));

    return {
      ...content[0],
      feedback
    };
  }

  // Add feedback for AI content
  async addFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [result] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return result;
  }

  async getFeedbackAnalytics(): Promise<{
    totalFeedback: number;
    thumbsUpCount: number;
    thumbsDownCount: number;
    avgRating: number;
    feedbackByType: { [key: string]: number };
  }> {
    const totalFeedbackResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedback);

    const thumbsUpResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedback)
      .where(eq(feedback.rating, true));

    const thumbsDownResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedback)
      .where(eq(feedback.rating, false));

    const feedbackByTypeResult = await db
      .select({
        content_type: feedback.content_type,
        count: sql<number>`count(*)`
      })
      .from(feedback)
      .groupBy(feedback.content_type);

    const feedbackByType: { [key: string]: number } = {};
    feedbackByTypeResult.forEach(row => {
      feedbackByType[row.content_type] = row.count;
    });

    const totalFeedback = totalFeedbackResult[0]?.count || 0;
    const thumbsUp = thumbsUpResult[0]?.count || 0;
    const thumbsDown = thumbsDownResult[0]?.count || 0;

    return {
      totalFeedback,
      thumbsUpCount: thumbsUp,
      thumbsDownCount: thumbsDown,
      avgRating: totalFeedback > 0 ? thumbsUp / totalFeedback : 0,
      feedbackByType
    };
  }

  async getAiFeedbackAnalytics(): Promise<{
    totalContent: number;
    totalFeedback: number;
    thumbsUpCount: number;
    thumbsDownCount: number;
    avgRating: number;
    feedbackByType: { [key: string]: number };
  }> {
    const totalContentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ai_generated_content);

    const totalFeedbackResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ai_content_feedback);

    const thumbsUpResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ai_content_feedback)
      .where(eq(ai_content_feedback.rating, 'thumbs_up'));

    const thumbsDownResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ai_content_feedback)
      .where(eq(ai_content_feedback.rating, 'thumbs_down'));

    const feedbackByTypeResult = await db
      .select({
        feedback_type: ai_content_feedback.feedback_type,
        count: sql<number>`count(*)`
      })
      .from(ai_content_feedback)
      .groupBy(ai_content_feedback.feedback_type);

    const totalContent = totalContentResult[0]?.count || 0;
    const totalFeedback = totalFeedbackResult[0]?.count || 0;
    const thumbsUpCount = thumbsUpResult[0]?.count || 0;
    const thumbsDownCount = thumbsDownResult[0]?.count || 0;

    const avgRating = totalFeedback > 0 ? (thumbsUpCount / totalFeedback) * 100 : 0;

    const feedbackByType: { [key: string]: number } = {};
    feedbackByTypeResult.forEach(item => {
      feedbackByType[item.feedback_type] = item.count;
    });

    return {
      totalContent,
      totalFeedback,
      thumbsUpCount,
      thumbsDownCount,
      avgRating,
      feedbackByType
    };
  }

  async saveAIContent(content: { type: string; content: string; metadata?: any }): Promise<AiGeneratedContent> {
    const [savedContent] = await db
      .insert(ai_generated_content)
      .values({
        content_type: content.type,
        original_prompt: content.metadata?.prompt || 'Call preparation request',
        generated_content: content.content,
        theme_id: content.metadata?.theme_id || null,
        context_data: content.metadata || null
      })
      .returning();
    return savedContent;
  }
}

export const storage = new DatabaseStorage();