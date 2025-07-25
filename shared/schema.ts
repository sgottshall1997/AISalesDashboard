import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Simple user table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  subscription_type: text("subscription_type").notNull().default("standard"), // standard, premium
  renewal_date: timestamp("renewal_date"),
  engagement_rate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0"),
  click_rate: decimal("click_rate", { precision: 5, scale: 2 }).default("0"),
  interest_tags: json("interest_tags").$type<string[]>().default([]),
  risk_level: text("risk_level").notNull().default("low"), // low, medium, high
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id).notNull(),
  invoice_number: text("invoice_number").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  due_date: timestamp("due_date").notNull(),
  payment_status: text("payment_status").notNull().default("pending"), // pending, paid, overdue
  last_reminder_sent: timestamp("last_reminder_sent"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  stage: text("stage").notNull().default("prospect"), // prospect, qualified, proposal, closed_won, closed_lost
  likelihood_of_closing: text("likelihood_of_closing").default("medium"), // low, medium, high
  engagement_level: text("engagement_level").default("none"), // none, medium, full
  last_contact: timestamp("last_contact"),
  next_step: text("next_step"),
  notes: text("notes"),
  interest_tags: json("interest_tags").$type<string[]>().default([]),
  how_heard: text("how_heard"),
  created_at: timestamp("created_at").defaultNow(),
});

export const content_reports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("WILTW"), // WILTW, special_report, etc
  source_type: text("source_type").notNull().default("uploaded_pdf"), // uploaded_pdf, parsed_summary, manual_entry
  published_date: timestamp("published_date").notNull(),
  open_rate: decimal("open_rate", { precision: 5, scale: 2 }).default("0"),
  click_rate: decimal("click_rate", { precision: 5, scale: 2 }).default("0"),
  engagement_level: text("engagement_level").notNull().default("medium"), // low, medium, high
  tags: json("tags").$type<string[]>().default([]),
  content_summary: text("content_summary"),
  investment_thesis: text("investment_thesis"),
  key_insights: json("key_insights").$type<string[]>().default([]),
  risk_factors: json("risk_factors").$type<string[]>().default([]),
  prospecting_points: json("prospecting_points").$type<string[]>().default([]),
  client_relevance: json("client_relevance").$type<{
    highNetWorth?: string;
    institutional?: string;
    retail?: string;
  }>(),
  full_content: text("full_content"),
  created_at: timestamp("created_at").defaultNow(),
});

export const client_engagements = pgTable("client_engagements", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id).notNull(),
  report_id: integer("report_id").references(() => content_reports.id).notNull(),
  opened: boolean("opened").default(false),
  clicked: boolean("clicked").default(false),
  engagement_date: timestamp("engagement_date").defaultNow(),
});

export const ai_suggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // follow_up, content_recommendation, lead_action, renewal_strategy
  target_id: integer("target_id").notNull(), // client_id or lead_id
  target_type: text("target_type").notNull(), // client, lead
  suggestion: text("suggestion").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high
  status: text("status").notNull().default("pending"), // pending, completed, dismissed
  created_at: timestamp("created_at").defaultNow(),
});

export const email_history = pgTable("email_history", {
  id: serial("id").primaryKey(),
  invoice_id: integer("invoice_id").references(() => invoices.id).notNull(),
  from_email: text("from_email").notNull(),
  to_email: text("to_email").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  email_type: text("email_type").notNull(), // incoming, outgoing
  sent_date: timestamp("sent_date").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

export const reading_history = pgTable("reading_history", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id).notNull(),
  report_title: text("report_title").notNull(),
  read_date: timestamp("read_date").notNull(),
  engagement_notes: text("engagement_notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const lead_email_history = pgTable("lead_email_history", {
  id: serial("id").primaryKey(),
  lead_id: integer("lead_id").references(() => leads.id).notNull(),
  from_email: text("from_email").notNull(),
  to_email: text("to_email").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  email_type: text("email_type").notNull(), // incoming, outgoing
  sent_date: timestamp("sent_date").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  client_name: text("client_name"), // Optional client association
  priority: text("priority").notNull().default("medium"), // low, medium, high
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  due_date: timestamp("due_date"),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

// AI Feedback Loop table for learning from user preferences
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"), // Nullable since we don't have user auth yet
  content_type: text("content_type").notNull(), // e.g. 'one_pager', 'qna', 'summary_email'
  content_id: text("content_id"), // Optional reference to specific content
  rating: boolean("rating").notNull(), // true for thumbs-up, false for thumbs-down
  comment: text("comment"), // Optional user comment
  created_at: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  created_at: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  created_at: true,
});

// Update schema that accepts string dates and converts them
export const updateInvoiceSchema = insertInvoiceSchema.extend({
  due_date: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  last_reminder_sent: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
}).partial();

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  created_at: true,
});

export const insertContentReportSchema = createInsertSchema(content_reports).omit({
  id: true,
  created_at: true,
});

export const insertClientEngagementSchema = createInsertSchema(client_engagements).omit({
  id: true,
});

export const insertAiSuggestionSchema = createInsertSchema(ai_suggestions).omit({
  id: true,
  created_at: true,
});

export const insertEmailHistorySchema = createInsertSchema(email_history).omit({
  id: true,
  created_at: true,
  sent_date: true,
}).extend({
  from_email: z.string().optional().default(''),
  to_email: z.string().optional().default(''),
});

export const insertLeadEmailHistorySchema = createInsertSchema(lead_email_history).omit({
  id: true,
  created_at: true,
  sent_date: true,
}).extend({
  from_email: z.string().optional().default(''),
  to_email: z.string().optional().default(''),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  created_at: true,
  completed_at: true,
}).extend({
  due_date: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (typeof val === 'string' && val !== '') {
      return new Date(val);
    }
    if (val === '' || val === null || val === undefined) {
      return null;
    }
    return val;
  }),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  created_at: true,
});

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type ContentReport = typeof content_reports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;

export type ClientEngagement = typeof client_engagements.$inferSelect;
export type InsertClientEngagement = z.infer<typeof insertClientEngagementSchema>;

export type AiSuggestion = typeof ai_suggestions.$inferSelect;
export type InsertAiSuggestion = z.infer<typeof insertAiSuggestionSchema>;

export type EmailHistory = typeof email_history.$inferSelect;
export type InsertEmailHistory = z.infer<typeof insertEmailHistorySchema>;

export type LeadEmailHistory = typeof lead_email_history.$inferSelect;
export type InsertLeadEmailHistory = z.infer<typeof insertLeadEmailHistorySchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export const report_summaries = pgTable("report_summaries", {
  id: serial("id").primaryKey(),
  content_report_id: integer("content_report_id").references(() => content_reports.id).notNull(),
  parsed_summary: text("parsed_summary").notNull(),
  structured_summary: text("structured_summary"),
  comprehensive_summary: text("comprehensive_summary"),
  summary_type: text("summary_type").notNull().default("wiltw_parser"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertReadingHistorySchema = createInsertSchema(reading_history).omit({
  id: true,
  created_at: true,
});

export const insertReportSummarySchema = createInsertSchema(report_summaries).omit({
  id: true,
  created_at: true,
});

export type ReadingHistory = typeof reading_history.$inferSelect;
export type InsertReadingHistory = z.infer<typeof insertReadingHistorySchema>;

export type ReportSummary = typeof report_summaries.$inferSelect;
export type InsertReportSummary = z.infer<typeof insertReportSummarySchema>;

export type User = typeof users.$inferSelect;

// Portfolio constituents table
export const portfolio_constituents = pgTable("portfolio_constituents", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  index: text("index").notNull(),
  isHighConviction: boolean("is_high_conviction").default(false),
  weightInIndex: decimal("weight_in_index", { precision: 5, scale: 2 }),
  weightInHighConviction: decimal("weight_in_high_conviction", { precision: 5, scale: 2 }),
  indexWeightInHc: decimal("index_weight_in_hc", { precision: 5, scale: 2 }),
  weightInHcPortfolio: decimal("weight_in_hc_portfolio", { precision: 5, scale: 2 }),
  rebalanceDate: timestamp("rebalance_date"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertPortfolioConstituentSchema = createInsertSchema(portfolio_constituents).omit({
  id: true,
  created_at: true,
});

export type PortfolioConstituent = typeof portfolio_constituents.$inferSelect;
export type InsertPortfolioConstituent = z.infer<typeof insertPortfolioConstituentSchema>;

// Analytics tables for comprehensive event tracking
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }),
  sessionId: varchar("session_id", { length: 255 }),
  properties: jsonb("properties"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailReports = pgTable("email_reports", {
  id: serial("id").primaryKey(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  reportType: varchar("report_type", { length: 100 }).notNull(), // weekly, daily, custom
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type EmailReportRecord = typeof emailReports.$inferSelect;
export type InsertEmailReportRecord = typeof emailReports.$inferInsert;

// Insert schemas for authentication
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
  engagements: many(client_engagements),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  client: one(clients, {
    fields: [invoices.client_id],
    references: [clients.id],
  }),
}));

export const contentReportsRelations = relations(content_reports, ({ many }) => ({
  engagements: many(client_engagements),
}));

export const clientEngagementsRelations = relations(client_engagements, ({ one }) => ({
  client: one(clients, {
    fields: [client_engagements.client_id],
    references: [clients.id],
  }),
  report: one(content_reports, {
    fields: [client_engagements.report_id],
    references: [content_reports.id],
  }),
}));



// AI Feedback Loop Tables
export const ai_generated_content = pgTable("ai_generated_content", {
  id: serial("id").primaryKey(),
  content_type: text("content_type").notNull(), // "email", "suggestion", "summary"
  theme_id: text("theme_id"), // Links to the original suggestion theme
  original_prompt: text("original_prompt").notNull(),
  generated_content: text("generated_content").notNull(),
  context_data: json("context_data").$type<{
    theme?: string;
    emailAngle?: string;
    keyPoints?: string[];
    supportingReports?: string[];
  }>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const ai_content_feedback = pgTable("ai_content_feedback", {
  id: serial("id").primaryKey(),
  content_id: integer("content_id").references(() => ai_generated_content.id).notNull(),
  rating: text("rating").notNull(), // "thumbs_up", "thumbs_down"
  improvement_suggestion: text("improvement_suggestion"), // Optional text feedback
  edited_version: text("edited_version"), // User's edited version of the content
  feedback_type: text("feedback_type").notNull().default("rating"), // "rating", "edit", "suggestion"
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for feedback tables
export const insertAiGeneratedContentSchema = createInsertSchema(ai_generated_content).omit({
  id: true,
  created_at: true,
});

export const insertAiContentFeedbackSchema = createInsertSchema(ai_content_feedback).omit({
  id: true,
  created_at: true,
});

// Types for feedback tables
export type AiGeneratedContent = typeof ai_generated_content.$inferSelect;
export type InsertAiGeneratedContent = z.infer<typeof insertAiGeneratedContentSchema>;

export type AiContentFeedback = typeof ai_content_feedback.$inferSelect;
export type InsertAiContentFeedback = z.infer<typeof insertAiContentFeedbackSchema>;
