CREATE TABLE "ai_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"target_id" integer NOT NULL,
	"target_type" text NOT NULL,
	"suggestion" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_engagements" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"report_id" integer NOT NULL,
	"opened" boolean DEFAULT false,
	"clicked" boolean DEFAULT false,
	"engagement_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text NOT NULL,
	"subscription_type" text DEFAULT 'standard' NOT NULL,
	"renewal_date" timestamp,
	"engagement_rate" numeric(5, 2) DEFAULT '0',
	"click_rate" numeric(5, 2) DEFAULT '0',
	"interest_tags" json DEFAULT '[]'::json,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'WILTW' NOT NULL,
	"published_date" timestamp NOT NULL,
	"open_rate" numeric(5, 2) DEFAULT '0',
	"click_rate" numeric(5, 2) DEFAULT '0',
	"engagement_level" text DEFAULT 'medium' NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"content_summary" text,
	"investment_thesis" text,
	"key_insights" json DEFAULT '[]'::json,
	"risk_factors" json DEFAULT '[]'::json,
	"prospecting_points" json DEFAULT '[]'::json,
	"client_relevance" json,
	"full_content" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"email_type" text NOT NULL,
	"sent_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"last_reminder_sent" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "lead_email_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"email_type" text NOT NULL,
	"sent_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text NOT NULL,
	"stage" text DEFAULT 'prospect' NOT NULL,
	"likelihood_of_closing" text DEFAULT 'medium',
	"last_contact" timestamp,
	"next_step" text,
	"notes" text,
	"interest_tags" json DEFAULT '[]'::json,
	"how_heard" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"report_title" text NOT NULL,
	"read_date" timestamp NOT NULL,
	"engagement_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_report_id" integer NOT NULL,
	"parsed_summary" text NOT NULL,
	"summary_type" text DEFAULT 'wiltw_parser' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "client_engagements" ADD CONSTRAINT "client_engagements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_engagements" ADD CONSTRAINT "client_engagements_report_id_content_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."content_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_email_history" ADD CONSTRAINT "lead_email_history_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_summaries" ADD CONSTRAINT "report_summaries_content_report_id_content_reports_id_fk" FOREIGN KEY ("content_report_id") REFERENCES "public"."content_reports"("id") ON DELETE no action ON UPDATE no action;