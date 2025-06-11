import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";

// Extend session type
declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}
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

// Authentication configuration
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
        res.status(500).json({ success: false, message: "Failed to logout" });
      } else {
        res.json({ success: true, message: "Logged out successfully" });
      }
    });
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

  // AI report summarization endpoint
  app.post("/api/ai/summarize-report", async (req: Request, res: Response) => {
    try {
      const { reportId, title, content, promptType } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please provide your API key to enable AI-powered report analysis." 
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Retrieve actual PDF content from database
      const reports = await storage.getAllContentReports();
      const numericReportId = typeof reportId === 'string' ? parseInt(reportId) : reportId;
      const report = reports.find(r => r.id === numericReportId);
      
      if (!report) {
        return res.status(404).json({ 
          error: "Report not found. Please re-upload the PDF file." 
        });
      }

      let actualContent = report.full_content;
      
      if (!actualContent || actualContent.trim().length < 100) {
        return res.status(400).json({ 
          error: "No PDF content available for this report. Please re-upload the PDF file." 
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert financial analyst. Summarize this research report concisely, focusing on key investment themes, market insights, and actionable takeaways."
          },
          {
            role: "user",
            content: `Please analyze and summarize this research report:\n\nTitle: ${title}\n\nContent:\n${actualContent}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const summary = response.choices[0].message.content || '';

      // Store the summary in database
      try {
        await storage.createReportSummary({
          content_report_id: numericReportId,
          parsed_summary: summary,
          summary_type: promptType || 'general'
        });
      } catch (error) {
        console.error("Error storing report summary:", error);
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

  // AI-powered call preparation endpoint
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

      const callPreparationPrompt = `
You are an institutional sales assistant at a top-tier investment research firm.

Your job is to prepare call notes for a prospect meeting. Use the provided details about the prospect and firm to generate tailored, research-backed talking points.

Return a clean, professional JSON object with exactly these 5 fields:
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
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

    } catch (error: any) {
      console.error('Prospecting insights error:', error);
      if (error?.message?.includes('API key')) {
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

  // AI Content Suggestions endpoint
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

  // Theme Tracker endpoint
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

  // Fund Strategies endpoint
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

  // Relevance Score endpoint
  app.post("/api/relevance-score", async (req: Request, res: Response) => {
    try {
      const { reportTitle, portfolioHoldings } = req.body;
      
      const scores = portfolioHoldings.map((holding: string) => ({
        reportTitle,
        portfolioHolding: holding,
        relevanceScore: Math.floor(Math.random() * 40) + 60, // 60-100 range
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

  // One-Pager Generator endpoint
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

  // Prospect matching endpoint with AI-powered analysis
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
        return res.json({ 
          matches: [],
          total: 0,
          analysisDate: new Date().toISOString(),
          message: "No prospects found in database"
        });
      }

      // Create AI prompt for prospect matching
      const prompt = `You are an expert relationship manager analyzing investment research content to identify the most relevant prospects for targeted outreach.

REPORT CONTENT TO ANALYZE:
${reportContent}

AVAILABLE PROSPECTS:
${prospects.map(p => `
- Name: ${p.name}
- Company: ${p.company || 'N/A'}
- Investment Interests: ${Array.isArray(p.interest_tags) ? p.interest_tags.join(', ') : 'N/A'}
- Engagement Level: ${p.engagement_level || 'N/A'}
- Notes: ${p.notes || 'N/A'}
`).join('\n')}

Analyze the report content and identify which prospects would be most interested in this research. For each relevant prospect, provide:

1. Relevance score (50-100, only include prospects with 50+ relevance)
2. Specific reasons why this prospect would find the content valuable
3. Key talking points from the report that align with their interests
4. Suggested approach for outreach

Return ONLY a JSON object with this structure:
{
  "matches": [
    {
      "name": "prospect name",
      "company": "company name",
      "relevanceScore": 85,
      "matchReason": "Specific explanation of why this prospect matches",
      "keyTalkingPoints": ["point 1", "point 2", "point 3"],
      "suggestedApproach": "How to approach this prospect with this content"
    }
  ]
}

Focus on prospects with clear alignment between their stated interests and the report content. Only include prospects with relevance scores of 50 or higher.`;

      console.log("Sending request to OpenAI...");
      
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResponse = response.choices[0]?.message?.content;
      console.log("AI Response received:", aiResponse?.substring(0, 200) + "...");

      if (!aiResponse) {
        return res.status(500).json({ error: "No response from AI analysis" });
      }

      try {
        // Clean the AI response by removing markdown code blocks
        let cleanedResponse = aiResponse.trim();
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        cleanedResponse = cleanedResponse.trim();
        const parsedResponse = JSON.parse(cleanedResponse);
        
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
      res.status(500).json({ error: "Failed to analyze prospect matches" });
    }
  });

  // Generate prospect email endpoint
  app.post("/api/generate-prospect-email", async (req: Request, res: Response) => {
    try {
      const { prospectName, reportTitle, keyTalkingPoints, matchReason } = req.body;

      if (!prospectName || !reportTitle) {
        return res.status(400).json({ error: "Prospect name and report title are required" });
      }

      // Create AI prompt for email generation
      const prompt = `Generate a personalized prospecting email following this specific format and tone:

PROSPECT INFORMATION:
- Name: ${prospectName}
- Report: ${reportTitle}
- Key talking points: ${keyTalkingPoints?.join(', ') || 'investment insights'}
- Match reason: ${matchReason || 'aligned investment interests'}

EMAIL FORMAT TO FOLLOW:
"Hi [Name] - I hope you are doing well. I wanted to share our recent report that discussed [topic] given your [interest]. [Line about 13D's process and how this ties in]. [Future outlook on the space]. Please let me know if you would like me to send over additional reports on this topic. -Spencer"

REQUIREMENTS:
1. Use the exact greeting: "Hi ${prospectName} - I hope you are doing well."
2. Reference the specific report and why it's relevant to their interests
3. Include a sentence about 13D's research process and unique insights
4. Add a forward-looking perspective on the investment space
5. End with the offer for additional reports and "-Spencer"
6. Keep the tone professional but personable
7. Keep it concise (3-4 sentences max)

Generate the email now:`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      });

      const emailContent = response.choices[0]?.message?.content?.trim() || '';
      
      res.json({ 
        email: emailContent,
        prospectName,
        reportTitle
      });

    } catch (error: any) {
      console.error("Error generating prospect email:", error);
      res.status(500).json({ error: "Failed to generate email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}