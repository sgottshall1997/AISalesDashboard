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

    const topHoldings = hcHoldings.slice(0, 5).map(h => `${h.ticker} (${h.weightInHighConviction}%)`);

    const prompt = `You are analyzing 13D Research reports to create INVESTMENT-FOCUSED email suggestions based primarily on the core themes and insights from our research analysis.

REPORT ANALYSIS DATA:
${JSON.stringify(reportData)}

STRICT REQUIREMENTS:
- Focus PRIMARILY on investment themes from the actual report content and analysis
- Extract key insights and findings from the parsed summaries
- Create suggestions based on research insights and market analysis
- Only briefly mention relevant HC portfolio positioning where it directly supports the theme (top holdings: ${topHoldings.join(', ')})
- Prioritize research content over portfolio references

From these WILTW and WATMTU reports, identify 3-4 investment themes based on the research analysis:

1. COMMODITIES & INFLATION - Analysis from reports on precious metals, commodities markets, inflation hedges
2. MARKET PARADIGM SHIFTS - Research insights on new market leaders, sector rotations, asset allocation changes  
3. GEOPOLITICAL INVESTMENTS - Report analysis on China markets, contrarian opportunities, global economic themes
4. DEEP INVESTMENT ANALYSIS - Complex financial strategies and portfolio insights from research

For each theme found in the reports, create:
- type: "frequent_theme", "emerging_trend", "cross_sector", or "deep_dive"
- title: Professional email subject focused on the research insight
- description: Investment angle based primarily on report content with minimal portfolio reference
- emailAngle: Specific market perspective from the research analysis
- supportingReports: Array of report titles that contain this theme
- keyPoints: 3-4 actual insights from the report content with brief portfolio validation where relevant
- insights: Array of 2-3 specific, traceable facts from source reports
- priority: "high", "medium", or "low" (prioritize based on research depth and insight quality)

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
    
    const topHoldings = hcHoldings.slice(0, 3).map(h => `${h.ticker} (${h.weightInHcPortfolio}%)`);

    const userPrompt = `You are a senior analyst at 13D Research writing an email to an institutional client about key research themes and market insights.
The email should focus primarily on the research findings and analysis from our reports.

CORE RESEARCH THEME:
Theme: ${theme}
Key Research Insights:
${insightsText.slice(0, 3).map(insight => `- ${insight}`).join('\n')}

Email Angle: ${emailAngle}
Description: ${description}
Supporting Reports: ${(supportingReports || []).join(', ')}

Please write a concise email (under 200 words) that:
1. Focuses on the research insights and analytical findings
2. Discusses market implications and investment themes
3. Only briefly mentions relevant portfolio positioning where it validates the research (top holdings: ${topHoldings.join(', ')})
4. Maintains a confident, professional tone focused on research quality
5. Ends with an offer to discuss the research implications

Provide a brief subject line for the email as well.

Prioritize the research content and market analysis over portfolio references.`;

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