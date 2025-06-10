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

// WILTW Report Parser
function parseWILTWReport(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  
  const keyInsights = [];
  const investmentThemes = [];
  let summary = '';
  
  let insightBuffer = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip headers and page numbers
    if (trimmed.includes('WHAT I LEARNED THIS WEEK') || 
        trimmed.includes('13D RESEARCH') ||
        trimmed.match(/^\d+\s+OF\s+\d+/)) {
      continue;
    }
    
    // Extract investment themes
    if (trimmed.includes('conviction') || 
        trimmed.includes('investment') || 
        trimmed.includes('opportunity')) {
      investmentThemes.push(trimmed);
    }
    
    // Build insights from substantial content
    if (trimmed.length > 20) {
      insightBuffer += ' ' + trimmed;
      if (insightBuffer.length > 200) {
        keyInsights.push(insightBuffer.trim());
        insightBuffer = '';
      }
    }
  }
  
  // Add final insight
  if (insightBuffer.trim()) {
    keyInsights.push(insightBuffer.trim());
  }
  
  // Generate summary
  summary = keyInsights.slice(0, 2).join(' ').substring(0, 500);
  
  return {
    summary,
    keyInsights: keyInsights.slice(0, 5),
    investmentThemes: investmentThemes.slice(0, 3),
    targetAudience: 'Investment professionals and portfolio managers',
    marketOutlook: 'Research-focused',
    riskFactors: ['Market volatility', 'Economic uncertainty']
  };
}

// WATMTU Report Parser - Specialized for market analysis
function parseWATMTUReport(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  
  const keyInsights = [];
  const investmentThemes = [];
  const marketAnalysis = [];
  const performanceData = [];
  let summary = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip headers and confidential notices
    if (trimmed.includes('WHAT ARE THE MARKETS TELLING US') || 
        trimmed.includes('Confidential for') ||
        trimmed.includes('13D RESEARCH') ||
        trimmed.match(/^\d+\s+OF\s+\d+/)) {
      continue;
    }
    
    // Extract performance metrics
    if (trimmed.match(/\+?\d+\.\d+%/) || trimmed.includes('gained') || trimmed.includes('outperforming')) {
      performanceData.push(trimmed);
    }
    
    // Extract precious metals and commodities insights
    if (trimmed.includes('gold') || trimmed.includes('silver') || 
        trimmed.includes('copper') || trimmed.includes('platinum') ||
        trimmed.includes('mining') || trimmed.includes('commodity')) {
      keyInsights.push(trimmed);
    }
    
    // Extract market trends and analysis
    if (trimmed.includes('breakout') || trimmed.includes('uptrend') || 
        trimmed.includes('bull market') || trimmed.includes('trend')) {
      marketAnalysis.push(trimmed);
    }
    
    // Extract investment allocation themes
    if (trimmed.includes('conviction') || trimmed.includes('allocation') || 
        trimmed.includes('portfolio') || trimmed.includes('strategy')) {
      investmentThemes.push(trimmed);
    }
  }
  
  // Combine insights
  const allInsights = [...keyInsights, ...marketAnalysis].slice(0, 8);
  
  // Generate WATMTU-specific summary
  summary = `Market analysis focusing on precious metals and commodities. Performance highlights include strong gains in silver and gold mining stocks with breakouts in key technical levels.`;
  
  return {
    summary,
    keyInsights: allInsights,
    investmentThemes: investmentThemes.slice(0, 4),
    targetAudience: 'Commodity investors and precious metals specialists',
    marketOutlook: 'Precious metals bullish',
    riskFactors: ['Commodity price volatility', 'Dollar strength', 'Economic policy changes'],
    performanceData: performanceData.slice(0, 5),
    marketAnalysis: marketAnalysis.slice(0, 5)
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

  // Enhanced PDF upload endpoint with specialized parsing
  app.post("/api/upload-pdf", upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const reportType = req.body.reportType || 'wiltw';
      
      if (!file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // Parse PDF content
      const pdfBuffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(pdfBuffer);
      const content = pdfData.text;

      // Determine report type and parse accordingly
      let parsedData;
      let reportTitle;
      let tags: string[] = [];
      
      if (reportType === 'watmtu' || file.originalname.includes('WATMTU')) {
        parsedData = parseWATMTUReport(content);
        reportTitle = `WATMTU_${new Date().toISOString().split('T')[0]}`;
        tags = ['watmtu', 'market-analysis', 'precious-metals', 'commodities'];
      } else {
        parsedData = parseWILTWReport(content);
        reportTitle = `WILTW_${new Date().toISOString().split('T')[0]}`;
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
        full_content: content.substring(0, 10000) // Store first 10k chars
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
      const { lead, emailHistory, contentReports, selectedReportId } = req.body;
      
      if (!lead) {
        return res.status(400).json({ error: "Lead data is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered email generation." 
        });
      }

      // Get stored summary if a specific report is selected
      let selectedReportSummary = null;
      if (selectedReportId) {
        selectedReportSummary = await storage.getReportSummary(selectedReportId);
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

${selectedReportSummary ? `
Featured Report Analysis:
${selectedReportSummary.parsed_summary}
` : ''}

Available Reports to Reference:
${relevantReports.slice(0, 3).map((report: any, i: number) => 
  `${i+1}. ${report.title} (Tags: ${report.tags?.join(', ')})${report.content_summary ? '\n   Summary: ' + report.content_summary.slice(0, 200) + '...' : ''}`
).join('\n')}

Write a personalized follow-up email that follows this specific format:

1. Brief personal greeting
2. Report reference with title and key highlights from the summary
3. Explain how the report would be helpful for their company and investing style based on their interests
4. End with: "I'd be happy to search for any other relevant reports you may be interested in."

Use proper line breaks and spacing for readability. Reference specific content from the report summaries when available. Make it personal and valuable.

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

        userPrompt = `Please analyze this complete WILTW report titled "${title}" and parse ALL articles (1-10) according to the format specified. Make sure to process the entire document and provide analysis for every numbered article section:

${content}

IMPORTANT: Analyze ALL 10 articles in the report. Do not stop at article 5 - continue through articles 6, 7, 8, 9, and 10. Each article should follow the exact formatting structure with Core Thesis, Key Insights, Investment Implications, Recommended Names, and Category Tag.`;
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
      
      // Store the generated summary
      if (promptType === "wiltw_parser") {
        try {
          // Check if summary already exists
          const existingSummary = await storage.getReportSummary(reportId);
          if (!existingSummary) {
            await storage.createReportSummary({
              content_report_id: reportId,
              parsed_summary: summary,
              summary_type: "wiltw_parser"
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