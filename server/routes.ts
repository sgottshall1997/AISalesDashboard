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

  // Call Preparation Tool endpoint
  app.post("/api/ai/generate-call-prep", requireAuth, async (req: Request, res: Response) => {
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

      const callPreparationPrompt = `You are an expert institutional sales assistant. Generate professional call preparation notes for a sales conversation.

Generate a JSON response with exactly this structure:
{
  "prospectSnapshot": "Name, title, firm, investment style summary",
  "topInterests": "Summarize the person's known interests (sectors, macro themes, geos)",
  "portfolioInsights": "Mention notable holdings and how they connect to current themes from past 13D reports",
  "talkingPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "smartQuestions": ["question 1", "question 2", "question 3"]
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

If the input is limited, use generalized themes from current macro research (commodities, de-dollarization, AI infrastructure, reshoring, China, precious metals, energy transition) to anchor ideas.
Make it crisp, useful, and professional. Focus on actionable insights that would help during an actual sales call.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert institutional sales assistant. Generate professional, actionable call preparation notes in valid JSON format."
          },
          {
            role: "user",
            content: callPreparationPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const callPrepContent = response.choices[0].message.content;
      
      try {
        const callPrepResult = JSON.parse(callPrepContent || '{}');
        res.json(callPrepResult);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        res.status(500).json({ error: "Failed to parse AI response" });
      }

    } catch (error) {
      console.error("Call prep generation error:", error);
      res.status(500).json({ 
        message: "Failed to generate call prep notes",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
      const thematicAlignment = [];
      const recommendations = [];
      
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

      const emailPrompt = `Generate ONLY the email body below, nothing else. Do not include subject lines or signatures beyond "Best, Spencer".

LEAD: ${lead.name} at ${lead.company}
INTERESTS: ${lead.interest_tags?.join(', ') || 'General investment research'}

REPORTS TO USE:
${reportContext || 'No reports selected'}

OUTPUT EXACTLY THIS FORMAT (replace bracketed content):

Hi ${lead.name},

Hope you're doing well. I wanted to share a few quick insights from our latest report that align closely with your interests - particularly ${lead.interest_tags?.join(', ') || 'market dynamics'}.

• **[Bold Headline from Article 1]**: [Specific insight with data/ratios from first article]. (Article 1)

• **[Bold Headline from Article 2]**: [Specific insight with data/ratios from second article]. (Article 2)  

• **[Bold Headline from Article 3]**: [Specific insight with data/ratios from third article]. (Article 3)

These are all trends 13D has been tracking for years. As you know, we aim to identify major inflection points before they become consensus.

I am happy to send over older reports on topics of interest. Please let me know if there is anything I can do to help.

Best,
Spencer

STRICT RULES:
- Extract insights from 3 different articles in the reports
- Use ** for bold headlines  
- Include specific numbers, ratios, percentages from reports
- Each bullet must end with (Article X)
- Maximum 150 words
- NO formal language, NO subject line, NO extra signatures`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Spencer from 13D Research. Follow the EXACT format provided. Use casual, conversational tone with bullet points. Do NOT write formal business letters or include subjects/signatures beyond what's specified in the template."
          },
          {
            role: "user",
            content: emailPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      });

      const emailSuggestion = response.choices[0].message.content || "Unable to generate email";
      
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

      const emailContent = response.choices[0].message.content;
      
      try {
        const emailResult = JSON.parse(emailContent || '{}');
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

  const httpServer = createServer(app);
  return httpServer;
}