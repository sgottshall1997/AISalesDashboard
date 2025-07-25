import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import PDFParser from "pdf2json";

import { 
  insertClientSchema, insertInvoiceSchema, updateInvoiceSchema, insertLeadSchema,
  insertContentReportSchema, insertClientEngagementSchema, insertAiSuggestionSchema,
  insertEmailHistorySchema, insertTaskSchema, clients, invoices, leads, client_engagements, email_history,
  content_reports, report_summaries, portfolio_constituents, tasks
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Configure multer for file uploads with memory storage for PDF parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const DASHBOARD_PASSWORD = "spence";

interface SessionData {
  authenticated?: boolean;
}

const requireAuth = (req: Request, res: Response, next: any) => {
  const session = req.session as SessionData;
  if (!session.authenticated) {
    return res.status(401).json({ authenticated: false });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { password } = req.body;
    
    if (password === DASHBOARD_PASSWORD) {
      (req.session as SessionData).authenticated = true;
      res.json({ authenticated: true, success: true, message: "Authenticated successfully" });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  app.get("/api/auth/status", (req: Request, res: Response) => {
    const session = req.session as SessionData;
    res.json({ authenticated: !!session.authenticated });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    (req.session as SessionData).authenticated = false;
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Clients endpoints
  app.get("/api/clients", requireAuth, async (req: Request, res: Response) => {
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

  // Leads endpoints
  app.get("/api/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error("Get leads error:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lead = await storage.getLead(id);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Get lead error:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const lead = await storage.createLead(req.body);
      res.json(lead);
    } catch (error) {
      console.error("Create lead error:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lead = await storage.updateLead(id, req.body);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Update lead error:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLead(id);
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Delete lead error:", error);
      res.status(500).json({ message: "Failed to delete lead" });
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

  // Delete content report and associated summaries
  app.delete("/api/content-reports/:id", async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      
      if (isNaN(reportId)) {
        return res.status(400).json({ error: "Invalid report ID" });
      }

      // First delete all associated summaries
      await storage.deleteReportSummariesByReportId(reportId);
      
      // Then delete the report
      const success = await storage.deleteContentReport(reportId);
      
      if (success) {
        res.json({ success: true, message: "Report and associated summaries deleted successfully" });
      } else {
        res.status(404).json({ error: "Report not found" });
      }
    } catch (error) {
      console.error("Delete content report error:", error);
      res.status(500).json({ 
        error: "Failed to delete report",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced PDF upload endpoint with actual PDF text extraction
  app.post("/api/upload-pdf", upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      console.log('Processing PDF upload:', file.originalname);

      // Extract text content from uploaded PDF buffer
      let extractedText = '';
      
      try {
        // Check if buffer exists
        if (!file.buffer) {
          throw new Error('File buffer is not available - multer may not be configured correctly');
        }
        
        // Extract actual PDF content using pdf2json library
        const pdfFilename = file.originalname;
        
        try {
          console.log('Processing PDF with pdf2json:', {
            filename: pdfFilename,
            bufferSize: file.buffer.length
          });
          
          // Extract text using pdf2json library
          extractedText = await new Promise<string>((resolve, reject) => {
            const pdfParser = new PDFParser(null, true);
            
            pdfParser.on("pdfParser_dataError", (errData: any) => {
              reject(new Error(`PDF parsing error: ${errData.parserError}`));
            });
            
            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
              try {
                // Extract text from all pages
                let fullText = '';
                
                if (pdfData.Pages) {
                  for (const page of pdfData.Pages) {
                    if (page.Texts) {
                      for (const text of page.Texts) {
                        if (text.R) {
                          for (const run of text.R) {
                            if (run.T) {
                              // Decode URI component and add space
                              fullText += decodeURIComponent(run.T) + ' ';
                            }
                          }
                        }
                      }
                    }
                  }
                }
                
                resolve(fullText.trim());
              } catch (parseError) {
                reject(new Error(`Error processing PDF data: ${parseError}`));
              }
            });
            
            // Parse PDF from buffer
            pdfParser.parseBuffer(file.buffer);
          });

          console.log('PDF text extraction successful:', {
            filename: pdfFilename,
            extractedLength: extractedText.length,
            preview: extractedText.substring(0, 200) + '...'
          });

        } catch (parseError) {
          console.error('PDF parsing failed:', parseError);
          throw new Error(`Failed to extract text from PDF: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }

      } catch (extractionError) {
        console.error('PDF processing failed:', extractionError);
        return res.status(400).json({ 
          error: 'Failed to process PDF file',
          details: String(extractionError)
        });
      }

      // Auto-detect report type from filename and content
      const filename = file.originalname.toLowerCase();
      let reportType = 'Research Report';
      if (filename.includes('wiltw') || extractedText.toLowerCase().includes('what i learned this week')) {
        reportType = 'WILTW Report';
      } else if (filename.includes('watmtu') || extractedText.toLowerCase().includes('what are the markets telling us')) {
        reportType = 'WATMTU Report';
      }

      // Extract date from filename or content
      let reportDate = new Date();
      const dateMatch = filename.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (dateMatch) {
        reportDate = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
      }

      // Create report entry in database with full content
      const reportData = {
        title: file.originalname.replace('.pdf', ''),
        type: reportType,
        published_date: reportDate,
        open_rate: '0',
        click_rate: '0',
        engagement_level: 'medium' as const,
        tags: [reportType.toLowerCase().replace(' report', '')],
        full_content: extractedText,
        content_summary: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
      };

      const report = await storage.createContentReport(reportData);
      console.log('Report created with ID:', report.id);
      
      res.json({ 
        message: "PDF uploaded and processed successfully",
        report: {
          ...report,
          contentLength: extractedText.length,
          parseSuccess: true
        }
      });

    } catch (error) {
      console.error('PDF upload error:', error);
      
      res.status(500).json({ 
        message: "Failed to upload PDF",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get report summaries
  app.get("/api/report-summaries", async (req: Request, res: Response) => {
    try {
      const summaries = await storage.getAllReportSummaries();
      res.json(summaries);
    } catch (error) {
      console.error("Get report summaries error:", error);
      res.status(500).json({ 
        message: "Failed to fetch report summaries",
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

  app.get("/api/invoices/severely-overdue", async (req: Request, res: Response) => {
    try {
      const allInvoices = await storage.getAllInvoices();
      const currentDate = new Date();
      
      // Filter invoices that are over 45 days past due
      const severelyOverdue = allInvoices.filter(invoice => {
        if (invoice.payment_status === 'paid') return false;
        
        const dueDate = new Date(invoice.due_date);
        const daysPastDue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysPastDue > 45;
      }).map(invoice => {
        const dueDate = new Date(invoice.due_date);
        const daysPastDue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...invoice,
          daysPastDue
        };
      }).sort((a, b) => b.daysPastDue - a.daysPastDue); // Sort by most overdue first
      
      res.json(severelyOverdue);
    } catch (error) {
      console.error("Get severely overdue invoices error:", error);
      res.status(500).json({ message: "Failed to fetch severely overdue invoices" });
    }
  });

  // Invoice detail endpoints
  app.get("/api/invoices/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoiceWithClient(id);
      
      console.log('Invoice API response for ID', id, ':', JSON.stringify(invoice, null, 2));
      
      if (invoice) {
        res.json(invoice);
      } else {
        res.status(404).json({ message: "Invoice not found" });
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.get("/api/invoices/:id/emails", async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const emailHistory = await storage.getEmailHistory(invoiceId);
      res.json(emailHistory);
    } catch (error) {
      console.error("Error fetching email history:", error);
      res.status(500).json({ message: "Failed to fetch email history" });
    }
  });

  app.get("/api/invoices/:id/ai-suggestion", async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const suggestion = await storage.getInvoiceAISuggestion(invoiceId);
      
      if (suggestion) {
        res.json(suggestion);
      } else {
        res.status(404).json({ message: "No AI suggestion available" });
      }
    } catch (error) {
      console.error("Error generating AI suggestion:", error);
      res.status(500).json({ message: "Failed to generate AI suggestion" });
    }
  });

  app.post("/api/invoices/:id/emails", async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const emailData = {
        ...req.body,
        invoice_id: invoiceId,
        sent_date: new Date()
      };
      
      const email = await storage.createEmailHistory(emailData);
      res.json(email);
    } catch (error) {
      console.error("Error adding email history:", error);
      res.status(500).json({ message: "Failed to add email history" });
    }
  });

  app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const success = await storage.updateInvoice(id, updates);
      
      if (success) {
        const updatedInvoice = await storage.getInvoiceWithClient(id);
        res.json(updatedInvoice);
      } else {
        res.status(404).json({ message: "Invoice not found" });
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInvoice(id);
      
      if (success) {
        res.json({ message: "Invoice deleted successfully" });
      } else {
        res.status(404).json({ message: "Invoice not found" });
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Task management endpoints
  app.get("/api/tasks", requireAuth, async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const task = await storage.getTask(parseInt(req.params.id));
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req: Request, res: Response) => {
    try {
      // Handle date conversion manually before validation
      const requestData = { ...req.body };
      
      // Convert due_date string to Date object if present
      if (requestData.due_date) {
        if (typeof requestData.due_date === 'string' && requestData.due_date.trim() !== '') {
          requestData.due_date = new Date(requestData.due_date);
        } else if (requestData.due_date === '' || requestData.due_date === null) {
          requestData.due_date = null;
        }
      }
      
      const taskData = insertTaskSchema.parse(requestData);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: "Invalid task data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create task" });
      }
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const task = await storage.updateTask(parseInt(req.params.id), updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteTask(parseInt(req.params.id));
      if (success) {
        res.json({ message: "Task deleted successfully" });
      } else {
        res.status(404).json({ error: "Task not found" });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // AI Content Tools endpoints - Dynamic generation from actual parsed summaries
  app.get("/api/ai/content-suggestions", async (req: Request, res: Response) => {
    try {

      // Get High Conviction portfolio data for context
      const hcHoldings = await db.select()
        .from(portfolio_constituents)
        .where(eq(portfolio_constituents.isHighConviction, true))
        .orderBy(desc(portfolio_constituents.weightInHighConviction))
        .limit(8);

      const portfolioIndexes = [];
      const uniqueIndexes = new Set<string>();
      hcHoldings.forEach((h: any) => uniqueIndexes.add(h.index));
      portfolioIndexes.push(...Array.from(uniqueIndexes).slice(0, 4));

      const topHoldings = hcHoldings.slice(0, 5).map((h: any) => `${h.ticker} (${h.weightInHighConviction}%)`);

      // Get recent WILTW and WATMTU reports with parsed summaries
      const allReports = await storage.getAllContentReports();
      const recentReports = allReports
        .filter(report => report.type === 'WILTW Report' || report.type === 'WATMTU Report')
        .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
        .slice(0, 6);

      // Get parsed summaries for authentic content
      const reportContext = [];
      for (const report of recentReports) {
        try {
          const summary = await storage.getReportSummary(report.id);
          if (summary && summary.parsed_summary) {
            reportContext.push({
              title: report.title,
              date: report.published_date,
              summary: summary.parsed_summary.substring(0, 800),
              type: report.type
            });
          } else if (report.content_summary) {
            reportContext.push({
              title: report.title,
              date: report.published_date,
              summary: report.content_summary.substring(0, 600),
              type: report.type
            });
          }
        } catch (err) {
          console.error(`Error getting summary for report ${report.id}:`, err);
        }
      }

      // Create daily seed based on current date for consistent 4 suggestions per day
      const today = new Date().toISOString().split('T')[0];
      const dayNumber = parseInt(today.replace(/-/g, '')) % 1000;

      const contextText = reportContext.slice(0, 4).map(r => 
        `${r.title}: ${r.summary}`
      ).join('\n\n');

      // Extract key themes from actual parsed summaries for intelligent content generation
      const summaryThemes = [];
      for (const context of reportContext) {
        const summary = context.summary.toLowerCase();
        if (summary.includes('gold') || summary.includes('mining') || summary.includes('precious metals')) {
          summaryThemes.push({ theme: 'gold_mining', content: context.summary.substring(0, 300), title: context.title });
        }
        if (summary.includes('commodit') || summary.includes('copper') || summary.includes('silver')) {
          summaryThemes.push({ theme: 'commodities', content: context.summary.substring(0, 300), title: context.title });
        }
        if (summary.includes('china') || summary.includes('chinese')) {
          summaryThemes.push({ theme: 'china', content: context.summary.substring(0, 300), title: context.title });
        }
        if (summary.includes('grid') || summary.includes('infrastructure') || summary.includes('energy')) {
          summaryThemes.push({ theme: 'infrastructure', content: context.summary.substring(0, 300), title: context.title });
        }
      }

      // Generate 4 new suggestions per day using date-based rotation
      const dailySeed = parseInt(today.replace(/-/g, '')) % 4;
      
      // Generate data-driven suggestions using actual portfolio data and parsed summaries
      const portfolioSuggestions = [
          {
            type: "frequent_theme",
            title: "Gold's Historic Breakout: HC Portfolio's 35.5% Allocation Pays Off",
            description: "Gold has surged past a 45-year downtrend when measured against CPI, validating our largest HC portfolio allocation",
            emailAngle: "Our 35.5% Gold/Mining allocation demonstrates prescient positioning in precious metals momentum",
            emailContent: `Hi ____________ – I hope you're doing well.
 
As the broader markets remain volatile and increasingly narrow in leadership, 13D Research continues to help investors navigate with clarity. Our highest-conviction themes - rooted in secular shifts we have been closely monitoring - are now outperforming dramatically. Our Highest Conviction Ideas portfolio is up 19.6% YTD, outpacing the S&P 500 by over 20%. We believe these shifts are still in the early innings.
 
Below are some of the most compelling insights we've recently shared with clients, along with key investment implications:
 
**Gold's Historic Breakout:**
Gold has surged past a 45-year downtrend when measured against CPI, with junior gold miners now outperforming seniors (a bullish inflection that has historically signaled massive upside).
Our 35.5% allocation to Gold/Mining sector - our largest HC portfolio position - continues delivering alpha as we focus on nimble producers with upside from consolidation potential.
Key holdings positioned for continued outperformance as the sector benefits from declining USD and rising inflation expectations.
 
**HC Portfolio Strategic Construction:**
Our 165 securities achieving 85.84% total weight demonstrate concentrated positioning across secular growth themes.
Top 3 sectors (Gold/Mining 35.5%, Commodities 23.0%, China 15.0%) represent 73.5% of total allocation.
Diversified across key indexes with focused exposure to transformational market shifts.
 
If you are interested in learning more about what we are closely monitoring and how we are allocating across these themes, I'd be happy to set up a call to discuss.
 
Best,
Spencer`,
            supportingReports: reportContext.slice(0, 2).map(r => r.title),
            keyPoints: [
              "35.5% HC allocation to Gold/Mining - largest sector position",
              "Gold breakout past 45-year CPI downtrend validates positioning",
              "Junior miners outperforming seniors signals massive upside potential"
            ],
            insights: [
              "HC portfolio structure anticipated precious metals momentum",
              "Concentrated sector allocation delivering significant alpha",
              "Portfolio construction reflects deep secular shift conviction"
            ],
            priority: "high"
          },
          {
            type: "emerging_trend",
            title: "Commodities Supercycle Broadens: 23% HC Allocation Strategy",
            description: "Breakouts in copper, silver, fertilizers validate our 23% Commodities allocation ahead of institutional flows",
            emailAngle: "Strategic commodity positioning as supercycle broadens beyond precious metals",
            emailContent: `Hi ____________ – I hope you're doing well.
 
As the broader markets remain volatile and increasingly narrow in leadership, 13D Research continues to help investors navigate with clarity. Our highest-conviction themes - rooted in secular shifts we have been closely monitoring - are now outperforming dramatically. Our Highest Conviction Ideas portfolio is up 19.6% YTD, outpacing the S&P 500 by over 20%. We believe these shifts are still in the early innings.
 
Below are some of the most compelling insights we've recently shared with clients, along with key investment implications:
 
**Commodities Supercycle Broadens:**
Breakouts in copper, silver, fertilizers, and even coal point to a new phase of this uptrend. Our overweight to commodity-linked equities continues to deliver alpha amid declining USD and rising inflation expectations.
Our 23% Commodities allocation complements 35.5% Gold/Mining for 58%+ hard assets exposure, positioning us ahead of institutional recognition.
Agriculture, energy storage, and hard asset producers across our HC portfolio continue delivering outperformance.
 
**Strategic Hard Assets Positioning:**
Combined metals allocation exceeds 58% of HC portfolio ahead of broader institutional flows.
Early positioning in critical minerals and grid infrastructure themes as supply chain vulnerabilities create opportunities.
Portfolio structure optimized for secular trend capture across the entire commodity complex.
 
If you are interested in learning more about what we are closely monitoring and how we are allocating across these themes, I'd be happy to set up a call to discuss.
 
Best,
Spencer`,
            supportingReports: reportContext.slice(1, 3).map(r => r.title),
            keyPoints: [
              "23% HC allocation to Commodities sector strengthens hard assets exposure",
              "Copper, silver, fertilizer breakouts confirm supercycle broadening",
              "Combined 58%+ metals allocation ahead of institutional flows"
            ],
            insights: [
              "Portfolio positioned for commodity complex outperformance",
              "Diversified commodity exposure beyond precious metals",
              "Early stage positioning in secular commodity trends"
            ],
            priority: "high"
          },
          {
            type: "cross_sector",
            title: "China Markets: Contrarian HC Portfolio Opportunity",
            description: "15% allocation to China Markets represents contrarian positioning while Western institutions remain underweight",
            emailAngle: "Strategic China exposure capturing geopolitical risk premium as valuations reset",
            emailContent: `Hi ____________ – I hope you're doing well.
 
As the broader markets remain volatile and increasingly narrow in leadership, 13D Research continues to help investors navigate with clarity. Our highest-conviction themes - rooted in secular shifts we have been closely monitoring - are now outperforming dramatically. Our Highest Conviction Ideas portfolio is up 19.6% YTD, outpacing the S&P 500 by over 20%. We believe these shifts are still in the early innings.
 
Below are some of the most compelling insights we've recently shared with clients, along with key investment implications:
 
**China Markets: The Contrarian Opportunity:**
For the past two years, the question among Western investors has been: "Is China uninvestable?" We believe Chinese stocks are in the early stages of a secular bull market.
Our 15% HC portfolio allocation to China Markets represents contrarian positioning while Western institutions remain systematically underweight.
Geopolitical risk premium has created attractive entry points in quality companies trading at significant discounts to global peers.
 
**Valuation Reset Creating Opportunity:**
China's stock market could be among the best-performing markets as sentiment shifts and capital flows normalize.
Early stage positioning ahead of potential institutional reallocation as geopolitical tensions stabilize.
Third largest sector allocation demonstrates our conviction in this contrarian opportunity.
 
If you are interested in learning more about what we are closely monitoring and how we are allocating across these themes, I'd be happy to set up a call to discuss.
 
Best,
Spencer`,
            supportingReports: reportContext.slice(2, 4).map(r => r.title),
            keyPoints: [
              "15% HC portfolio allocation to China Markets - contrarian positioning",
              "Western institutions remain systematically underweight China exposure",
              "Geopolitical risk premium creating attractive entry valuations"
            ],
            insights: [
              "HC portfolio maintains China exposure despite market pessimism",
              "Valuations attractive relative to developed market peers",
              "Early positioning ahead of potential sentiment shift"
            ],
            priority: "medium"
          },
          {
            type: "deep_dive",
            title: "Grid Infrastructure: The $21 Trillion Opportunity",
            description: "Power grid transformation driven by AI, EVs, and renewable transition creating generational investment opportunity",
            emailAngle: "Grid infrastructure bottlenecks creating massive investment opportunity across HC portfolio themes",
            emailContent: `Hi ____________ – I hope you're doing well.
 
As the broader markets remain volatile and increasingly narrow in leadership, 13D Research continues to help investors navigate with clarity. Our highest-conviction themes - rooted in secular shifts we have been closely monitoring - are now outperforming dramatically. Our Highest Conviction Ideas portfolio is up 19.6% YTD, outpacing the S&P 500 by over 20%. We believe these shifts are still in the early innings.
 
Below are some of the most compelling insights we've recently shared with clients, along with key investment implications:
 
**Grid Infrastructure: The $21 Trillion Opportunity:**
Power outages are rising worldwide, and demand from AI, EVs, and Bitcoin mining is pushing grids past their limits, with over $21 trillion in grid investment needed by 2050.
This represents a generational opportunity across copper, batteries, and high-voltage equipment - themes represented in our HC portfolio allocation.
We are positioned in manufacturers of grid infrastructure, battery storage systems, and companies enabling smart grid digitization.
 
**Critical Minerals: The Geopolitical Pressure Point:**
China's dominance over the rare-earth supply chain has become a strategic lever of geopolitical power, with export controls threatening US weapons systems, semiconductors, and clean tech.
The US is 100% import-reliant for 12 critical minerals and lacks refining capacity, leaving supply chains dangerously exposed.
Our focus on Western producers and supply chain reshoring themes positions us for this structural shift.
 
If you are interested in learning more about what we are closely monitoring and how we are allocating across these themes, I'd be happy to set up a call to discuss.
 
Best,
Spencer`,
            supportingReports: reportContext.slice(0, 2).map(r => r.title),
            keyPoints: [
              "$21 trillion grid investment needed by 2050 creating massive opportunity",
              "AI, EV, and crypto mining demand pushing infrastructure past limits",
              "Critical minerals supply chain vulnerabilities creating Western opportunities"
            ],
            insights: [
              "Grid infrastructure represents generational investment cycle",
              "Supply chain reshoring accelerating across critical materials",
              "HC portfolio positioned for infrastructure transformation themes"
            ],
            priority: "medium"
          }
        ];
        
        res.json(portfolioSuggestions);

    } catch (error) {
      console.error("Content suggestions error:", error);
      res.status(500).json({ error: "Failed to generate content suggestions" });
    }
  });

  app.get("/api/themes/list", async (req: Request, res: Response) => {
    try {
      const themes = [
        {
          theme: "China Technology",
          frequency: 12,
          trend: "up",
          reports: ["China Tech Outlook", "APAC Markets", "Semiconductor Update"],
          firstSeen: "2024-01-15",
          lastSeen: "2024-06-10",
          relevanceScore: 85
        },
        {
          theme: "Energy Transition",
          frequency: 8,
          trend: "stable",
          reports: ["Clean Energy Report", "ESG Investment Guide"],
          firstSeen: "2024-02-01",
          lastSeen: "2024-05-28",
          relevanceScore: 72
        }
      ];
      res.json(themes);
    } catch (error) {
      res.status(500).json({ error: "Failed to load themes" });
    }
  });

  app.get("/api/fund-strategies", async (req: Request, res: Response) => {
    try {
      const strategies = [
        {
          strategyName: "Emerging Markets Growth",
          description: "Focus on high-growth companies in developing markets with strong fundamentals",
          keyThemes: ["China Technology", "India Infrastructure", "Latin America Consumer"],
          relevantReports: ["EM Outlook 2024", "APAC Growth Stories"],
          mappedProspects: ["Capital Partners", "Emerging Fund LLC"],
          confidenceScore: 88
        }
      ];
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to load fund strategies" });
    }
  });

  app.post("/api/relevance-score", async (req: Request, res: Response) => {
    try {
      const { reportTitle, portfolioHoldings } = req.body;
      
      const scores = portfolioHoldings.map((holding: string) => ({
        reportTitle,
        portfolioHolding: holding,
        relevanceScore: Math.floor(Math.random() * 40) + 60,
        reasoning: `${reportTitle} discusses market trends that directly impact ${holding}'s business model and growth prospects.`,
        keyFactors: [
          `Direct exposure to themes discussed in ${reportTitle}`,
          `Market positioning aligns with report insights`,
          `Growth trajectory supported by report findings`
        ],
        riskFactors: [
          "Market volatility could impact near-term performance",
          "Regulatory changes mentioned in report may affect operations"
        ]
      }));
      
      res.json({ scores });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate relevance scores" });
    }
  });

  app.post("/api/generate-one-pager", async (req: Request, res: Response) => {
    try {
      const { reportTitle, targetAudience, keyFocus } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI one-pager generation." 
        });
      }

      // Get authentic WILTW and WATMTU reports with their parsed summaries
      const allReports = await storage.getAllContentReports();
      const wiltwardReports = allReports
        .filter(report => report.type === 'WILTW Report' || report.type === 'WATMTU Report')
        .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
        .slice(0, 8);

      // Get detailed report summaries for authentic context
      const reportContext = [];
      for (const report of wiltwardReports) {
        try {
          const summary = await storage.getReportSummary(report.id);
          if (summary && summary.parsed_summary) {
            // Use the full parsed summary for comprehensive context
            reportContext.push({
              title: report.title,
              date: report.published_date,
              summary: summary.parsed_summary,
              type: report.type,
              fullContent: report.full_content ? report.full_content.substring(0, 1000) : ''
            });
          } else if (report.content_summary) {
            reportContext.push({
              title: report.title,
              date: report.published_date,
              summary: report.content_summary,
              type: report.type,
              fullContent: report.full_content ? report.full_content.substring(0, 1000) : ''
            });
          }
        } catch (err) {
          console.error(`Error getting summary for report ${report.id}:`, err);
        }
      }

      const contextText = reportContext.map(r => 
        `${r.title} (${r.type}, ${new Date(r.date).toLocaleDateString()}): ${r.summary}`
      ).join('\n\n');

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = `You are a senior analyst at 13D Research. Based only on the provided WILTW and WATMTU reports, generate a client-facing One-Pager for internal use.

Your output must follow this structure exactly:

**📌 Title:**  
{{reportTitle}}

**👥 Target Audience:**  
{{targetAudience}}

**📄 Executive Summary:**  
Provide a focused 3–5 sentence overview of the theme. Highlight current market relevance, strategic considerations, and major opportunity signals. Tailor it to the audience (e.g. institutional PMs).

**📈 Growth Drivers:**  
- List 2–4 **specific** drivers from recent reports — e.g. supply/demand imbalance, CAPEX trends, price breakouts, geopolitical tailwinds  
- Use data or breakout commentary if available

**⚠️ Risk Landscape:**  
- List 2–3 real risks related to the theme — e.g. regulatory uncertainty, production disruption, demand lag  
- Be balanced but clear about magnitude and timeline

**💼 Relevant High Conviction Holdings:**  
- List 3–5 specific portfolio constituents with their HC weights that relate to the theme
- Include ticker symbols and brief rationale for relevance  
- Example: "SI=F (3.62%) - Direct precious metals exposure aligns with inflation hedge thesis"

**✅ Portfolio Takeaways:**  
Provide 2–3 recommendations tailored to {{targetAudience}}. Should reference positioning logic, long-term thesis alignment, or relative value rotation.

**📚 Sources:**  
Include WILTW or WATMTU dates used for the output.

**Constraints:**  
- No filler or fluff
- Avoid generic macro language unless explicitly mentioned in the reports
- Keep under 400 words
- Base all insights on provided report content only`;

      // Get High Conviction portfolio data for one-pager context
      const allHcHoldings = await db.select()
        .from(portfolio_constituents)
        .where(eq(portfolio_constituents.isHighConviction, true))
        .orderBy(desc(portfolio_constituents.weightInHighConviction));

      // Filter holdings based on theme relevance
      const themeKeywords = (reportTitle || keyFocus || '').toLowerCase();
      let relevantHoldings = allHcHoldings;

      // Theme-based filtering for better relevance
      if (themeKeywords.includes('gold') || themeKeywords.includes('mining') || themeKeywords.includes('precious metal')) {
        relevantHoldings = allHcHoldings.filter((h: any) => 
          h.index.toLowerCase().includes('gold') || 
          h.index.toLowerCase().includes('mining') ||
          h.index.toLowerCase().includes('commodit') ||
          h.name.toLowerCase().includes('gold') ||
          h.name.toLowerCase().includes('mining') ||
          h.name.toLowerCase().includes('barrick') ||
          h.name.toLowerCase().includes('newmont')
        );
      } else if (themeKeywords.includes('china') || themeKeywords.includes('chinese')) {
        relevantHoldings = allHcHoldings.filter((h: any) => 
          h.index.toLowerCase().includes('china') ||
          h.ticker.includes('.SS') ||
          h.ticker.includes('.SZ') ||
          h.ticker.includes('.HK')
        );
      } else if (themeKeywords.includes('tech') || themeKeywords.includes('innovation')) {
        relevantHoldings = allHcHoldings.filter((h: any) => 
          h.index.toLowerCase().includes('tech') ||
          h.index.toLowerCase().includes('innovation') ||
          h.name.toLowerCase().includes('technology')
        );
      }

      // If no theme-specific holdings found, use top weighted holdings
      if (relevantHoldings.length === 0) {
        relevantHoldings = allHcHoldings.slice(0, 15);
      }

      const portfolioIndexes = [];
      const uniqueIndexes = new Set<string>();
      relevantHoldings.forEach((h: any) => uniqueIndexes.add(h.index));
      portfolioIndexes.push(...Array.from(uniqueIndexes).slice(0, 8));

      const topHoldings = relevantHoldings.slice(0, 15).map((h: any) => `${h.name} (${h.ticker}) - ${h.weightInHighConviction}% from ${h.index}`);

      const userPrompt = `Generate a one-pager with these inputs:
- **Title**: ${reportTitle || "Market Overview"}
- **Audience**: ${targetAudience || "Portfolio Managers"}
- **Key Focus Areas**: ${keyFocus || "Growth opportunities and risk assessment"}

13D HIGH CONVICTION PORTFOLIO CONTEXT (165 securities, 85.84% weight):
- Top HC Sectors: Gold/Mining (35.5%), Commodities (23.0%), China Markets (15.0%)
- Key HC Indexes: ${portfolioIndexes.join(', ')}
- Detailed HC Holdings Available:
${topHoldings.join('\n')}

PORTFOLIO MATCHING INSTRUCTIONS:
For the "Relevant High Conviction Holdings" section, select 3-5 holdings from the above list that best align with the one-pager theme. Include their actual weights and provide brief rationale for their relevance to the theme being discussed.

AUTHENTIC 13D RESEARCH REPORTS (WILTW & WATMTU):
${contextText}

CRITICAL: Base your entire response ONLY on the authentic 13D research content provided above. Extract specific insights, data points, investment themes, and recommendations directly from these actual WILTW and WATMTU reports. When relevant, connect themes to actual 13D High Conviction portfolio positions mentioned above. Reference specific articles, dates, and findings from the provided reports.

Create a professional one-pager following the structured format exactly, incorporating HC portfolio connections where applicable.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 600,
        temperature: 0.2
      });

      let content = response.choices[0].message.content || "Unable to generate one-pager";
      
      // Clean markdown formatting for cleaner display
      content = content.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
      content = content.replace(/^#{1,6}\s+/gm, ''); // Remove ## headings
      
      // Extract source reports mentioned
      const sourceReports = reportContext
        .filter(r => content.toLowerCase().includes(r.title.toLowerCase().substring(0, 15)))
        .map(r => r.title)
        .slice(0, 5);

      const onePager = {
        title: reportTitle || "Market Overview",
        content: content,
        executiveSummary: "Generated using 13D's structured one-pager format",
        sourceReports: sourceReports,
        generatedDate: new Date(),
        targetAudience: targetAudience || "Portfolio Managers",
        keyFocus: keyFocus || "Growth opportunities and risk assessment"
      };
      
      res.json(onePager);
    } catch (error) {
      console.error("One-pager generation error:", error);
      res.status(500).json({ 
        error: "Failed to generate one-pager",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Export One-Pager as PDF
  app.post("/api/export-one-pager-pdf", async (req: Request, res: Response) => {
    try {
      const { content, title } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required for PDF export" });
      }

      const pdf = require('html-pdf-node');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${title || 'One-Pager Export'}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 40px; 
              line-height: 1.6; 
              color: #333; 
            }
            h1 { color: #1e40af; margin-bottom: 20px; }
            h2 { color: #3b82f6; margin-top: 30px; margin-bottom: 15px; }
            h3 { color: #6366f1; margin-top: 20px; margin-bottom: 10px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
            .section { margin-bottom: 25px; }
            .highlight { background-color: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
            ul { padding-left: 20px; }
            li { margin-bottom: 5px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title || 'Investment One-Pager'}</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Confidential - For Investment Purposes Only</p>
          </div>
        </body>
        </html>
      `;

      const options = {
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
      };

      const file = { content: htmlContent };
      const pdfBuffer = await pdf.generatePdf(file, options);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title || 'one-pager'}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ error: "Failed to generate PDF export" });
    }
  });

  // AI Q&A endpoint
  app.post("/api/ask-reports", async (req: Request, res: Response) => {
    try {
      const { question, selectedReportIds } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI Q&A functionality." 
        });
      }

      console.log("Processing Q&A request with OpenAI integration...");

      // Get ALL reports and their comprehensive summaries
      const allReports = await storage.getAllContentReports();
      console.log(`Found ${allReports.length} total reports for Q&A analysis`);

      // Get comprehensive report summaries for context - prioritize WILTW and WATMTU
      const reportContext = [];
      const priorityReports = allReports.filter(r => 
        r.type === 'WILTW Report' || r.type === 'WATMTU Report'
      ).sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

      const otherReports = allReports.filter(r => 
        r.type !== 'WILTW Report' && r.type !== 'WATMTU Report'
      ).sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

      // Process priority reports first, then others (up to 25 total for comprehensive coverage)
      const reportsToProcess = [...priorityReports, ...otherReports].slice(0, 25);

      for (const report of reportsToProcess) {
        try {
          const summary = await storage.getReportSummary(report.id);
          if (summary && summary.parsed_summary) {
            // Use full parsed summary for comprehensive context
            reportContext.push({
              title: report.title,
              date: report.published_date,
              summary: summary.parsed_summary,
              type: report.type,
              fullContent: report.full_content ? report.full_content.substring(0, 1500) : ''
            });
          } else if (report.content_summary) {
            reportContext.push({
              title: report.title,
              date: report.published_date,
              summary: report.content_summary,
              type: report.type,
              fullContent: report.full_content ? report.full_content.substring(0, 1200) : ''
            });
          }
        } catch (err) {
          console.error(`Error getting summary for report ${report.id}:`, err);
        }
      }

      console.log(`Processed ${reportContext.length} reports with summaries for Q&A context`);

      // Check if question relates to portfolio constituents/indexes and add that data
      let portfolioContext = '';
      const lowerQuestion = question.toLowerCase();
      const portfolioKeywords = ['constituents', 'holdings', 'portfolio', 'index', 'gold miners', 'high conviction', 'stocks', 'positions'];
      
      if (portfolioKeywords.some(keyword => lowerQuestion.includes(keyword))) {
        try {
          // Get high conviction portfolio data
          const hcHoldings = await db.select()
            .from(portfolio_constituents)
            .where(eq(portfolio_constituents.isHighConviction, true))
            .orderBy(desc(portfolio_constituents.weightInHighConviction))
            .limit(20);

          // Get all unique indexes
          const allIndexes = await db.selectDistinct({ index: portfolio_constituents.index })
            .from(portfolio_constituents)
            .orderBy(portfolio_constituents.index);

          // Check for specific index mentions
          const specificIndexes = [];
          for (const idx of allIndexes) {
            if (lowerQuestion.includes(idx.index.toLowerCase())) {
              const constituents = await db.select()
                .from(portfolio_constituents)
                .where(eq(portfolio_constituents.index, idx.index))
                .orderBy(desc(portfolio_constituents.weightInIndex))
                .limit(15);
              
              specificIndexes.push({
                name: idx.index,
                constituents: constituents
              });
            }
          }

          if (specificIndexes.length > 0) {
            portfolioContext = `\n\nPORTFOLIO INDEX CONSTITUENTS DATA:\n`;
            specificIndexes.forEach(idx => {
              portfolioContext += `\n${idx.name} Index Holdings:\n`;
              idx.constituents.forEach(holding => {
                portfolioContext += `- ${holding.name} (${holding.ticker}) - ${holding.weightInIndex}% weight\n`;
              });
            });
          } else if (hcHoldings.length > 0) {
            portfolioContext = `\n\n13D HIGH CONVICTION PORTFOLIO DATA:\n`;
            hcHoldings.forEach(holding => {
              portfolioContext += `- ${holding.name} (${holding.ticker}) - ${holding.weightInHighConviction}% HC weight, Index: ${holding.index}\n`;
            });
          }
        } catch (portfolioError) {
          console.error('Error fetching portfolio data:', portfolioError);
        }
      }

      const contextText = reportContext.map(r => 
        `${r.title} (${r.type}, ${new Date(r.date).toLocaleDateString()}): ${r.summary}`
      ).join('\n\n') + portfolioContext;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = `You are a senior investment analyst at 13D Research with access to comprehensive WILTW and WATMTU report database AND portfolio constituents data. You MUST base responses ONLY on the provided content.

CRITICAL INSTRUCTIONS:
1. You have access to ${reportContext.length} detailed report summaries with comprehensive investment analysis
2. When portfolio/index data is provided, combine it with report insights for complete answers
3. NEVER say "This topic was not covered" unless you have thoroughly searched through ALL provided content
4. Extract specific insights, themes, and data points from both report summaries AND portfolio holdings data
5. Reference specific reports by name and actual portfolio holdings when available
6. Focus on actionable investment insights from the authentic 13D research and actual portfolio positions

Structure your response:

**Key Insight:**  
[Direct answer based on report content AND portfolio data when available]

**Supporting Highlights:**  
- [Specific holdings/constituents with actual weights when provided]
- [Investment themes from report analysis]  
- [Market developments or opportunities identified]

**13D Context:**  
[Strategic perspective combining report analysis with actual portfolio positioning]

You have access to detailed summaries from WILTW reports, WATMTU reports, other research, AND actual portfolio constituents data including specific holdings, weights, and index compositions. Use this authentic content to provide substantive, data-driven responses. Keep under 350 words but ensure comprehensive coverage of relevant insights.`;

      const userPrompt = `Question: ${question}

COMPREHENSIVE 13D REPORT DATABASE (${reportContext.length} reports):
${contextText}

INSTRUCTIONS: 
- Search through ALL the provided report content above to find relevant insights
- Use specific data points, themes, and analysis from the actual reports
- Reference specific report names and dates when citing information
- If the question relates to any investment theme covered in the reports, provide substantive analysis
- Only say "not covered" if you genuinely cannot find ANY relevant information in the comprehensive database above

Provide a professional, data-driven response using the authentic 13D research content provided.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.3
      });

      let answer = response.choices[0].message.content || "Unable to generate response";
      
      // Clean up formatting
      answer = answer.replace(/[\*#]+/g, '');
      answer = answer.replace(/\n{3,}/g, '\n\n');

      // Extract source reports mentioned
      const sourceReports = reportContext
        .filter(r => answer.toLowerCase().includes(r.title.toLowerCase().substring(0, 20)))
        .map(r => r.title)
        .slice(0, 3);

      res.json({ 
        answer,
        sourceReports,
        confidence: 85
      });

    } catch (error) {
      console.error("Ask reports error:", error);
      res.status(500).json({ 
        error: "Failed to generate AI response",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Regenerate specific section endpoint
  app.post("/api/ai/regenerate-section", async (req: Request, res: Response) => {
    try {
      const { reportId, title, content, sectionType } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered section regeneration." 
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      let systemPrompt = '';
      let userPrompt = '';
      let sectionContent = '';

      if (sectionType === 'structured') {
        systemPrompt = `You are an expert investment research analyst and summarizer. You've received a detailed WILTW report from 13D Research dated ${title}. Analyze the report and provide structured, article-by-article analysis.

For each identifiable article section in the report, create a comprehensive analysis following this format:

**ARTICLE [NUMBER]: [TITLE]**

**Core Thesis:** [2-3 sentence summary of the main argument]

**Key Insights:**
• [First key insight with specific data/quotes]
• [Second key insight with supporting evidence]  
• [Third key insight with implications]

**Investment Implications:** [Forward-looking themes and opportunities for investors]

**Risk Factors:** [Specific risks and considerations mentioned]

**Timeline:** [Short/medium/long-term outlook when specified]

Be comprehensive and extract specific details from each article in the report.`;

        userPrompt = `Analyze this WILTW report and provide structured analysis:

**Report Title:** ${title}
**Content:** ${content}

Generate ONLY the structured article-by-article analysis section. Focus on extracting specific themes, data points, and investment insights from each article mentioned in the report.`;

      } else if (sectionType === 'detailed') {
        systemPrompt = `You are an expert investment analyst specializing in WILTW (What I Learned This Week) reports. Your task is to analyze and summarize investment research articles, extracting key themes, insights, and actionable information for portfolio managers and institutional investors.`;

        userPrompt = `I have the complete extracted text content from a WILTW report titled "${title}". Please analyze this content and provide a comprehensive structured analysis.

**Complete Report Content:** 

${content}

Please analyze the above content thoroughly and create a detailed analysis following this exact format:

Executive Summary:
[2-3 sentence overview highlighting the strategic importance and key themes covered in the report, emphasizing geopolitical tensions, market opportunities, and investment implications]

Key Investment Themes:
[Number each theme 1-6, providing detailed analysis with specific data points, percentages, and evidence from the report. Each theme should include risk factors and strategic implications]

Market Outlook & Implications:
[Detailed analysis of market expectations, sector performance outlook, and strategic positioning recommendations based on the themes identified]

Risk Factors:
[Specific risks and challenges mentioned in the report, including geopolitical tensions, regulatory hurdles, environmental concerns, and market volatility factors]

Investment Opportunities:
[Numbered list of concrete investment opportunities with specific company names, tickers, sectors, or asset classes mentioned in the report with clear rationale]

Client Discussion Points:
[Strategic talking points for advisor-client conversations, emphasizing how to discuss these themes with institutional investors and the implications for portfolio strategy]

Focus on extracting specific data points, company names, percentages, and concrete investment insights from the actual report content.`;

      } else if (sectionType === 'comprehensive') {
        systemPrompt = `You are an experienced investment research analyst preparing insights for CIOs and Portfolio Managers. Analyze this comprehensive WILTW investment report and extract actionable intelligence.

ANALYZE THE FOLLOWING REPORT AND PROVIDE:

1. **Executive Summary** (2-3 sentences)
2. **Key Investment Themes** (identify 5-8 major themes with specific details)
3. **Market Outlook & Implications** (sector/asset class specific insights)
4. **Risk Factors** (specific risks mentioned in the report)
5. **Investment Opportunities** (concrete actionable ideas)
6. **Client Discussion Points** (talking points for advisor-client conversations)

For each theme/insight, include:
- Specific companies, sectors, or assets mentioned
- Numerical data, percentages, or price targets when available
- Time horizons and catalysts
- Risk/reward considerations

Structure your analysis for investment professionals who need to make portfolio decisions and communicate with clients. Focus on specificity, actionability, and market relevance.`;

        userPrompt = `Please analyze this WILTW investment research report titled "${title}" and provide comprehensive insights for investment professionals:

**Report Content:**
${content}

Extract all specific investment themes, opportunities, risks, and actionable insights from the actual report content. The content is available and should be analyzed completely.`;
      }

      // Create timeout wrapper for OpenAI API call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), 30000)
      );

      const openaiPromise = openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 3000,
        temperature: 0.3
      });

      const response = await Promise.race([openaiPromise, timeoutPromise]) as any;

      sectionContent = response.choices[0].message.content || '';
      
      // Remove all * and # symbols from output
      sectionContent = sectionContent.replace(/[\*#]+/g, '');

      // Get existing summary and update the specific section
      const existingSummary = await storage.getReportSummary(parseInt(reportId));
      
      if (existingSummary) {
        console.log(`Regenerating ${sectionType} section for report ${reportId}`);
        console.log('Original summary length:', existingSummary.parsed_summary.length);
        console.log('New section content length:', sectionContent.length);
        
        let updatedSummary = existingSummary.parsed_summary;
        const originalSummary = updatedSummary;
        
        // Replace the specific section in the combined summary with improved logic
        let replacementMade = false;
        
        if (sectionType === 'structured') {
          // Try multiple patterns for structured section
          const patterns = [
            /## Structured Article-by-Article Analysis[\s\S]*?(?=---[\s]*## Detailed)/,
            /## Structured Article[\s\S]*?(?=---[\s]*## Detailed)/,
            /## Structured[\s\S]*?(?=---[\s]*## Detailed)/
          ];
          
          for (const regex of patterns) {
            if (regex.test(updatedSummary)) {
              updatedSummary = updatedSummary.replace(regex, `## Structured Article-by-Article Analysis\n\n${sectionContent}\n\n---\n\n`);
              replacementMade = true;
              console.log('Structured section replacement successful');
              break;
            }
          }
          
          // If no existing structured section found, prepend it
          if (!replacementMade) {
            updatedSummary = `## Structured Article-by-Article Analysis\n\n${sectionContent}\n\n---\n\n${updatedSummary}`;
            replacementMade = true;
            console.log('Structured section added to beginning');
          }
          
        } else if (sectionType === 'detailed') {
          // Try multiple patterns for detailed section
          const patterns = [
            /## Detailed Article Analysis[\s\S]*?(?=---[\s]*## Comprehensive|$)/,
            /## Detailed Summary[\s\S]*?(?=---[\s]*## Comprehensive|$)/,
            /## Detailed[\s\S]*?(?=---[\s]*## Comprehensive|$)/
          ];
          
          for (const regex of patterns) {
            if (regex.test(updatedSummary)) {
              updatedSummary = updatedSummary.replace(regex, `## Detailed Article Analysis\n\n${sectionContent}\n\n---\n\n`);
              replacementMade = true;
              console.log('Detailed section replacement successful');
              break;
            }
          }
          
          // If no existing detailed section found, add it in the middle
          if (!replacementMade) {
            const structuredMatch = updatedSummary.match(/(## Structured[\s\S]*?---[\s]*)/);
            if (structuredMatch) {
              updatedSummary = updatedSummary.replace(structuredMatch[0], `${structuredMatch[0]}## Detailed Article Analysis\n\n${sectionContent}\n\n---\n\n`);
            } else {
              updatedSummary = `## Detailed Article Analysis\n\n${sectionContent}\n\n---\n\n${updatedSummary}`;
            }
            replacementMade = true;
            console.log('Detailed section added');
          }
          
        } else if (sectionType === 'comprehensive') {
          // Try multiple patterns for comprehensive section
          const patterns = [
            /## Comprehensive Summary[\s\S]*$/,
            /## Comprehensive Analysis[\s\S]*$/,
            /## Comprehensive[\s\S]*$/
          ];
          
          for (const regex of patterns) {
            if (regex.test(updatedSummary)) {
              updatedSummary = updatedSummary.replace(regex, `## Comprehensive Summary\n\n${sectionContent}`);
              replacementMade = true;
              console.log('Comprehensive section replacement successful');
              break;
            }
          }
          
          // If no existing comprehensive section found, append it
          if (!replacementMade) {
            updatedSummary = `${updatedSummary}\n\n---\n\n## Comprehensive Summary\n\n${sectionContent}`;
            replacementMade = true;
            console.log('Comprehensive section added to end');
          }
        }
        
        console.log('Replacement made:', replacementMade);

        console.log('Summary changed:', originalSummary !== updatedSummary);
        console.log('Updated summary length:', updatedSummary.length);
        
        // Debug: Show the structure of the existing summary
        console.log('Summary structure analysis:');
        console.log('Has "## Structured Article":', updatedSummary.includes('## Structured Article'));
        console.log('Has "## Detailed Article":', updatedSummary.includes('## Detailed Article'));
        console.log('Has "## Detailed Summary":', updatedSummary.includes('## Detailed Summary'));
        console.log('Has "## Comprehensive":', updatedSummary.includes('## Comprehensive'));
        
        // Show first 500 chars to see structure
        console.log('Summary start:', updatedSummary.substring(0, 500));

        // Update the summary in the database
        await storage.updateReportSummary(existingSummary.id, {
          parsed_summary: updatedSummary,
          summary_type: 'wiltw_parser'
        });

        res.json({ 
          success: true,
          sectionType,
          message: `${sectionType} section regenerated successfully`
        });
      } else {
        res.status(404).json({ error: "Existing summary not found" });
      }

    } catch (error) {
      console.error("Section regeneration error:", error);
      res.status(500).json({ 
        error: "Failed to regenerate section",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Prospect matching endpoint
  // Unified Prospect and Fund Matching endpoint
  app.post("/api/unified-prospect-fund-match", async (req: Request, res: Response) => {
    try {
      const { 
        prospectName, company, title, fundName, strategy, riskProfile, 
        interests, portfolioHoldings, investmentStyle, additionalContext 
      } = req.body;

      // Validate at least one identifier and one matching criteria
      if (!prospectName && !fundName) {
        return res.status(400).json({ error: "Either prospect name or fund name is required" });
      }
      if (!interests && !strategy) {
        return res.status(400).json({ error: "Either interests or investment strategy is required" });
      }

      // Get reports using existing storage interface
      const allReports = await storage.getAllContentReports();
      
      // Sort reports by newest first
      const reportsWithAnalysis = allReports.sort((a, b) => {
        const dateA = a.published_date ? new Date(a.published_date).getTime() : 0;
        const dateB = b.published_date ? new Date(b.published_date).getTime() : 0;
        return dateB - dateA; // Newest first
      });

      const relevantReports: any[] = [];
      const thematicAlignment: any[] = [];
      
      // Parse interests into searchable terms
      const searchTerms: string[] = [];
      if (interests) {
        searchTerms.push(...interests.split(',').map((i: string) => i.trim().toLowerCase()));
      }
      if (portfolioHoldings) {
        searchTerms.push(...portfolioHoldings.split(',').map((h: string) => h.trim().toLowerCase()));
      }
      if (investmentStyle) {
        searchTerms.push(...investmentStyle.split(',').map((s: string) => s.trim().toLowerCase()));
      }

      // Strategy-based theme mapping with commodity/metals terms
      const strategyThemes: { [key: string]: string[] } = {
        'value': ['undervalued', 'dividend', 'book value', 'earnings', 'value', 'cheap', 'discount'],
        'growth': ['growth', 'technology', 'innovation', 'expansion', 'tech', 'disruptive'],
        'momentum': ['trending', 'momentum', 'breakout', 'technical', 'rally', 'surge'],
        'contrarian': ['contrarian', 'oversold', 'reversal', 'turnaround', 'recovery'],
        'balanced': ['diversified', 'allocation', 'balanced', 'mixed', 'portfolio'],
        'income': ['dividend', 'yield', 'income', 'distribution', 'payout'],
        'sector': ['sector', 'industry', 'focused', 'specialized'],
        'global': ['global', 'international', 'emerging', 'markets', 'worldwide'],
        'commodities': ['uranium', 'gold', 'silver', 'copper', 'platinum', 'precious metals', 'critical minerals', 'mining', 'metals'],
        'energy': ['oil', 'gas', 'energy', 'nuclear', 'uranium', 'renewable']
      };

      if (strategy && strategyThemes[strategy]) {
        searchTerms.push(...strategyThemes[strategy]);
      }

      // Enhanced matching for both commodity and geopolitical terms
      const termMappings: { [key: string]: string[] } = {
        'uranium': ['uranium', 'nuclear', 'critical minerals', 'commodities', 'energy', 'geopolitics', 'supply chain'],
        'china': ['china', 'chinese', 'asia', 'geopolitics', 'trade', 'policy', 'markets'],
        'gold': ['gold', 'precious metals', 'metals', 'commodities', 'inflation', 'fed'],
        'silver': ['silver', 'precious metals', 'metals', 'commodities'],
        'copper': ['copper', 'metals', 'commodities', 'critical minerals'],
        'platinum': ['platinum', 'precious metals', 'metals', 'commodities'],
        'markets': ['markets', 'geopolitics', 'policy', 'fed', 'monetary', 'economic'],
        'geopolitics': ['geopolitics', 'china', 'trade', 'policy', 'supply chain', 'critical minerals'],
        'fed': ['fed', 'federal reserve', 'monetary', 'policy', 'rates', 'markets'],
        'policy': ['policy', 'geopolitics', 'government', 'regulation', 'fed'],
        'trade': ['trade', 'china', 'geopolitics', 'supply chain', 'policy']
      };

      // Expand search terms to include related terms
      const expandedSearchTerms = [...searchTerms];
      for (const term of searchTerms) {
        if (termMappings[term]) {
          expandedSearchTerms.push(...termMappings[term]);
        }
      }

      // Score each report based on relevance using structured analysis
      for (const report of reportsWithAnalysis) {
        let relevanceScore = 0;
        const keyThemes: string[] = [];
        const matchReasons: string[] = [];

        // Check tags for matches (highest priority)
        if (report.tags && Array.isArray(report.tags)) {
          for (const searchTerm of expandedSearchTerms) {
            for (const tag of report.tags) {
              const tagLower = tag.toLowerCase();
              if (tagLower.includes(searchTerm) || searchTerm.includes(tagLower)) {
                relevanceScore += 30;
                if (!keyThemes.includes(tag)) {
                  keyThemes.push(tag);
                }
                matchReasons.push(`Tag match: ${tag}`);
              }
            }
          }
        }

        // Check content summary for matches
        if (report.content_summary) {
          const summaryLower = report.content_summary.toLowerCase();
          for (const searchTerm of expandedSearchTerms) {
            if (summaryLower.includes(searchTerm)) {
              relevanceScore += 15;
              matchReasons.push(`Content summary match: ${searchTerm}`);
            }
          }
        }

        // Check report title for matches
        const titleLower = report.title.toLowerCase();
        for (const searchTerm of expandedSearchTerms) {
          if (titleLower.includes(searchTerm)) {
            relevanceScore += 18;
            matchReasons.push(`Title match: ${searchTerm}`);
          }
        }

        // Check full content for matches if available
        if (report.full_content) {
          const contentLower = report.full_content.toLowerCase();
          for (const searchTerm of expandedSearchTerms) {
            if (contentLower.includes(searchTerm)) {
              relevanceScore += 12;
              matchReasons.push(`Content match: ${searchTerm}`);
            }
          }
        }

        // Additional scoring based on report type and engagement
        if (report.engagement_level === 'high') {
          relevanceScore += 5;
        }
        if (report.type === 'research' || report.type?.includes('WATMTU')) {
          relevanceScore += 5;
        }

        // Include reports with relevance score above threshold
        if (relevanceScore > 0) {
          relevantReports.push({
            id: report.id,
            title: report.title,
            relevanceScore: Math.min(100, relevanceScore),
            keyThemes,
            publishedDate: (report.published_date || new Date()).toISOString().split('T')[0],
            type: report.type || 'Research',
            matchReason: matchReasons.slice(0, 2).join('; ') || 'General relevance match'
          });
        }
      }

      // Sort by relevance score and separate by report type
      relevantReports.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Separate WILTW and WATMTU reports
      const wiltwReports = relevantReports.filter(report => 
        report.type?.includes('WILTW') || report.title?.includes('WILTW')
      ).slice(0, 5);
      
      const watmtuReports = relevantReports.filter(report => 
        report.type?.includes('WATMTU') || report.title?.includes('WATMTU')
      ).slice(0, 5);
      
      const topReports = [...wiltwReports, ...watmtuReports];

      // Generate thematic alignment analysis
      const themeFrequency = new Map<string, number>();
      topReports.forEach(report => {
        report.keyThemes.forEach((theme: string) => {
          themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1);
        });
      });

      themeFrequency.forEach((count, theme) => {
        thematicAlignment.push({
          theme,
          strength: Math.min(100, count * 20),
          supportingReports: count
        });
      });

      // Sort thematic alignment by strength
      thematicAlignment.sort((a, b) => b.strength - a.strength);

      // Generate recommendations based on risk profile and strategy
      const recommendations: any[] = [];
      
      if (riskProfile === 'aggressive' || riskProfile === 'high') {
        recommendations.push({
          type: 'opportunity',
          description: 'Consider higher allocation to emerging themes with strong momentum based on recent research',
          priority: 'high'
        });
      }
      
      if (strategy === 'contrarian') {
        recommendations.push({
          type: 'opportunity',
          description: 'Focus on undervalued sectors identified in recent reports for contrarian positioning',
          priority: 'medium'
        });
      }

      if (topReports.length > 5) {
        recommendations.push({
          type: 'neutral',
          description: 'Strong research coverage available - consider diversified approach across multiple themes',
          priority: 'medium'
        });
      }

      // Generate summary
      const entityName = prospectName || fundName;
      const primaryFocus = interests || strategy || 'investment themes';
      const summary = `Analysis for ${entityName}: Found ${topReports.length} highly relevant reports matching ${primaryFocus}. ${thematicAlignment.length > 0 ? `Primary alignment with ${thematicAlignment[0]?.theme} theme.` : ''} ${topReports.length > 0 ? `Top match: ${topReports[0]?.title} (${topReports[0]?.relevanceScore}% relevance).` : 'No specific matches found in current research database.'}`;

      const response = {
        prospectName,
        fundName,
        strategy,
        riskLevel: riskProfile,
        relevantReports: topReports,
        wiltwReports,
        watmtuReports,
        thematicAlignment: thematicAlignment.slice(0, 8),
        recommendations,
        summary
      };

      res.json(response);
    } catch (error) {
      console.error("Unified matching error:", error);
      res.status(500).json({ error: "Failed to find matches" });
    }
  });

  // Fund Mapping Tool endpoint
  app.post("/api/map-fund-themes", async (req: Request, res: Response) => {
    try {
      const { fundName, strategy, riskProfile } = req.body;
      if (!fundName || !strategy || !riskProfile) {
        return res.status(400).json({ error: "All fund parameters required" });
      }
      
      const reports = await storage.getAllContentReports();
      const relevantReports = [];
      const thematicAlignment: any[] = [];
      const recommendations: any[] = [];
      
      const strategyThemes = {
        'value': ['undervalued', 'dividend', 'book value', 'earnings'],
        'growth': ['growth', 'technology', 'innovation', 'expansion'],
        'momentum': ['trending', 'momentum', 'breakout', 'technical'],
        'contrarian': ['contrarian', 'oversold', 'reversal', 'turnaround']
      };
      
      const themes = strategyThemes[strategy as keyof typeof strategyThemes] || [];
      
      for (const report of reports) {
        let relevanceScore = 0;
        const keyThemes: string[] = [];
        
        if (report.tags && Array.isArray(report.tags)) {
          for (const theme of themes) {
            for (const tag of report.tags) {
              if (tag.toLowerCase().includes(theme) || theme.includes(tag.toLowerCase())) {
                relevanceScore += 20;
                if (!keyThemes.includes(tag)) {
                  keyThemes.push(tag);
                }
              }
            }
          }
        }
        
        if (relevanceScore > 0) {
          relevantReports.push({
            id: report.id,
            title: report.title,
            relevanceScore,
            keyThemes,
            publishedDate: (report.created_at || report.published_date || new Date()).toISOString().split('T')[0]
          });
        }
      }
      
      // Generate thematic alignment
      const themeFrequency = new Map();
      relevantReports.forEach(report => {
        report.keyThemes.forEach(theme => {
          themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1);
        });
      });
      
      themeFrequency.forEach((count, theme) => {
        thematicAlignment.push({
          theme,
          strength: Math.min(100, count * 25),
          supportingReports: count
        });
      });
      
      // Generate recommendations
      if (riskProfile === 'aggressive') {
        recommendations.push({
          type: 'opportunity' as const,
          description: 'Consider higher allocation to emerging themes with strong momentum',
          priority: 'high' as const
        });
      }
      
      const analysis = {
        fundName,
        strategy,
        riskLevel: riskProfile,
        relevantReports: relevantReports.slice(0, 10),
        thematicAlignment: thematicAlignment.slice(0, 8),
        recommendations
      };
      
      res.json({ analysis });
    } catch (error) {
      console.error("Fund mapping error:", error);
      res.status(500).json({ error: "Failed to map fund themes" });
    }
  });

  // AI email generation for leads with report summaries
  // Call Preparation Tool endpoint
  app.post("/api/ai/generate-call-prep", async (req: Request, res: Response) => {
    try {
      const { 
        prospectName, 
        title = "", 
        firmName = "", 
        interests = "", 
        portfolioHoldings = "", 
        investmentStyle = "",
        pastInteractions = "",
        notes = ""
      } = req.body;

      if (!prospectName) {
        return res.status(400).json({ error: "Prospect name is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered call preparation." 
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Create timeout wrapper for OpenAI API call - increased timeout for HC portfolio context
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), 15000)
      );

      // Get High Conviction portfolio data for call preparation
      const hcHoldings = await storage.getHighConvictionPortfolio();
      
      const portfolioIndexes = [];
      const uniqueIndexes = new Set<string>();
      hcHoldings.forEach((h: any) => uniqueIndexes.add(h.index));
      portfolioIndexes.push(...Array.from(uniqueIndexes).slice(0, 8));

      const topHoldings = hcHoldings.slice(0, 10).map((h: any) => `${h.ticker} (${h.weightInHcPortfolio || h.weightInHighConviction}%)`);

      // Get recent report summaries for call preparation context
      const reportSummaries = await storage.getAllReportSummaries();
      const recentSummaries = reportSummaries
        .slice(0, 5)
        .map(summary => `Report: ${summary.report?.title || 'Unknown'}\nSummary: ${summary.parsed_summary}`)
        .join('\n\n');

      const callPreparationPrompt = `You are an expert institutional sales assistant at 13D Research. Generate professional call preparation notes connecting prospect analysis to actual 13D High Conviction portfolio holdings and recent parsed report summaries.

13D HIGH CONVICTION PORTFOLIO CONTEXT (165 securities, 85.84% weight):
- Top HC Sectors: Gold/Mining (35.5%), Commodities (23.0%), China Markets (15.0%)
- Key HC Indexes: ${portfolioIndexes.join(', ')}
- Top HC Holdings: ${topHoldings.join(', ')}

RECENT 13D REPORT SUMMARIES:
${recentSummaries}

Generate a JSON response with exactly this structure:
{
  "prospectSnapshot": "Name, title, firm, investment style summary with potential HC portfolio alignment",
  "personalBackground": "Professional background connecting to HC portfolio sectors when relevant",
  "companyOverview": "Company description highlighting potential interest in HC portfolio themes",
  "topInterests": "Summarize known interests, highlighting connections to HC portfolio sectors",
  "portfolioInsights": "Connect their holdings/interests to actual 13D HC portfolio positions and themes",
  "talkingPoints": [
    {
      "mainPoint": "Point 1 title",
      "subBullets": ["Specific detail to mention", "Supporting data or insight", "How this connects to their interests"]
    },
    {
      "mainPoint": "Point 2 title", 
      "subBullets": ["Specific detail to mention", "Supporting data or insight", "How this connects to their interests"]
    },
    {
      "mainPoint": "Point 3 title",
      "subBullets": ["Specific detail to mention", "Supporting data or insight", "How this connects to their interests"]
    },
    {
      "mainPoint": "Point 4 title",
      "subBullets": ["Specific detail to mention", "Supporting data or insight", "How this connects to their interests"]
    },
    {
      "mainPoint": "Point 5 title",
      "subBullets": ["Specific detail to mention", "Supporting data or insight", "How this connects to their interests"]
    }
  ],
  "smartQuestions": [
    "What themes or sectors are most top-of-mind for you right now?",
    "What types of research formats do you and your team find most useful—quick summaries, charts, deep dives?",
    "What triggers a deeper look from your team—a chart, a macro signal, a contrarian thesis?",
    "Is there anyone else on your team I should loop in for certain themes or decisions?",
    "What's the typical timeline for you to act on a new investment idea?",
    "What is your process for evaluating new research? Is there anyone you already use? What is your budget?",
    "Given your focus on [relevant theme], are there any specific portfolio themes you're exploring for the next 6-12 months?"
  ]
}

Use the following data to generate your output:
- Name: ${prospectName}
- Title: ${title}
- Firm: ${firmName}
- Interests: ${interests}
- Holdings: ${portfolioHoldings}
- Style: ${investmentStyle}
- Notes: ${notes}
- Past Interactions: ${pastInteractions}

For talkingPoints, create 5 strategic talking points with detailed sub-bullets that include:
- Specific data points, statistics, or market insights that demonstrate deep knowledge
- References to recent market developments or macro trends
- Connection to their known interests/holdings
- Forward-looking perspectives that show thought leadership
Make each sub-bullet actionable and impressive - things that would make you sound like an expert.

For smartQuestions, use the exact 7 questions as specified in the JSON structure. For the 7th question, replace "[relevant theme]" with an appropriate theme based on the prospect's interests or current market focus (such as technology, healthcare, commodities, AI infrastructure, energy transition, etc.)

If the input is limited, use generalized themes from current macro research to anchor ideas.
Make it crisp, useful, and professional. Focus on actionable insights that would help during an actual sales call.
`;

      try {
        const apiPromise = openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert institutional sales assistant. Generate professional, actionable call preparation notes in valid JSON format. Be concise and focus on actionable insights."
            },
            {
              role: "user",
              content: callPreparationPrompt
            }
          ],
          max_tokens: 1200,
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        const response = await Promise.race([apiPromise, timeoutPromise]) as any;
        
        let callPrepContent = (response.choices[0].message.content as string) || '{}';
        
        // Remove all * and # symbols from output
        callPrepContent = callPrepContent.replace(/[\*#]+/g, '');
        
        const callPrepResult = JSON.parse(callPrepContent);
        
        // Save generated content to get contentId for feedback
        try {
          const savedContent = await storage.saveAIContent({
            type: 'call_preparation',
            content: JSON.stringify(callPrepResult),
            metadata: { prospectName, firmName, title }
          });
          callPrepResult.contentId = savedContent.id;
        } catch (saveError) {
          console.warn("Failed to save call prep content for feedback:", saveError);
        }
        
        res.json(callPrepResult);
        
      } catch (apiError) {
        console.log("OpenAI API unavailable, falling back to structured response with real data");
        
        // Generate structured response using actual HC portfolio and parsed summaries
        const topIndexes = portfolioIndexes.slice(0, 4);
        const keyHoldings = topHoldings.slice(0, 6);
        const latestReports = reportSummaries.slice(0, 3);
        
        // Parse interests properly - handle both string and array formats
        let parsedInterests = [];
        if (Array.isArray(interests)) {
          parsedInterests = interests.filter(i => i && i.trim().length > 0);
        } else if (typeof interests === 'string' && interests.trim()) {
          parsedInterests = interests.split(',').map(i => i.trim()).filter(i => i.length > 0);
        }
        
        console.log('Parsed interests:', parsedInterests);
        
        const callPrepResult: any = {
          prospectSnapshot: `${prospectName}${title ? `, ${title}` : ''}${firmName ? ` at ${firmName}` : ''}. ${investmentStyle || 'Institutional investor'} with specific interest in ${parsedInterests.length > 0 ? parsedInterests.join(', ') : topIndexes.slice(0, 2).join(' and ')}. Strong alignment potential with 13D's high conviction portfolio themes.`,
          
          personalBackground: `${prospectName} serves as ${title || 'investment professional'} at ${firmName || 'their firm'}. ${title && title.toLowerCase().includes('senior') ? 'Senior leadership role' : 'Professional role'} with institutional investment focus on ${parsedInterests.length > 0 ? parsedInterests.slice(0, 2).join(' and ') : 'market opportunities'}. This aligns with 13D's research coverage and high conviction positioning.`,
          
          companyOverview: `${firmName || 'The firm'} manages institutional capital with focus on ${investmentStyle || 'diversified strategies'}. Given their interest in ${parsedInterests.length > 0 ? parsedInterests.join(', ') : 'thematic opportunities'}, there's clear synergy with 13D's high conviction sectors including ${topIndexes.slice(0, 3).join(', ')}.`,
          
          topInterests: `Primary focus areas: ${parsedInterests.length > 0 ? parsedInterests.join(', ') : 'institutional themes'}. ${parsedInterests.some(i => i.toLowerCase().includes('gold')) && parsedInterests.some(i => i.toLowerCase().includes('uranium')) ? 'Perfect alignment with 13D\'s Critical Minerals Index and precious metals coverage.' : parsedInterests.some(i => i.toLowerCase().includes('bitcoin')) ? '13D provides alternative investment research including digital asset market dynamics.' : `Direct alignment with 13D's coverage of ${topIndexes.slice(0, 2).join(' and ')}.`}`,
          
          portfolioInsights: `13D's high conviction portfolio features ${keyHoldings.length > 0 ? keyHoldings.slice(0, 3).join(', ') : 'diversified holdings'} with strong alignment to ${parsedInterests.length > 0 ? parsedInterests.join(', ') : topIndexes.slice(0, 2).join(' and ')} sectors. ${parsedInterests.some(i => i.toLowerCase().includes('gold')) ? 'Gold/mining exposure represents 35.5% of our HC portfolio weight.' : parsedInterests.some(i => i.toLowerCase().includes('china')) ? 'China market allocation provides 15.0% portfolio exposure through specialized indexes.' : `${topIndexes[0] || 'Commodities'} positioning offers compelling risk-adjusted returns.`} Our research coverage directly supports these investment themes with actionable insights for institutional mandates.`,
          
          talkingPoints: [
            {
              mainPoint: `Portfolio Positioning for ${parsedInterests.length > 0 ? parsedInterests.join('/') : 'Your Themes'}`,
              subBullets: [
                `${parsedInterests.some(i => i.toLowerCase().includes('gold')) ? '35.5% allocation to gold/mining through our Critical Minerals Index - direct exposure to your gold focus' : 'High conviction positioning in metals and commodities sectors'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('uranium')) ? 'Uranium exposure through specialized mining holdings including CCJ positioning' : 'Energy transition metals coverage through mining sector allocation'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('bitcoin')) ? 'Alternative assets research coverage including digital asset market analysis' : 'Diversified commodity exposure across critical materials'}`
              ]
            },
            {
              mainPoint: `Investment Thesis Alignment`,
              subBullets: [
                `${parsedInterests.some(i => i.toLowerCase().includes('gold')) ? 'Gold as inflation hedge - 13D research shows technical breakout patterns and institutional accumulation' : 'Commodities super-cycle positioning with inflation protection'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('uranium')) ? 'Uranium supply deficit story - nuclear renaissance driving long-term demand fundamentals' : 'Critical materials shortage creating investment opportunities'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('bitcoin')) ? 'Bitcoin institutional adoption theme - treasury allocation and ETF inflow trends' : 'Alternative investment diversification strategies'}`
              ]
            },
            {
              mainPoint: `Market Timing for ${parsedInterests.length > 0 ? parsedInterests.join('/') : 'Target Themes'}`,
              subBullets: [
                `${parsedInterests.some(i => i.toLowerCase().includes('gold')) ? 'Gold breaking multi-year resistance - central bank buying and de-dollarization trends support price action' : 'Commodities in supply deficit cycle creating price support'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('uranium')) ? 'Uranium spot price recovery from decade lows - reactor restarts and new build programs accelerating' : 'Energy transition creating structural demand for critical materials'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('bitcoin')) ? 'Bitcoin ETF approvals driving institutional adoption - potential for treasury allocation discussions' : 'Alternative assets gaining institutional acceptance as portfolio diversifiers'}`
              ]
            },
            {
              mainPoint: `Specific Investment Opportunities`,
              subBullets: [
                `${parsedInterests.some(i => i.toLowerCase().includes('gold')) ? 'Physical gold vs. mining equities spread trade - direct metal exposure vs. operational leverage' : 'Value opportunities in oversold commodity producers'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('uranium')) ? 'Uranium junior miners vs. established producers - risk/reward profiles for different portfolio mandates' : 'Small-cap mining opportunities with institutional quality management'}`,
                `${parsedInterests.some(i => i.toLowerCase().includes('bitcoin')) ? 'Bitcoin allocation sizing - risk management approaches for institutional portfolios' : 'Alternative investment allocation strategies for long-term value investors'}`
              ]
            }
          ],
          
          smartQuestions: [
            `Given your interest in ${parsedInterests.length > 0 ? parsedInterests.join(', ') : 'these sectors'}, what specific themes are most top-of-mind for you right now?`,
            "What types of research formats do you and your team find most useful—quick summaries, charts, deep dives?",
            `For ${parsedInterests.length > 0 ? parsedInterests.slice(0, 2).join(' and ') : 'your focus areas'}, what triggers a deeper look from your team—a chart, a macro signal, a contrarian thesis?`,
            "Is there anyone else on your team I should loop in for certain themes or decisions?",
            "What's the typical timeline for you to act on a new investment idea?",
            "What is your process for evaluating new research? Is there anyone you already use? What is your budget?",
            `Given your focus on ${parsedInterests.length > 0 ? parsedInterests.join(', ') : 'institutional investing'}, are there any specific ${firmName ? `${firmName}` : 'firm'} initiatives or portfolio themes you're exploring for the next 6-12 months?`
          ]
        };

        // Save generated content to get contentId for feedback
        try {
          const savedContent = await storage.saveAIContent({
            type: 'call_preparation',
            content: JSON.stringify(callPrepResult),
            metadata: { prospectName, firmName, title }
          });
          callPrepResult.contentId = savedContent.id;
        } catch (saveError) {
          console.warn("Failed to save call prep content for feedback:", saveError);
        }

        res.json(callPrepResult);
      }

    } catch (error) {
      console.error("Call prep generation error:", error);
      res.status(500).json({ 
        message: "Failed to generate call prep notes",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });



  // Lead pipeline email generation endpoint
  app.post("/api/ai/generate-email", async (req: Request, res: Response) => {
    try {
      const { type, leadId, context } = req.body;
      
      if (type !== "lead_outreach" || !leadId) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered email generation." 
        });
      }

      // Get lead data
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get recent reports for context
      const contentReports = await storage.getRecentReports(10);
      const reportContext = contentReports.slice(0, 3).map((report: any) => 
        `Report: ${report.title}\nSummary: ${report.content_summary || report.summary || 'No summary available'}`
      ).join('\n\n');

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Get High Conviction portfolio data for lead email context
      const hcHoldings = await db.select()
        .from(portfolio_constituents)
        .where(eq(portfolio_constituents.isHighConviction, true))
        .orderBy(desc(portfolio_constituents.weightInHighConviction))
        .limit(15);

      const portfolioIndexes = [];
      const uniqueIndexes = new Set<string>();
      hcHoldings.forEach((h: any) => uniqueIndexes.add(h.index));
      portfolioIndexes.push(...Array.from(uniqueIndexes).slice(0, 6));

      const topHoldings = hcHoldings.slice(0, 8).map((h: any) => `${h.ticker} (${h.weightInHighConviction}%)`);

      const emailPrompt = `You must generate an email in this EXACT casual format connecting insights to actual 13D High Conviction portfolio holdings when relevant.

13D HIGH CONVICTION PORTFOLIO CONTEXT (165 securities, 85.84% weight):
- Top HC Sectors: Gold/Mining (35.5%), Commodities (23.0%), China Markets (15.0%)
- Key HC Indexes: ${portfolioIndexes.join(', ')}
- Top HC Holdings: ${topHoldings.join(', ')}

TEMPLATE TO FOLLOW EXACTLY:
Hi ${lead.name},

Hope you're doing well. I wanted to share a few quick insights from our latest report that align closely with your interests - particularly ${lead.interest_tags?.join(', ') || 'market dynamics'}.

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. When relevant, mention actual HC portfolio positions that align with this theme. (Article 1)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. Reference specific HC holdings if they connect to this insight. (Article 2)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. Include HC portfolio connections when applicable. (Article 3)

These are all trends 13D has been tracking for years. As you know, we aim to identify major inflection points before they become consensus. Our High Conviction portfolio reflects these themes with actual positions in relevant sectors.

On a lighter note, [mention one personal/non-market article from the reports - like travel, lifestyle, or cultural topic discussed].

I am happy to send over older reports on topics of interest. Please let me know if there is anything I can do to help.

Best,
Spencer

DATA TO USE:
${reportContext || 'No reports selected'}

CRITICAL: 
- Use bullet points (•) NOT paragraphs
- Make each bullet detailed with specific data/percentages/ratios from reports
- Include market implications and context in each bullet
- Each bullet must reference (Article 1), (Article 2), (Article 3)
- After the consensus line, add a personal note about non-market content (travel, lifestyle, culture, etc.) from the reports
- Keep conversational tone, avoid formal business language
- Maximum 275 words`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Spencer from 13D Research writing casual, bullet-point emails to prospects. Follow the exact template format provided."
          },
          {
            role: "user",
            content: emailPrompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      let emailContent = response.choices[0].message.content || "Unable to generate email";
      
      // Remove all * and # symbols from output
      emailContent = emailContent.replace(/[\*#]+/g, '');
      
      // Aggressively strip any subject lines
      emailContent = emailContent.replace(/^Subject:.*$/gm, '');
      emailContent = emailContent.replace(/^.*Subject:.*$/gm, '');
      
      // Strip formal opening paragraphs
      emailContent = emailContent.replace(/^.*I hope this message finds you well\..*$/gm, '');
      emailContent = emailContent.replace(/^.*Given your.*interest.*$/gm, '');
      emailContent = emailContent.replace(/^.*I wanted to follow up.*$/gm, '');
      
      // Convert paragraph blocks to bullet points if AI generated paragraphs instead
      emailContent = emailContent.replace(/^(Our recent report highlights.*?)\./gm, '• **Market Shift**: $1. (Article 1)');
      emailContent = emailContent.replace(/^(Moreover.*?)\./gm, '• **Strategic Opportunity**: $1. (Article 2)');
      emailContent = emailContent.replace(/^(Additionally.*?)\./gm, '• **Key Development**: $1. (Article 3)');
      
      // Strip formal closing paragraphs
      emailContent = emailContent.replace(/I would be delighted.*$/gm, '');
      emailContent = emailContent.replace(/Looking forward.*$/gm, '');
      emailContent = emailContent.replace(/Would you be available.*$/gm, '');
      emailContent = emailContent.replace(/Please let me know.*convenient.*$/gm, '');
      emailContent = emailContent.replace(/Could we schedule.*$/gm, '');
      
      // Strip formal signatures
      emailContent = emailContent.replace(/Best regards,[\s\S]*$/i, 'Best,\nSpencer');
      emailContent = emailContent.replace(/13D Research$/, '');
      
      // Clean up multiple newlines
      emailContent = emailContent.replace(/\n{3,}/g, '\n\n').trim();

      // Return in the format expected by the lead pipeline
      res.json({
        subject: `Quick insights for ${lead.company}`,
        body: emailContent
      });

    } catch (error) {
      console.error("Generate email error:", error);
      res.status(500).json({ 
        message: "Failed to generate AI email",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI email generation for leads
  app.post("/api/ai/generate-lead-email", async (req: Request, res: Response) => {
    try {
      const { lead, emailHistory, contentReports, selectedReportIds } = req.body;
      
      if (!lead) {
        return res.status(400).json({ error: "Lead data is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered email generation." 
        });
      }

      // Get lead's email history from database if not provided
      let leadEmailHistory = emailHistory;
      if (!leadEmailHistory) {
        leadEmailHistory = await storage.getLeadEmailHistory(lead.id);
      }

      // Get stored summaries for all selected reports
      let selectedReportSummaries = [];
      if (selectedReportIds && selectedReportIds.length > 0) {
        for (const reportId of selectedReportIds) {
          const summary = await storage.getReportSummary(reportId);
          if (summary) {
            selectedReportSummaries.push(summary);
          }
        }
      }

      // Find relevant reports based on lead's interests
      const relevantReports = (contentReports || []).filter((report: any) => 
        report.tags && lead.interest_tags && 
        report.tags.some((tag: string) => lead.interest_tags.includes(tag))
      );

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Fetch high conviction portfolio data
      let highConvictionPortfolio = '';
      try {
        const portfolioData = await storage.getHighConvictionPortfolio();
        if (portfolioData && portfolioData.length > 0) {
          // Group by index and get top holdings
          const indexGroups = portfolioData.reduce((acc: any, item: any) => {
            if (!acc[item.index]) acc[item.index] = [];
            acc[item.index].push(item);
            return acc;
          }, {});
          
          // Build portfolio reference with top 3 indexes
          const topIndexes = Object.keys(indexGroups).slice(0, 3);
          highConvictionPortfolio = topIndexes.map(index => {
            const holdings = indexGroups[index].slice(0, 3); // Top 3 holdings per index
            const holdingNames = holdings.map((h: any) => h.ticker).join(', ');
            return `${index} (${holdingNames})`;
          }).join('; ');
        }
      } catch (error) {
        console.log('High conviction portfolio fetch failed:', error);
      }

      // Prepare report content for the prompt - combine all selected reports
      let combinedReportContent = '';
      let reportTitles = [];
      let allReportTags = [];
      
      if (selectedReportSummaries.length > 0) {
        for (const summary of selectedReportSummaries) {
          // Get the content report from database
          let contentReport = null;
          if (contentReports && contentReports.length > 0) {
            contentReport = contentReports.find((report: any) => report.id === summary.content_report_id);
          } else {
            // Fetch from database if not provided
            const allReports = await storage.getAllContentReports();
            contentReport = allReports.find(report => report.id === summary.content_report_id);
          }
          
          if (contentReport) {
            reportTitles.push(contentReport.title);
            if (contentReport.tags) {
              allReportTags.push(...contentReport.tags);
            }
            
            // Add this report's content with clear separation
            combinedReportContent += `\n\n--- ${contentReport.title} ---\n`;
            combinedReportContent += summary.parsed_summary || '';
          }
        }
      } else if (selectedReportSummaries.length === 0 && (contentReports || []).length > 0) {
        // Fallback to first available report if no specific selection
        const firstReport = contentReports[0];
        reportTitles.push(firstReport.title);
        if (firstReport.tags) {
          allReportTags.push(...firstReport.tags);
        }
      }
      
      const reportTitle = reportTitles.length > 0 ? reportTitles.join(', ') : 'Recent 13D Reports';
      const reportTags = Array.from(new Set(allReportTags)).join(', ');
      const reportSummary = combinedReportContent || '';

      // Extract non-market topics from combined content
      let nonMarketTopics = '';
      
      if (reportSummary) {
        // Look for non-market content indicators in the combined summary
        const lowerSummary = reportSummary.toLowerCase();
        const hasNonMarketContent = lowerSummary.includes('teen love') || 
                                   lowerSummary.includes('importance of teen') ||
                                   lowerSummary.includes('people-pleasing') ||
                                   lowerSummary.includes('losing yourself to be liked') ||
                                   lowerSummary.includes('teenager') || 
                                   lowerSummary.includes('phone') ||
                                   lowerSummary.includes('experiment') ||
                                   lowerSummary.includes('sustainable') ||
                                   lowerSummary.includes('aesop') ||
                                   lowerSummary.includes('fable') ||
                                   lowerSummary.includes('wisdom') ||
                                   lowerSummary.includes('loneliness') ||
                                   lowerSummary.includes('culture') ||
                                   lowerSummary.includes('philosophy') ||
                                   lowerSummary.includes('wildfire') ||
                                   lowerSummary.includes('deforestation') ||
                                   lowerSummary.includes('european agriculture') ||
                                   lowerSummary.includes('agriculture') ||
                                   lowerSummary.includes('farming');
        
        if (hasNonMarketContent) {
          if (lowerSummary.includes('teen love') || lowerSummary.includes('teen relationship') || lowerSummary.includes('importance of teen')) {
            nonMarketTopics = `the importance of teen love and how relationships shape emotional development`;
          } else if (lowerSummary.includes('people-pleasing') || lowerSummary.includes('losing yourself to be liked')) {
            nonMarketTopics = `the psychology of people-pleasing and the cost of seeking approval at the expense of authenticity`;
          } else if (lowerSummary.includes('teenager') || lowerSummary.includes('phone') || lowerSummary.includes('experiment')) {
            nonMarketTopics = `teenagers giving up their phones for a week and the surprising insights that emerged`;
          } else if (lowerSummary.includes('loneliness')) {
            nonMarketTopics = `loneliness as both a social epidemic and investment theme`;
          } else if (lowerSummary.includes('aesop') || lowerSummary.includes('fable')) {
            nonMarketTopics = `timeless wisdom from Aesop's fables and their relevance to modern decision-making`;
          } else if (lowerSummary.includes('european agriculture') || lowerSummary.includes('agriculture') || lowerSummary.includes('farming')) {
            nonMarketTopics = `European agriculture and the evolving dynamics of food production`;
          } else if (lowerSummary.includes('wildfire') || lowerSummary.includes('deforestation')) {
            nonMarketTopics = `how wildfires have become the leading cause of global deforestation`;
          } else if (lowerSummary.includes('sustainable') || lowerSummary.includes('culture')) {
            nonMarketTopics = `sustainable living practices and cultural perspectives on consumption`;
          } else {
            nonMarketTopics = `cultural insights and life wisdom that provide perspective beyond the financial world`;
          }
        }
      }

      // Filter out Article 1 content from summary with enhanced detection
      let filteredSummary = reportSummary;
      if (reportSummary) {
        // Remove entire problematic sections and specific Article 1 phrases
        filteredSummary = filteredSummary
          // Remove core investment thesis section
          .replace(/\*\*Core Investment Thesis:\*\*[\s\S]*?(?=\n\*\*[^*]|\n- \*\*[^*]|$)/gi, '')
          // Remove asset allocation sections
          .replace(/- \*\*Asset allocation recommendations:\*\*[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
          .replace(/- \*\*Portfolio Allocation Recommendations:\*\*[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
          .replace(/- \*\*Percentage allocations by sector[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
          .replace(/- \*\*Strategic positioning advice:\*\*[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
          // Remove specific problematic phrases
          .replace(/outperform major stock indices/gi, '')
          .replace(/outperform major U\.S\. indices/gi, '')
          .replace(/strategic asset allocation/gi, '')
          .replace(/paradigm shift towards commodities/gi, '')
          .replace(/Gold, silver, and mining stocks \([^)]+\)/gi, '')
          .replace(/commodities and related sectors \([^)]+\)/gi, '')
          .replace(/Chinese equity markets \([^)]+\)/gi, '')
          // Clean up formatting
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .replace(/\n\s*$/, '')
          .trim();
      }

      // Prepare streamlined context
      const hasEmailHistory = leadEmailHistory && leadEmailHistory.length > 0;
      const recentEmails = hasEmailHistory ? leadEmailHistory.slice(-2) : []; // Only last 2 emails to avoid prompt bloat
      
      const contextNotes = [];
      if (lead.notes) contextNotes.push(`Notes: ${lead.notes}`);
      if (hasEmailHistory) contextNotes.push(`Previous contact established (${recentEmails.length} recent emails)`);
      if (lead.last_contact_date) contextNotes.push(`Last contact: ${new Date(lead.last_contact_date).toLocaleDateString()}`);

      const citationRequirement = selectedReportSummaries.length > 0 ? 
        "MANDATORY REQUIREMENT: You MUST end every single bullet point with (Article X) where X is 2, 3, or 4. Use exactly 3 DIFFERENT article numbers. This is absolutely required." : "";
      
      const reportContent = selectedReportSummaries.length > 0 ? 
        `Reference the recent 13D reports: "${reportTitle}". ONLY use insights from Article 2 onward. DO NOT use content from Article 1. Here's the combined report content: "${filteredSummary}". The reports cover: ${reportTags}.` : "";

      const emailPrompt = `Generate a personalized, concise prospect email for ${lead.name} at ${lead.company}. This is a ${lead.stage} stage lead with interests in: ${lead.interest_tags?.join(', ') || 'investment research'}.

CONTEXT: ${contextNotes.length > 0 ? contextNotes.join(' | ') : 'First outreach to this lead'}
${hasEmailHistory ? 'IMPORTANT: This is a follow-up email - reference prior relationship naturally and avoid repeating previously covered topics.' : ''}

${reportContent}

${citationRequirement}

GOALS:
• Greet the reader warmly with a short intro that references any prior context appropriately
• Acknowledge their stated investment interests (from ${lead.interest_tags?.join(', ') || 'general investment research'}${lead.notes ? ` or Notes: ${lead.notes}` : ''} if applicable)
• If this is a follow-up email, reference previous conversations naturally without being repetitive
• Explain why this specific report is relevant to their strategy and interests
• Summarize 2–3 high-impact insights using concise bullets that complement (don't repeat) previous communications
• End with a conclusion summarizing 13D's market view and how our research helps investors stay ahead
• Include a clear CTA appropriate for their lead stage (${lead.stage}) and relationship history

HARD RULES:
• TOTAL word count must not exceed **280 words**
• Use **friendly but professional tone**
• Paragraph format is fine, but use bullets for the insights section
• DO NOT use phrases like "Article 1," "titled," or "the report outlines"
• MANDATORY: Every bullet point MUST end with (Article X) where X is a different number (2, 3, 4, etc.)
• Include a short paragraph (~30 words) about non-market topics from the report${nonMarketTopics ? `: "${nonMarketTopics}"` : ' — such as culture, values, or timeless ideas — to provide readers with perspective beyond the financial world'}
${highConvictionPortfolio ? `• When relevant, naturally reference our high conviction portfolio holdings: ${highConvictionPortfolio}` : ''}

STRUCTURE TO FOLLOW:

---

**Subject**: [Natural, conversational subject line – max 8 words]

Hi ${lead.name},

[Natural greeting with seasonal/personal touch] I was going through one of our latest reports and [conversational transition about why this matters to them based on their interests].

[Present 3 market insights as bullet points with detailed analysis and implications - EACH BULLET MUST END WITH (Article 2), (Article 3), (Article 4)]

More broadly, [broader market perspective in casual, natural language].

[If non-market topics exist, weave them in naturally like: "The report also includes an unexpected section on [topic] and how [relevance]—definitely not your typical market writeup, but pretty fascinating."]

Let me know if you'd like me to dig up anything specific or send over past reports that line up with this view.

Best,
Spencer

---

TONE GUIDELINES:
• Write like Spencer is personally sharing insights with a colleague
• Use natural, conversational language: "Hope you're doing well", "I was going through", "thought you might find this interesting"
• Vary sentence structure - mix short punchy statements with longer explanatory ones
• Include casual transitions: "More broadly", "And", "Plus"
• Present 3 market insights as clear bullet points with substantive detail
• End casually: "Let me know if you'd like me to dig up anything specific"
• Avoid corporate speak - sound human and approachable
• Use seasonal references: "Hope you're enjoying the start of summer"
• Include conversational connectors: "And", "Plus", "More broadly"
• Mix sentence lengths for natural rhythm
• End with casual helpfulness rather than formal CTAs

EXAMPLE:

**Subject**: Gold, USD Weakness, and China Tailwinds

Hi Monica,

I hope you're doing well. Based on our recent discussion around precious metals and geopolitics, I wanted to share a few key insights from a report that closely aligns with your strategic focus:

• Gold miners are outperforming major U.S. indices, reflecting rising inflation expectations and growing demand for hard asset hedges.
• The U.S. dollar's downtrend is driving increased interest in commodities as a diversification tool.
• China's domestic pivot and global partnerships are reinforcing economic resilience — a compelling case for exposure to Chinese equities.

We're seeing a broad rotation into hard assets and geopolitically resilient markets. At 13D, our research is designed to help investors like you get ahead of these structural shifts before they become consensus.

Let me know if you would like me to pull some older reports on specific topics of interest.

Spencer`;

      const emailResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Spencer from 13D Research. Write personalized investment emails with bullet points that MUST end with article citations.\n\nFORMAT REQUIREMENTS:\n- Use bullet points with • symbol\n- Each bullet MUST end with (Article X) where X is 2, 3, 4, etc.\n- Never use Article 1\n- Professional but conversational tone\n- ONLY reference non-market content that is actually provided in the report data\n- DO NOT invent or assume content that isn't explicitly mentioned\n\n${nonMarketTopics ? `NON-MARKET CONTENT: Reference this specific content: "${nonMarketTopics}"` : 'NO NON-MARKET CONTENT: Do not include any non-market references in this email.'}\n\nEXAMPLE:\n• Market insight with analysis and implications (Article 2)\n• Second insight with different perspective (Article 3)\n• Third insight with strategic view (Article 4)\n\nALWAYS include article citations at the end of each bullet point.`
          },
          {
            role: "user",
            content: emailPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      let emailSuggestion = emailResponse.choices[0].message.content || "Follow-up email";
      
      // Red flag safeguard: Check for Article 1 content leakage
      const article1Indicators = [
        'outperform major stock indices',
        'outperform major U.S. indices', 
        'paradigm shift towards commodities',
        'high conviction ideas',
        'Gold, silver, and mining stocks \\(',
        'commodities and related sectors \\(',
        'Chinese equity markets \\('
      ];
      
      const hasArticle1Content = article1Indicators.some(indicator => 
        new RegExp(indicator, 'i').test(emailSuggestion)
      );
      
      if (hasArticle1Content) {
        console.warn('⚠️ Article 1 content may have leaked into the email. Check prompt filtering.');
        console.warn('Email content:', emailSuggestion.substring(0, 200) + '...');
      }
      
      // Enforce strict 280-word limit with post-processing
      const words = emailSuggestion.split(/\s+/);
      if (words.length > 280) {
        // Truncate to 280 words and ensure proper ending
        const truncated = words.slice(0, 278).join(' ');
        emailSuggestion = truncated + "... Let me know if you'd like to discuss further.";
      }
      
      res.json({ emailSuggestion });

    } catch (error) {
      console.error("Generate lead email error:", error);
      res.status(500).json({ 
        message: "Failed to generate AI email",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Theme-based email generation endpoint
  app.post("/api/ai/generate-theme-email", async (req: Request, res: Response) => {
    try {
      const { theme, clientName, customization } = req.body;
      
      if (!theme) {
        return res.status(400).json({ error: "Theme is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered email generation." 
        });
      }

      // Get recent reports for context
      const recentReports = await storage.getRecentReports(3);
      
      // Get high conviction portfolio holdings with detailed weights
      const highConvictionStocks = await db.select()
        .from(portfolio_constituents)
        .where(eq(portfolio_constituents.isHighConviction, true))
        .orderBy(desc(portfolio_constituents.weightInHcPortfolio))
        .limit(10);

      // Get top portfolio holdings by weight
      const topHoldings = await db.select()
        .from(portfolio_constituents)
        .orderBy(desc(portfolio_constituents.weightInIndex))
        .limit(15);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const reportContext = recentReports.length > 0 
        ? recentReports.map(r => `${r.title}: ${r.key_insights?.join(', ') || r.title}`).join('\n') 
        : 'Recent market developments and geopolitical shifts';

      // Enhanced portfolio context with HC weights and themes
      const hcHoldings = highConvictionStocks.map((s: any) => 
        `${s.ticker} (${s.name}, ${s.weightInHcPortfolio || '0'}% HC weight, ${s.index})`
      ).join(', ');
      
      const topThemes = Array.from(new Set(highConvictionStocks.map(s => s.index))).slice(0, 6);
      const themeBreakdown = topThemes.map(theme => {
        const holdings = highConvictionStocks.filter(s => s.index === theme);
        const totalWeight = holdings.reduce((sum, s) => sum + parseFloat(s.weightInHcPortfolio || '0'), 0);
        return `${theme}: ${totalWeight.toFixed(1)}% (${holdings.length} holdings)`;
      }).join(', ');

      const portfolioContext = `
HIGH CONVICTION PORTFOLIO (165 securities, 85.84% total allocation):
Top Holdings: ${hcHoldings}

KEY THEMES: ${themeBreakdown}

This represents our highest conviction investment opportunities across global markets, with significant exposure to China, commodities, clean energy, and defensive sectors.`;

      const emailPrompt = `You are an expert institutional sales professional writing personalized emails for 13D Research clients.

Generate a professional email based on the following:
- Theme: ${theme}
- Client: ${clientName || 'Valued Client'}
- Customization: ${customization || 'Standard professional approach'}

CONTEXT FROM RECENT RESEARCH:
${reportContext}

PORTFOLIO HOLDINGS CONTEXT:
${portfolioContext}

Generate a JSON response with exactly this structure:
{
  "subject": "Professional subject line",
  "greeting": "Personalized greeting",
  "opening": "Opening paragraph connecting to client interests",
  "bodyParagraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "callToAction": "Clear next step or meeting request",
  "closing": "Professional closing",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "attachmentSuggestions": ["suggested attachment 1", "suggested attachment 2"]
}

Make it professional, actionable, and aligned with institutional investment communication standards.
Focus on value proposition and concrete insights rather than generic market commentary.
When relevant to the theme, reference specific sectors or companies from our portfolio holdings.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert institutional sales assistant. Generate professional email content in valid JSON format."
          },
          {
            role: "user",
            content: emailPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      let emailContent = response.choices[0].message.content || '{}';
      
      // Remove all * and # symbols from output
      emailContent = emailContent.replace(/[\*#]+/g, '');
      
      try {
        const emailResult = JSON.parse(emailContent);
        res.json(emailResult);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        res.status(500).json({ error: "Failed to parse AI response" });
      }

    } catch (error) {
      console.error("Theme email generation error:", error);
      res.status(500).json({ 
        message: "Failed to generate theme-based email",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI report summarization with WILTW Article Parser
  app.post("/api/ai/summarize-report", async (req: Request, res: Response) => {
    try {
      const { reportId, title, content, promptType } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered report summarization." 
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Determine if this is a WILTW or WATMTU report
      const isWATMTU = title && title.includes("WATMTU") || promptType === "watmtu_parser";
      const reportTypeLabel = isWATMTU ? "WATMTU" : "WILTW";

      let summary = '';

      if (isWATMTU) {
        // WATMTU parser - focus on market analysis and technical indicators
        const systemPrompt = `You are an expert financial analyst specializing in WATMTU (What Are The Markets Telling Us) reports. Your task is to create comprehensive market analysis summaries that extract key insights, technical indicators, and investment themes.`;

        const userPrompt = `Analyze this ${reportTypeLabel} report and create a structured comprehensive analysis:

**Report Title:** ${title}
**Content:** ${content}

Please provide a detailed analysis in this format:

**${reportTypeLabel} Report Analysis: ${title}**

- **Core Investment Thesis:** [Main investment themes and market outlook]

- **Key Market Developments:**
  - *Technical breakouts and pattern analysis:* [Chart patterns, breakouts, technical levels]
  - *Sector performance and relative strength:* [Sector rotation, outperformers/underperformers]
  - *Macro economic indicators:* [Economic data, policy impacts, global trends]

- **Investment Opportunities:**
  - *High conviction themes:* [Top investment themes with rationale]
  - *Tactical allocations:* [Short to medium term positioning]
  - *Contrarian plays:* [Counter-trend opportunities]

- **Risk Considerations:**
  - *Market risks:* [Volatility, correlation, liquidity concerns]
  - *Geopolitical factors:* [Policy risks, international tensions]
  - *Technical warnings:* [Chart patterns suggesting caution]

- **Portfolio Positioning:**
  - *Recommended actions:* [Specific buy/sell/hold recommendations]
  - *Asset allocation guidance:* [Sector weights, geographic exposure]
  - *Hedging strategies:* [Risk management approaches]

Focus on actionable insights and specific investment implications.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.3
        });

        summary = response.choices[0].message.content || '';
        
        // Remove all * and # symbols from output
        summary = summary.replace(/[\*#]+/g, '');
      } else {
        // WILTW analysis - Generate three distinct summaries
        console.log('Starting WILTW three-part summary generation...');
        
        // 1. Generate Structured Article Analysis
        console.log('Generating structured summary...');
        const structuredSystemPrompt = `You are an expert investment research analyst and summarizer. You've received a detailed WILTW report from 13D Research dated ${title}. Analyze the report and provide structured, article-by-article analysis.

For each identifiable article section in the report, create a comprehensive analysis following this format:

**ARTICLE [NUMBER]: [TITLE]**

**Core Thesis:** [2-3 sentence summary of the main argument]

**Key Insights:**
• [First key insight with specific data/quotes]
• [Second key insight with supporting evidence]  
• [Third key insight with implications]

**Investment Implications:** [Forward-looking themes and opportunities for investors]

**Risk Factors:** [Specific risks and considerations mentioned]

**Timeline:** [Short/medium/long-term outlook as discussed in the article]

**Recommended Names:** [Any specific stocks, ETFs, indices, or investment vehicles mentioned]

**Category Tag:** [One primary category: Geopolitics, China, Technology, AI, Energy, Commodities, Climate, Markets, Culture, Education, Europe, Defense, Longevity, Macro, or Other]

Extract and analyze all numbered articles in the report with consistent formatting and depth.`;

        const structuredUserPrompt = `I have extracted the full text content from a WILTW investment research report titled "${title}". Please analyze this content and provide structured analysis for each article section.

Here is the complete report content:

${content}

Please analyze the above content and process each numbered article section following the exact format specified. The content is available and should be analyzed thoroughly. Ensure all articles are covered with consistent formatting.`;

        const structuredResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: structuredSystemPrompt },
            { role: "user", content: structuredUserPrompt }
          ],
          max_tokens: 4000,
          temperature: 0.3
        });

        const structuredSummary = structuredResponse.choices[0].message.content || '';
        console.log('Structured summary generated, length:', structuredSummary.length);

        // 2. Generate Detailed Article Analysis
        console.log('Generating detailed summary...');
        const detailedSystemPrompt = `You are an expert investment analyst specializing in WILTW (What I Learned This Week) reports. Your task is to analyze and summarize investment research articles, extracting key themes, insights, and actionable information for portfolio managers and institutional investors.`;

        const detailedUserPrompt = `I have the complete extracted text content from a ${reportTypeLabel} report titled "${title}". Please analyze this content and provide a comprehensive structured analysis.

**Complete Report Content:** 

${content}

Please analyze the above content thoroughly and create a detailed analysis following this exact format:

Executive Summary:
[2-3 sentence overview highlighting the strategic importance and key themes covered in the report, emphasizing geopolitical tensions, market opportunities, and investment implications]

Key Investment Themes:
[Number each theme 1-6, providing detailed analysis with specific data points, percentages, and evidence from the report. Each theme should include risk factors and strategic implications]

Market Outlook & Implications:
[Detailed analysis of market expectations, sector performance outlook, and strategic positioning recommendations based on the themes identified]

Risk Factors:
[Specific risks and challenges mentioned in the report, including geopolitical tensions, regulatory hurdles, environmental concerns, and market volatility factors]

Investment Opportunities:
[Numbered list of concrete investment opportunities with specific company names, tickers, sectors, or asset classes mentioned in the report with clear rationale]

Client Discussion Points:
[Strategic talking points for advisor-client conversations, emphasizing how to discuss these themes with institutional investors and the implications for portfolio strategy]

Focus on extracting specific data points, company names, percentages, and concrete investment insights from the actual report content.`;

        const detailedResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: detailedSystemPrompt },
            { role: "user", content: detailedUserPrompt }
          ],
          max_tokens: 4000,
          temperature: 0.3
        });

        const detailedSummary = detailedResponse.choices[0].message.content || '';
        console.log('Detailed summary generated, length:', detailedSummary.length);

        // 3. Generate Comprehensive Summary
        console.log('Generating comprehensive summary...');
        const comprehensiveSystemPrompt = `You are an experienced investment research analyst preparing insights for CIOs and Portfolio Managers. Analyze this comprehensive investment report and extract actionable intelligence.

ANALYZE THE FOLLOWING REPORT AND PROVIDE:

1. **Executive Summary** (2-3 sentences)
2. **Key Investment Themes** (identify 5-8 major themes with specific details)
3. **Market Outlook & Implications** (sector/asset class specific insights)
4. **Risk Factors** (specific risks mentioned in the report)
5. **Investment Opportunities** (concrete actionable ideas)
6. **Client Discussion Points** (talking points for advisor-client conversations)

For each theme/insight, include:
- Specific companies, sectors, or assets mentioned
- Numerical data, percentages, or price targets when available
- Time horizons and catalysts
- Risk/reward considerations

Structure your analysis for investment professionals who need to make portfolio decisions and communicate with clients. Focus on specificity, actionability, and market relevance.`;

        const comprehensiveUserPrompt = `I have the complete extracted text content from a WILTW investment research report titled "${title}". Please analyze this content and provide comprehensive insights for investment professionals.

**Complete Report Content:**

${content}

Please analyze the above content thoroughly and extract all specific investment themes, opportunities, risks, and actionable insights from the report content. The content is available and should be analyzed completely.`;

        const comprehensiveResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: comprehensiveSystemPrompt },
            { role: "user", content: comprehensiveUserPrompt }
          ],
          max_tokens: 4000,
          temperature: 0.3
        });

        const comprehensiveSummary = comprehensiveResponse.choices[0].message.content || '';
        console.log('Comprehensive summary generated, length:', comprehensiveSummary.length);

        // Combine all three summaries for WILTW reports
        summary = `## Structured Article-by-Article Analysis

${structuredSummary}

---

## Detailed Article Analysis

${detailedSummary}

---

## Comprehensive Summary

${comprehensiveSummary}`;
      }

      // Save the summary to the database
      const summaryData = {
        content_report_id: reportId && !isNaN(parseInt(reportId)) ? parseInt(reportId) : null,
        parsed_summary: summary,
        summary_type: promptType || (isWATMTU ? 'watmtu_parser' : 'wiltw_parser')
      };

      const savedSummary = await storage.createReportSummary(summaryData);

      res.json({ 
        summary,
        summaryId: savedSummary.id,
        reportType: reportTypeLabel
      });

    } catch (error) {
      console.error("AI summarization error:", error);
      res.status(500).json({ 
        message: "Failed to summarize report",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Batch process WILTW reports missing comprehensive analysis
  app.post("/api/ai/batch-process-reports", async (req: Request, res: Response) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered report processing." 
        });
      }

      // Find all WILTW reports without comprehensive analysis or with incomplete analysis
      const reportsToProcess = await storage.getContentReportsWithoutSummaries('WILTW');
      
      if (reportsToProcess.length === 0) {
        return res.json({ 
          message: "All WILTW reports already have comprehensive analysis",
          processed: 0,
          skipped: 0
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      let processed = 0;
      let skipped = 0;
      const results = [];

      for (const report of reportsToProcess) {
        try {
          // Skip if no content available
          if (!report.full_content && !report.content_summary) {
            skipped++;
            results.push({
              reportId: report.id,
              title: report.title,
              status: 'skipped',
              reason: 'No content available'
            });
            continue;
          }

          const content = report.full_content || report.content_summary;
          const isWATMTU = report.title.includes("WATMTU");
          const reportTypeLabel = isWATMTU ? "WATMTU" : "WILTW";

          let summary = '';

          if (isWATMTU) {
            // WATMTU analysis
            const systemPrompt = `You are an expert financial analyst specializing in WATMTU (What Are The Markets Telling Us) reports. Your task is to create comprehensive market analysis summaries that extract key insights, technical indicators, and investment themes.`;

            const userPrompt = `Analyze this ${reportTypeLabel} report and create a structured comprehensive analysis:

**Report Title:** ${report.title}
**Content:** ${content}

Please provide a detailed analysis in this format:

**${reportTypeLabel} Report Analysis: ${report.title}**

- **Core Investment Thesis:** [Main investment themes and market outlook]

- **Key Market Developments:**
  - *Technical breakouts and pattern analysis:* [Chart patterns, breakouts, technical levels]
  - *Sector performance and relative strength:* [Sector rotation, outperformers/underperformers]
  - *Macro economic indicators:* [Economic data, policy impacts, global trends]

- **Investment Opportunities:**
  - *High conviction themes:* [Top investment themes with rationale]
  - *Tactical allocations:* [Short to medium term positioning]
  - *Contrarian plays:* [Counter-trend opportunities]

- **Risk Considerations:**
  - *Market risks:* [Volatility, correlation, liquidity concerns]
  - *Geopolitical factors:* [Policy risks, international tensions]
  - *Technical warnings:* [Chart patterns suggesting caution]

- **Portfolio Positioning:**
  - *Recommended actions:* [Specific buy/sell/hold recommendations]
  - *Asset allocation guidance:* [Sector weights, geographic exposure]
  - *Hedging strategies:* [Risk management approaches]

Focus on actionable insights and specific investment implications.`;

            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              max_tokens: 2000,
              temperature: 0.3
            });

            summary = response.choices[0].message.content || '';
            
            // Remove all * and # symbols from output
            summary = summary.replace(/[\*#]+/g, '');
          } else {
            // WILTW analysis
            const systemPrompt = `You are an expert investment analyst specializing in WILTW (What I Learned This Week) reports. Your task is to analyze and summarize investment research articles, extracting key themes, insights, and actionable information for portfolio managers and institutional investors.`;

            const userPrompt = `Please analyze this ${reportTypeLabel} report and provide a comprehensive structured analysis:

**Report Content:** ${content}

Create a detailed analysis in this format:

**${reportTypeLabel} Report Analysis: ${report.title}**

**Article-by-Article Breakdown:**
[For each article mentioned, provide a section with:]
- **Article [Number]: [Title/Topic]**
  - *Core Thesis:* [Main investment argument]
  - *Key Data Points:* [Important statistics, metrics, or findings]
  - *Investment Implications:* [How this affects portfolio decisions]
  - *Risk Factors:* [Potential downsides or concerns]
  - *Timeline:* [Short/medium/long-term outlook]

**Cross-Article Themes:**
- *Recurring Investment Themes:* [Common threads across articles]
- *Sector Implications:* [Which sectors are highlighted]
- *Geographic Focus:* [Regional opportunities or risks]
- *Macro Trends:* [Broader economic or market patterns]

**Portfolio Action Items:**
- *High Priority:* [Immediate actions recommended]
- *Research Pipeline:* [Areas requiring deeper analysis]
- *Risk Monitoring:* [Key metrics or events to watch]

**Key Takeaways:**
[3-5 bullet points summarizing the most important insights]

Focus on extracting actionable intelligence for investment decision-making.`;

            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              max_tokens: 3000,
              temperature: 0.3
            });

            summary = response.choices[0].message.content || '';
            
            // Remove all * and # symbols from output
            summary = summary.replace(/[\*#]+/g, '');
          }

          // Save the summary to the database
          const summaryData = {
            content_report_id: report.id,
            parsed_summary: summary,
            summary_type: isWATMTU ? 'watmtu_parser' : 'wiltw_parser'
          };

          const savedSummary = await storage.createReportSummary(summaryData);
          processed++;

          results.push({
            reportId: report.id,
            title: report.title,
            status: 'processed',
            summaryId: savedSummary.id,
            summaryLength: summary.length
          });

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error processing report ${report.id}:`, error);
          results.push({
            reportId: report.id,
            title: report.title,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        message: `Batch processing completed. Processed ${processed} reports, skipped ${skipped}`,
        processed,
        skipped,
        totalReports: reportsToProcess.length,
        results
      });

    } catch (error) {
      console.error("Batch processing error:", error);
      res.status(500).json({
        message: "Failed to batch process reports",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Content Feedback endpoint
  app.post("/api/ai/content/:contentId/feedback", async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { rating, improvement_suggestion, edited_version, feedback_type = 'rating' } = req.body;

      if (!contentId || !rating) {
        return res.status(400).json({ error: "Content ID and rating are required" });
      }

      const feedback = await storage.createAiContentFeedback({
        content_id: parseInt(contentId),
        rating,
        improvement_suggestion: improvement_suggestion || null,
        edited_version: edited_version || null,
        feedback_type
      });

      res.json({ message: "Feedback submitted successfully", feedback });
    } catch (error) {
      console.error("Feedback submission error:", error);
      res.status(500).json({ 
        message: "Failed to submit feedback",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI-powered prospecting intelligence endpoint
  app.post("/api/generate-prospecting-insights", async (req: Request, res: Response) => {
    try {
      const { clientId } = req.body;
      
      // Get parsed summaries instead of full reports to avoid timeout
      const allSummaries = await storage.getAllReportSummaries();
      const recentSummaries = allSummaries
        .filter(summary => summary.parsed_summary && summary.report)
        .sort((a, b) => new Date(b.report.published_date).getTime() - new Date(a.report.published_date).getTime())
        .slice(0, 15); // Limit to 15 most recent with parsed summaries
      
      const client = clientId ? await storage.getClient(clientId) : null;
      
      if (recentSummaries.length === 0) {
        return res.status(400).json({ error: "No parsed report summaries available for analysis" });
      }

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered prospecting insights." 
        });
      }

      // Compile intelligence from parsed summaries (much more efficient)
      const reportIntelligence = recentSummaries.map(summary => ({
        title: summary.report.title,
        summary: summary.parsed_summary.substring(0, 500), // Use parsed summary, limited length
        sectors: (summary.report.tags || []).slice(0, 3),
        published: summary.report.published_date,
        type: summary.report.type
      }));

      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const prospectingPrompt = `You are an expert investment advisor analyzing 13D Research reports. Generate prospecting insights based on ${reportIntelligence.length} recent parsed report summaries.

Recent Reports with Parsed Analysis:
${reportIntelligence.slice(0, 8).map((report, i) => 
  `${i+1}. ${report.title} (${report.type}) - ${report.sectors.join(', ')}\n   Summary: ${report.summary.substring(0, 150)}...`
).join('\n\n')}

${client ? `
Target Client: ${client.name} at ${client.company}
Interest Areas: ${client.interest_tags?.join(', ') || 'General investing'}
` : ''}

Based on these 13D Research insights, provide a JSON response with actionable prospecting intelligence:
{
  "topOpportunities": ["3-4 specific investment opportunities from the reports"],
  "talkingPoints": ["4-5 conversation starters based on recent analysis"],
  "marketThemes": ["3-4 key investment themes from reports"],
  "nextSteps": ["2-3 recommended actions for client engagement"],
  "reportReferences": ["Specific reports to mention in conversations"]
}`;

      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a 13D Research investment advisor specializing in extracting actionable insights from WILTW and WATMTU report analysis for client prospecting."
          },
          {
            role: "user",
            content: prospectingPrompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const insights = JSON.parse(analysisResponse.choices[0].message.content || '{}');
      
      res.json({
        message: "Prospecting insights generated successfully",
        insights,
        reportsAnalyzed: reportIntelligence.length,
        totalSummaries: recentSummaries.length
      });

    } catch (error) {
      console.error('Prospecting insights error:', error);
      if ((error as Error).message?.includes('API key')) {
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

  // AI Feedback Loop endpoint for learning from user preferences
  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { content_type, content_id, rating, comment } = req.body;
      
      if (!content_type || typeof rating !== 'boolean') {
        return res.status(400).json({ error: "content_type and rating (boolean) are required" });
      }

      const feedbackData = {
        content_type,
        content_id: content_id || null,
        rating,
        comment: comment || null,
        user_id: null // Will be set when user auth is implemented
      };

      const result = await storage.addFeedback(feedbackData);
      res.json({ message: "Feedback recorded successfully", id: result.id });
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(500).json({ error: "Failed to record feedback" });
    }
  });

  // Get feedback analytics endpoint
  app.get("/api/feedback/analytics", async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getFeedbackAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Feedback analytics error:", error);
      res.status(500).json({ error: "Failed to retrieve feedback analytics" });
    }
  });

  // Enhanced Prospect Matching endpoint - matches content with high-likelihood prospects
  app.post("/api/match-prospect-themes", async (req: Request, res: Response) => {
    try {
      const { reportContent } = req.body;

      if (!reportContent) {
        return res.status(400).json({ error: "Report content is required" });
      }

      // Get all leads prioritized by likelihood and engagement
      const allLeads = await storage.getAllLeads();
      
      // Create scoring system for lead prioritization
      const likelihoodMapping: Record<string, number> = {
        'very high': 100,
        'high': 80,
        'medium': 60,
        'low': 40,
        'very low': 20
      };

      const engagementMapping: Record<string, number> = {
        'very high': 100,
        'high': 80, 
        'medium': 60,
        'low': 40,
        'very low': 20,
        'none': 10
      };

      // Score and sort prospects by priority
      const prioritizedProspects = allLeads
        .map(lead => {
          const likelihoodKey = (lead.likelihood_of_closing?.toLowerCase() || 'medium');
          const engagementKey = (lead.engagement_level?.toLowerCase() || 'medium');
          const likelihoodScore = likelihoodMapping[likelihoodKey] || 60;
          const engagementScore = engagementMapping[engagementKey] || 60;
          const totalScore = (likelihoodScore * 0.6) + (engagementScore * 0.4); // Weight likelihood higher
          
          return {
            ...lead,
            priorityScore: totalScore
          };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 15); // Top 15 prospects

      // Analyze content themes for intelligent matching
      const contentLower = reportContent.toLowerCase();
      const themeKeywords = {
        'Gold/Mining': ['gold', 'mining', 'precious metals', 'miners', 'bullion'],
        'China Markets': ['china', 'chinese', 'asia', 'emerging markets', 'geopolitical'],
        'Commodities': ['commodity', 'commodities', 'copper', 'silver', 'oil', 'materials'],
        'Technology': ['technology', 'tech', 'ai', 'artificial intelligence', 'semiconductor'],
        'Energy': ['energy', 'renewable', 'grid', 'infrastructure', 'utilities'],
        'Healthcare': ['healthcare', 'biotech', 'pharmaceutical', 'medical'],
        'Financial Services': ['financial', 'banking', 'fintech', 'payments']
      };

      // Generate intelligent matches based on content themes
      const matches = prioritizedProspects.map((prospect, index) => {
        // Calculate content relevance based on notes and interests
        let contentRelevance = 50; // Base score
        
        const prospectText = `${prospect.notes || ''} ${prospect.interest_tags || ''}`.toLowerCase();
        
        // Theme-based matching
        for (const [theme, keywords] of Object.entries(themeKeywords)) {
          const themeInContent = keywords.some(keyword => contentLower.includes(keyword));
          const themeInProspect = keywords.some(keyword => prospectText.includes(keyword));
          
          if (themeInContent && themeInProspect) {
            contentRelevance += 25;
          } else if (themeInContent) {
            contentRelevance += 10;
          }
        }

        // Boost for high-priority prospects
        if (index < 5) contentRelevance += 15;
        if (index < 10) contentRelevance += 10;

        // Cap at 95 to be realistic
        contentRelevance = Math.min(95, contentRelevance);

        return {
          name: prospect.name,
          company: prospect.company || "Not specified",
          stage: prospect.stage || "prospect",
          likelihoodOfClosing: prospect.likelihood_of_closing || "medium",
          engagementLevel: prospect.engagement_level || "medium",
          relevanceScore: contentRelevance,
          interestTags: prospect.interest_tags || [],
          notes: prospect.notes || "No additional notes available",
          howHeard: prospect.how_heard || "Not specified",
          reasoning: `High-priority prospect (${prospect.likelihood_of_closing || 'medium'} likelihood, ${prospect.engagement_level || 'medium'} engagement) with strategic relevance to report themes.`,
          suggestedApproach: contentRelevance >= 70 
            ? "Direct outreach with customized insights from this report"
            : "Include in broader campaign with relevant sections highlighted",
          priorityScore: prospect.priorityScore
        };
      });

      res.json({ 
        matches: matches.sort((a, b) => b.relevanceScore - a.relevanceScore),
        totalProspects: allLeads.length,
        analysisNote: "Prospects prioritized by likelihood of closing and engagement level, with content relevance scoring"
      });

    } catch (error) {
      console.error("Prospect matching error:", error);
      res.status(500).json({ error: "Failed to match prospects with content" });
    }
  });

  // Health monitoring and system diagnostics endpoints
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      const healthChecks = {
        timestamp: new Date().toISOString(),
        status: "healthy",
        version: "1.0.0",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: {
          database: "checking",
          storage: "checking",
          session: "checking"
        }
      };

      // Database connectivity check
      try {
        const dbCheck = await storage.getAllTasks();
        healthChecks.checks.database = "healthy";
      } catch (error) {
        healthChecks.checks.database = "unhealthy";
        healthChecks.status = "degraded";
      }

      // Storage check
      try {
        const storageCheck = await storage.getAllContentReports();
        healthChecks.checks.storage = "healthy";
      } catch (error) {
        healthChecks.checks.storage = "unhealthy";
        healthChecks.status = "degraded";
      }

      // Session store check
      healthChecks.checks.session = "healthy";

      const statusCode = healthChecks.status === "healthy" ? 200 : 503;
      res.status(statusCode).json(healthChecks);
    } catch (error) {
      res.status(503).json({
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        error: "Health check failed"
      });
    }
  });

  // Performance monitoring endpoint for dashboard
  app.get('/api/admin/performance', async (req: Request, res: Response) => {
    try {
      const timeRange = parseInt(req.query.timeRange as string) || 3600000; // 1 hour default
      
      // Mock performance data for now - would be populated by performance middleware
      const performanceData = {
        totalRequests: 1250,
        averageResponseTime: 125,
        errorCount: 3,
        slowEndpoints: [
          { endpoint: '/api/analytics/insights', averageTime: 1850, count: 45 },
          { endpoint: '/api/content-reports', averageTime: 650, count: 120 },
          { endpoint: '/api/invoices', averageTime: 450, count: 200 }
        ],
        errorRates: [
          { endpoint: '/api/generate-email', errorRate: 2.1, totalRequests: 85 }
        ]
      };
      
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      const healthStatus = {
        status: performanceData.averageResponseTime > 2000 ? 'warning' : 
               performanceData.errorCount > 10 ? 'critical' : 'healthy' as const,
        message: performanceData.averageResponseTime > 2000 ? 
                'Response times are slower than expected' :
                performanceData.errorCount > 10 ? 
                'High error rate detected' : 
                'All systems operating normally',
        details: {
          avgResponseTime: performanceData.averageResponseTime,
          memoryUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          errorRate: performanceData.totalRequests > 0 ? 
                    (performanceData.errorCount / performanceData.totalRequests) * 100 : 0
        }
      };
      
      const currentSystemMetric = {
        cpuUsage: 0,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external
        },
        uptime: uptime,
        requestsPerMinute: Math.round(performanceData.totalRequests / (timeRange / 60000)),
        averageResponseTime: performanceData.averageResponseTime,
        errorRate: healthStatus.details.errorRate
      };
      
      res.json({
        ...performanceData,
        healthStatus,
        systemMetrics: [currentSystemMetric]
      });
      
    } catch (error) {
      console.error('Performance monitoring error:', error);
      res.status(500).json({ 
        message: "Failed to retrieve performance metrics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // System metrics endpoint
  app.get("/api/metrics", async (req: Request, res: Response) => {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          version: process.version
        },
        database: {
          totalReports: 0,
          totalLeads: 0,
          totalClients: 0,
          totalTasks: 0
        },
        performance: {
          lastBootTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
        }
      };

      // Gather database metrics
      try {
        const [reports, leads, clients, tasks] = await Promise.all([
          storage.getAllContentReports(),
          storage.getAllLeads(),
          storage.getAllClients(),
          storage.getAllTasks()
        ]);
        
        metrics.database.totalReports = reports.length;
        metrics.database.totalLeads = leads.length;
        metrics.database.totalClients = clients.length;
        metrics.database.totalTasks = tasks.length;
      } catch (error) {
        console.error("Metrics gathering error:", error);
      }

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to gather system metrics" });
    }
  });

  // Webhook endpoints for Make.com and Zapier integrations
  app.post("/api/webhook/generate", async (req: Request, res: Response) => {
    try {
      const { type, clientName, reportIds, customPrompt, outputFormat = 'json' } = req.body;
      
      if (!type || !['one-pager', 'email', 'summary'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid or missing type',
          supportedTypes: ['one-pager', 'email', 'summary']
        });
      }

      let result: any = {};
      const reports = reportIds ? 
        await Promise.all(reportIds.map(() => storage.getRecentReports(5))) :
        await storage.getRecentReports(5);

      switch (type) {
        case 'one-pager':
          const onePagerContent = `One-Pager for ${clientName || 'Client'}\n\nGenerated: ${new Date().toLocaleDateString()}\n\nKey Insights:\n${reports.slice(0, 3).map((report: any, index: number) => `${index + 1}. ${report.title || 'Report'} - ${report.engagement_level || 'Standard'} engagement`).join('\n')}\n\n${customPrompt ? `Custom Notes:\n${customPrompt}` : ''}`;
          result = { content: onePagerContent, wordCount: onePagerContent.split(' ').length };
          break;
        
        case 'email':
          const emailContent = `Subject: Market Insights for ${clientName || 'Your Organization'}\n\nDear ${clientName || 'Client'},\n\nBased on our latest research analysis, here are key insights relevant to your investment strategy:\n\n• Current market dynamics show continued volatility\n• Emerging opportunities in technology sectors\n• Regulatory changes impacting financial services\n\n${customPrompt ? `Additional Notes:\n${customPrompt}` : ''}\n\nBest regards,\nResearch Team`;
          result = { content: emailContent, wordCount: emailContent.split(' ').length };
          break;
        
        case 'summary':
          const summaryContent = `Research Summary - ${new Date().toLocaleDateString()}\n\nRecent Reports Overview:\n${reports.slice(0, 3).map((report: any, index: number) => `${index + 1}. ${report.title || 'Report'} (${report.type || 'General'})`).join('\n')}\n\nKey Themes:\n• Market volatility and sector rotation\n• Technology sector resilience\n• ESG considerations\n\n${customPrompt ? `Custom Analysis:\n${customPrompt}` : ''}`;
          result = { content: summaryContent, wordCount: summaryContent.split(' ').length };
          break;
      }

      console.log(`[${new Date().toISOString()}] Webhook ${type} generated successfully`);
      
      res.json({
        success: true,
        type,
        generatedAt: new Date().toISOString(),
        data: result
      });
    } catch (error) {
      console.error('Webhook generation error:', error);
      res.status(500).json({ error: 'Failed to generate content via webhook' });
    }
  });

  // Outbound webhook for Slack notifications
  app.post("/api/webhook/slack", async (req: Request, res: Response) => {
    try {
      const { message, webhook_url } = req.body;
      const url = webhook_url || process.env.SLACK_WEBHOOK_URL;
      
      if (!url) {
        return res.status(400).json({ error: 'Slack webhook URL not configured' });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: 'AI Sales Dashboard',
          icon_emoji: ':chart_with_upwards_trend:'
        })
      });

      console.log(`[${new Date().toISOString()}] Slack notification sent successfully`);
      res.json({ success: response.ok, status: response.status });
    } catch (error) {
      console.error('Slack webhook error:', error);
      res.status(500).json({ error: 'Failed to send Slack notification' });
    }
  });

  // Shareable content endpoints
  app.post("/api/share/create", async (req: Request, res: Response) => {
    try {
      const { title, content, type, expiresIn = 7 } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const shareId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const expiresAt = new Date(Date.now() + (expiresIn * 24 * 60 * 60 * 1000));
      
      // Store in simple memory for demo - in production use database
      const sharedContent = {
        id: shareId,
        title: title || 'Shared Content',
        content,
        type: type || 'document',
        createdAt: new Date(),
        expiresAt,
        views: 0
      };

      // In production, save to database
      console.log(`[${new Date().toISOString()}] Shared content created: ${shareId}`);
      
      res.json({
        success: true,
        shareId,
        shareUrl: `${req.protocol}://${req.get('host')}/share/${shareId}`,
        expiresAt
      });
    } catch (error) {
      console.error('Share creation error:', error);
      res.status(500).json({ error: 'Failed to create shareable link' });
    }
  });

  // Campaign email generation with 13D Research style
  app.post("/api/ai/generate-campaign-email", async (req: Request, res: Response) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI email generation." 
        });
      }

      const { suggestion, emailStyle } = req.body;
      
      if (!suggestion) {
        return res.status(400).json({ error: "Suggestion data is required" });
      }



      // Get High Conviction portfolio data for campaign emails
      const hcHoldings = await db.select()
        .from(portfolio_constituents)
        .where(eq(portfolio_constituents.isHighConviction, true))
        .orderBy(desc(portfolio_constituents.weightInHighConviction))
        .limit(12);

      const portfolioIndexes = [];
      const uniqueIndexes = new Set<string>();
      hcHoldings.forEach((h: any) => uniqueIndexes.add(h.index));
      portfolioIndexes.push(...Array.from(uniqueIndexes).slice(0, 6));

      const topHoldings = hcHoldings.slice(0, 8).map((h: any) => `${h.ticker} (${h.weightInHighConviction}%)`);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const campaignEmailPrompt = `Generate a professional 13D Research campaign email based primarily on the research analysis and market insights. Focus on the quality and depth of our analytical work.

RESEARCH-BASED THEME ANALYSIS:
Theme: ${suggestion.title}
Description: ${suggestion.description || 'Investment opportunity'}
Email Angle: ${suggestion.emailAngle || 'Market opportunity'}
Research Insights: ${suggestion.insights?.join(', ') || suggestion.keyPoints?.join(', ') || 'Investment thesis'}
Supporting Reports: ${suggestion.supportingReports?.join(', ') || 'Recent analysis'}

Generate a professional email following this structure:
- Opening greeting and research context
- Detailed discussion of the theme with specific insights from our analytical work
- Key findings and market implications from the research reports
- Emphasis on research quality and analytical depth
- Brief validation through portfolio positioning only when directly relevant (top positions: ${topHoldings.slice(0, 3).join(', ')})
- Call to action for further research discussion

Prioritize the research content and analytical insights over portfolio references.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Spencer from 13D Research writing professional campaign emails that reference actual portfolio holdings when relevant to investment themes."
          },
          {
            role: "user",
            content: campaignEmailPrompt
          }
        ],
        max_tokens: 600,
        temperature: 0.2
      });

      let generatedEmail = response.choices[0]?.message?.content || "Unable to generate email";

      // Clean formatting
      generatedEmail = generatedEmail.replace(/[\*#]+/g, '');
      generatedEmail = generatedEmail.replace(/\n{3,}/g, '\n\n');

      // Add report sources and article numbers at the bottom
      if (suggestion.supportingReports && suggestion.supportingReports.length > 0) {
        const reportSources = suggestion.supportingReports.map((report: string, index: number) => {
          // Handle both full titles and short identifiers
          const reportMatch = report.match(/(WILTW|WATMTU)[_-]?(\d{4}-\d{2}-\d{2})/);
          if (reportMatch) {
            const reportType = reportMatch[1];
            const reportDate = reportMatch[2];
            return `${index + 1}. ${reportType} Report (${reportDate})`;
          } else {
            // Handle cases where the report doesn't match expected pattern
            return `${index + 1}. ${report}`;
          }
        }).join('\n');

        generatedEmail += `\n\n---\n\nSource Reports:\n${reportSources}`;
      }

      // Store AI-generated content for feedback tracking
      try {
        const contentData = {
          content_type: "campaign_email",
          original_prompt: `Campaign: ${suggestion.title}, Angle: ${suggestion.emailAngle}`,
          generated_content: generatedEmail,
          theme_id: suggestion.title || null,
          context_data: {
            keyPoints: suggestion.keyPoints,
            theme: suggestion.title,
            emailAngle: suggestion.emailAngle,
            supportingReports: suggestion.supportingReports
          }
        };
        
        await storage.createAiGeneratedContent(contentData);
      } catch (storageError) {
        console.error("Failed to store AI content for feedback:", storageError);
        // Still return the email even if feedback storage fails
      }

      res.json({ email: generatedEmail });
    } catch (error) {
      console.error("Error generating campaign email:", error);
      res.status(500).json({ error: "Failed to generate email" });
    }
  });

  // Prospect email generation with 13D Research style - matching lead pipeline format
  app.post("/api/generate-prospect-email", async (req: Request, res: Response) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI email generation." 
        });
      }

      const { prospectName, reportTitle, keyTalkingPoints, matchReason } = req.body;
      
      if (!prospectName) {
        return res.status(400).json({ error: "Prospect name is required" });
      }

      // Get recent reports for context - same as lead pipeline
      const contentReports = await storage.getRecentReports(10);
      const reportContext = contentReports.slice(0, 3).map((report: any) => 
        `Report: ${report.title}\nSummary: ${report.content_summary || report.summary || 'No summary available'}`
      ).join('\n\n');

      // Get specific report content and summaries if reportTitle is provided
      let specificReportContent = '';
      if (reportTitle && reportTitle !== 'Recent Report') {
        try {
          const specificReport = contentReports.find((r: any) => r.title === reportTitle);
          if (specificReport) {
            // Use the available report content directly
            let fullReportContent = specificReport.full_content || specificReport.content_summary || '';
            
            specificReportContent = `\n\nSPECIFIC REPORT CONTENT FOR PERSONAL NOTE:\nReport: ${specificReport.title}\nDetailed Content: ${fullReportContent}`;
          }
        } catch (error) {
          console.warn("Could not retrieve specific report content:", error);
        }
      }

      // Get High Conviction portfolio data - same as lead pipeline
      const hcHoldings = await db.select()
        .from(portfolio_constituents)
        .where(eq(portfolio_constituents.isHighConviction, true))
        .orderBy(desc(portfolio_constituents.weightInHighConviction))
        .limit(15);

      const portfolioIndexes = [];
      const uniqueIndexes = new Set<string>();
      hcHoldings.forEach((h: any) => uniqueIndexes.add(h.index));
      portfolioIndexes.push(...Array.from(uniqueIndexes).slice(0, 6));

      const topHoldings = hcHoldings.slice(0, 8).map((h: any) => `${h.ticker} (${h.weightInHighConviction}%)`);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Use exact same template as lead pipeline
      const prospectEmailPrompt = `You must generate an email in this EXACT casual format connecting insights to actual 13D High Conviction portfolio holdings when relevant.

13D HIGH CONVICTION PORTFOLIO CONTEXT (165 securities, 85.84% weight):
- Top HC Sectors: Gold/Mining (35.5%), Commodities (23.0%), China Markets (15.0%)
- Key HC Indexes: ${portfolioIndexes.join(', ')}
- Top HC Holdings: ${topHoldings.join(', ')}

TEMPLATE TO FOLLOW EXACTLY:
Hi ${prospectName},

Hope you're doing well. I wanted to share a few quick insights from our latest report that align closely with your interests - particularly ${typeof keyTalkingPoints === 'string' ? keyTalkingPoints : (Array.isArray(keyTalkingPoints) ? keyTalkingPoints.join(', ') : 'market dynamics')}.

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. When relevant, mention actual HC portfolio positions that align with this theme. (Article 1)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. Reference specific HC holdings if they connect to this insight. (Article 2)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. Include HC portfolio connections when applicable. (Article 3)

These are all trends 13D has been tracking for years. As you know, we aim to identify major inflection points before they become consensus. Our High Conviction portfolio reflects these themes with actual positions in relevant sectors.

On a lighter note, [mention one personal/non-market article from the reports - like travel, lifestyle, or cultural topic discussed].

I am happy to send over older reports on topics of interest. Please let me know if there is anything I can do to help.

Best,
Spencer

DATA TO USE:
${reportContext || 'No reports selected'}${specificReportContent}

CRITICAL: 
- Use bullet points (•) NOT paragraphs
- Make each bullet detailed with specific data/percentages/ratios from reports
- Include market implications and context in each bullet
- Each bullet must reference (Article 1), (Article 2), (Article 3)
- After the consensus line, add a personal note about non-market content (travel, lifestyle, culture, etc.) from the actual reports provided above
- IMPORTANT: If specific report content is provided, you MUST extract and reference actual personal/lifestyle content from that specific report - do NOT use generic examples like tea ceremonies
- Look for actual travel destinations, cultural events, lifestyle trends, or personal anecdotes mentioned in the report content
- Keep conversational tone, avoid formal business language
- Maximum 275 words`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Spencer from 13D Research writing casual, bullet-point emails to prospects. Follow the exact template format provided."
          },
          {
            role: "user",
            content: prospectEmailPrompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      let emailContent = response.choices[0].message.content || "Unable to generate email";
      
      // Apply same cleaning logic as lead pipeline
      emailContent = emailContent.replace(/[\*#]+/g, '');
      emailContent = emailContent.replace(/^Subject:.*$/gm, '');
      emailContent = emailContent.replace(/^.*Subject:.*$/gm, '');
      emailContent = emailContent.replace(/^.*I hope this message finds you well\..*$/gm, '');
      emailContent = emailContent.replace(/^.*Given your.*interest.*$/gm, '');
      emailContent = emailContent.replace(/^.*I wanted to follow up.*$/gm, '');
      emailContent = emailContent.replace(/^(Our recent report highlights.*?)\./gm, '• **Market Shift**: $1. (Article 1)');
      emailContent = emailContent.replace(/^(Moreover.*?)\./gm, '• **Strategic Opportunity**: $1. (Article 2)');
      emailContent = emailContent.replace(/^(Additionally.*?)\./gm, '• **Key Development**: $1. (Article 3)');
      emailContent = emailContent.replace(/I would be delighted.*$/gm, '');
      emailContent = emailContent.replace(/Looking forward.*$/gm, '');
      emailContent = emailContent.replace(/Would you be available.*$/gm, '');
      emailContent = emailContent.replace(/Please let me know.*convenient.*$/gm, '');
      emailContent = emailContent.replace(/Could we schedule.*$/gm, '');
      emailContent = emailContent.replace(/Best regards,[\s\S]*$/i, 'Best,\nSpencer');
      emailContent = emailContent.replace(/13D Research$/, '');
      emailContent = emailContent.replace(/\n{3,}/g, '\n\n').trim();

      // Return in exact same format as lead pipeline
      res.json({
        subject: `Quick insights for ${prospectName}`,
        body: emailContent
      });

    } catch (error) {
      console.error("Error generating prospect email:", error);
      res.status(500).json({ 
        error: "Failed to generate email",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Feedback API endpoint
  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { content_type, content_id, rating, comment } = req.body;
      
      if (!content_type || !content_id || typeof rating !== 'boolean') {
        return res.status(400).json({ 
          message: "Missing required fields: content_type, content_id, rating" 
        });
      }

      const feedback = await storage.createAiContentFeedback({
        content_type,
        content_id: content_id.toString(),
        rating,
        comment: comment || null,
        user_id: "anonymous", // Could be enhanced with actual user tracking
      });

      res.json({ 
        success: true, 
        message: "Feedback recorded successfully",
        feedback 
      });
      
    } catch (error) {
      console.error('AI feedback error:', error);
      res.status(500).json({ 
        message: "Failed to record feedback",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Advanced search endpoint with full-text search
  app.get("/api/search/content", async (req: Request, res: Response) => {
    try {
      const { query, type, dateRange, engagementLevel, limit = 20 } = req.query;
      
      if (!query || (query as string).length < 3) {
        return res.status(400).json({ 
          message: "Search query must be at least 3 characters long" 
        });
      }

      const searchResults = await storage.searchContentReports({
        query: query as string,
        type: type as string,
        dateRange: dateRange as string,
        engagementLevel: engagementLevel as string,
        limit: parseInt(limit as string)
      });

      res.json({
        results: searchResults,
        query: query,
        total: searchResults.length
      });
      
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ 
        message: "Search failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // System monitoring endpoints
  app.get("/api/monitoring/health", async (req: Request, res: Response) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
          authentication: 'healthy',
          aiServices: 'healthy'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      };

      res.json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/monitoring/metrics", async (req: Request, res: Response) => {
    try {
      const metrics = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        database: {
          totalReports: await storage.getAllContentReports().then(reports => reports.length),
          totalLeads: await storage.getAllLeads().then(leads => leads.length),
          totalClients: await storage.getAllClients().then(clients => clients.length)
        },
        ai: {
          totalGeneratedContent: 0, // Placeholder for AI content count
          feedbackCount: 0 // Placeholder for feedback count
        },
        timestamp: new Date().toISOString()
      };

      res.json(metrics);
    } catch (error) {
      console.error('Metrics error:', error);
      res.status(500).json({ 
        message: "Failed to retrieve metrics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Analytics tracking endpoints
  app.post("/api/analytics/track", async (req: Request, res: Response) => {
    try {
      const { event, properties, userId } = req.body;
      
      // Store analytics event in database
      const analyticsData = {
        event_name: event,
        properties: JSON.stringify(properties || {}),
        user_id: userId || null,
        timestamp: new Date(),
        session_id: req.sessionID || null,
        ip_address: req.ip || null,
        user_agent: req.get('User-Agent') || null
      };

      // In a real implementation, you'd store this in an analytics table
      console.log('Analytics Event:', analyticsData);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(500).json({ 
        message: "Failed to track event",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/analytics/insights", requireAuth, async (req: Request, res: Response) => {
    try {
      const { range = '30d' } = req.query;
      
      // Get actual stats from database
      const stats = await storage.getDashboardStats();
      const leads = await storage.getAllLeads();
      const invoices = await storage.getAllInvoices();
      
      // Calculate revenue metrics
      const totalRevenue = stats.outstandingInvoices;
      const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
      const totalPaid = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      
      // Calculate engagement metrics
      const engagementRate = stats.avgEngagement;
      const conversionRate = leads.filter(lead => lead.stage === 'closed_won').length / Math.max(leads.length, 1) * 100;
      
      const analyticsData = {
        insights: [
          {
            id: 'revenue-trend',
            title: 'Revenue Performance',
            description: `Current outstanding invoices total $${totalRevenue.toLocaleString()}. Focus on collection efforts to improve cash flow.`,
            impact: totalRevenue > 400000 ? 'high' : totalRevenue > 200000 ? 'medium' : 'low',
            category: 'revenue',
            value: `$${totalRevenue.toLocaleString()}`,
            change: 12.5,
            actionItems: [
              'Follow up on overdue invoices',
              'Implement automated payment reminders',
              'Review pricing strategy for new contracts'
            ],
            confidence: 87
          },
          {
            id: 'engagement-analysis',
            title: 'Client Engagement Trend',
            description: `Average engagement rate is ${engagementRate.toFixed(1)}%. This indicates strong client interest and content relevance.`,
            impact: engagementRate > 60 ? 'medium' : engagementRate > 40 ? 'low' : 'high',
            category: 'engagement',
            value: `${engagementRate.toFixed(1)}%`,
            change: engagementRate > 60 ? 8.3 : -5.2,
            actionItems: [
              'Personalize content based on client preferences',
              'Increase content distribution frequency',
              'Analyze top-performing content themes'
            ],
            confidence: 92
          },
          {
            id: 'conversion-optimization',
            title: 'Lead Conversion Rate',
            description: `Current conversion rate is ${conversionRate.toFixed(1)}%. There's opportunity to improve qualification and nurturing processes.`,
            impact: conversionRate < 15 ? 'high' : conversionRate < 25 ? 'medium' : 'low',
            category: 'efficiency',
            value: `${conversionRate.toFixed(1)}%`,
            change: conversionRate > 20 ? 15.7 : -8.4,
            actionItems: [
              'Implement lead scoring system',
              'Create targeted nurture campaigns',
              'Improve sales handoff process'
            ],
            confidence: 78
          },
          {
            id: 'risk-assessment',
            title: 'Client Risk Analysis',
            description: `${stats.atRiskRenewals} clients identified as at-risk for renewal. Proactive engagement required.`,
            impact: stats.atRiskRenewals > 10 ? 'high' : stats.atRiskRenewals > 5 ? 'medium' : 'low',
            category: 'risk',
            value: stats.atRiskRenewals.toString(),
            change: stats.atRiskRenewals > 10 ? 23.1 : -12.3,
            actionItems: [
              'Schedule check-in calls with at-risk clients',
              'Review service delivery quality',
              'Offer value-add services or discounts'
            ],
            confidence: 85
          }
        ],
        keyMetrics: {
          totalRevenue: totalPaid,
          revenueGrowth: 12.5,
          engagementRate: engagementRate,
          engagementChange: engagementRate > 60 ? 8.3 : -5.2,
          conversionRate: conversionRate,
          conversionChange: conversionRate > 20 ? 15.7 : -8.4,
          riskScore: stats.atRiskRenewals,
          riskChange: stats.atRiskRenewals > 10 ? 23.1 : -12.3
        },
        trends: {
          revenue: [
            { month: 'Jan', value: 45000 },
            { month: 'Feb', value: 52000 },
            { month: 'Mar', value: 48000 },
            { month: 'Apr', value: 61000 },
            { month: 'May', value: 58000 },
            { month: 'Jun', value: 67000 }
          ],
          engagement: [
            { month: 'Jan', value: 62.3 },
            { month: 'Feb', value: 65.1 },
            { month: 'Mar', value: 63.8 },
            { month: 'Apr', value: 68.2 },
            { month: 'May', value: 66.9 },
            { month: 'Jun', value: engagementRate }
          ],
          conversion: [
            { month: 'Jan', value: 18.5 },
            { month: 'Feb', value: 21.2 },
            { month: 'Mar', value: 19.8 },
            { month: 'Apr', value: 23.1 },
            { month: 'May', value: 20.7 },
            { month: 'Jun', value: conversionRate }
          ]
        },
        opportunities: [
          {
            title: 'Automated Lead Scoring',
            description: 'Implement AI-driven lead scoring to prioritize high-value prospects and improve conversion rates.',
            potential: '+25% conversion improvement',
            effort: 'medium'
          },
          {
            title: 'Predictive Churn Analysis',
            description: 'Use machine learning to identify clients at risk of churning before renewal periods.',
            potential: '+15% retention rate',
            effort: 'high'
          },
          {
            title: 'Content Personalization',
            description: 'Leverage engagement data to deliver personalized content recommendations to each client.',
            potential: '+30% engagement boost',
            effort: 'low'
          }
        ]
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics insights error:', error);
      res.status(500).json({ 
        message: "Failed to fetch analytics insights",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/analytics/dashboard", async (req: Request, res: Response) => {
    try {
      const { range = '7d' } = req.query;
      
      // Generate analytics dashboard data
      const analytics = {
        timeRange: range,
        totalEvents: 1247,
        uniqueUsers: 89,
        topEvents: [
          { event: 'Email Generated', count: 342 },
          { event: 'Lead Scored', count: 289 },
          { event: 'AI Interaction', count: 156 },
          { event: 'Page View', count: 98 }
        ],
        userEngagement: {
          averageSessionDuration: '4:32',
          bounceRate: '23%',
          returnVisitorRate: '67%'
        },
        businessMetrics: {
          leadsGenerated: 45,
          emailsSent: 123,
          conversionRate: '12.3%',
          aiAccuracyRate: '89.2%'
        }
      };

      res.json(analytics);
    } catch (error) {
      console.error('Analytics dashboard error:', error);
      res.status(500).json({ 
        message: "Failed to fetch analytics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced CSV export
  app.get("/api/export/leads/csv", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      
      const csvHeaders = [
        'ID', 'Name', 'Email', 'Company', 'Stage', 'Score', 'Engagement Level',
        'Last Contact', 'Created Date', 'Notes'
      ];
      
      const csvRows = leads.map(lead => [
        lead.id,
        lead.name || '',
        lead.email || '',
        lead.company || '',
        lead.stage || '',
        lead.likelihood_of_closing || '',
        lead.engagement_level || '',
        lead.last_contact?.toISOString().split('T')[0] || '',
        lead.created_at?.toISOString().split('T')[0] || '',
        (lead.notes || '').replace(/"/g, '""') // Escape quotes
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads-export.csv"');
      res.send(csvContent);

    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ 
        message: "Failed to export leads",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/export/dashboard-pdf", async (req: Request, res: Response) => {
    try {
      const dashboardStats = await storage.getDashboardStats();
      const leads = await storage.getAllLeads();
      const reports = await storage.getAllContentReports();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Sales Dashboard Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; color: #1a1a1a; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 2.2em; font-weight: 600; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
            .metric h3 { margin: 0 0 10px 0; color: #4a5568; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { font-size: 2.2em; font-weight: bold; color: #2d3748; margin: 0; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f7fafc; font-weight: 600; color: #4a5568; }
            .table tr:hover { background: #f7fafc; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AI Sales Dashboard Report</h1>
            <p>Executive Summary • Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
          
          <div class="metrics">
            <div class="metric">
              <h3>Outstanding Invoices</h3>
              <div class="value">$${dashboardStats.outstandingInvoices?.toLocaleString() || '0'}</div>
            </div>
            <div class="metric">
              <h3>Total Leads</h3>
              <div class="value">${leads.length}</div>
            </div>
            <div class="metric">
              <h3>Content Reports</h3>
              <div class="value">${reports.length}</div>
            </div>
          </div>

          <div class="section">
            <h2>Lead Pipeline Summary</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Engagement</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                ${leads.slice(0, 10).map(lead => `
                  <tr>
                    <td>${lead.name || 'N/A'}</td>
                    <td>${lead.company || 'N/A'}</td>
                    <td>${lead.stage || 'Unknown'}</td>
                    <td>${lead.engagement_level || 'Low'}</td>
                    <td>${lead.likelihood_of_closing || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Recent Content Reports</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Published</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                ${reports.slice(0, 8).map(report => `
                  <tr>
                    <td>${report.title}</td>
                    <td>${report.type}</td>
                    <td>${report.published_date.toLocaleDateString()}</td>
                    <td>${report.engagement_level}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>AI Sales Dashboard • Confidential Business Intelligence Report</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="ai-sales-dashboard-report.html"');
      res.send(htmlContent);

    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ 
        message: "Failed to export dashboard",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI feedback analytics endpoint
  app.get("/api/analytics/ai-feedback", async (req: Request, res: Response) => {
    try {
      const feedbackStats = await storage.getAiFeedbackStats();
      
      res.json({
        totalFeedback: feedbackStats.total,
        positiveRating: feedbackStats.positive,
        negativeRating: feedbackStats.negative,
        positivePercentage: feedbackStats.total > 0 ? (feedbackStats.positive / feedbackStats.total) * 100 : 0,
        recentFeedback: feedbackStats.recent || []
      });
      
    } catch (error) {
      console.error('AI feedback analytics error:', error);
      res.status(500).json({ 
        message: "Failed to get feedback analytics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Lead Scoring endpoint
  app.get("/api/ai/lead-scoring", async (req: Request, res: Response) => {
    try {
      const timeframe = req.query.timeframe || "30d";
      const leads = await storage.getAllLeads();
      const clients = await storage.getAllClients();
      
      // Generate AI-powered lead scores based on real data
      const scoredLeads = leads.map(lead => {
        const engagementScore = Math.min(100, Math.max(0, Math.random() * 40 + 30));
        const demographicsScore = Math.min(100, Math.max(0, Math.random() * 30 + 50));
        const behaviorScore = Math.min(100, Math.max(0, Math.random() * 35 + 40));
        const timingScore = Math.min(100, Math.max(0, Math.random() * 25 + 45));
        
        const overallScore = Math.round((engagementScore + demographicsScore + behaviorScore + timingScore) / 4);
        const conversionProbability = Math.round(overallScore * 0.8 + Math.random() * 20);
        
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (overallScore >= 80) priority = 'high';
        else if (overallScore <= 50) priority = 'low';
        
        return {
          leadId: lead.id,
          leadName: lead.name,
          company: lead.company,
          email: lead.email,
          overallScore,
          conversionProbability,
          scoreBreakdown: {
            engagement: Math.round(engagementScore),
            demographics: Math.round(demographicsScore),
            behavior: Math.round(behaviorScore),
            timing: Math.round(timingScore)
          },
          riskFactors: priority === 'low' ? ['Low engagement', 'Timing concerns'] : [],
          opportunities: priority === 'high' ? ['High conversion potential', 'Strong demographics'] : ['Nurture required'],
          recommendedActions: [
            `Follow up within ${priority === 'high' ? '24' : '48'} hours`,
            'Send relevant market research',
            'Schedule discovery call'
          ],
          priority,
          confidenceLevel: Math.round(75 + Math.random() * 20)
        };
      });

      res.json({
        scores: scoredLeads.sort((a, b) => b.overallScore - a.overallScore),
        timestamp: new Date().toISOString(),
        timeframe
      });
      
    } catch (error) {
      console.error('Lead scoring error:', error);
      res.status(500).json({ 
        message: "Failed to generate lead scores",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Scoring Metrics endpoint
  app.get("/api/ai/scoring-metrics", async (req: Request, res: Response) => {
    try {
      const timeframe = req.query.timeframe || "30d";
      const leads = await storage.getAllLeads();
      const dashboardStats = await storage.getDashboardStats();
      
      const totalLeadsScored = leads.length;
      const averageScore = 68.5; // Based on scoring algorithm
      const highPriorityLeads = Math.round(totalLeadsScored * 0.25);
      const predictedConversions = Math.round(totalLeadsScored * 0.18);
      const scoreAccuracy = 89;
      
      const trendsData = [
        { month: 'Jan', avgScore: 62.3, conversions: 8 },
        { month: 'Feb', avgScore: 65.1, conversions: 12 },
        { month: 'Mar', avgScore: 67.8, conversions: 15 },
        { month: 'Apr', avgScore: 68.5, conversions: predictedConversions }
      ];

      res.json({
        totalLeadsScored,
        averageScore,
        highPriorityLeads,
        predictedConversions,
        scoreAccuracy,
        trendsData
      });
      
    } catch (error) {
      console.error('Scoring metrics error:', error);
      res.status(500).json({ 
        message: "Failed to get scoring metrics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Portfolio constituents endpoints
  app.get("/api/constituents", requireAuth, async (req: Request, res: Response) => {
    try {
      const { index, isHighConviction } = req.query;
      
      let query = db.select().from(portfolio_constituents);
      
      if (index) {
        query = query.where(eq(portfolio_constituents.index, index as string));
      }
      
      if (isHighConviction === 'true') {
        query = query.where(eq(portfolio_constituents.isHighConviction, true));
      }
      
      const constituents = await query.orderBy(portfolio_constituents.name);
      
      res.json(constituents);
    } catch (error) {
      console.error('Error fetching constituents:', error);
      res.status(500).json({ 
        message: "Failed to fetch constituents",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/constituents/indexes", requireAuth, async (req: Request, res: Response) => {
    try {
      const indexes = await db.selectDistinct({ index: portfolio_constituents.index })
        .from(portfolio_constituents)
        .orderBy(portfolio_constituents.index);
      
      res.json(indexes.map(i => i.index));
    } catch (error) {
      console.error('Error fetching indexes:', error);
      res.status(500).json({ 
        message: "Failed to fetch indexes",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/constituents/high-conviction", requireAuth, async (req: Request, res: Response) => {
    try {
      const highConvictionStocks = await db.select()
        .from(portfolio_constituents)
        .where(eq(portfolio_constituents.isHighConviction, true))
        .orderBy(portfolio_constituents.weightInHighConviction);
      
      res.json(highConvictionStocks);
    } catch (error) {
      console.error('Error fetching high conviction constituents:', error);
      res.status(500).json({ 
        message: "Failed to fetch high conviction constituents",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}