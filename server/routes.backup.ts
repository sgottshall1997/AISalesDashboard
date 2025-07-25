import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import cookieParser from "cookie-parser";

// Extend session type
declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import PDFParser from "pdf2json";
import path from "path";
import { Readable } from "stream";
import { insertTaskSchema } from "@shared/schema";

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

// WILTW Report Parser - Enhanced to capture ALL numbered articles with consistent formatting
function parseWILTWReport(content: string) {
  console.log('Starting enhanced WILTW parsing, content length:', content.length);
  
  const articles = [];
  const insights = [];
  const themes = [];
  
  // First, extract the table of contents to identify all article numbers and titles
  const tocMatch = content.match(/Table of Contents([\s\S]*?)(?:Confidential|Back to ToC|STRATEGY & ASSET)/i);
  const tocEntries = [];
  
  if (tocMatch) {
    const tocContent = tocMatch[1];
    // Look for numbered entries (01, 02, 03, etc.) with descriptions
    const tocPattern = /(\d{2})\s+(.*?)(?=\d{2}\s+|$)/g;
    let match;
    
    while ((match = tocPattern.exec(tocContent)) !== null) {
      const articleNum = match[1];
      const title = match[2].replace(/P\.\s*\d+.*$/, '').trim();
      if (title.length > 10) {
        tocEntries.push({
          number: articleNum,
          title: title.replace(/\s+/g, ' ').trim()
        });
      }
    }
  }
  
  console.log('Found TOC entries:', tocEntries.length);
  
  // Now extract the actual content for each numbered article
  for (const tocEntry of tocEntries) {
    const articleNum = tocEntry.number;
    
    // Look for the article content using multiple patterns
    const patterns = [
      // Pattern 1: Article number followed by title and content
      new RegExp(`${articleNum}\\s+([\\s\\S]*?)(?=\\d{2}\\s+|Back to ToC|Confidential for|$)`, 'i'),
      // Pattern 2: Article content after a section break
      new RegExp(`Back to ToC[\\s\\S]*?${tocEntry.title.substring(0, 30)}[\\s\\S]*?([\\s\\S]*?)(?=Back to ToC|Confidential for|\\d{2}\\s+|$)`, 'i'),
      // Pattern 3: Look for the title anywhere in the document
      new RegExp(`${tocEntry.title.substring(0, 50)}[\\s\\S]*?([\\s\\S]{200,2000})(?=Back to ToC|Confidential for|\\d{2}\\s+|$)`, 'i')
    ];
    
    let articleContent = '';
    let fullTitle = tocEntry.title;
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 100) {
        articleContent = match[1].trim();
        break;
      }
    }
    
    // If we found content, clean it up and add it
    if (articleContent && articleContent.length > 100) {
      // Clean up the content
      const cleanedContent = articleContent
        .replace(/Confidential for.*$/gm, '')
        .replace(/\d+\s+OF\s+\d+/g, '')
        .replace(/13D RESEARCH.*$/gm, '')
        .replace(/PRINT ONCE.*$/gm, '')
        .replace(/Back to ToC/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract the first substantial paragraph as summary
      const paragraphs = cleanedContent.split(/\n\s*\n|\.\s{2,}/);
      const substantialParagraphs = paragraphs.filter(p => p.trim().length > 50);
      const summary = substantialParagraphs.slice(0, 3).join(' ').substring(0, 800);
      
      articles.push({
        number: parseInt(articleNum),
        title: fullTitle,
        content: summary,
        fullContent: cleanedContent.substring(0, 2000) // Keep more content for analysis
      });
      
      // Extract themes from the title
      themes.push(fullTitle);
      
      // Extract key insights from the content
      const sentences = cleanedContent.split(/[.!?]+/).filter(s => s.trim().length > 40);
      for (const sentence of sentences.slice(0, 2)) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 60 && cleanSentence.length < 250) {
          insights.push(cleanSentence + '.');
        }
      }
    }
  }
  
  // If we didn't find numbered articles, fall back to section-based parsing
  if (articles.length === 0) {
    console.log('No numbered articles found, using fallback parsing...');
    
    // Split by common section markers
    const sections = content.split(/(?:Back to ToC|Confidential for)/);
    
    for (const section of sections) {
      if (section.trim().length < 200) continue;
      
      const lines = section.split('\n').filter(line => line.trim().length > 0);
      if (lines.length < 3) continue;
      
      // Look for potential title (first substantial line)
      const potentialTitle = lines.find(line => 
        line.trim().length > 20 && 
        line.trim().length < 200 &&
        !line.includes('RESEARCH') &&
        !line.includes('PRINT ONCE')
      );
      
      if (potentialTitle) {
        const remainingContent = section.substring(section.indexOf(potentialTitle) + potentialTitle.length);
        if (remainingContent.trim().length > 200) {
          articles.push({
            number: articles.length + 1,
            title: potentialTitle.trim(),
            content: remainingContent.trim().substring(0, 800),
            fullContent: remainingContent.trim().substring(0, 2000)
          });
          
          themes.push(potentialTitle.trim());
        }
      }
    }
  }
  
  // Sort articles by number
  articles.sort((a, b) => a.number - b.number);
  
  console.log('Enhanced WILTW parsing results:', {
    articlesFound: articles.length,
    insightsFound: insights.length,
    themesFound: themes.length,
    articleTitles: articles.map(a => `${a.number}: ${a.title.substring(0, 50)}...`)
  });
  
  return {
    articles: articles,
    summary: `WILTW report containing ${articles.length} detailed investment articles covering market analysis, sector insights, and strategic recommendations`,
    keyInsights: insights.slice(0, 12),
    investmentThemes: themes.slice(0, 10),
    targetAudience: 'Investment professionals and portfolio managers',
    articleCount: articles.length,
    structuredContent: articles.map(article => ({
      articleNumber: article.number,
      title: article.title,
      summary: article.content,
      keyPoints: article.fullContent.split(/[.!?]+/).filter(s => s.trim().length > 50).slice(0, 3)
    }))
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

// Helper function to process a single PDF file
async function processSinglePdf(file: Express.Multer.File, reportType: string) {
  // Extract text content from uploaded PDF buffer
  let extractedText = '';
  
  try {
    // Check if buffer exists
    if (!file.buffer) {
      throw new Error('File buffer is not available - multer may not be configured correctly');
    }
    
    // Extract actual PDF content using pdf2json library
    const pdfFilename = file.originalname;
    
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
        } catch (extractError) {
          reject(new Error(`Error extracting text from PDF: ${extractError}`));
        }
      });
      
      // Parse the PDF buffer
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

  // Determine parser type and parse content
  let parsedContent: any;
  let reportTitle = file.originalname.replace('.pdf', '');
  
  if (reportType === 'watmtu') {
    parsedContent = parseWATMTUReport(extractedText);
    reportTitle = `WATMTU Report - ${new Date().toISOString().split('T')[0]}`;
  } else {
    parsedContent = parseWILTWReport(extractedText);
    reportTitle = `WILTW Report - ${new Date().toISOString().split('T')[0]}`;
  }

  // Store in database
  const reportData = {
    title: reportTitle,
    type: reportType.toUpperCase(),
    source_type: 'uploaded_pdf',
    published_date: new Date(),
    content_summary: parsedContent.summary || '',
    engagement_level: 'medium',
    tags: parsedContent.tags || [],
    full_content: extractedText,
    open_rate: null,
    click_rate: null,
    article_summaries: parsedContent.articles || [],
    key_themes: parsedContent.themes || [],
    sentiment_analysis: parsedContent.sentiment || null,
    reading_time_minutes: Math.ceil(extractedText.length / 1000), // Rough estimate
  };

  const createdReport = await storage.createContentReport(reportData);
  
  return {
    reportId: createdReport.id,
    title: reportTitle,
    type: reportType,
    summary: parsedContent.summary
  };
}

// Simple password for demo purposes - in production, use environment variables
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "spence";

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: any) => {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication routes
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { password } = req.body;
    
    if (password === DASHBOARD_PASSWORD) {
      req.session.authenticated = true;
      res.json({ authenticated: true, success: true, message: "Authenticated successfully" });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  app.get("/api/auth/status", (req: Request, res: Response) => {
    if (req.session?.authenticated) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ success: false, message: "Could not log out" });
      } else {
        res.json({ success: true, message: "Logged out successfully" });
      }
    });
  });

  // Protected routes - Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Dashboard overview with stats and priority actions
  app.get("/api/dashboard/overview", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      const overview = {
        stats,
        recentActivity: [], // Empty array since we replaced this section
        priorityActions: [
          {
            type: "urgent",
            title: "Overdue Invoice",
            description: "Acme Corp - $15,000 (20 days overdue)",
            action: "Send Reminder"
          },
          {
            type: "warning", 
            title: "Renewal Due Soon",
            description: "Beta Fund - Expires in 15 days",
            action: "Draft Follow-up"
          },
          {
            type: "info",
            title: "Hot Lead",
            description: "Jane Doe (ABC Capital) - Schedule discovery call",
            action: "Schedule Call"
          }
        ]
      };
      
      res.json(overview);
    } catch (error) {
      console.error("Dashboard overview error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard overview" });
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
  app.post("/api/upload-pdf", upload.array('pdf', 10), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const singleFile = req.file;
      const reportType = req.body.reportType || 'wiltw';
      const parserType = req.body.parserType || 'auto_detect';
      
      // Handle both single and multiple file uploads
      const filesToProcess = files && files.length > 0 ? files : (singleFile ? [singleFile] : []);
      
      if (filesToProcess.length === 0) {
        return res.status(400).json({ error: 'No PDF files uploaded' });
      }

      // If multiple files, return batch processing response
      if (filesToProcess.length > 1) {
        const results = [];
        const errors = [];

        for (const file of filesToProcess) {
          try {
            // Auto-detect parser type based on filename
            const currentFileType = file.originalname.toLowerCase().includes('watmtu') ? 'watmtu' : 'wiltw';
            
            console.log('Processing file:', {
              filename: file.originalname,
              detectedType: currentFileType,
              size: file.size
            });

            // Process the PDF inline for batch upload
            let extractedText = '';
            
            // Extract text content from uploaded PDF buffer
            if (!file.buffer) {
              throw new Error('File buffer is not available');
            }
            
            // Extract text using pdf2json library
            extractedText = await new Promise<string>((resolve, reject) => {
              const pdfParser = new (PDFParser as any)(null, true);
              
              pdfParser.on("pdfParser_dataError", (errData: any) => {
                reject(new Error(`PDF parsing error: ${errData.parserError}`));
              });
              
              pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                try {
                  let fullText = '';
                  
                  if (pdfData.Pages) {
                    for (const page of pdfData.Pages) {
                      if (page.Texts) {
                        for (const text of page.Texts) {
                          if (text.R) {
                            for (const run of text.R) {
                              if (run.T) {
                                fullText += decodeURIComponent(run.T) + ' ';
                              }
                            }
                          }
                        }
                      }
                      fullText += '\n\n';
                    }
                  }
                  
                  fullText = fullText.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
                  resolve(fullText);
                } catch (extractError) {
                  reject(new Error(`Error extracting text from PDF: ${extractError}`));
                }
              });
              
              pdfParser.parseBuffer(file.buffer);
            });

            // Parse content based on type
            let parsedContent: any;
            let reportTitle = file.originalname.replace('.pdf', '');
            
            if (currentFileType === 'watmtu') {
              parsedContent = parseWATMTUReport(extractedText);
              reportTitle = `WATMTU_${reportTitle.split('_').slice(-1)[0] || new Date().toISOString().split('T')[0]}`;
            } else {
              parsedContent = parseWILTWReport(extractedText);
              reportTitle = `WILTW_${reportTitle.split('_').slice(-1)[0] || new Date().toISOString().split('T')[0]}`;
            }

            // Check for existing report with same title to prevent duplicates
            const existingReports = await storage.getAllContentReports();
            const existingReport = existingReports.find(report => report.title === reportTitle);
            
            if (existingReport) {
              results.push({
                filename: file.originalname,
                type: currentFileType,
                success: true,
                reportId: existingReport.id,
                message: 'Report already exists - using existing version'
              });
              continue;
            }

            // Store in database
            const reportData = {
              title: reportTitle,
              type: currentFileType.toUpperCase(),
              source_type: 'uploaded_pdf',
              published_date: new Date(),
              content_summary: parsedContent.summary || '',
              engagement_level: 'medium',
              tags: parsedContent.tags || [],
              full_content: extractedText,
              open_rate: null,
              click_rate: null,
              article_summaries: parsedContent.articles || [],
              key_themes: parsedContent.themes || [],
              sentiment_analysis: parsedContent.sentiment || null,
              reading_time_minutes: Math.ceil(extractedText.length / 1000),
            };

            const createdReport = await storage.createContentReport(reportData);
            const processedData = {
              reportId: createdReport.id,
              title: reportTitle,
              type: currentFileType,
              summary: parsedContent.summary
            };
            results.push({
              filename: file.originalname,
              type: currentFileType,
              success: true,
              reportId: processedData.reportId
            });
          } catch (error) {
            console.error(`Error processing ${file.originalname}:`, error);
            errors.push({
              filename: file.originalname,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        return res.json({
          success: true,
          results,
          errors,
          successCount: results.length,
          errorCount: errors.length,
          message: `Processed ${results.length} files successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
        });
      }

      // Single file processing
      const file = filesToProcess[0];
      const detectedType = file.originalname.toLowerCase().includes('watmtu') ? 'watmtu' : 'wiltw';
      
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

      // Check for existing report with same title to prevent duplicates
      const existingReports = await storage.getAllContentReports();
      const existingReport = existingReports.find(report => report.title === reportTitle);
      
      if (existingReport) {
        return res.json({
          success: true,
          message: 'Report already exists - using existing version',
          report: {
            id: existingReport.id,
            title: existingReport.title,
            type: reportType,
            contentLength: existingReport.full_content?.length || 0,
            parsed: false
          },
          reportType,
          parserUsed: parserType,
          parseSuccess: false
        });
      }

      // Create report entry in database with only raw PDF content
      const reportData = {
        title: reportTitle,
        type: reportType.toUpperCase() + ' Report',
        source_type: 'uploaded_pdf',
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
      
      // Automatically parse the uploaded PDF using the appropriate parser
      let parsedSummary = '';
      let parseSuccess = false;
      
      try {
        console.log(`Attempting to parse with ${parserType} for file: ${file.originalname}`);
        
        if (parserType === 'watmtu_parser') {
          console.log('Using WATMTU parser...');
          const parsedData = parseWATMTUReport(extractedText);
          parsedSummary = JSON.stringify(parsedData, null, 2);
          console.log('WATMTU parsing successful, length:', parsedSummary.length);
        } else {
          console.log('Using WILTW parser...');
          // Use WILTW parser
          const reportDate = dateStr; // Use the extracted date
          console.log('Formatting WILTW content with date:', reportDate);
          const formattedContent = formatWILTWArticles(extractedText, reportDate);
          console.log('Formatted content length:', formattedContent.length);
          
          const parsedData = parseWILTWReport(formattedContent);
          parsedSummary = JSON.stringify(parsedData, null, 2);
          console.log('WILTW parsing successful, length:', parsedSummary.length);
        }
        
        if (parsedSummary && parsedSummary.length > 100) {
          // Store the parsed summary
          const summaryData = {
            title: `Parsed Summary - ${reportTitle}`,
            type: reportType.toUpperCase() + ' Summary',
            source_type: 'parsed_summary',
            published_date: new Date(),
            open_rate: '0',
            click_rate: '0', 
            engagement_level: 'medium' as const,
            tags: [...tags, 'parsed-summary'],
            content_summary: parsedSummary,
            key_insights: [],
            target_audience: 'Investment Professionals',
            full_content: parsedSummary
          };
          
          const summaryReport = await storage.createContentReport(summaryData);
          console.log('Parsed summary stored successfully with ID:', summaryReport.id);
          parseSuccess = true;
        } else {
          console.error('Parsing produced empty or invalid result');
        }
        
      } catch (parseError) {
        console.error('Auto-parsing failed:', parseError);
        console.error('Parser type:', parserType);
        console.error('File name:', file.originalname);
        console.error('Extracted text length:', extractedText.length);
        console.error('Error details:', parseError instanceof Error ? parseError.message : String(parseError));
      }
      
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      res.json({ 
        message: parseSuccess 
          ? `${reportType.toUpperCase()} report uploaded and parsed successfully`
          : `${reportType.toUpperCase()} report uploaded (parsing failed)`,
        report: {
          id: report.id,
          title: report.title,
          type: report.type,
          contentLength: extractedText.length,
          parsed: parseSuccess
        },
        reportType,
        parserUsed: parserType,
        parseSuccess
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

  app.get("/api/invoices/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoiceWithClient(id);
      
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

  app.get("/api/invoices/:id/emails", requireAuth, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const emailHistory = await storage.getEmailHistory(invoiceId);
      res.json(emailHistory);
    } catch (error) {
      console.error("Error fetching email history:", error);
      res.status(500).json({ message: "Failed to fetch email history" });
    }
  });

  app.get("/api/invoices/:id/ai-suggestion", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/invoices/:id/emails", requireAuth, async (req: Request, res: Response) => {
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

  app.patch("/api/invoices/:id", requireAuth, async (req: Request, res: Response) => {
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
        const hasNonMarketContent = reportSummary.toLowerCase().includes('teenager') || 
                                   reportSummary.toLowerCase().includes('phone') ||
                                   reportSummary.toLowerCase().includes('sustainable') ||
                                   reportSummary.toLowerCase().includes('aesop') ||
                                   reportSummary.toLowerCase().includes('fable') ||
                                   reportSummary.toLowerCase().includes('wisdom') ||
                                   reportSummary.toLowerCase().includes('loneliness') ||
                                   reportSummary.toLowerCase().includes('culture') ||
                                   reportSummary.toLowerCase().includes('philosophy');
        
        if (hasNonMarketContent) {
          nonMarketTopics = `The reports also explore cultural insights and life wisdom to provide readers with perspective beyond the financial world.`;
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

      const emailPrompt = `Generate a personalized, concise prospect email for ${lead.name} at ${lead.company}. This is a ${lead.stage} stage lead with interests in: ${lead.interest_tags?.join(', ') || 'investment research'}.

CONTEXT: ${contextNotes.length > 0 ? contextNotes.join(' | ') : 'First outreach to this lead'}
${hasEmailHistory ? 'IMPORTANT: This is a follow-up email - reference prior relationship naturally and avoid repeating previously covered topics.' : ''}

${selectedReportSummaries.length > 0 ? `Reference the recent 13D reports: "${reportTitle}". ONLY use insights from Article 2 onward. DO NOT use content from Article 1 ('Strategy & Asset Allocation & Performance of High Conviction Ideas'). Here's the combined report content: "${filteredSummary}". The reports cover: ${reportTags}.

${selectedReportIds && selectedReportIds.length > 1 ? 
`MANDATORY REQUIREMENT: You MUST end every single bullet point with (REPORT_TITLE - Article X) where REPORT_TITLE is the specific report name and X is the specific article number from that report. Use exactly 3 DIFFERENT article numbers from potentially different reports - never repeat the same article number twice. This is absolutely required - no exceptions.

CRITICAL DISTRIBUTION RULE: When multiple reports are available, you MUST pull insights from DIFFERENT reports. Do NOT take all 3 bullet points from the same report. Mix insights across the available reports to show breadth of coverage.

Available reports and their articles:
${selectedReportSummaries.map(summary => {
  const contentReport = contentReports?.find((report: any) => report.id === summary.content_report_id);
  return contentReport ? `${contentReport.title}:
Article 2 = Critical minerals supply chain
Article 3 = AI tech infrastructure  
Article 4 = Mining stocks performance
Article 5 = Teenagers phone experiment
Article 6 = Loneliness investment theme
Article 7 = Russia analysis
Article 8 = European agriculture` : '';
}).join('\n\n')}

Example format (MANDATORY - notice 3 DIFFERENT citations from DIFFERENT reports):
• China controls 78% of critical minerals needed for U.S. weapons production, creating national security vulnerabilities (WILTW_2025-06-05 - Article 2).
• Mining sector outperforms due to reshoring challenges and decades of underinvestment in domestic capacity (WILTW_2025-05-29 - Article 4).
• Russia's geopolitical strategies are often misunderstood by analysts who lack perspective on Russian national interests (WILTW_2025-05-22 - Article 7).

CRITICAL: Each bullet point MUST include the specific report title and a DIFFERENT article number. Distribute insights across different reports when multiple are available.` :
`IMPORTANT: Since only one report is selected, DO NOT include article citations or reference numbers. Present the insights naturally without any (Article X) citations.`}` : ''}

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
• Include a short paragraph (~30 words) about non-market topics from the report${nonMarketTopics ? `: "${nonMarketTopics}"` : ' — such as culture, values, or timeless ideas — to provide readers with perspective beyond the financial world'}

STRUCTURE TO FOLLOW:

---

**Subject**: [Natural, conversational subject line – max 8 words]

Hi ${lead.name},

[Natural greeting with seasonal/personal touch] I was going through one of our latest reports and [conversational transition about why this matters to them based on their interests].

[Present 3 market insights as bullet points with detailed analysis and implications]

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
            content: "You are Spencer from 13D Research. MANDATORY FORMATTING: After the opening line, you MUST use bullet points with '•' symbols for market insights. Example format:\n\nHope you're enjoying the start of summer! I was reviewing one of our latest reports and thought a few insights might resonate with your focus on [interests]:\n\n• First market insight with analysis.\n• Second market insight with implications.\n• Third market insight with strategic perspective.\n\nMore broadly, we're seeing a meaningful shift into [theme]. At 13D, our work centers on helping investors anticipate structural trends like these—before they hit the mainstream narrative.\n\nOn a different note, the report also explores [cultural topic]—an unexpected but thought-provoking angle.\n\nLet me know if you'd like me to send over past reports aligned with any of these themes.\n\nBest,\nSpencer\n\nDO NOT write paragraph format. USE BULLETS."
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
      const numericReportId = typeof reportId === 'string' ? parseInt(reportId) : reportId;
      const report = reports.find(r => r.id === numericReportId);
      
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

      // Store original content for WILTW parsing
      const originalContent = actualContent;
      
      // Optimize content for AI processing - chunk large content only for non-WILTW reports
      if (actualContent.length > 50000 && promptType !== "wiltw_parser") {
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
        console.log('Content chunked, new length:', actualContent.length);
      } else if (actualContent.length > 50000 && promptType === "wiltw_parser") {
        // For WILTW reports, use a different strategy - take larger chunks but preserve structure
        actualContent = actualContent.substring(0, 80000); // Take first 80k characters to preserve structure
        console.log('WILTW content truncated to preserve structure, new length:', actualContent.length);
      }
      
      console.log('Final content check before prompts:', {
        hasActualContent: !!actualContent,
        contentLength: actualContent?.length || 0,
        contentPreview: actualContent?.substring(0, 100) || 'No content'
      });
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      let systemPrompt = "";
      let userPrompt = "";

      if (promptType === "wiltw_parser") {
        // Use enhanced investment research analysis for WILTW reports
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
        
        userPrompt = `Please analyze this WILTW investment research report titled "${title || report.title}" and provide comprehensive insights for investment professionals:

${actualContent}

Extract all specific investment themes, opportunities, risks, and actionable insights from the actual report content.`;
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
        
        userPrompt = `Please analyze this investment research report titled "${title || report.title}" and provide comprehensive insights for investment professionals:

${actualContent}

Extract all specific investment themes, opportunities, risks, and actionable insights from the actual report content.`;
      }

      console.log('OpenAI request debug:', {
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        actualContentLength: actualContent?.length || 0,
        titleUsed: title || report.title || 'undefined',
        contentIncluded: !!actualContent && userPrompt.includes(actualContent.substring(0, 50)),
        promptPreview: userPrompt.substring(0, 300)
      });

      // Generate the original detailed summary first
      const detailedResponse = await openai.chat.completions.create({
        model: "gpt-4o",
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

      const detailedSummary = detailedResponse.choices[0].message.content;
      console.log('Initial detailed summary generated, length:', detailedSummary?.length || 0);

      let structuredSummary = '';
      let comprehensiveSummary = '';
      let summary = detailedSummary;

      // For WILTW reports, generate additional structured and comprehensive summaries
      console.log('Checking if WILTW parser should generate three summaries:', {
        promptType,
        isWILTW: promptType === "wiltw_parser",
        willGenerateThreeSummaries: promptType === "wiltw_parser"
      });
      
      if (promptType === "wiltw_parser") {
        console.log('Starting WILTW three-part summary generation...');
        
        // Skip the complex parsing for now and generate the structured summary directly
        console.log('Generating structured summary...');
        
        const structuredSystemPrompt = `You are an expert investment research analyst and summarizer. You've received a detailed WILTW report from 13D Research dated ${title || report.title}. Analyze the report and provide structured, article-by-article analysis.

For each identifiable article section in the report, create a comprehensive analysis following this format:

**ARTICLE [NUMBER]: [TITLE]**

**Core Thesis:** [2-3 sentence summary of the main argument]

**Key Insights:**
• [First key insight with specific data/quotes]
• [Second key insight with supporting evidence]  
• [Third key insight with implications]

**Investment Implications:** [Forward-looking themes and opportunities for investors]

**Recommended Names:** [Any specific stocks, ETFs, indices, or investment vehicles mentioned]

**Category Tag:** [One primary category: Geopolitics, China, Technology, AI, Energy, Commodities, Climate, Markets, Culture, Education, Europe, Defense, Longevity, Macro, or Other]

Extract and analyze all numbered articles in the report with consistent formatting and depth.`;

        const structuredUserPrompt = `Analyze this WILTW investment research report titled "${title || report.title}" and provide structured analysis for each article section:

${actualContent}

Process each numbered article section following the exact format specified. Ensure all articles are covered with consistent formatting.`;

        console.log('Making structured summary API call...');
        const structuredResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: structuredSystemPrompt
            },
            {
              role: "user",
              content: structuredUserPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.3
        });

        structuredSummary = structuredResponse.choices[0].message.content || '';
        console.log('Structured summary generated, length:', structuredSummary.length);

        // Generate the comprehensive summary (this uses the same system prompt as the detailedSummary)
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

        const comprehensiveUserPrompt = `Please analyze this WILTW investment research report titled "${title || report.title}" and provide comprehensive insights for investment professionals:

${actualContent}

Extract all specific investment themes, opportunities, risks, and actionable insights from the actual report content.`;

        console.log('Making comprehensive summary API call...');
        const comprehensiveResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: comprehensiveSystemPrompt
            },
            {
              role: "user",
              content: comprehensiveUserPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.3
        });

        comprehensiveSummary = comprehensiveResponse.choices[0].message.content || '';
        console.log('Comprehensive summary generated, length:', comprehensiveSummary.length);

        // Combine all three summaries for WILTW reports
        const combinedSummary = `## Structured Article-by-Article Analysis

${structuredSummary}

\n\n---\n\n

## Detailed Article Analysis

${detailedSummary}

\n\n---\n\n

## Comprehensive Investment Summary

${comprehensiveSummary}`;

        summary = combinedSummary;
        console.log('WILTW three-part summary completed. Combined summary length:', summary.length);
        console.log('Summary components saved:', {
          detailedLength: detailedSummary?.length || 0,
          structuredLength: structuredSummary?.length || 0,
          comprehensiveLength: comprehensiveSummary?.length || 0,
          combinedLength: summary?.length || 0
        });
      } else {
        console.log('Not a WILTW parser, using single summary approach');
      }
      
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
              parsed_summary: summary || '', // Save the complete combined summary
              structured_summary: structuredSummary || '',
              comprehensive_summary: comprehensiveSummary || '',
              summary_type: promptType === "wiltw_parser" ? "wiltw_parser" : "watmtu_parser"
            });
            console.log('Created new summary:', { 
              id: newSummary.id, 
              content_report_id: newSummary.content_report_id,
              completeSummaryLength: newSummary.parsed_summary?.length,
              structuredSummaryLength: newSummary.structured_summary?.length,
              comprehensiveSummaryLength: newSummary.comprehensive_summary?.length
            });
          } else {
            // Update existing summary with new content
            const updatedSummary = await storage.updateReportSummary(existingSummary.id, {
              parsed_summary: summary || '', // Save the complete combined summary
              structured_summary: structuredSummary || '',
              comprehensive_summary: comprehensiveSummary || '',
              summary_type: promptType === "wiltw_parser" ? "wiltw_parser" : "watmtu_parser"
            });
            console.log('Updated existing summary:', { 
              id: updatedSummary?.id, 
              content_report_id: updatedSummary?.content_report_id,
              completeSummaryLength: updatedSummary?.parsed_summary?.length,
              structuredSummaryLength: updatedSummary?.structured_summary?.length,
              comprehensiveSummaryLength: updatedSummary?.comprehensive_summary?.length
            });
          }
        } catch (error) {
          console.error("Error storing report summary:", error);
        }
      }
      
      res.json({ 
        summary,
        structuredSummary,
        detailedSummary, 
        comprehensiveSummary 
      });
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

      // Enhanced validation with specific error messages
      if (!file) {
        return res.status(400).json({ 
          success: false,
          message: 'No file was uploaded. Please select a CSV file to upload.',
          error: 'FILE_MISSING'
        });
      }

      if (!file.buffer) {
        return res.status(400).json({ 
          success: false,
          message: 'The uploaded file appears to be corrupted or empty.',
          error: 'FILE_CORRUPTED'
        });
      }

      if (!type || !['prospects', 'invoices'].includes(type)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid upload type. Please specify either "prospects" or "invoices".',
          error: 'INVALID_TYPE'
        });
      }

      if (file.mimetype !== 'text/csv' && !file.originalname?.endsWith('.csv')) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid file format. Please upload a CSV file (.csv extension).',
          error: 'INVALID_FORMAT'
        });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let processed = 0;
      let duplicates = 0;

      // Parse CSV from buffer (since we're using memoryStorage)
      const csvString = file.buffer.toString('utf8');
      
      await new Promise((resolve, reject) => {
        const readable = new Readable();
        readable.push(csvString);
        readable.push(null);
        
        readable
          .pipe(csv())
          .on('data', (data: any) => results.push(data))
          .on('end', resolve)
          .on('error', (err: any) => {
            reject(new Error(`CSV parsing failed: ${err.message}. Please check that your file is a valid CSV format.`));
          });
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

      res.json({
        success: true,
        processed,
        errors,
        duplicates,
        total: results.length,
        message: `Successfully processed ${processed} records. ${duplicates > 0 ? `Skipped ${duplicates} duplicates. ` : ''}${errors.length > 0 ? `${errors.length} errors encountered.` : ''}`
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to process CSV file";
      let errorCode = "PROCESSING_ERROR";
      
      if (error instanceof Error) {
        if (error.message.includes('CSV parsing failed')) {
          errorMessage = error.message;
          errorCode = "CSV_PARSE_ERROR";
        } else if (error.message.includes('ENOENT') || error.message.includes('file')) {
          errorMessage = "The uploaded file could not be read. Please try uploading the file again.";
          errorCode = "FILE_READ_ERROR";
        } else if (error.message.includes('duplicate key') || error.message.includes('UNIQUE constraint')) {
          errorMessage = "Some records could not be added due to duplicate entries in the database.";
          errorCode = "DATABASE_CONSTRAINT_ERROR";
        } else if (error.message.includes('database') || error.message.includes('connection')) {
          errorMessage = "Database connection error. Please try again in a moment.";
          errorCode = "DATABASE_CONNECTION_ERROR";
        } else {
          errorMessage = `Processing error: ${error.message}`;
        }
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: errorCode,
        details: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
        duplicates: 0,
        errors: [],
        total: 0
      });
    }
  });

  // Reverse last CSV upload endpoint
  app.post("/api/upload/csv/reverse", async (req: Request, res: Response) => {
    try {
      const { count, timeWindow = 5 } = req.body; // timeWindow in minutes, default 5 minutes
      
      if (!count || count <= 0) {
        return res.status(400).json({
          success: false,
          message: "Please specify the number of records to reverse (count parameter required)"
        });
      }

      // Get the most recently added leads within the time window
      const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
      const allLeads = await storage.getAllLeads();
      
      // Filter leads created within the time window and sort by creation time (newest first)
      const recentLeads = allLeads
        .filter(lead => lead.created_at && new Date(lead.created_at) >= cutoffTime)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, count);

      if (recentLeads.length === 0) {
        return res.json({
          success: false,
          message: `No leads found that were created in the last ${timeWindow} minutes to reverse`,
          deleted: 0,
          timeWindow
        });
      }

      // Delete the recent leads
      let deleted = 0;
      const errors: string[] = [];
      
      for (const lead of recentLeads) {
        try {
          const success = await storage.deleteLead(lead.id);
          if (success) {
            deleted++;
          } else {
            errors.push(`Failed to delete lead ${lead.name} (${lead.email})`);
          }
        } catch (error) {
          errors.push(`Error deleting lead ${lead.name} (${lead.email}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        success: deleted > 0,
        message: `Reversed upload: deleted ${deleted} leads${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
        deleted,
        errors,
        timeWindow,
        requestedCount: count,
        availableCount: recentLeads.length
      });

    } catch (error) {
      console.error('Reverse upload error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to reverse upload",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
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

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteTask(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // AI Content Suggestions - Theme-based email suggestions
  app.get("/api/ai/content-suggestions", async (req: Request, res: Response) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI content suggestions." 
        });
      }

      // Get all reports for theme analysis
      const reports = await storage.getAllContentReports();
      
      if (reports.length === 0) {
        return res.json([]);
      }

      console.log(`Analyzing ${reports.length} reports for theme-based suggestions...`);
      
      const { generateThemeBasedEmailSuggestions } = await import("./ai");
      const suggestions = await generateThemeBasedEmailSuggestions(reports);
      
      console.log(`Generated ${suggestions.length} theme-based suggestions`);
      
      // Set headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating content suggestions:", error);
      res.status(500).json({ error: "Failed to generate content suggestions" });
    }
  });

  // Download theme summary
  app.post("/api/themes/download-summary", async (req: Request, res: Response) => {
    try {
      const { theme, insights, email } = req.body;
      
      const summaryContent = `THEME SUMMARY
=============

Theme: ${theme.title}

Description:
${theme.description}

Key Insights:
${(insights || theme.keyPoints || []).map((insight: string, idx: number) => `${idx + 1}. ${insight}`).join('\n')}

Supporting Reports:
${(theme.supportingReports || []).join('\n- ')}

Generated Email:
${email || 'No email generated yet.'}

Generated on: ${new Date().toLocaleString()}
`;

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="theme-summary-${Date.now()}.txt"`);
      res.send(summaryContent);
    } catch (error) {
      console.error("Error generating theme summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Generate theme-based email
  app.post("/api/ai/generate-theme-email", async (req: Request, res: Response) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI email generation." 
        });
      }

      const { suggestion } = req.body;
      const { title: theme, emailAngle, description, keyPoints, supportingReports, insights } = suggestion;
      
      // Get all reports for content analysis
      const reports = await storage.getAllContentReports();
      
      if (reports.length === 0) {
        return res.status(400).json({ error: "No reports available for email generation" });
      }

      const { generateThemeBasedEmail } = await import("./ai");
      const email = await generateThemeBasedEmail(
        theme,
        emailAngle,
        description,
        keyPoints,
        supportingReports,
        reports,
        insights
      );

      // Store AI-generated content for feedback tracking
      try {
        const contentData = {
          content_type: "email",
          original_prompt: `Theme: ${theme}, Angle: ${emailAngle}`,
          generated_content: email,
          theme_id: theme || null,
          context_data: {
            theme,
            emailAngle,
            keyPoints,
            supportingReports
          }
        };

        const aiContent = await storage.createAiGeneratedContent(contentData);
        res.json({ email, contentId: aiContent.id });
      } catch (feedbackError) {
        console.error("Error storing content for feedback:", feedbackError);
        // Still return the email even if feedback storage fails
        res.json({ email });
      }
    } catch (error) {
      console.error("Error generating theme-based email:", error);
      res.status(500).json({ error: "Failed to generate email" });
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
        return res.status(400).json({ error: "Suggestion is required" });
      }

      const exampleEmailStyle = `Hi ____________ – I hope you're doing well.
 
As the broader markets remain volatile and increasingly narrow in leadership, 13D Research continues to help investors navigate with clarity. Our highest-conviction themes - rooted in secular shifts we have been closely monitoring - are now outperforming dramatically. Our Highest Conviction Ideas portfolio is up 19.6% YTD, outpacing the S&P 500 by over 20%. We believe these shifts are still in the early innings.
 
Below are some of the most compelling insights we've recently shared with clients, along with key investment implications:
 
Gold's Historic Breakout:
1.      Gold has surged past a 45-year downtrend when measured against CPI, with junior gold miners now outperforming seniors (a bullish inflection that has historically signaled massive upside). 
2.      Our 13D Gold Miners Index is up over 55% YTD as we are focused on nimble producers with upside from consolidation potential.
 
Commodities Supercycle Broadens:
1.      Breakouts in copper, silver, fertilizers, and even coal point to a new phase of this uptrend. Our overweight to commodity-linked equities continues to deliver alpha amid declining USD and rising inflation expectations.
2.      Agriculture, energy storage, and hard asset producers are all key focuses.
 
Grid Infrastructure: The $21 Trillion Opportunity: 
1.      Power outages are rising worldwide, and demand from AI, EVs, and Bitcoin mining is pushing grids past their limits, with over $21 trillion in grid investment needed by 2050 - providing a generational opportunity across copper, batteries, and high-voltage equipment.
2.      We are focused on manufacturers of grid infrastructure, battery storage systems, and companies enabling smart grid digitization.
 
Critical Minerals: The Geopolitical Pressure Point: 
1.      China's dominance over the rare-earth supply chain has become a strategic lever of geopolitical power, with export controls threatening US weapons systems, semiconductors, and clean tech.
1.      The US is 100% import-reliant for 12 critical minerals and lacks refining capacity, leaving supply chains dangerously exposed.
2.      Our 13D Critical Minerals Index (focused on Western producers) is already outperforming as global investment pours into securing mine independence.
 
Bitcoin's Evolving Use Case:
1.      Bitcoin is undergoing a quiet transformation as Layer-2 innovation and DeFi infrastructure (BTCFi) are unlocking new functionality beyond simply "digital gold."
2.      As Bitcoin becomes a platform for smart contracts, lending, and NFTs, it could drive a new wave of demand and broader adoption.
3.      We closely monitor Bitcoin's technical positioning to identify when it is overbought or oversold—giving clients a tactical edge - for example, we started to exit bitcoin after its run up late last year, then re-entered the position in April as conditions reset. 
1.      This disciplined approach enables us to capitalize on volatility while managing risk.
 
If you are interested in learning more about what we are closely monitoring and how we are allocating across these themes, I'd be happy to set up a call to discuss.
 
Best, 
Spencer`;

      const prompt = `Generate a professional investment research email that matches the exact style and formatting of the example provided. Use this investment theme suggestion:

Title: ${suggestion.title}
Description: ${suggestion.description}
Email Angle: ${suggestion.emailAngle}
Key Points: ${suggestion.keyPoints ? suggestion.keyPoints.join(', ') : 'N/A'}
Insights: ${suggestion.insights ? suggestion.insights.join(', ') : 'N/A'}
Supporting Reports: ${suggestion.supportingReports ? suggestion.supportingReports.join(', ') : 'N/A'}

STYLE REQUIREMENTS:
- Start with "Hi ____________ – I hope you're doing well."
- Include performance metrics and specific numbers where relevant
- Use numbered bullet points (1. 2. etc.) for key insights
- Structure with clear thematic sections like the example
- End with offer to discuss further and sign "Best, Spencer"
- Keep the professional, confident tone of an investment research firm
- Include specific actionable investment themes
- Reference market conditions and opportunities
- Generate compelling subject line starting with "Subject: "

Format exactly like the example email provided.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Spencer from 13D Research, a leading investment research firm. Generate professional investment emails that match the exact style, tone, and formatting of the provided example. Include compelling subject lines and maintain the authoritative yet approachable voice of an investment expert.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      const generatedEmail = response.choices[0]?.message?.content || "Unable to generate email";

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

  // AI Feedback Loop API Routes
  
  // Store AI-generated content
  app.post("/api/ai/content", async (req: Request, res: Response) => {
    try {
      const { content_type, theme_id, original_prompt, generated_content, context_data } = req.body;
      
      if (!content_type || !original_prompt || !generated_content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const contentData = {
        content_type,
        theme_id: theme_id || null,
        original_prompt,
        generated_content,
        context_data: context_data || null
      };

      const aiContent = await storage.createAiGeneratedContent(contentData);
      res.json(aiContent);
    } catch (error) {
      console.error("Error storing AI content:", error);
      res.status(500).json({ error: "Failed to store AI content" });
    }
  });

  // Submit feedback for AI-generated content
  app.post("/api/ai/content/:contentId/feedback", async (req: Request, res: Response) => {
    try {
      const contentId = parseInt(req.params.contentId);
      const { rating, improvement_suggestion, edited_version, feedback_type } = req.body;
      
      if (!rating) {
        return res.status(400).json({ error: "Rating is required" });
      }

      const feedbackData = {
        content_id: contentId,
        rating,
        improvement_suggestion: improvement_suggestion || null,
        edited_version: edited_version || null,
        feedback_type: feedback_type || "rating"
      };

      const feedback = await storage.createAiContentFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get feedback analytics
  app.get("/api/ai/feedback/analytics", async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getAiFeedbackAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching feedback analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get AI content with feedback
  app.get("/api/ai/content/:contentId", async (req: Request, res: Response) => {
    try {
      const contentId = parseInt(req.params.contentId);
      const content = await storage.getAiGeneratedContentWithFeedback(contentId);
      
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error("Error fetching AI content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // AI Content Tools Routes
  app.get("/api/themes/list", async (req: Request, res: Response) => {
    try {
      const reports = await storage.getAllContentReports();
      const themeMap = new Map<string, { count: number, reports: string[] }>();
      
      reports.forEach((report: any) => {
        if (report.tags && Array.isArray(report.tags)) {
          report.tags.forEach((tag: string) => {
            if (!themeMap.has(tag)) {
              themeMap.set(tag, { count: 0, reports: [] });
            }
            const existing = themeMap.get(tag)!;
            existing.count++;
            existing.reports.push(report.title);
          });
        }
      });
      
      const themes = Array.from(themeMap.entries()).map(([theme, data]) => ({
        theme,
        totalCount: data.count,
        reports: data.reports
      })).sort((a, b) => b.totalCount - a.totalCount);
      
      res.json(themes);
    } catch (error) {
      console.error("Error fetching themes:", error);
      res.status(500).json({ error: "Failed to fetch themes" });
    }
  });

  app.get("/api/themes/timeseries", async (req: Request, res: Response) => {
    try {
      const { theme } = req.query;
      if (!theme || typeof theme !== 'string') {
        return res.status(400).json({ error: "Theme parameter required" });
      }
      
      const reports = await storage.getAllContentReports();
      const timeSeriesData = new Map<string, { count: number, reports: string[] }>();
      
      reports.forEach((report: any) => {
        if (report.tags && Array.isArray(report.tags) && report.tags.includes(theme)) {
          const dateKey = new Date(report.published_date).toISOString().split('T')[0];
          if (!timeSeriesData.has(dateKey)) {
            timeSeriesData.set(dateKey, { count: 0, reports: [] });
          }
          const existing = timeSeriesData.get(dateKey)!;
          existing.count++;
          existing.reports.push(report.title);
        }
      });
      
      const sortedData = Array.from(timeSeriesData.entries())
        .map(([date, data]) => ({ date, count: data.count, reports: data.reports }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      res.json(sortedData);
    } catch (error) {
      console.error("Error fetching theme timeseries:", error);
      res.status(500).json({ error: "Failed to fetch theme timeseries" });
    }
  });

  // Removed duplicate endpoint - using the AI-powered version below

  app.post("/api/relevance-score", async (req: Request, res: Response) => {
    try {
      const { tickers } = req.body;
      if (!Array.isArray(tickers)) {
        return res.status(400).json({ error: "Tickers must be an array" });
      }
      
      const reports = await storage.getAllContentReports();
      const scoredReports = [];
      
      for (const report of reports) {
        let relevanceScore = 0;
        const matchedTickers: any[] = [];
        const sectorMatches: any[] = [];
        
        for (const ticker of tickers) {
          const tickerRegex = new RegExp(`\\b${ticker}\\b`, 'gi');
          if (report.title.match(tickerRegex) || 
              (report.summary && report.summary.match(tickerRegex)) ||
              (report.full_content && report.full_content.match(tickerRegex))) {
            relevanceScore += 25;
            if (!matchedTickers.includes(ticker)) {
              matchedTickers.push(ticker);
            }
          }
        }
        
        const sectorKeywords = ['technology', 'energy', 'healthcare', 'finance', 'mining', 'utilities'];
        for (const sector of sectorKeywords) {
          if (report.title.toLowerCase().includes(sector) || 
              (report.summary && report.summary.toLowerCase().includes(sector))) {
            relevanceScore += 5;
            if (!sectorMatches.includes(sector)) {
              sectorMatches.push(sector);
            }
          }
        }
        
        if (relevanceScore > 0) {
          scoredReports.push({
            id: report.id,
            title: report.title,
            summary: report.summary || "No summary available",
            relevanceScore: Math.min(relevanceScore, 100),
            matchedTickers,
            sectorMatches,
            publishedDate: report.published_date
          });
        }
      }
      
      scoredReports.sort((a, b) => b.relevanceScore - a.relevanceScore);
      res.json({ scoredReports: scoredReports.slice(0, 15) });
    } catch (error) {
      console.error("Error scoring portfolio relevance:", error);
      res.status(500).json({ error: "Failed to score portfolio relevance" });
    }
  });

  app.post("/api/ask-reports", async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter required" });
      }
      
      const reports = await storage.getAllContentReports();
      const sourceReports = [];
      let confidence = 0;
      
      const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 3);
      
      for (const report of reports) {
        let relevanceScore = 0;
        
        for (const word of queryWords) {
          if (report.title.toLowerCase().includes(word)) relevanceScore += 10;
          if (report.content_summary && report.content_summary.toLowerCase().includes(word)) relevanceScore += 5;
          if (report.full_content && report.full_content.toLowerCase().includes(word)) relevanceScore += 3;
        }
        
        if (relevanceScore > 8) {
          // Generate better excerpt by prioritizing content_summary or extracting meaningful content
          let excerpt = "No excerpt available";
          
          if (report.content_summary && report.content_summary.trim()) {
            excerpt = report.content_summary.substring(0, 300);
          } else if (report.full_content) {
            // Skip boilerplate headers and find meaningful content
            const content = report.full_content;
            const skipPatterns = [
              /PRINT ONCE - DO NOT FORWARD - DO NOT COPY/,
              /13D RESEARCH & STRATEGY/,
              /WHAT I LEARNED THIS WEEK/,
              /What is needed is a realization/
            ];
            
            let startIndex = 0;
            for (const pattern of skipPatterns) {
              const match = content.match(pattern);
              if (match && match.index) {
                startIndex = Math.max(startIndex, match.index + match[0].length);
              }
            }
            
            // Find the first meaningful paragraph after headers
            const contentAfterHeaders = content.substring(startIndex).trim();
            const firstMeaningfulParagraph = contentAfterHeaders.split('\n')
              .find(line => line.trim().length > 50 && !line.includes('®') && !line.includes('13D.COM'));
            
            if (firstMeaningfulParagraph) {
              excerpt = firstMeaningfulParagraph.trim().substring(0, 300);
            } else {
              excerpt = contentAfterHeaders.substring(0, 300);
            }
          }
          
          sourceReports.push({
            id: report.id,
            title: report.title,
            relevanceScore,
            excerpt: excerpt + (excerpt.length === 300 ? "..." : ""),
            fullContent: report.content_summary || report.full_content || ""
          });
        }
      }
      
      sourceReports.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topSources = sourceReports.slice(0, 5);
      
      confidence = Math.min(topSources.length * 20, 90);
      
      let answer = "";
      if (topSources.length > 0) {
        // Generate comprehensive answer using GPT-4 with actual report content
        const contextContent = topSources.slice(0, 3).map(source => 
          `Report: ${source.title}\nContent: ${source.fullContent?.substring(0, 1000) || source.excerpt}`
        ).join('\n\n---\n\n');
        
        const prompt = `Based on the following research reports, provide a comprehensive and specific answer to the question: "${query}"

Context from reports:
${contextContent}

Instructions:
- Provide a detailed, substantive answer that directly addresses the question
- Include specific insights, data points, and analysis from the reports
- Mention key themes, trends, or viewpoints found in the research
- Be specific about investment implications or market perspectives where relevant
- Keep the response focused and informative (2-3 paragraphs)
- Do not mention that you're referencing reports - just provide the insights naturally

Question: ${query}`;

        try {
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 500
            })
          });

          if (openaiResponse.ok) {
            const gptResult = await openaiResponse.json();
            answer = gptResult.choices[0]?.message?.content || "Unable to generate comprehensive answer.";
          } else {
            throw new Error('OpenAI API call failed');
          }
        } catch (gptError) {
          console.error("Error generating AI answer:", gptError);
          // Fallback to basic answer
          answer = `Based on ${topSources.length} relevant reports in our research corpus, this topic appears to be an area of active analysis. The reports suggest varying perspectives and ongoing developments that warrant attention. Key themes identified include market dynamics, risk considerations, and strategic positioning opportunities.`;
        }
      } else {
        answer = "I couldn't find specific information about this topic in the current report corpus. You might want to refine your query or check if relevant reports have been uploaded.";
        confidence = 10;
      }
      
      res.json({
        answer,
        sourceReports: topSources.map(source => ({
          id: source.id,
          title: source.title,
          relevanceScore: source.relevanceScore,
          excerpt: source.excerpt
        })),
        confidence
      });
    } catch (error) {
      console.error("Error processing Q&A query:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  });

  app.post("/api/generate-one-pager", async (req: Request, res: Response) => {
    try {
      const { topic, audience, tone, keyPoints } = req.body;
      if (!topic || !audience) {
        return res.status(400).json({ error: "Topic and audience are required" });
      }
      
      const reports = await storage.getAllContentReports();
      const relevantReports = [];
      
      const topicWords = topic.toLowerCase().split(' ');
      for (const report of reports) {
        let relevanceScore = 0;
        
        for (const word of topicWords) {
          if (report.title.toLowerCase().includes(word)) relevanceScore += 15;
          if (report.summary && report.summary.toLowerCase().includes(word)) relevanceScore += 10;
        }
        
        if (relevanceScore > 20) {
          relevantReports.push({
            id: report.id,
            title: report.title,
            relevanceScore
          });
        }
      }
      
      relevantReports.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topReports = relevantReports.slice(0, 5);
      
      const title = `${topic} - Investment Analysis`;
      const content = `${title}

Prepared for: ${audience}
Date: ${new Date().toLocaleDateString()}

Executive Summary

This analysis examines ${topic} based on our latest research and market intelligence. Our research indicates significant developments in this area that warrant attention from ${audience.toLowerCase()}.

Key Insights

${keyPoints && keyPoints.length > 0 ? 
  keyPoints.map((point: string, index: number) => `• ${point}`).join('\n') :
  '• Market dynamics show evolving trends\n• Risk-return profiles are shifting\n• Opportunities exist for strategic positioning'
}

Market Analysis

Based on our comprehensive research corpus, ${topic.toLowerCase()} presents both opportunities and challenges. The current market environment suggests that careful analysis and strategic positioning will be critical for success.

Investment Implications

For ${audience.toLowerCase()}, this analysis suggests:
• Continued monitoring of developments
• Assessment of portfolio implications  
• Consideration of strategic positioning

Conclusion

${topic} remains an important area for ongoing research and analysis. We recommend continued monitoring and strategic evaluation based on evolving market conditions.

This analysis is based on ${topReports.length} relevant research reports from our intelligence corpus.`;

      const onePager = {
        id: Date.now().toString(),
        title,
        content,
        keyInsights: keyPoints || ['Market Analysis', 'Investment Implications', 'Strategic Considerations'],
        sourceReports: topReports,
        generatedAt: new Date().toISOString()
      };
      
      res.json({ onePager });
    } catch (error) {
      console.error("Error generating one-pager:", error);
      res.status(500).json({ error: "Failed to generate one-pager" });
    }
  });

  app.get("/api/fund-strategies", async (req: Request, res: Response) => {
    try {
      const strategies = [
        { id: 'value', name: 'Value Investing', description: 'Focus on undervalued securities' },
        { id: 'growth', name: 'Growth Investing', description: 'Target high-growth companies' },
        { id: 'momentum', name: 'Momentum Strategy', description: 'Follow market trends' },
        { id: 'contrarian', name: 'Contrarian Investing', description: 'Against market sentiment' }
      ];
      res.json(strategies);
    } catch (error) {
      console.error("Error fetching fund strategies:", error);
      res.status(500).json({ error: "Failed to fetch strategies" });
    }
  });

  app.post("/api/map-fund-themes", async (req: Request, res: Response) => {
    try {
      const { fundName, strategy, riskProfile } = req.body;
      if (!fundName || !strategy || !riskProfile) {
        return res.status(400).json({ error: "All fund parameters required" });
      }
      
      const reports = await storage.getAllContentReports();
      const relevantReports = [];
      const thematicAlignment = [];
      
      const strategyThemes = {
        'value': ['undervalued', 'dividend', 'book value', 'earnings'],
        'growth': ['growth', 'technology', 'innovation', 'expansion'],
        'momentum': ['trending', 'momentum', 'breakout', 'technical'],
        'contrarian': ['contrarian', 'oversold', 'reversal', 'turnaround']
      };
      
      const themes = strategyThemes[strategy as keyof typeof strategyThemes] || [];
      
      for (const report of reports) {
        let relevanceScore = 0;
        const keyThemes = [];
        
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
            relevanceScore: Math.min(relevanceScore, 100),
            keyThemes,
            publishedDate: report.published_date
          });
        }
      }
      
      const themeMap = new Map<string, { strength: number, reports: number }>();
      relevantReports.forEach(report => {
        report.keyThemes.forEach(theme => {
          if (!themeMap.has(theme)) {
            themeMap.set(theme, { strength: 0, reports: 0 });
          }
          const existing = themeMap.get(theme)!;
          existing.strength += report.relevanceScore / relevantReports.length;
          existing.reports++;
        });
      });
      
      Array.from(themeMap.entries()).forEach(([theme, data]) => {
        thematicAlignment.push({
          theme,
          strength: Math.round(data.strength),
          supportingReports: data.reports
        });
      });
      
      const recommendations = [
        {
          type: 'opportunity' as const,
          description: `Based on ${strategy} strategy, consider increasing exposure to identified themes`,
          priority: 'medium' as const
        },
        {
          type: 'neutral' as const,
          description: `Monitor developments in aligned thematic areas for ${riskProfile} risk tolerance`,
          priority: 'low' as const
        }
      ];
      
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
      console.error("Error mapping fund themes:", error);
      res.status(500).json({ error: "Failed to map fund themes" });
    }
  });

  // Prospect matching endpoint
  app.post("/api/match-prospect-themes", async (req: Request, res: Response) => {
    try {
      console.log("Prospect matching request received:", req.body);
      const { reportContent } = req.body;

      if (!reportContent) {
        console.log("Missing report content in request");
        return res.status(400).json({ error: "Report content is required" });
      }

      // Get all leads (prospects) from database
      const prospects = await db.select().from(leads);
      console.log(`Found ${prospects.length} prospects in database`);

      if (prospects.length === 0) {
        return res.json({ matches: [] });
      }

      // Log first prospect to verify data structure
      if (prospects.length > 0) {
        console.log("Sample prospect data:", JSON.stringify(prospects[0], null, 2));
      }

      // Use AI to analyze report content and match with prospects
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that analyzes investment report content and matches it with relevant prospects based on their investment interests and preferences.

Given a report summary and a list of prospects with their business details, identify which prospects would be most interested in this report content based on their company profile, engagement level, stage, and interest tags.

For each relevant match, provide:
1. The prospect's name and company
2. A relevance score (0-100) based on how well the report aligns with their profile
3. Specific reasoning for why this prospect would be interested
4. Which sections or topics from the report would be most relevant to them
5. Suggested approach for sharing this content

Consider their stage (prospect, qualified, proposal), engagement level, and interest tags when scoring relevance.
Only include prospects with a relevance score of 50 or higher. Rank by relevance score (highest first).`
          },
          {
            role: "user",
            content: `Report Content to analyze:
${reportContent}

Prospects to match against:
${prospects.map(p => `
Name: ${p.name}
Company: ${p.company}
Stage: ${p.stage || 'prospect'}
Likelihood of Closing: ${p.likelihood_of_closing || 'medium'}
Engagement Level: ${p.engagement_level || 'none'}
Notes: ${p.notes || 'No additional notes'}
Interest Tags: ${p.interest_tags ? (Array.isArray(p.interest_tags) ? p.interest_tags.join(', ') : JSON.stringify(p.interest_tags)) : 'No tags'}
How Heard: ${p.how_heard || 'Not specified'}
`).join('\n---\n')}

Please analyze this report content and identify which prospects would be most interested, providing detailed matching information in the following JSON format:

{
  "matches": [
    {
      "name": "prospect name",
      "company": "company name", 
      "relevanceScore": 85,
      "interests": ["matched interest 1", "matched interest 2"],
      "reasoning": "Detailed explanation of why this prospect matches",
      "suggestedContent": "Specific sections or insights to highlight when sharing"
    }
  ]
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResponse = completion.choices[0]?.message?.content;
      
      if (!aiResponse) {
        return res.status(500).json({ error: "Failed to generate prospect matches" });
      }

      try {
        const parsedResponse = JSON.parse(aiResponse);
        
        // Validate and clean the response
        const matches = parsedResponse.matches?.filter((match: any) => {
          console.log("Validating match:", match);
          return match.name && match.relevanceScore >= 50;
        }).sort((a: any, b: any) => b.relevanceScore - a.relevanceScore) || [];
        
        console.log(`Filtered matches: ${matches.length} out of ${parsedResponse.matches?.length || 0}`);

        res.json({ 
          matches,
          total: matches.length,
          analysisDate: new Date().toISOString()
        });

      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        res.status(500).json({ error: "Failed to parse prospect matching results" });
      }

    } catch (error) {
      console.error("Error in prospect matching:", error);
      res.status(500).json({ error: "Failed to match prospects" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}