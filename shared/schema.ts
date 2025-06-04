import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  industry: text("industry"),
  interestTags: json("interest_tags").$type<string[]>().default([]),
  riskLevel: text("risk_level").$type<"low" | "medium" | "high">().default("medium"),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0"),
  renewalDate: timestamp("renewal_date"),
  subscriptionValue: decimal("subscription_value", { precision: 10, scale: 2 }),
  notes: text("notes"),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  sentDate: timestamp("sent_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").$type<"pending" | "paid" | "overdue">().default("pending"),
  remindersSent: integer("reminders_sent").default(0),
  lastReminderDate: timestamp("last_reminder_date"),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  stage: text("stage").$type<"prospect" | "qualified" | "proposal" | "closed_won" | "closed_lost">().default("prospect"),
  source: text("source"),
  interestTags: json("interest_tags").$type<string[]>().default([]),
  lastContact: timestamp("last_contact"),
  nextStep: text("next_step"),
  proposalValue: decimal("proposal_value", { precision: 10, scale: 2 }),
  notes: text("notes"),
});

export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  publishDate: timestamp("publish_date").notNull(),
  openRate: decimal("open_rate", { precision: 5, scale: 2 }).default("0"),
  clickRate: decimal("click_rate", { precision: 5, scale: 2 }).default("0"),
  totalSent: integer("total_sent").default(0),
  category: text("category"),
});

export const clientEngagement = pgTable("client_engagement", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  reportId: integer("report_id").references(() => contentReports.id).notNull(),
  opened: boolean("opened").default(false),
  clicked: boolean("clicked").default(false),
  engagementDate: timestamp("engagement_date"),
});

export const aiEmails = pgTable("ai_emails", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  leadId: integer("lead_id").references(() => leads.id),
  type: text("type").$type<"invoice_reminder" | "content_followup" | "lead_outreach" | "renewal" | "upsell">().notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").$type<"draft" | "sent" | "scheduled">().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  scheduledFor: timestamp("scheduled_for"),
});

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true });
export const insertContentReportSchema = createInsertSchema(contentReports).omit({ id: true });
export const insertClientEngagementSchema = createInsertSchema(clientEngagement).omit({ id: true });
export const insertAiEmailSchema = createInsertSchema(aiEmails).omit({ id: true });

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
export type ClientEngagement = typeof clientEngagement.$inferSelect;
export type InsertClientEngagement = z.infer<typeof insertClientEngagementSchema>;
export type AiEmail = typeof aiEmails.$inferSelect;
export type InsertAiEmail = z.infer<typeof insertAiEmailSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
