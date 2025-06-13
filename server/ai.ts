import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

export interface ContentSuggestion {
  type: "frequent_theme" | "emerging_trend" | "cross_sector" | "deep_dive";
  title: string;
  description: string;
  emailAngle: string;
  supportingReports: string[];
  keyPoints: string[];
  insights: string[]; // 2-3 traceable insights from source reports
  priority: "low" | "medium" | "high";
}

export async function generateThemeBasedEmailSuggestions(
  reports: any[]
): Promise<ContentSuggestion[]> {
  try {
    if (!reports || reports.length === 0) {
      return [];
    }

    // Get High Conviction portfolio data for context
    const { db } = await import("./db");
    const { portfolio_constituents } = await import("@shared/schema");
    const { desc, eq } = await import("drizzle-orm");
    
    const hcHoldings = await db.select()
      .from(portfolio_constituents)
      .where(eq(portfolio_constituents.isHighConviction, true))
      .orderBy(desc(portfolio_constituents.weightInHighConviction))
      .limit(30);

    // Group holdings by index for thematic reference
    const indexHoldings = hcHoldings.reduce((acc: Record<string, any[]>, holding: any) => {
      if (holding.index) {
        if (!acc[holding.index]) acc[holding.index] = [];
        acc[holding.index].push(holding);
      }
      return acc;
    }, {} as Record<string, any[]>);

    const reportData = reports.map(report => ({
      title: report.title,
      tags: report.tags || [],
      summary: report.content_summary || '',
      content: report.full_content ? report.full_content.substring(0, 2000) : '',
      publishedDate: report.published_date
    }));

    const portfolioContext = `
13D HIGH CONVICTION PORTFOLIO HOLDINGS (165 securities, 85.84% total weight):
- Gold/Mining Sector (35.5%): ${Object.keys(indexHoldings).filter(idx => idx.includes('Gold') || idx.includes('Miners')).slice(0, 3).join(', ')}
- Commodities Sector (23.0%): ${Object.keys(indexHoldings).filter(idx => idx.includes('Commodity') || idx.includes('Energy')).slice(0, 3).join(', ')}
- China Markets (15.0%): ${Object.keys(indexHoldings).filter(idx => idx.includes('China')).slice(0, 3).join(', ')}

Top HC Index Holdings:
${Object.entries(indexHoldings).slice(0, 8).map(([index, holdings]) => 
  `- ${index}: ${holdings.slice(0, 2).map(h => `${h.ticker} (${h.weightInHcPortfolio}%)`).join(', ')}`
).join('\n')}
`;

    const prompt = `You are analyzing 13D Research reports to create INVESTMENT-FOCUSED email suggestions that connect to actual 13D High Conviction portfolio holdings.

${portfolioContext}

STRICT REQUIREMENTS:
- Do NOT mention client engagement, clicks, or user behavior
- Focus ONLY on investment themes from the actual report content
- Create suggestions based on market insights, not marketing metrics
- CONNECT themes to actual 13D HC portfolio holdings when relevant
- Reference specific portfolio positions that align with report themes

Report Data: ${JSON.stringify(reportData)}

From these WILTW and WATMTU reports, identify 3-4 investment themes that connect to HC portfolio holdings:

1. COMMODITIES & INFLATION - Analysis of precious metals, commodities markets, inflation hedges (reference HC gold/commodity positions)
2. MARKET PARADIGM SHIFTS - Discussion of new market leaders, sector rotations, asset allocation changes (reference relevant HC indexes)
3. GEOPOLITICAL INVESTMENTS - China markets, contrarian opportunities, global economic themes (reference HC China positions)
4. DEEP INVESTMENT ANALYSIS - Complex financial strategies, portfolio allocation insights (reference specific HC holdings)

For each theme found in the reports, create:
- type: "frequent_theme", "emerging_trend", "cross_sector", or "deep_dive"
- title: Professional email subject focused on investment opportunity from report content
- description: Investment angle based primarily on actual report insights (80%) with brief HC portfolio context (20%)
- emailAngle: Specific market perspective derived from the parsed report summaries
- supportingReports: Array of report titles that contain this theme
- keyPoints: 4 actual insights from the report content, mentioning HC portfolio only where thematically relevant
- insights: Array of 2-3 specific, traceable facts from source reports with minimal portfolio references
- priority: "high", "medium", or "low" (prioritize based on report insight strength, not portfolio alignment)

Focus 80% on report content/parsed summaries, 20% on HC portfolio context only where naturally relevant.
Return only JSON: {"suggestions": [...]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a 13D Research investment analyst specializing in identifying investment themes from WILTW and WATMTU reports. Focus on actual market commentary, asset allocation strategies, commodities insights, and economic themes mentioned in the reports. Avoid generic suggestions - base everything on the specific content provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.suggestions || [];
  } catch (error) {
    console.error("Theme-based email suggestions failed:", error);
    return [];
  }
}

export async function generateThemeBasedEmail(
  theme: string,
  emailAngle: string,
  description: string,
  keyPoints: string[],
  supportingReports: string[],
  reports: any[],
  insights?: string[]
): Promise<string> {
  try {
    const reportContent = reports.map(report => ({
      title: report.title,
      content: report.full_content ? report.full_content.substring(0, 2000) : report.content_summary || '',
      publishedDate: report.published_date
    }));

    // Get High Conviction portfolio data to enhance the email
    const { db } = await import("./db");
    const { portfolio_constituents } = await import("@shared/schema");
    const { desc, and, eq } = await import("drizzle-orm");
    
    const hcHoldings = await db.select()
      .from(portfolio_constituents)
      .where(eq(portfolio_constituents.isHighConviction, true))
      .orderBy(desc(portfolio_constituents.weightInHighConviction))
      .limit(20);

    // Group HC holdings by theme for context
    const goldMiners = hcHoldings.filter((h: any) => h.index?.includes('Gold') || h.index?.includes('Miners')).slice(0, 3);
    const chinaHoldings = hcHoldings.filter((h: any) => h.index?.includes('China')).slice(0, 3);
    const commodityHoldings = hcHoldings.filter((h: any) => h.index?.includes('Commodity') || h.index?.includes('Energy')).slice(0, 3);

    // Using Enhancement Plan's exact prompt template specification
    const insightsText = insights && insights.length > 0 ? insights : keyPoints || [];
    
    const portfolioContext = `
13D HIGH CONVICTION PORTFOLIO CONTEXT:
- Total HC Holdings: 165 securities (85.84% portfolio weight)
- Top HC Sectors: Gold/Mining (35.5%), Commodities (23.0%), China Markets (15.0%)
- Key Gold Holdings: ${goldMiners.map(h => `${h.ticker} (${h.weightInHcPortfolio}%)`).join(', ')}
- Key China Holdings: ${chinaHoldings.map(h => `${h.ticker} (${h.weightInHcPortfolio}%)`).join(', ')}
- Key Commodity Holdings: ${commodityHoldings.map(h => `${h.ticker} (${h.weightInHcPortfolio}%)`).join(', ')}
`;

    const userPrompt = `You are a senior sales rep at 13D Research writing an email to an institutional client about portfolio-relevant themes.
The email should reference recent research findings AND connect them to actual 13D High Conviction portfolio holdings.

${portfolioContext}

Theme: ${theme}
Key Insights:
${insightsText.slice(0, 2).map(insight => `- ${insight}`).join('\n')}

IMPORTANT: When relevant, mention specific portfolio holdings that align with this theme. For example:
- If discussing gold/mining: Reference actual HC gold mining positions
- If discussing China: Reference actual HC China equity positions  
- If discussing commodities: Reference actual HC commodity-related holdings

Please write a concise email (under 200 words) that:
1. References the research insights
2. Connects to relevant 13D HC portfolio positions when applicable
3. Maintains a confident, professional tone
4. Ends with an offer to discuss portfolio implications

Provide a brief subject line for the email as well.

Email Angle: ${emailAngle}
Description: ${description}
Supporting Reports: ${(supportingReports || []).join(', ')}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const rawContent = response.choices[0].message.content || "Failed to generate email";
    
    // Clean up the output by removing markdown formatting and symbols
    const cleanedContent = rawContent
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting **text**
      .replace(/\*([^*]+)\*/g, '$1')     // Remove italic formatting *text*
      .replace(/^---\s*$/gm, '')        // Remove horizontal rules ---
      .replace(/^\s*#+\s*/gm, '')       // Remove headers # ## ###
      .replace(/📩|🔧|✅|⸻|📊|💡/g, '') // Remove emojis and special symbols
      .replace(/\*\*Email Output\*\*/gi, '') // Remove section headers
      .replace(/\*\*Subject\*\*/gi, 'Subject:') // Clean subject formatting
      .replace(/\*\*Body\*\*/gi, '')     // Remove body header
      .replace(/\n{3,}/g, '\n\n')       // Normalize multiple line breaks
      .trim();

    return cleanedContent;
  } catch (error) {
    console.error("Theme-based email generation failed:", error);
    throw new Error("Failed to generate email");
  }
}