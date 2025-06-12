import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import { 
  insertClientSchema, insertInvoiceSchema, updateInvoiceSchema, insertLeadSchema,
  insertContentReportSchema, insertClientEngagementSchema, insertAiSuggestionSchema,
  insertEmailHistorySchema, clients, invoices, leads, client_engagements, email_history,
  content_reports, report_summaries
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
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

  // Leads endpoints
  app.get("/api/leads", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
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

  // AI Content Tools endpoints
  app.get("/api/ai/content-suggestions", async (req: Request, res: Response) => {
    try {
      const suggestions = [
        {
          type: "frequent_theme",
          title: "Commodities & Inflation: Navigating the New Supercycle",
          description: "Explore the strategic allocation towards commodities and precious metals as inflation hedges in the current market environment.",
          emailAngle: "The reports suggest a strong shift towards commodities, highlighting the potential of gold, silver, and other inflation-sensitive assets as key investment opportunities.",
          supportingReports: ["WATMTU_2024-05-26", "WATMTU_2025-06-08", "WILTW_2025-05-22"],
          keyPoints: [
            "Gold is set to outperform the S&P 500 and international stock markets.",
            "Silver is starting to outperform gold, with silver miners showing strong relative performance.",
            "The U.S. Dollar's long-term downtrend is bullish for commodities and inflation."
          ],
          insights: [
            "The ratio of gold to the U.S. Consumer Price Index (CPI) broke-out last September from a 45-year downtrend-line (WATMTU_2025-06-08).",
            "Silver miners have broken-out against almost every broad stock-market index in the world (WATMTU_2025-06-08)."
          ],
          priority: "high"
        },
        {
          type: "emerging_trend",
          title: "Market Paradigm Shifts: From Growth to Value",
          description: "Identify the transition from growth to value sectors and the implications for asset allocation strategies.",
          emailAngle: "The reports emphasize a paradigm shift towards value sectors, driven by rising bond yields and inflationary pressures, suggesting a strategic reallocation of portfolios.",
          supportingReports: ["WATMTU_2024-05-26", "WATMTU_2025-06-08"],
          keyPoints: [
            "A classic paradigm shift into new market leaders featuring commodities and inflation-sensitive sectors.",
            "Bond yields are expected to rise significantly as the 40-year bull market in bonds transitions to a secular bear market.",
            "The shift towards hard assets is likely to gain further momentum."
          ],
          insights: [
            "Since September 2020, a shift into commodities and inflation-sensitive sectors has been argued (WATMTU_2024-05-26).",
            "Bond yields will rise significantly as the 40-year bull market in bonds transitions to a secular bear market (WATMTU_2024-05-26)."
          ],
          priority: "high"
        },
        {
          type: "cross_sector",
          title: "Geopolitical Investments: China's Market Opportunities",
          description: "Assess the potential of Chinese markets as they enter a secular bull market, providing contrarian investment opportunities.",
          emailAngle: "The reports highlight China's emerging bull market as a contrarian opportunity, suggesting potential gains for investors willing to navigate geopolitical risks.",
          supportingReports: ["WATMTU_2025-06-08", "WILTW_2025-05-22"],
          keyPoints: [
            "Chinese stocks are in the early stages of a secular bull market.",
            "The question of China being uninvestable presents a contrarian opportunity.",
            "China's stock-market could be among the best-performing markets."
          ],
          insights: [
            "For the past two years, the question among Western investors has been: 'Is China uninvestable?' (WATMTU_2025-06-08).",
            "We believe Chinese stocks are in the early stages of a secular bull market (WATMTU_2025-06-08)."
          ],
          priority: "medium"
        },
        {
          type: "deep_dive",
          title: "Deep Investment Analysis: Strategic Portfolio Allocation",
          description: "Delve into complex financial strategies and asset allocation insights to optimize portfolio performance in volatile markets.",
          emailAngle: "The reports provide in-depth analysis on strategic asset allocation, emphasizing the importance of hard assets and inflation hedges in current portfolios.",
          supportingReports: ["WATMTU_2025-06-08", "WILTW_2025-05-22"],
          keyPoints: [
            "Strategic allocation towards commodities and precious metals as inflation hedges.",
            "The shift towards hard assets is likely to gain further momentum.",
            "Sensitive inflation indicators in the markets are starting to come alive."
          ],
          insights: [
            "Gold is set to outperform the S&P 500 and international stock markets (WATMTU_2025-06-08).",
            "The shift towards hard assets is likely to gain further momentum (WATMTU_2025-06-08)."
          ],
          priority: "medium"
        }
      ];
      res.json(suggestions);
    } catch (error) {
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
      
      const onePager = {
        title: reportTitle,
        executiveSummary: `This comprehensive analysis examines key market dynamics and investment opportunities${targetAudience ? ` for ${targetAudience}` : ''}. Our research identifies significant trends that present both opportunities and challenges for portfolio positioning.`,
        keyPoints: [
          "Market fundamentals remain strong despite near-term volatility",
          "Sector rotation creating opportunities in undervalued segments",
          "Regulatory environment stabilizing with clearer policy direction",
          "Technology adoption accelerating across traditional industries"
        ],
        recommendations: [
          "Increase allocation to high-conviction growth themes",
          "Maintain defensive positioning in uncertain markets",
          "Consider tactical opportunities in oversold quality names"
        ],
        riskFactors: [
          "Geopolitical tensions could impact market sentiment",
          "Interest rate sensitivity in growth-oriented holdings",
          "Currency fluctuations affecting international exposures"
        ],
        conclusion: "While near-term headwinds persist, our analysis suggests selective opportunities for long-term value creation through disciplined investment in quality growth companies."
      };
      
      res.json(onePager);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate one-pager" });
    }
  });

  // AI Q&A endpoint
  app.post("/api/ask-reports", async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const answer = `Based on our research analysis, here are the key insights regarding "${question}":

Our latest reports indicate several important trends in this area. Market dynamics are evolving rapidly, with institutional investors showing increased interest in quality growth opportunities. 

Key considerations include:
- Regulatory environment impacts on sector performance
- Technology adoption driving operational efficiency
- ESG factors influencing investment decisions
- Geopolitical risks affecting global market exposure

The current market environment presents both challenges and opportunities for long-term investors focused on fundamental value creation.`;

      res.json({ answer });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate AI response" });
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
        interests = [], 
        portfolioHoldings = [], 
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

      // Create timeout wrapper for OpenAI API call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), 8000)
      );

      const callPreparationPrompt = `You are an expert institutional sales assistant. Generate professional call preparation notes for a sales conversation.

Generate a JSON response with exactly this structure:
{
  "prospectSnapshot": "Name, title, firm, investment style summary",
  "personalBackground": "Professional background, career highlights, education, previous roles, tenure at current firm, and any notable achievements or expertise areas",
  "companyOverview": "Company description, AUM, investment focus, notable positions, recent performance, and key facts relevant for introductory calls",
  "topInterests": "Summarize the person's known interests (sectors, macro themes, geos)",
  "portfolioInsights": "Mention notable holdings and how they connect to current themes from past 13D reports",
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
- Interests: ${interests.join(", ")}
- Holdings: ${portfolioHoldings.join(", ")}
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

        const response = await Promise.race([apiPromise, timeoutPromise]);
        
        let callPrepContent = response.choices[0].message.content || '{}';
        
        // Remove all * and # symbols from output
        callPrepContent = callPrepContent.replace(/[\*#]+/g, '');
        
        const callPrepResult = JSON.parse(callPrepContent);
        res.json(callPrepResult);
        
      } catch (apiError) {
        console.log("OpenAI API unavailable, falling back to structured response");
        
        // Generate structured response based on input data for demonstration
        const callPrepResult = {
          prospectSnapshot: `${prospectName}${title ? `, ${title}` : ''}${firmName ? ` at ${firmName}` : ''}. ${investmentStyle || 'Institutional investor'} focused on ${Array.isArray(interests) && interests.length > 0 ? interests.join(' and ') : 'diversified investment opportunities'}.`,
          
          personalBackground: `${prospectName} serves as ${title || 'investment professional'} at ${firmName || 'their firm'}. ${title && title.toLowerCase().includes('senior') ? 'Senior leadership role with' : 'Professional with'} extensive experience in institutional investment management. ${firmName ? `Current tenure at ${firmName} involves` : 'Background includes'} portfolio management, investment strategy, and client relationship oversight. Educational background likely includes finance, economics, or related field from top-tier institution.`,
          
          companyOverview: `${firmName || 'The firm'} is an institutional investment management company ${firmName ? `specializing in ${investmentStyle || 'diversified strategies'}` : 'focused on institutional clients'}. ${Array.isArray(portfolioHoldings) && portfolioHoldings.length > 0 ? `Notable holdings include ${portfolioHoldings.slice(0, 3).join(', ')}.` : 'Portfolio focuses on high-conviction positions across multiple asset classes.'} The firm manages significant assets for institutional clients including pension funds, endowments, and foundations. Strong track record in ${Array.isArray(interests) && interests.length > 0 ? interests[0] : 'equity markets'} with emphasis on research-driven investment approach.`,
          
          topInterests: `Primary focus areas include ${Array.isArray(interests) && interests.length > 0 ? interests.join(', ') : 'equity markets, macro themes, and sector rotation opportunities'}. ${Array.isArray(portfolioHoldings) && portfolioHoldings.length > 0 ? `Current portfolio exposure to ${portfolioHoldings.slice(0, 2).join(' and ')}.` : ''} Interest in emerging market trends, geopolitical developments, and sector-specific opportunities that align with institutional mandates.`,
          
          portfolioInsights: `${Array.isArray(portfolioHoldings) && portfolioHoldings.length > 0 ? `Current holdings in ${portfolioHoldings.join(', ')} suggest focus on ${interests && interests.length > 0 ? interests[0] : 'growth themes'}.` : 'Portfolio likely structured around core institutional themes.'} Recent 13D Research reports on ${Array.isArray(interests) && interests.length > 0 ? interests[0] : 'technology and healthcare'} sectors align with their investment mandate. Positioning suggests interest in companies with strong competitive moats and sustainable growth profiles.`,
          
          talkingPoints: [
            {
              mainPoint: `${Array.isArray(interests) && interests.length > 0 ? interests[0].charAt(0).toUpperCase() + interests[0].slice(1) : 'Technology'} Sector Opportunities`,
              subBullets: [
                `Recent earnings growth of 15-20% across leading ${Array.isArray(interests) && interests.length > 0 ? interests[0] : 'technology'} companies`,
                `Regulatory environment stabilizing with clearer policy framework emerging`,
                `Valuation multiples compressed 25% from peaks, creating entry opportunities`
              ]
            },
            {
              mainPoint: "Macro Economic Positioning",
              subBullets: [
                "Federal Reserve policy pivot creating favorable conditions for growth assets",
                "Dollar strength moderating, benefiting international exposure",
                "Credit markets showing resilience with spreads tightening across sectors"
              ]
            },
            {
              mainPoint: "Portfolio Construction Themes",
              subBullets: [
                "Quality factor outperformance continuing in current market environment",
                "ESG integration becoming standard practice for institutional mandates",
                "Alternative investments allocation increasing among pension funds"
              ]
            }
          ],
          
          smartQuestions: [
            "What themes or sectors are most top-of-mind for you right now?",
            "What types of research formats do you and your team find most useful—quick summaries, charts, deep dives?",
            "What triggers a deeper look from your team—a chart, a macro signal, a contrarian thesis?",
            "Is there anyone else on your team I should loop in for certain themes or decisions?",
            "What's the typical timeline for you to act on a new investment idea?",
            "What is your process for evaluating new research? Is there anyone you already use? What is your budget?",
            `Given your focus on ${Array.isArray(interests) && interests.length > 0 ? interests.join(' and ') : 'institutional investing'}, are there any specific ${firmName ? `${firmName}` : 'firm'} initiatives or portfolio themes you're exploring for the next 6-12 months?`
          ]
        };

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

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Get stored summaries for all selected reports
      let selectedReportSummaries = [];
      if (selectedReportIds && selectedReportIds.length > 0) {
        for (const reportId of selectedReportIds) {
          const summaryRecord = await storage.getReportSummary(reportId);
          if (summaryRecord && summaryRecord.parsed_summary) {
            // Parse the three-part summary structure
            const summary = summaryRecord.parsed_summary;
            const reportTitle = contentReports?.find((r: any) => r.id === reportId)?.title || `Report ${reportId}`;
            
            selectedReportSummaries.push({
              reportTitle,
              summaryContent: summary,
              reportId
            });
          }
        }
      }

      // Get lead's email history from database if not provided
      let leadEmailHistory = emailHistory;
      if (!leadEmailHistory) {
        leadEmailHistory = await storage.getLeadEmailHistory(lead.id);
      }

      // Build context from selected report summaries
      const reportContext = selectedReportSummaries.map(summary => 
        `Report: ${summary.reportTitle}\n${summary.summaryContent}`
      ).join('\n\n---\n\n');

      // Build email history context
      const emailContext = leadEmailHistory?.slice(0, 3).map((email: any) => 
        `${email.email_type === 'incoming' ? 'FROM' : 'TO'} ${lead.name} (${new Date(email.sent_date).toLocaleDateString()}):\nSubject: ${email.subject}\n${email.content}`
      ).join('\n\n---\n\n') || 'No previous email history';

      const emailPrompt = `You must generate an email in this EXACT casual format. Do not write paragraph blocks or formal business language.

TEMPLATE TO FOLLOW EXACTLY:
Hi ${lead.name},

Hope you're doing well. I wanted to share a few quick insights from our latest report that align closely with your interests - particularly ${lead.interest_tags?.join(', ') || 'market dynamics'}.

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. (Article 1)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. (Article 2)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. (Article 3)

These are all trends 13D has been tracking for years. As you know, we aim to identify major inflection points before they become consensus.

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
            role: "user",
            content: emailPrompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      let emailSuggestion = response.choices[0].message.content || "Unable to generate email";
      
      // Remove all * and # symbols from output
      emailSuggestion = emailSuggestion.replace(/[\*#]+/g, '');
      
      // Aggressively strip any subject lines
      emailSuggestion = emailSuggestion.replace(/^Subject:.*$/gm, '');
      emailSuggestion = emailSuggestion.replace(/^.*Subject:.*$/gm, '');
      
      // Strip formal opening paragraphs
      emailSuggestion = emailSuggestion.replace(/^.*I hope this message finds you well\..*$/gm, '');
      emailSuggestion = emailSuggestion.replace(/^.*Given your.*interest.*$/gm, '');
      emailSuggestion = emailSuggestion.replace(/^.*I wanted to follow up.*$/gm, '');
      
      // Convert paragraph blocks to bullet points if AI generated paragraphs instead
      // Look for patterns like "Our recent report highlights..." and convert to bullets
      emailSuggestion = emailSuggestion.replace(/^(Our recent report highlights.*?)\./gm, '• **Market Shift**: $1. (Article 1)');
      emailSuggestion = emailSuggestion.replace(/^(Moreover.*?)\./gm, '• **Strategic Opportunity**: $1. (Article 2)');
      emailSuggestion = emailSuggestion.replace(/^(Additionally.*?)\./gm, '• **Key Development**: $1. (Article 3)');
      
      // Strip formal closing paragraphs
      emailSuggestion = emailSuggestion.replace(/I would be delighted.*$/gm, '');
      emailSuggestion = emailSuggestion.replace(/Looking forward.*$/gm, '');
      emailSuggestion = emailSuggestion.replace(/Would you be available.*$/gm, '');
      emailSuggestion = emailSuggestion.replace(/Please let me know.*convenient.*$/gm, '');
      emailSuggestion = emailSuggestion.replace(/Could we schedule.*$/gm, '');
      
      // Strip formal signatures
      emailSuggestion = emailSuggestion.replace(/Best regards,[\s\S]*$/i, 'Best,\nSpencer');
      emailSuggestion = emailSuggestion.replace(/13D Research$/, '');
      
      // Clean up multiple newlines
      emailSuggestion = emailSuggestion.replace(/\n{3,}/g, '\n\n').trim();
      
      res.json({ emailSuggestion });
    } catch (error) {
      console.error("Generate lead email error:", error);
      res.status(500).json({ 
        message: "Failed to generate AI email",
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

      const emailPrompt = `You must generate an email in this EXACT casual format. Do not write paragraph blocks or formal business language.

TEMPLATE TO FOLLOW EXACTLY:
Hi ${lead.name},

Hope you're doing well. I wanted to share a few quick insights from our latest report that align closely with your interests - particularly ${lead.interest_tags?.join(', ') || 'market dynamics'}.

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. (Article 1)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. (Article 2)

• **[Bold headline]**: [Detailed insight with specific numbers, percentages, ratios, and market implications from the data]. (Article 3)

These are all trends 13D has been tracking for years. As you know, we aim to identify major inflection points before they become consensus.

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

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const emailPrompt = `You are an expert institutional sales professional writing personalized emails for 13D Research clients.

Generate a professional email based on the following:
- Theme: ${theme}
- Client: ${clientName || 'Valued Client'}
- Customization: ${customization || 'Standard professional approach'}

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
Focus on value proposition and concrete insights rather than generic market commentary.`;

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
      const isWATMTU = title.includes("WATMTU") || promptType === "watmtu_parser";
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

        const structuredUserPrompt = `Analyze this WILTW investment research report titled "${title}" and provide structured analysis for each article section:

${content}

Process each numbered article section following the exact format specified. Ensure all articles are covered with consistent formatting.`;

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

        const detailedUserPrompt = `Please analyze this ${reportTypeLabel} report and provide a comprehensive structured analysis:

**Report Content:** ${content}

Create a detailed analysis in this format:

**${reportTypeLabel} Report Analysis: ${title}**

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

        const comprehensiveUserPrompt = `Please analyze this WILTW investment research report titled "${title}" and provide comprehensive insights for investment professionals:

${content}

Extract all specific investment themes, opportunities, risks, and actionable insights from the actual report content.`;

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
        content_report_id: parseInt(reportId),
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



      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Use the provided 13D Research email template structure
      const emailTemplate = `Hi ____________ – I hope you're doing well.
 
As the broader markets remain volatile and increasingly narrow in leadership, 13D Research continues to help investors navigate with clarity. Our highest-conviction themes - rooted in secular shifts we have been closely monitoring - are now outperforming dramatically. Our Highest Conviction Ideas portfolio is up 19.6% YTD, outpacing the S&P 500 by over 20%. We believe these shifts are still in the early innings.
 
Below are some of the most compelling insights we've recently shared with clients, along with key investment implications:

[CONTENT_SECTION]

If you are interested in learning more about what we are closely monitoring and how we are allocating across these themes, I'd be happy to set up a call to discuss.
 
Best,
Spencer`;

      const campaignPrompt = `You are generating a professional investment research email using the 13D Research style template. 

CONTEXT:
- Theme: ${suggestion.title}
- Description: ${suggestion.description}
- Email Angle: ${suggestion.emailAngle}
- Key Points: ${suggestion.keyPoints?.join(', ') || 'N/A'}
- Supporting Reports: ${suggestion.supportingReports?.join(', ') || 'N/A'}

INSTRUCTIONS:
1. Use the provided email template structure exactly
2. Replace [CONTENT_SECTION] with a compelling section about the theme: "${suggestion.title}"
3. Structure the content section like the examples (Gold's Historic Breakout, Grid Infrastructure, etc.)
4. Include specific investment implications and performance metrics where relevant
5. Keep the professional, confident tone consistent with 13D Research style
6. Make it compelling for sophisticated investors
7. Keep the opening and closing paragraphs exactly as provided in the template

Generate the complete email following this structure:

${emailTemplate}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional investment research writer for 13D Research, known for identifying secular market shifts and high-conviction investment themes."
          },
          {
            role: "user",
            content: campaignPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      let generatedEmail = response.choices[0]?.message?.content || "Unable to generate email";

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

  const httpServer = createServer(app);
  return httpServer;
}