import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import PDFParser from "pdf2json";
import path from "path";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GPT-based PDF analysis function
async function analyzeReportWithGPT(extractedText: string, filename: string): Promise<string> {
  try {
    const prompt = `You are an experienced investment research analyst preparing insights for CIOs and Portfolio Managers. Analyze this comprehensive investment report and extract actionable intelligence.

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

REPORT CONTENT:
"""${extractedText}"""

Structure your analysis for investment professionals who need to make portfolio decisions and communicate with clients. Focus on specificity, actionability, and market relevance.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.3
    });

    return response.choices[0].message.content || extractedText;
  } catch (error) {
    console.error('GPT analysis failed:', error);
    // Return the original extracted text if GPT fails
    return extractedText;
  }
}

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
  const lines = content.split('\n');
  const articles = [];
  let isInTableOfContents = false;
  let tocArticles = [];
  
  // First pass: Extract article titles from Table of Contents
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('Table of Contents')) {
      isInTableOfContents = true;
      continue;
    }
    
    if (isInTableOfContents) {
      // Look for numbered sections (01, 02, 03, etc.)
      const articleMatch = line.match(/^(\d{1,2})\s+(.+?)(?:\s+P\.\s*\d+)?$/);
      if (articleMatch && articleMatch[2].length > 15) {
        const articleNum = parseInt(articleMatch[1]);
        const articleTitle = articleMatch[2].trim().replace(/\s+/g, ' ');
        tocArticles.push({ num: articleNum, title: articleTitle });
      }
      
      // End of TOC when we hit main content
      if (line.match(/^\d+\s+STRATEGY & ASSET ALLOCATION/) || tocArticles.length >= 10) {
        isInTableOfContents = false;
        break;
      }
    }
  }
  
  // Second pass: Extract content for each article
  for (const tocArticle of tocArticles.slice(0, 10)) {
    let articleContent = '';
    let foundStart = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for the start of this article's content
      if (line.match(new RegExp(`^${tocArticle.num}\\s+`)) && line.includes(tocArticle.title.substring(0, 20))) {
        foundStart = true;
        continue;
      }
      
      // Collect content after finding the start
      if (foundStart && line.length > 30 && 
          !line.includes('WHAT I LEARNED THIS WEEK') &&
          !line.includes('Confidential for') &&
          !line.includes('13D RESEARCH') &&
          !line.match(/^\d+\s+OF\s+\d+/) &&
          !line.includes('PRINT ONCE')) {
        
        articleContent += line + ' ';
        
        // Stop at next numbered section or after sufficient content
        if (articleContent.length > 500 || 
            (articleContent.length > 200 && line.match(/^\d+\s+[A-Z]/) && !line.includes(tocArticle.title))) {
          break;
        }
      }
    }
    
    if (articleContent.length > 100) {
      articles.push({
        title: tocArticle.title,
        content: articleContent.trim().substring(0, 800)
      });
    }
  }
  
  return {
    articles,
    summary: `WILTW report analyzing ${articles.length} key investment themes from actual PDF content`,
    keyInsights: articles.map(a => `- **${a.title}**: ${a.content.substring(0, 150)}...`),
    investmentThemes: articles.slice(0, 5).map(a => a.title),
    targetAudience: 'Investment professionals and portfolio managers'
  };
}

function formatWILTWArticles(extractedText: string, reportDate: string): string {
  console.log('Preserving full PDF content for analysis:', {
    originalLength: extractedText.length,
    reportDate
  });
  
  // Return the complete extracted text to preserve all content for AI analysis
  // This ensures the full 2,560-line document is available for processing
  return extractedText;
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
  storage: multer.memoryStorage(),
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

      console.log('File upload debug:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hasBuffer: !!file.buffer,
        bufferLength: file.buffer?.length
      });

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
            const pdfParser = new (PDFParser as any)(null, true);
            
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
                    fullText += '\n\n'; // Page break
                  }
                }
                
                // Clean up the text
                fullText = fullText
                  .replace(/\s+/g, ' ')
                  .replace(/\n\s*\n/g, '\n\n')
                  .trim();
                
                resolve(fullText);
              } catch (parseError) {
                reject(new Error(`Text extraction error: ${parseError.message}`));
              }
            });
            
            // Parse the PDF buffer
            pdfParser.parseBuffer(file.buffer);
          });
          
          console.log('PDF text extraction successful:', {
            filename: pdfFilename,
            extractedLength: extractedText.length,
            preview: extractedText.substring(0, 300)
          });
          
        } catch (error) {
          console.error('PDF text extraction error:', error);
          throw new Error(`Failed to extract PDF content: ${error.message}`);
        }
        
        // Only use real extracted PDF text - no fallback content
        if (extractedText.length < 1000) {
          throw new Error('PDF extraction failed - extracted text is too short. Please ensure the PDF contains readable text.');
        }
        
        console.log('Raw PDF extraction:', {
          length: extractedText.length,
          preview: extractedText.substring(0, 300)
        });
        
        // Store the complete original PDF content without any processing
        console.log('Storing complete original PDF content:', extractedText.length, 'characters');
        
        console.log('PDF processing successful:', {
          filename: file.originalname,
          extractedLength: extractedText.length,
          fileSize: file.buffer.length
        });
        
      } catch (extractionError) {
        console.error('PDF processing failed:', extractionError);
        return res.status(400).json({ 
          error: 'Failed to process PDF file',
          details: String(extractionError)
        });
      }
      
      // Extract date from filename if available
      const dateMatch = file.originalname.match(/(\d{4}-\d{2}-\d{2})/);
      const dateStr = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
      
      let reportTitle;
      let tags: string[] = [];
      
      if (reportType === 'watmtu' || file.originalname.includes('WATMTU')) {
        reportTitle = `WATMTU_${dateStr}`;
        tags = ['watmtu', 'market-analysis', 'precious-metals', 'commodities'];
      } else {
        reportTitle = `WILTW_${dateStr}`;
        tags = ['wiltw', 'weekly-insights', 'research'];
      }

      // Create report entry in database with only raw PDF content
      const reportData = {
        title: reportTitle,
        type: reportType.toUpperCase() + ' Report',
        published_date: new Date(),
        open_rate: '0',
        click_rate: '0',
        engagement_level: 'medium' as const,
        tags,
        content_summary: '', // Empty - summary only generated when parsing
        key_insights: [], // Empty - insights only generated when parsing
        target_audience: 'Investment Professionals',
        full_content: extractedText // Store complete original extracted PDF text
      };

      const report = await storage.createContentReport(reportData);
      
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      res.json({ 
        message: `${reportType.toUpperCase()} report uploaded successfully`,
        report: {
          id: report.id,
          title: report.title,
          type: report.type,
          contentLength: extractedText.length
        },
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
      const relevantReports = (contentReports || []).filter((report: any) => 
        report.tags && lead.interest_tags && 
        report.tags.some((tag: string) => lead.interest_tags.includes(tag))
      );

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Prepare report content for the prompt
      const primaryReport = selectedReportSummaries.length > 0 ? selectedReportSummaries[0] : null;
      
      // Get the actual content report data
      let reportTitle = 'Recent 13D Report';
      let reportTags = '';
      let reportArticles = [];
      if (primaryReport) {
        // Get the content report from database if not provided
        let contentReport = null;
        if (contentReports && contentReports.length > 0) {
          contentReport = contentReports.find((report: any) => report.id === primaryReport.content_report_id);
        } else {
          // Fetch from database if not provided
          const allReports = await storage.getAllContentReports();
          contentReport = allReports.find(report => report.id === primaryReport.content_report_id);
        }
        
        reportTitle = contentReport?.title || 'Recent 13D Report';
        reportTags = contentReport?.tags?.join(', ') || '';
        
        // Extract article information from the full content for WILTW reports
        if (contentReport && contentReport.full_content && reportTitle.includes('WILTW')) {
          const parsedData = parseWILTWReport(contentReport.full_content);
          reportArticles = parsedData.articles || [];
        }
      }
      
      const reportSummary = primaryReport ? primaryReport.parsed_summary : '';

      // Extract non-market topics from article content
      let nonMarketTopics = '';
      
      if (reportArticles.length > 0) {
        // Extract non-market topics from article titles
        const nonMarketArticles = reportArticles.filter((article: any) => {
          const title = article.title.toLowerCase();
          return title.includes('culture') || title.includes('values') || title.includes('philosophy') || 
                 title.includes('leadership') || title.includes('education') || title.includes('history') ||
                 title.includes('book') || title.includes('life') || title.includes('wisdom') ||
                 title.includes('personal') || title.includes('character') || title.includes('principle') ||
                 title.includes('lesson') || title.includes('story') || title.includes('human') ||
                 title.includes('society') || title.includes('ethics') || title.includes('moral') ||
                 title.includes('teenager') || title.includes('phone') || title.includes('school') ||
                 title.includes('aesop') || title.includes('fable') || title.includes('sustainable') ||
                 title.includes('remote') || title.includes('loneliness') || title.includes('enduring');
        });

        if (nonMarketArticles.length > 0) {
          const topics = nonMarketArticles.map((article: any) => {
            const title = article.title.toLowerCase();
            if (title.includes('teenager') || title.includes('phone') || title.includes('sustainable')) return 'digital wellness and sustainable living';
            if (title.includes('aesop') || title.includes('fable') || title.includes('wisdom')) return 'timeless wisdom and moral lessons';
            if (title.includes('loneliness') || title.includes('human')) return 'social connection and human nature';
            if (title.includes('culture') || title.includes('values')) return 'cultural insights';
            if (title.includes('philosophy') || title.includes('enduring')) return 'philosophical perspectives';
            if (title.includes('leadership') || title.includes('character')) return 'leadership principles';
            if (title.includes('education') || title.includes('lesson')) return 'educational themes';
            if (title.includes('book') || title.includes('story')) return 'literary analysis';
            if (title.includes('history')) return 'historical context';
            return 'life wisdom';
          });
          
          const uniqueTopics = Array.from(new Set(topics));
          nonMarketTopics = `The report also explores ${uniqueTopics.slice(0, 2).join(' and ')} to provide readers with perspective beyond the financial world.`;
        }
      }

      const emailPrompt = `Generate a personalized, concise prospect email for ${lead.name} at ${lead.company}. This is a ${lead.stage} stage lead with interests in: ${lead.interest_tags?.join(', ') || 'investment research'}.

${primaryReport ? `Reference the recent 13D report titled "${reportTitle}" with the following content: "${reportSummary}". The report covers: ${reportTags}.` : ''}

GOALS:
• Greet the reader warmly with a short intro
• Acknowledge their stated investment interests (from ${lead.interest_tags?.join(', ') || 'general investment research'}${lead.notes ? ` or Notes: ${lead.notes}` : ''} if applicable)
• Explain why this specific report is relevant to their strategy
• Summarize 2–3 high-impact insights using concise bullets
• End with a conclusion summarizing 13D's market view and how our research helps investors stay ahead
• Include a clear CTA (e.g., invite to review the full report, book a call)

HARD RULES:
• TOTAL word count must not exceed **280 words**
• Use **friendly but professional tone**
• Paragraph format is fine, but use bullets for the insights section
• DO NOT use phrases like "Article 1," "titled," or "the report outlines"
• Include a short paragraph (~30 words) about non-market topics from the report${nonMarketTopics ? `: "${nonMarketTopics}"` : ' — such as culture, values, or timeless ideas — to provide readers with perspective beyond the financial world'}

STRUCTURE TO FOLLOW:

---

**Subject**: [Natural, conversational subject line – max 8 words]

Hi ${lead.name},

[Natural greeting with seasonal/personal touch] I was going through one of our latest reports and [conversational transition about why this matters to them based on their interests].

[Present insights in a flowing, conversational way - mix of bullets and natural sentences]

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
• Weave insights naturally into conversation rather than rigid bullet format
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

• Gold miners are outperforming major U.S. indices, reflecting rising inflation expectations and growing demand for hard asset hedges. (Article 2 in WILTW)
• The U.S. dollar's downtrend is driving increased interest in commodities as a diversification tool. (Article 3 in WILTW)
• China's domestic pivot and global partnerships are reinforcing economic resilience — a compelling case for exposure to Chinese equities. (Article 5 in WILTW)

We're seeing a broad rotation into hard assets and geopolitically resilient markets. At 13D, our research is designed to help investors like you get ahead of these structural shifts before they become consensus.

Let me know if you would like me to pull some older reports on specific topics of interest.

Spencer`;

      const emailResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Spencer from 13D Research writing a personal email to a colleague. Write in a natural, conversational tone like you're genuinely sharing interesting insights you just discovered. Use casual language, varied sentence structure, and natural transitions. Include seasonal greetings, conversational phrases like 'I was going through' or 'thought you might find this interesting'. Present insights in a flowing conversation rather than rigid bullets. End casually with helpful offers. NO source citations or parenthetical references. Maximum 280 words."
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
      
      console.log('Content retrieval debug:', {
        hasContent: !!actualContent,
        contentLength: actualContent?.length || 0,
        contentType: typeof actualContent,
        firstChars: actualContent?.substring(0, 200) || 'No content'
      });
      
      if (!actualContent || actualContent.trim().length < 100) {
        return res.status(400).json({ 
          error: "No PDF content available for this report. Please re-upload the PDF file to extract the actual content." 
        });
      }

      // Optimize content for AI processing - chunk large content
      if (actualContent.length > 50000) {
        // Take meaningful chunks from the content for analysis
        const chunks = [];
        const chunkSize = 15000;
        
        // Get the beginning (usually contains executive summary)
        chunks.push(actualContent.substring(0, chunkSize));
        
        // Get middle sections
        const midPoint = Math.floor(actualContent.length / 2);
        chunks.push(actualContent.substring(midPoint, midPoint + chunkSize));
        
        // Get the end (usually contains conclusions)
        chunks.push(actualContent.substring(actualContent.length - chunkSize));
        
        actualContent = chunks.join('\n\n--- SECTION BREAK ---\n\n');
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      let systemPrompt = "";
      let userPrompt = "";

      if (promptType === "wiltw_parser") {
        systemPrompt = `You are an expert investment research analyst and summarizer. You've received a detailed WILTW report from 13D Research dated ${title || report.title}. The report is divided into multiple clearly titled article sections.

For each article, do the following:

Headline: Identify and restate the article's title.

Core Thesis: Summarize the main argument or thesis in 2–3 sentences.

Key Insights: Bullet the top 3–5 data points, quotes, or arguments that support the thesis.

Investment Implications: If applicable, list any forward-looking insights or themes that investors should pay attention to.

Recommended Names (if any): List any specific equities, ETFs, or indices mentioned.

Category Tag: Assign a category from this list — Geopolitics, China, Technology, AI, Energy, Commodities, Climate, Markets, Culture, Education, Europe, Defense, Longevity, Macro, or Other.

Return the results in a structured format, clearly separating each article.`;

        userPrompt = `Please analyze this complete WILTW report titled "${title || report.title}" and parse ALL articles according to the format specified. Extract all numbered article sections from the actual report content provided:

${actualContent}

IMPORTANT: Analyze ALL articles found in the actual report content. Each article should follow the exact formatting structure with Headline, Core Thesis, Key Insights, Investment Implications, Recommended Names, and Category Tag.`;
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

        userPrompt = `Please analyze this WATMTU report titled "${title || report.title}" focusing on the market analysis, technical patterns, and investment recommendations. Extract specific performance data, ETF names, percentage allocations, and technical analysis:

${actualContent}

IMPORTANT: Focus on extracting specific investment names, performance percentages, technical breakout patterns, and asset allocation percentages mentioned in the report.`;
      } else {
        // Use enhanced investment research analysis
        systemPrompt = `You are an experienced investment research analyst preparing insights for CIOs and Portfolio Managers. Analyze this comprehensive investment report and extract actionable intelligence.

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
        
        userPrompt = `Please analyze this investment research report titled "${title}" and provide comprehensive insights for investment professionals:

${content}

Extract all specific investment themes, opportunities, risks, and actionable insights from the actual report content.`;
      }

      console.log('OpenAI request debug:', {
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        contentIncluded: userPrompt.includes('WATMTU Market Analysis'),
        promptPreview: userPrompt.substring(0, 300)
      });

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