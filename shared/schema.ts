import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  last_contact: timestamp("last_contact"),
  next_step: text("next_step"),
  notes: text("notes"),
  interest_tags: json("interest_tags").$type<string[]>().default([]),
  created_at: timestamp("created_at").defaultNow(),
});

export const content_reports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("WILTW"), // WILTW, special_report, etc
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

export const insertReadingHistorySchema = createInsertSchema(reading_history).omit({
  id: true,
  created_at: true,
});

export type ReadingHistory = typeof reading_history.$inferSelect;
export type InsertReadingHistory = z.infer<typeof insertReadingHistorySchema>;

export type User = typeof users.$inferSelect;
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
