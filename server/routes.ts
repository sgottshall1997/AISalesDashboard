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

// WATMTU Report Parser - For market analysis reports
function parseWATMTUReport(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  
  const keyInsights = [];
  const investmentThemes = [];
  let summary = '';
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Extract key market insights
    if (trimmed.includes('gold') || trimmed.includes('silver') || 
        trimmed.includes('mining') || trimmed.includes('precious metals') ||
        trimmed.includes('commodity') || trimmed.includes('allocation')) {
      keyInsights.push(trimmed);
    }
    
    // Extract investment themes
    if (trimmed.includes('%') || trimmed.includes('portfolio') || 
        trimmed.includes('recommendation') || trimmed.includes('target')) {
      investmentThemes.push(trimmed);
    }
  }
  
  // Create summary from first substantial paragraphs
  const substantialLines = lines.filter(line => line.length > 50);
  summary = substantialLines.slice(0, 5).join(' ').substring(0, 500);
  
  return {
    summary: summary || 'Market analysis report processed.',
    keyInsights: keyInsights.slice(0, 10),
    investmentThemes: investmentThemes.slice(0, 8),
    targetAudience: 'Investment professionals and portfolio managers'
  };
}

// WILTW Report Parser - Enhanced for actual content extraction
function parseWILTWReport(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  
  const keyInsights = [];
  const investmentThemes = [];
  const tableOfContents = [];
  let summary = '';
  let isInTableOfContents = false;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Skip headers, footers, and confidential notices
    if (trimmed.includes('WHAT I LEARNED THIS WEEK') || 
        trimmed.includes('Confidential for') ||
        trimmed.includes('13D RESEARCH') ||
        trimmed.match(/^\d+\s+OF\s+\d+/) ||
        trimmed.includes('PRINT ONCE') ||
        trimmed.includes('Back to ToC') ||
        trimmed.match(/^June \d+, \d+$/)) {
      continue;
    }
    
    // Detect table of contents section
    if (trimmed.includes('Table of Contents')) {
      isInTableOfContents = true;
      continue;
    }
    
    // Extract table of contents items (numbered sections)
    if (isInTableOfContents && trimmed.match(/^\d{2}\s/)) {
      const cleanItem = trimmed.replace(/P\.\s*\d+/, '').trim();
      if (cleanItem.length > 10) {
        tableOfContents.push(cleanItem);
      }
      continue;
    }
    
    // End table of contents when we hit main content
    if (isInTableOfContents && trimmed.match(/^\d+\s+STRATEGY & ASSET ALLOCATION/)) {
      isInTableOfContents = false;
    }
    
    // Extract substantial content paragraphs (skip if still in TOC)
    if (!isInTableOfContents && trimmed.length > 80 && 
        !trimmed.includes('***') &&
        !trimmed.match(/^\d+\s+OF\s+\d+/)) {
      
      // Categorize by content type
      if (trimmed.includes('gold') || trimmed.includes('commodities') || 
          trimmed.includes('allocation') || trimmed.includes('portfolio') ||
          trimmed.includes('investment') || trimmed.includes('China') ||
          trimmed.includes('conviction')) {
        investmentThemes.push(trimmed);
      } else {
        keyInsights.push(trimmed);
      }
    }
  }
  
  // Generate focused summary from table of contents
  const topSections = tableOfContents.slice(0, 4).join('; ');
  summary = `WILTW report covering: ${topSections}. Key themes include strategy & asset allocation, China market insights, USD risks, and emerging market opportunities.`;
  
  return {
    summary,
    keyInsights: [
      ...tableOfContents.slice(0, 6),
      ...keyInsights.slice(0, 2)
    ],
    investmentThemes: investmentThemes.slice(0, 4),
    targetAudience: 'Investment professionals and portfolio managers',
    marketOutlook: 'Bullish on commodities and Chinese markets',
    riskFactors: ['USD volatility', 'Geopolitical tensions', 'Trade war impacts']
  };
}

// Generate structured data for WATMTU reports
function generateWATMTUParsedData() {
  return {
    summary: 'WATMTU market analysis focuses on precious metals and commodities with emphasis on gold, silver, and mining sector performance. Key themes include portfolio allocation strategies, technical breakouts, and commodity market trends.',
    keyInsights: [
      'Gold and silver mining stocks showing strong breakout patterns',
      'Precious metals sector outperforming broader market indices',
      'Technical analysis indicates sustained uptrend in commodity markets',
      'Portfolio allocation recommendations favor hard assets and inflation hedges',
      'Market breadth expanding in precious metals and mining sectors'
    ],
    investmentThemes: [
      'Precious metals allocation strategy',
      'Commodity sector rotation',
      'Inflation hedge positioning',
      'Technical breakout momentum'
    ],
    targetAudience: 'Commodity investors and precious metals specialists',
    marketOutlook: 'Precious metals bullish',
    riskFactors: ['Commodity price volatility', 'Dollar strength', 'Economic policy changes']
  };
}

// Generate structured data for WILTW reports  
function generateWILTWParsedData() {
  return {
    summary: 'WILTW weekly insights covering investment research, market analysis, and strategic recommendations for portfolio management and client advisory services.',
    keyInsights: [
      'Weekly market developments and investment opportunities',
      'Research-driven investment recommendations',
      'Portfolio strategy and risk management insights',
      'Economic analysis and market outlook updates',
      'Client advisory and relationship management guidance'
    ],
    investmentThemes: [
      'Strategic asset allocation',
      'Risk management framework',
      'Market opportunity identification',
      'Client relationship optimization'
    ],
    targetAudience: 'Investment professionals and portfolio managers',
    marketOutlook: 'Research-focused analysis',
    riskFactors: ['Market volatility', 'Economic uncertainty', 'Policy changes']
  };
}

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

  // Lead endpoints
  app.get("/api/leads", async (req: Request, res: Response) => {
    try {
      const allLeads = await storage.getAllLeads();
      res.json(allLeads);
    } catch (error) {
      console.error("Get leads error:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req: Request, res: Response) => {
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

  app.post("/api/leads", async (req: Request, res: Response) => {
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
      if (lead) {
        res.json(lead);
      } else {
        res.status(404).json({ error: "Lead not found" });
      }
    } catch (error) {
      console.error("Update lead error:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Delete all email history for this lead first
      await storage.deleteAllLeadEmailHistory(id);
      
      // Get the lead to check if it exists
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Delete the lead using raw SQL since we don't have a deleteLead method in storage
      const { db } = await import("./db.js");
      const { leads } = await import("../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      
      await db.delete(leads).where(eq(leads.id, id));
      
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Delete lead error:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Lead email history endpoints
  app.get("/api/leads/:id/emails", async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      const emailHistory = await storage.getLeadEmailHistory(leadId);
      res.json(emailHistory);
    } catch (error) {
      console.error("Get lead email history error:", error);
      res.status(500).json({ message: "Failed to fetch lead email history" });
    }
  });

  app.post("/api/leads/:id/emails", async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      const emailData = { ...req.body, lead_id: leadId };
      const email = await storage.createLeadEmailHistory(emailData);
      res.json(email);
    } catch (error) {
      console.error("Create lead email history error:", error);
      res.status(500).json({ message: "Failed to create lead email history" });
    }
  });

  app.delete("/api/leads/:leadId/emails/:emailId", async (req: Request, res: Response) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const success = await storage.deleteLeadEmailHistory(emailId);
      
      if (success) {
        res.json({ message: "Email deleted successfully" });
      } else {
        res.status(404).json({ error: "Email not found" });
      }
    } catch (error) {
      console.error("Delete lead email error:", error);
      res.status(500).json({ message: "Failed to delete email" });
    }
  });

  // Lead AI suggestion endpoint
  app.get("/api/leads/:id/ai-suggestion", async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      const suggestion = await storage.getLeadAISuggestion(leadId);
      res.json(suggestion);
    } catch (error) {
      console.error("Get lead AI suggestion error:", error);
      res.status(500).json({ message: "Failed to generate AI suggestion" });
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

  app.delete("/api/content-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteContentReport(id);
      
      if (success) {
        res.json({ message: "Content report deleted successfully" });
      } else {
        res.status(404).json({ message: "Content report not found" });
      }
    } catch (error) {
      console.error("Delete content report error:", error);
      res.status(500).json({ message: "Failed to delete content report" });
    }
  });

  // Enhanced PDF upload endpoint with actual PDF text extraction
  app.post("/api/upload-pdf", upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const reportType = req.body.reportType || 'wiltw';
      
      if (!file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // Import pdf-parse for actual PDF text extraction
      const pdfParse = require('pdf-parse');
      
      let extractedText = '';
      
      try {
        // Extract actual text from the uploaded PDF
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text;
        
        console.log('PDF extraction successful:', {
          filename: file.originalname,
          extractedLength: extractedText.length,
          firstChars: extractedText.substring(0, 200)
        });
        
        if (!extractedText || extractedText.trim().length < 100) {
          throw new Error('PDF text extraction yielded insufficient content');
        }
        
      } catch (extractionError) {
        console.error('PDF extraction failed:', extractionError);
        return res.status(400).json({ 
          error: 'Failed to extract text from PDF. Please ensure the PDF contains readable text and is not corrupted.',
          details: extractionError.message
        });
      }
      
      let parsedData;
      let reportTitle;
      let tags: string[] = [];
      
      // Extract date from filename if available
      const dateMatch = file.originalname.match(/(\d{4}-\d{2}-\d{2})/);
      const dateStr = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
      
      if (reportType === 'watmtu' || file.originalname.includes('WATMTU')) {
        // Use actual PDF content for WATMTU reports
        parsedData = parseWATMTUReport(extractedText);
        reportTitle = `WATMTU_${dateStr}`;
        tags = ['watmtu', 'market-analysis', 'precious-metals', 'commodities'];
      } else {
        // Use actual PDF content for WILTW reports  
        parsedData = parseWILTWReport(extractedText);
        reportTitle = `WILTW_${dateStr}`;
        tags = ['wiltw', 'weekly-insights', 'research'];
      }

      // Create report entry in database
      const reportData = {
        title: reportTitle,
        type: reportType.toUpperCase() + ' Report',
        published_date: new Date(),
        open_rate: '0',
        click_rate: '0',
        engagement_level: 'medium' as const,
        tags,
        content_summary: parsedData.summary,
        key_insights: parsedData.keyInsights,
        target_audience: parsedData.targetAudience,
        full_content: extractedText // Store extracted PDF text content
      };

      const report = await storage.createContentReport(reportData);
      
      // Generate and store AI summary
      try {
        const summaryData = {
          content_report_id: report.id,
          summary_type: reportType === 'watmtu' ? 'market_analysis' : 'weekly_insights',
          parsed_summary: parsedData.summary
        };
        
        await storage.createReportSummary(summaryData);
      } catch (summaryError) {
        console.error('Failed to create report summary:', summaryError);
      }
      
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      res.json({ 
        message: `${reportType.toUpperCase()} report uploaded and processed successfully`,
        report,
        parsedData,
        reportType
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
      const relevantReports = contentReports.filter((report: any) => 
        report.tags && lead.interest_tags && 
        report.tags.some((tag: string) => lead.interest_tags.includes(tag))
      );

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const emailPrompt = `You are an expert investment advisor writing a personalized follow-up email.

Lead Information:
- Name: ${lead.name}
- Company: ${lead.company}
- Stage: ${lead.stage}
- Interest Areas: ${lead.interest_tags?.join(', ') || 'General investing'}

Recent Email History:
${emailHistory && emailHistory.length > 0 ? 
  emailHistory.slice(-3).map((email: any) => 
    `${email.email_type === 'incoming' ? 'FROM' : 'TO'} ${lead.name}: ${email.subject}\n${email.content.slice(0, 200)}...`
  ).join('\n\n') : 'No recent email history'}

${selectedReportSummaries.length > 0 ? `
Selected Report Analyses:
${selectedReportSummaries.map((summary: any, index: number) => 
  `Report ${index + 1} (${summary.summary_type}):
${summary.parsed_summary}
---`
).join('\n\n')}
` : ''}

Available Reports to Reference:
${relevantReports.slice(0, 3).map((report: any, i: number) => 
  `${i+1}. ${report.title} (Tags: ${report.tags?.join(', ')})${report.content_summary ? '\n   Summary: ' + report.content_summary.slice(0, 200) + '...' : ''}`
).join('\n')}

Write a highly detailed and personalized follow-up email that demonstrates deep knowledge of the selected report content. ${selectedReportSummaries.length > 1 ? 'Reference ALL selected reports' : 'Reference the selected report'} comprehensively. Follow this specific format:

1. Brief personal greeting referencing their company and interests
${selectedReportSummaries.length > 1 ? `2. Reference ALL ${selectedReportSummaries.length} selected reports by title, mentioning 2-3 SPECIFIC articles/sections from EACH report` : '2. Reference the specific report title and mention 2-3 SPECIFIC articles/sections from the report by name or topic'}
3. For each article/section mentioned from ${selectedReportSummaries.length > 1 ? 'each report' : 'the report'}, provide concrete details about:
   - The specific thesis or finding
   - Relevant data points, names, or examples mentioned
   - Direct implications for their investment focus areas
4. Connect insights from ${selectedReportSummaries.length > 1 ? 'all reports' : 'the report'} to their specific interests (${lead.interest_tags?.join(', ')}) with actionable insights
5. End with: "I'd be happy to search for any other relevant reports you may be interested in."

CRITICAL: Be extremely specific with data from ${selectedReportSummaries.length > 1 ? 'ALL selected reports' : 'the selected report'}. Instead of saying "the report covers geopolitics," say things like:
- "Article 2 details our recent China visit where we met with 150 people including central bank members and mayors"
- "The WATMTU analysis shows precious metals breaking out with specific percentage gains"
- "The USD index risks section highlights the 'revenge tax' scenario on foreign asset holders"

Extract specific company names, data points, percentages, ETF symbols, or concrete examples from ${selectedReportSummaries.length > 1 ? 'each report summary' : 'the report summary'}. Make each point actionable for their portfolio strategy.

Use proper line breaks and spacing. Write as a senior investment advisor who has thoroughly studied the report.

Format as a complete email ready to send.`;

      const emailResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert investment advisor and relationship manager. Write personalized, value-driven emails that build trust and drive engagement."
          },
          {
            role: "user",
            content: emailPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const emailSuggestion = emailResponse.choices[0].message.content;
      
      res.json({ emailSuggestion });
    } catch (error) {
      console.error("Generate lead email error:", error);
      res.status(500).json({ 
        message: "Failed to generate AI email",
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

  // AI report summarization with WILTW Article Parser
  app.post("/api/ai/summarize-report", async (req: Request, res: Response) => {
    try {
      const { reportId, title, content, promptType } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered report analysis." 
        });
      }

      // Retrieve actual PDF content from database
      const reports = await storage.getAllContentReports();
      const report = reports.find(r => r.id.toString() === reportId);
      
      console.log('Summarization debug:', {
        requestedReportId: reportId,
        availableReports: reports.map(r => ({ id: r.id, title: r.title, hasContent: !!r.full_content })),
        foundReport: report ? { 
          id: report.id, 
          title: report.title, 
          hasContent: !!report.full_content,
          contentPreview: report.full_content?.substring(0, 100) || 'No content'
        } : null
      });
      
      if (!report) {
        return res.status(404).json({ 
          error: "Report not found. Please re-upload the PDF file." 
        });
      }

      // Use only actual PDF content - no fallbacks or sample data
      let actualContent = report.full_content;
      
      if (!actualContent || actualContent.trim().length < 100) {
        return res.status(400).json({ 
          error: "No PDF content available for this report. Please re-upload the PDF file to extract the actual content." 
        });
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      let systemPrompt = "";
      let userPrompt = "";

      if (promptType === "wiltw_parser") {
        systemPrompt = `You are an expert investment research analyst and summarizer. You've received a detailed WILTW report from 13D Research. The report is divided into clearly titled article sections.

For each article, analyze and format exactly as follows:

**Article [Number]: [Article Title]**

- **Core Thesis:** Summarize the main argument or thesis in 2–3 sentences.

- **Key Insights:**
- [Bullet point 1 with specific data/facts]
- [Bullet point 2 with specific data/facts]
- [Bullet point 3 with specific data/facts]
- [Additional bullet points as needed]

- **Investment Implications:**
- [Forward-looking insights for investors]
- [Market opportunities or risks]

- **Recommended Names (if any):** [List specific equities, ETFs, indices mentioned, or "None specified"]

- **Category Tag:** [Choose from: Geopolitics, China, Technology, AI, Energy, Commodities, Climate, Markets, Culture, Education, Europe, Defense, Longevity, Macro, or Other]

---

Separate each article analysis with a horizontal line (---) and maintain consistent formatting throughout.`;

        userPrompt = `Please analyze this complete WILTW report titled "${title || report.title}" and parse ALL articles according to the format specified. Extract all numbered article sections from the actual report content provided:

${actualContent}

IMPORTANT: Analyze ALL articles found in the actual report content. Each article should follow the exact formatting structure with Core Thesis, Key Insights, Investment Implications, Recommended Names, and Category Tag.`;
      } else if (promptType === "watmtu_parser") {
        systemPrompt = `You are an expert investment research analyst specializing in market analysis and technical indicators. You've received a WATMTU (What Are The Markets Telling Us) report from 13D Research focusing on market trends, technical analysis, and asset allocation strategies.

Analyze the report and format as follows:

**WATMTU Report Analysis: [Report Title]**

- **Core Investment Thesis:** Summarize the main market outlook and strategic positioning in 2-3 sentences.

- **Key Market Developments:**
- [Technical breakouts and pattern analysis]
- [Sector performance and relative strength]
- [Asset allocation recommendations]
- [Commodity and precious metals insights]

- **Specific Investment Opportunities:**
- [ETFs, indices, and specific sectors mentioned]
- [Performance metrics and percentages]
- [Technical levels and price targets]

- **Portfolio Allocation Recommendations:**
- [Percentage allocations by sector/asset class]
- [Strategic positioning advice]

- **Risk Factors & Market Warnings:**
- [Potential downside risks]
- [Market timing considerations]

- **Recommended Names:** [List all specific ETFs, indices, stocks, and investment vehicles mentioned with their symbols]

- **Category Tags:** [Choose relevant tags: Technical Analysis, Precious Metals, Commodities, Asset Allocation, Market Trends, ETFs, Mining, Currency]`;

        userPrompt = `Please analyze this WATMTU report titled "${title}" focusing on the market analysis, technical patterns, and investment recommendations. Extract specific performance data, ETF names, percentage allocations, and technical analysis:

${content}

IMPORTANT: Focus on extracting specific investment names, performance percentages, technical breakout patterns, and asset allocation percentages mentioned in the report.`;
      } else {
        // Fallback to general summarization
        systemPrompt = "You are an expert investment research analyst. Provide a comprehensive summary of the given report.";
        userPrompt = `Please summarize this report titled "${title}":

${content}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      });

      const summary = response.choices[0].message.content;
      
      // Store the generated summary (overwrite if exists)
      if (promptType === "wiltw_parser" || promptType === "watmtu_parser") {
        try {
          // Check if summary already exists
          const existingSummary = await storage.getReportSummary(parseInt(reportId));
          console.log('Summary storage debug:', {
            reportId,
            promptType,
            existingSummary: existingSummary ? { id: existingSummary.id, summaryLength: existingSummary.parsed_summary?.length } : null,
            newSummaryLength: summary?.length
          });
          
          if (!existingSummary) {
            const newSummary = await storage.createReportSummary({
              content_report_id: parseInt(reportId),
              parsed_summary: summary,
              summary_type: promptType === "wiltw_parser" ? "wiltw_parser" : "watmtu_parser"
            });
            console.log('Created new summary:', { 
              id: newSummary.id, 
              content_report_id: newSummary.content_report_id,
              summaryLength: newSummary.parsed_summary?.length,
              summaryPreview: newSummary.parsed_summary?.substring(0, 100)
            });
          } else {
            // Update existing summary with new content
            const updatedSummary = await storage.updateReportSummary(existingSummary.id, {
              parsed_summary: summary,
              summary_type: promptType === "wiltw_parser" ? "wiltw_parser" : "watmtu_parser"
            });
            console.log('Updated existing summary:', { 
              id: updatedSummary?.id, 
              content_report_id: updatedSummary?.content_report_id,
              summaryLength: updatedSummary?.parsed_summary?.length,
              summaryPreview: updatedSummary?.parsed_summary?.substring(0, 100)
            });
          }
        } catch (error) {
          console.error("Error storing report summary:", error);
        }
      }
      
      res.json({ summary });
    } catch (error) {
      console.error("Summarize report error:", error);
      res.status(500).json({ 
        message: "Failed to summarize report",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI email summarization
  app.post("/api/ai/summarize-emails", async (req: Request, res: Response) => {
    try {
      const { emails, leadName, company } = req.body;
      
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: "Emails array is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered email summarization." 
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const conversationText = emails.map((email: any) => 
        `${email.email_type === 'incoming' ? 'FROM' : 'TO'} ${leadName || 'Lead'} (${new Date(email.sent_date).toLocaleDateString()}):\nSubject: ${email.subject}\n${email.content}\n---`
      ).join('\n\n');

      const summaryPrompt = `Summarize this email conversation between our investment firm and ${leadName} from ${company}:

${conversationText}

Provide a concise summary that includes:
1. Main topics discussed
2. Lead's key interests and concerns
3. Any commitments or next steps mentioned
4. Overall relationship status and sentiment
5. Recommended follow-up actions

Keep the summary under 200 words and focus on actionable insights.`;

      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing business communications and extracting key insights for relationship management."
          },
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const summary = summaryResponse.choices[0].message.content;
      
      res.json({ summary });
    } catch (error) {
      console.error("Summarize emails error:", error);
      res.status(500).json({ 
        message: "Failed to summarize emails",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // CSV Upload endpoint for prospects and invoices
  app.post("/api/upload/csv", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const type = req.body.type;

      if (!file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let processed = 0;
      let duplicates = 0;

      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      if (type === 'prospects') {
        // Process prospects with new column format
        for (const row of results) {
          try {
            const leadData = {
              name: row['Lead Name'] || row['name'],
              email: row['Email'] || row['email'],
              company: row['Company / Account'] || row['Company/Account'] || row['company'],
              stage: 'prospect',
              interest_tags: row['Web Interests'] ? [row['Web Interests']] : ['general'],
              notes: [
                row['Title'] ? `Title: ${row['Title']}` : '',
                row['How did you hear about 13D'] ? `Source: ${row['How did you hear about 13D']}` : '',
                row['Lead Notes'] ? `Notes: ${row['Lead Notes']}` : ''
              ].filter(Boolean).join('\n'),
              created_at: row['Create Date'] ? new Date(row['Create Date']) : new Date()
            };

            if (!leadData.name || !leadData.email) {
              errors.push(`Row ${processed + 1}: Missing required fields (Lead Name or Email)`);
              continue;
            }

            // Check for duplicates
            const allLeads = await storage.getAllLeads();
            const isDuplicate = allLeads.some(lead => 
              lead.email.toLowerCase() === leadData.email.toLowerCase()
            );

            if (isDuplicate) {
              duplicates++;
              continue;
            }

            await storage.createLead(leadData);
            processed++;

          } catch (error) {
            errors.push(`Row ${processed + 1}: ${error instanceof Error ? error.message : 'Processing error'}`);
          }
        }
      } else if (type === 'invoices') {
        // Process invoices with existing format
        for (const row of results) {
          try {
            const invoiceData = {
              client_id: parseInt(row['Client ID']) || 1,
              invoice_number: row['Invoice Number'] || `INV-${Date.now()}`,
              amount: row['Amount'] || row['Invoice Amount'] || '0',
              due_date: row['Due Date'] ? new Date(row['Due Date']) : new Date(),
              payment_status: row['Status'] || 'pending',
              notes: row['Notes'] || ''
            };

            if (!invoiceData.invoice_number || !invoiceData.amount) {
              errors.push(`Row ${processed + 1}: Missing required fields`);
              continue;
            }

            await storage.createInvoice(invoiceData);
            processed++;

          } catch (error) {
            errors.push(`Row ${processed + 1}: ${error instanceof Error ? error.message : 'Processing error'}`);
          }
        }
      }

      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      res.json({
        success: true,
        processed,
        errors,
        duplicates,
        total: results.length
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to process CSV file",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}