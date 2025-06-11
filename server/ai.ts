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

    const reportData = reports.map(report => ({
      title: report.title,
      tags: report.tags || [],
      summary: report.content_summary || '',
      content: report.full_content ? report.full_content.substring(0, 2000) : '',
      publishedDate: report.published_date
    }));

    const prompt = `You are analyzing 13D Research reports to create INVESTMENT-FOCUSED email suggestions. 

STRICT REQUIREMENTS:
- Do NOT mention client engagement, clicks, or user behavior
- Focus ONLY on investment themes from the actual report content
- Create suggestions based on market insights, not marketing metrics

Report Data: ${JSON.stringify(reportData)}

From these WILTW and WATMTU reports, identify 3-4 investment themes:

1. COMMODITIES & INFLATION - Analysis of precious metals, commodities markets, inflation hedges
2. MARKET PARADIGM SHIFTS - Discussion of new market leaders, sector rotations, asset allocation changes  
3. GEOPOLITICAL INVESTMENTS - China markets, contrarian opportunities, global economic themes
4. DEEP INVESTMENT ANALYSIS - Complex financial strategies, portfolio allocation insights

For each theme found in the reports, create:
- type: "frequent_theme", "emerging_trend", "cross_sector", or "deep_dive"
- title: Professional email subject focused on investment opportunity
- description: Investment angle based on actual report content
- emailAngle: Specific market perspective from the reports
- supportingReports: Array of report titles that contain this theme
- keyPoints: 3-4 actual insights from the report content
- insights: Array of 2-3 specific, traceable facts from the source reports (quotable data points)
- priority: "high", "medium", or "low"

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

    const systemPrompt = `You are a senior research sales professional at 13D Research writing to institutional clients. Write professional, substantive emails that demonstrate deep market insight and provide compelling investment themes. Your emails should be comprehensive, informative, and showcase 13D's research expertise.`;

    const insightsText = insights && insights.length > 0 ? insights : keyPoints || [];
    
    const userPrompt = `Write a professional email to an institutional client about our research insights. Follow this exact structure and tone:

REQUIRED FORMAT:
1. Personal greeting with placeholder for name: "Hi ____________ – I hope you're doing well."
2. Opening paragraph establishing market context and 13D's track record
3. Multiple detailed sections covering specific investment themes with:
   - Clear theme headers (e.g., "Gold's Historic Breakout:", "Grid Infrastructure: The $X Trillion Opportunity:")
   - Specific data points and metrics
   - Investment implications and opportunities
   - Company/sector focus areas
4. Closing invitation to discuss further
5. Professional sign-off with "Best, Spencer"

Theme: ${theme}
Key Investment Insights:
${insightsText.map(insight => `- ${insight}`).join('\n')}

Email should be 400-600 words, include specific metrics where possible, maintain confidence about 13D's positioning, and emphasize actionable investment opportunities. Reference our research track record and outperformance.

Write in the professional, authoritative tone of a senior research analyst communicating with sophisticated institutional investors.

Supporting context:
Email Angle: ${emailAngle}
Description: ${description}
Supporting Reports: ${(supportingReports || []).join(', ')}

Start with "Subject:" followed by the subject line, then the email body.`;

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
      temperature: 0.7,
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