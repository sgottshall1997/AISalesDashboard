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

  // AI Content Tools endpoints
  app.get("/api/ai/content-suggestions", async (req: Request, res: Response) => {
    try {
      const suggestions = [
        {
          type: "frequent_theme",
          title: "China Technology Investment Outlook",
          description: "Analysis of technology sector opportunities in Chinese markets",
          emailAngle: "Given your interest in emerging markets and technology, our latest analysis on China's tech sector reveals compelling investment opportunities despite regulatory headwinds.",
          supportingReports: ["China Tech Q4 2024", "APAC Market Update"],
          keyPoints: [
            "Regulatory environment stabilizing for major tech platforms",
            "AI and semiconductor opportunities emerging",
            "Consumer spending patterns shifting to digital services"
          ],
          insights: [
            "Government policy support for AI development creating investment opportunities",
            "Consumer tech recovery showing early signs of momentum"
          ],
          priority: "high"
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
  app.post("/api/match-prospect-themes", async (req: Request, res: Response) => {
    try {
      const { reportTitle } = req.body;

      if (!reportTitle) {
        return res.status(400).json({ error: "Report title is required" });
      }

      const matches = [
        {
          clientName: "Capital Investment Partners",
          matchScore: 85,
          matchReason: `Strong interest in technology themes discussed in ${reportTitle}`,
          interests: ["Technology", "China Markets", "Growth Investing"],
          relevantThemes: ["Tech Innovation", "Market Expansion"],
          suggestedTalkingPoints: [
            "Technology sector opportunities in emerging markets",
            "Regulatory environment impact on growth prospects",
            "Portfolio positioning for tech recovery"
          ]
        },
        {
          clientName: "Emerging Markets Fund",
          matchScore: 72,
          matchReason: `Geographic focus aligns with report themes`,
          interests: ["Emerging Markets", "Sector Rotation"],
          relevantThemes: ["Market Dynamics", "Economic Growth"],
          suggestedTalkingPoints: [
            "Emerging market recovery indicators",
            "Sector-specific investment opportunities",
            "Risk management in volatile markets"
          ]
        }
      ];

      res.json({ matches });
    } catch (error) {
      res.status(500).json({ error: "Failed to find prospect matches" });
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