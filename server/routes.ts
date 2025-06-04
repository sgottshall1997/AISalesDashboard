import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertInvoiceSchema, insertLeadSchema, insertAiEmailSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-test-key"
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard overview
  app.get("/api/dashboard/overview", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      const invoices = await storage.getAllInvoices();
      const leads = await storage.getAllLeads();
      const contentReports = await storage.getAllContentReports();

      const outstandingInvoices = invoices
        .filter(inv => inv.status !== "paid")
        .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

      const overdueInvoices = invoices.filter(inv => inv.status === "overdue").length;
      const activeLeads = leads.filter(lead => 
        ["prospect", "qualified", "proposal"].includes(lead.stage)
      ).length;
      const hotLeads = leads.filter(lead => lead.stage === "qualified").length;

      const avgEngagement = contentReports.length > 0 
        ? contentReports.reduce((sum, report) => sum + parseFloat(report.openRate), 0) / contentReports.length
        : 0;

      const atRiskRenewals = clients.filter(client => 
        client.riskLevel === "high" || 
        (client.renewalDate && new Date(client.renewalDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      ).length;

      res.json({
        outstandingInvoices,
        overdueInvoices,
        activeLeads,
        hotLeads,
        avgEngagement: Math.round(avgEngagement),
        atRiskRenewals,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard overview" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(parseInt(req.params.id));
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      
      // Calculate days since sent for each invoice
      const invoicesWithDays = invoices.map(invoice => {
        const daysSince = Math.floor(
          (Date.now() - new Date(invoice.sentDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...invoice, daysSince };
      });

      res.json(invoicesWithDays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ message: "Invalid invoice data" });
    }
  });

  // Lead routes
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const lead = await storage.updateLead(id, updates);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Content report routes
  app.get("/api/content-reports", async (req, res) => {
    try {
      const reports = await storage.getAllContentReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content reports" });
    }
  });

  // AI Email generation routes
  app.post("/api/ai/generate-email", async (req, res) => {
    try {
      const { type, clientId, leadId, context } = req.body;

      let client, lead;
      if (clientId) {
        client = await storage.getClient(clientId);
      }
      if (leadId) {
        lead = await storage.getLead(leadId);
      }

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const prompt = generateEmailPrompt(type, client, lead, context);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert business email writer for 13D Research, an investment research firm. Generate professional, personalized emails that are concise but engaging. Always respond with JSON containing 'subject' and 'body' fields."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const emailContent = JSON.parse(response.choices[0].message.content || "{}");
      
      // Save the generated email
      const aiEmail = await storage.createAiEmail({
        clientId: clientId || null,
        leadId: leadId || null,
        type,
        subject: emailContent.subject,
        body: emailContent.body,
        status: "draft",
      });

      res.json(aiEmail);
    } catch (error) {
      console.error("AI email generation error:", error);
      res.status(500).json({ message: "Failed to generate AI email" });
    }
  });

  app.get("/api/ai/emails", async (req, res) => {
    try {
      const emails = await storage.getAllAiEmails();
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI emails" });
    }
  });

  app.patch("/api/ai/emails/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const email = await storage.updateAiEmail(id, updates);
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateEmailPrompt(type: string, client?: any, lead?: any, context?: any): string {
  const companyInfo = "13D Research is a boutique investment research firm specializing in deep-dive analysis with weekly WILTW (What I Learned This Week) reports.";
  
  switch (type) {
    case "invoice_reminder":
      return `${companyInfo}

Generate a professional but friendly invoice reminder email for client: ${client?.name || "Client"}

Context:
- Invoice amount: ${context?.amount || "amount"}
- Days overdue: ${context?.daysOverdue || "X"} days
- Last contact: ${context?.lastContact || "recent"}

The email should be polite, professional, and request payment while maintaining the relationship. Include invoice details and ask if they need any clarification.

Respond with JSON containing 'subject' and 'body' fields.`;

    case "content_followup":
      return `${companyInfo}

Generate a personalized follow-up email for client: ${client?.name || "Client"}

Context:
- Client interests: ${client?.interestTags?.join(", ") || "general markets"}
- Recent engagement: ${context?.engagement || "high"}
- Relevant reports: ${context?.reports || "latest WILTW"}
- Engagement rate: ${client?.engagementRate || "N/A"}%

The email should reference their interests and recent engagement, suggest relevant content, and encourage continued engagement.

Respond with JSON containing 'subject' and 'body' fields.`;

    case "lead_outreach":
      return `${companyInfo}

Generate a professional outreach email for prospect: ${lead?.name || "Prospect"} at ${lead?.company || "Company"}

Context:
- Lead stage: ${lead?.stage || "prospect"}
- Interests: ${lead?.interestTags?.join(", ") || "investment research"}
- Next step: ${lead?.nextStep || "introduction"}
- Notes: ${lead?.notes || "initial contact"}

The email should be engaging, demonstrate value, and include a clear call to action for the next step.

Respond with JSON containing 'subject' and 'body' fields.`;

    case "renewal":
      return `${companyInfo}

Generate a renewal email for client: ${client?.name || "Client"}

Context:
- Renewal date: ${client?.renewalDate || "upcoming"}
- Subscription value: $${client?.subscriptionValue || "X"}
- Engagement rate: ${client?.engagementRate || "N/A"}%
- Risk level: ${client?.riskLevel || "medium"}
- Interest areas: ${client?.interestTags?.join(", ") || "general"}

The email should emphasize value received, reference their engagement with content, and propose renewal/upgrade options.

Respond with JSON containing 'subject' and 'body' fields.`;

    case "upsell":
      return `${companyInfo}

Generate an upsell email for client: ${client?.name || "Client"}

Context:
- Current engagement: ${client?.engagementRate || "high"}%
- Interests: ${client?.interestTags?.join(", ") || "various sectors"}
- Current subscription: $${client?.subscriptionValue || "X"}
- Notes: ${client?.notes || "engaged client"}

The email should highlight their high engagement, introduce premium features/benefits, and propose an upgrade that matches their interests.

Respond with JSON containing 'subject' and 'body' fields.`;

    default:
      return `${companyInfo}

Generate a professional business email.

Context: ${JSON.stringify(context || {})}

Respond with JSON containing 'subject' and 'body' fields.`;
  }
}
