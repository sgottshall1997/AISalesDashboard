import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
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

  // Dashboard overview with stats and priority actions
  app.get("/api/dashboard/overview", async (req, res) => {
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
        console.log('Content chunked, new length:', actualContent.length);
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
        // First, use our enhanced parser to extract structured articles
        const parsedData = parseWILTWReport(actualContent);
        
        systemPrompt = `You are an expert investment research analyst and summarizer. You've received a detailed WILTW report from 13D Research dated ${title || report.title}. The report contains ${parsedData.articles.length} numbered articles that have been pre-extracted.

For EACH of the ${parsedData.articles.length} articles provided, create a comprehensive analysis following this EXACT format:

**ARTICLE [NUMBER]: [TITLE]**

**Core Thesis:** [2-3 sentence summary of the main argument]

**Key Insights:**
• [First key insight with specific data/quotes]
• [Second key insight with supporting evidence]  
• [Third key insight with implications]
• [Fourth insight if substantial content available]

**Investment Implications:** [Forward-looking themes and opportunities for investors]

**Recommended Names:** [Any specific stocks, ETFs, indices, or investment vehicles mentioned]

**Category Tag:** [One primary category: Geopolitics, China, Technology, AI, Energy, Commodities, Climate, Markets, Culture, Education, Europe, Defense, Longevity, Macro, or Other]

---

CRITICAL REQUIREMENTS:
- Process ALL ${parsedData.articles.length} articles - do not skip any
- Maintain consistent formatting across all articles
- Extract specific data points, percentages, and concrete details
- Each article must have the exact same structure and depth of analysis
- Use the article numbers and titles exactly as provided`;

        userPrompt = `Analyze these ${parsedData.articles.length} pre-extracted articles from the WILTW report "${title || report.title}". Process each article thoroughly and maintain consistent formatting:

${parsedData.articles.map(article => `
**ARTICLE ${article.number}: ${article.title}**
Content: ${article.fullContent}
`).join('\n---\n')}

MANDATORY: Create detailed analysis for ALL ${parsedData.articles.length} articles using the exact format specified. Do not skip any articles and maintain consistent depth across all analyses.`;
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

      // Generate the structured article-by-article analysis
      const structuredSystemPrompt = `You are an expert investment research analyst and summarizer. You've received a detailed WILTW report from 13D Research dated ${title || report.title}. The report is divided into a large number of clearly titled article sections (Ie 01, 02, 03, etc.).

For each article, do the following:
1. Headline: Identify and restate the article's title.
2. Core Thesis: Summarize the main argument or thesis in 2–3 sentences.
3. Key Insights: Bullet the top 3–5 data points, quotes, or arguments that support the thesis.
4. Investment Implications: If applicable, list any forward-looking insights or themes that investors should pay attention to.
5. Recommended Names (if any): List any specific equities, ETFs, or indices mentioned.
6. Category Tag: Assign a category from this list — Geopolitics, China, Technology, AI, Energy, Commodities, Climate, Markets, Culture, Education, Europe, Defense, Longevity, Macro, or Other.

Return the results in a structured format, clearly separating each article.`;

      const structuredUserPrompt = `Analyze this investment research report titled "${title || report.title}" and provide structured analysis for each article section:

${actualContent}

Process each numbered article section following the exact format specified. Ensure all articles are covered with consistent formatting.`;

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

      const structuredSummary = structuredResponse.choices[0].message.content;

      // Generate the comprehensive summary
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

      const comprehensiveUserPrompt = `Please analyze this investment research report titled "${title || report.title}" and provide comprehensive insights for investment professionals:

${actualContent}

Extract all specific investment themes, opportunities, risks, and actionable insights from the actual report content.`;

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

      const comprehensiveSummary = comprehensiveResponse.choices[0].message.content;

      // Combine all three summaries for the response with proper spacing
      const combinedSummary = `## Structured Article-by-Article Analysis

${structuredSummary}

\n\n---\n\n

## Detailed Article Analysis

${detailedSummary}

\n\n---\n\n

## Comprehensive Investment Summary

${comprehensiveSummary}`;

      const summary = combinedSummary;
      
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

  const httpServer = createServer(app);
  return httpServer;
}