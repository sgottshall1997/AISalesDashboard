import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIEmail } from "./openai";
import { 
  insertClientSchema, insertInvoiceSchema, insertLeadSchema,
  insertContentReportSchema, insertClientEngagementSchema, insertAiSuggestionSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Clients routes
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

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const updates = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(parseInt(req.params.id), updates);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data" });
    }
  });

  // Invoices routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/overdue", async (req, res) => {
    try {
      const invoices = await storage.getOverdueInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue invoices" });
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

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const updates = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(parseInt(req.params.id), updates);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(400).json({ message: "Invalid invoice data" });
    }
  });

  // Leads routes
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/stage/:stage", async (req, res) => {
    try {
      const leads = await storage.getLeadsByStage(req.params.stage);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads by stage" });
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
      const updates = insertLeadSchema.partial().parse(req.body);
      const lead = await storage.updateLead(parseInt(req.params.id), updates);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data" });
    }
  });

  // Content Reports routes
  app.get("/api/content-reports", async (req, res) => {
    try {
      const reports = await storage.getAllContentReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content reports" });
    }
  });

  app.get("/api/content-reports/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const reports = await storage.getRecentReports(limit);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent reports" });
    }
  });

  app.post("/api/content-reports", async (req, res) => {
    try {
      const validatedData = insertContentReportSchema.parse(req.body);
      const report = await storage.createContentReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid content report data" });
    }
  });

  // AI Suggestions routes
  app.get("/api/ai-suggestions", async (req, res) => {
    try {
      const { target_type, priority } = req.query;
      const suggestions = await storage.getAiSuggestions(
        target_type as string,
        priority as string
      );
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI suggestions" });
    }
  });

  app.post("/api/ai-suggestions", async (req, res) => {
    try {
      const validatedData = insertAiSuggestionSchema.parse(req.body);
      const suggestion = await storage.createAiSuggestion(validatedData);
      res.status(201).json(suggestion);
    } catch (error) {
      res.status(400).json({ message: "Invalid AI suggestion data" });
    }
  });

  // AI Email Generation routes
  app.post("/api/ai/generate-email", async (req, res) => {
    try {
      const { type, clientId, leadId, context } = req.body;
      
      if (!type || (!clientId && !leadId)) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      let targetData;
      if (clientId) {
        targetData = await storage.getClient(clientId);
      } else if (leadId) {
        targetData = await storage.getLead(leadId);
      }

      if (!targetData) {
        return res.status(404).json({ message: "Target not found" });
      }

      const emailContent = await generateAIEmail(type, targetData, context);
      res.json(emailContent);
    } catch (error) {
      console.error("AI email generation error:", error);
      res.status(500).json({ message: "Failed to generate AI email" });
    }
  });

  app.post("/api/ai/generate-follow-up", async (req, res) => {
    try {
      const { clientId, emailType = "renewal" } = req.body;
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const emailContent = await generateAIEmail(emailType, client, {
        subscription_type: client.subscription_type,
        engagement_rate: client.engagement_rate,
        interest_tags: client.interest_tags,
        renewal_date: client.renewal_date
      });

      res.json(emailContent);
    } catch (error) {
      console.error("AI follow-up generation error:", error);
      res.status(500).json({ message: "Failed to generate follow-up email" });
    }
  });

  app.post("/api/ai/generate-invoice-reminder", async (req, res) => {
    try {
      const { invoiceId } = req.body;
      
      const invoices = await storage.getAllInvoices();
      const invoice = invoices.find(inv => inv.id === invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const daysSince = Math.floor(
        (Date.now() - new Date(invoice.sent_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      const emailContent = await generateAIEmail("invoice_reminder", invoice.client, {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        sent_date: invoice.sent_date,
        days_overdue: daysSince
      });

      res.json(emailContent);
    } catch (error) {
      console.error("AI invoice reminder generation error:", error);
      res.status(500).json({ message: "Failed to generate invoice reminder" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
