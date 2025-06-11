import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIEmail } from "./openai";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import { 
  insertClientSchema, insertInvoiceSchema, updateInvoiceSchema, insertLeadSchema,
  insertContentReportSchema, insertClientEngagementSchema, insertAiSuggestionSchema,
  insertEmailHistorySchema, clients, invoices, leads, client_engagements, email_history
} from "@shared/schema";
import { db } from "./db";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Clients endpoints
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      const allClients = await storage.getAllClients();
      res.json(allClients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Content reports endpoints
  app.get("/api/content-reports", async (req: Request, res: Response) => {
    try {
      const reports = await storage.getAllContentReports();
      res.json(reports);
    } catch (error) {
      console.error("Get content reports error:", error);
      res.status(500).json({ message: "Failed to fetch content reports" });
    }
  });

  // Simple PDF upload endpoint that works with database
  app.post("/api/upload-pdf", upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // Create basic report entry in database
      const reportData = {
        title: file.originalname.replace('.pdf', ''),
        type: 'Research Report',
        published_date: new Date(),
        open_rate: '0',
        click_rate: '0',
        engagement_level: 'medium' as const,
        tags: ['research']
      };

      const report = await storage.createContentReport(reportData);
      
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      res.json({ 
        message: "PDF uploaded successfully",
        report,
        note: "Basic upload complete - AI analysis can be added later"
      });

    } catch (error) {
      console.error('PDF upload error:', error);
      res.status(500).json({ 
        message: "Failed to upload PDF",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reading history endpoints
  app.get("/api/reading-history", async (req: Request, res: Response) => {
    try {
      const history = await storage.getAllReadingHistory();
      res.json(history);
    } catch (error) {
      console.error("Get reading history error:", error);
      res.status(500).json({ message: "Failed to fetch reading history" });
    }
  });

  app.post("/api/reading-history", async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const readingHistory = await storage.createReadingHistory(data);
      res.json(readingHistory);
    } catch (error) {
      console.error("Create reading history error:", error);
      res.status(500).json({ message: "Failed to create reading history" });
    }
  });

  app.delete("/api/reading-history/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteReadingHistory(id);
      
      if (success) {
        res.json({ message: "Reading history deleted successfully" });
      } else {
        res.status(404).json({ message: "Reading history not found" });
      }
    } catch (error) {
      console.error("Error deleting reading history:", error);
      res.status(500).json({ message: "Failed to delete reading history" });
    }
  });

  // Invoice endpoints
  app.get("/api/invoices", async (req: Request, res: Response) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/overdue", async (req: Request, res: Response) => {
    try {
      const overdueInvoices = await storage.getOverdueInvoices();
      res.json(overdueInvoices);
    } catch (error) {
      console.error("Get overdue invoices error:", error);
      res.status(500).json({ message: "Failed to fetch overdue invoices" });
    }
  });

  app.get("/api/invoices/aging", async (req: Request, res: Response) => {
    try {
      const aging = await storage.getInvoiceAging();
      res.json(aging);
    } catch (error) {
      console.error("Get invoice aging error:", error);
      res.status(500).json({ message: "Failed to fetch invoice aging" });
    }
  });

  // AI-powered prospecting intelligence endpoint
  app.post("/api/generate-prospecting-insights", async (req: Request, res: Response) => {
    try {
      const { clientId } = req.body;
      
      // Get all reports from database for comprehensive analysis
      const allReports = await storage.getAllContentReports();
      const client = clientId ? await storage.getClient(clientId) : null;
      
      if (allReports.length === 0) {
        return res.status(400).json({ error: "No reports available for analysis" });
      }

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered prospecting insights." 
        });
      }

      // Compile intelligence from reports
      const reportIntelligence = allReports.map(report => ({
        title: report.title,
        summary: report.content_summary || 'Investment research report',
        sectors: report.tags || [],
        published: report.published_date
      }));

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prospectingPrompt = `You are an expert investment advisor. Generate prospecting insights based on ${reportIntelligence.length} research reports.

Reports available:
${reportIntelligence.map((report, i) => `${i+1}. ${report.title} (${report.sectors.join(', ')})`).join('\n')}

${client ? `
Target Client: ${client.name} at ${client.company}
Interest Areas: ${client.interest_tags?.join(', ') || 'General investing'}
` : ''}

Provide a JSON response with actionable prospecting insights:
{
  "topOpportunities": ["3-4 specific market opportunities"],
  "talkingPoints": ["4-5 conversation starters"],
  "marketThemes": ["3-4 key investment themes"],
  "nextSteps": ["2-3 recommended actions"],
  "reportReferences": ["Key reports to mention"]
}`;

      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert investment advisor and client relationship manager."
          },
          {
            role: "user",
            content: prospectingPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const insights = JSON.parse(analysisResponse.choices[0].message.content || '{}');
      
      res.json({
        message: "Prospecting insights generated successfully",
        insights,
        reportsAnalyzed: reportIntelligence.length,
        totalReports: allReports.length
      });

    } catch (error) {
      console.error('Prospecting insights error:', error);
      if (error.message?.includes('API key')) {
        res.status(400).json({ 
          message: "OpenAI API key required",
          error: "Please provide a valid OpenAI API key to enable AI-powered prospecting insights"
        });
      } else {
        res.status(500).json({ 
          message: "Failed to generate prospecting insights",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}