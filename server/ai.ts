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
  reports: any[]
): Promise<string> {
  try {
    const reportContent = reports.map(report => ({
      title: report.title,
      content: report.full_content ? report.full_content.substring(0, 2000) : report.content_summary || '',
      publishedDate: report.published_date
    }));

    const systemPrompt = `You are a financial analyst writing for 13D Research, a leading independent research firm known for identifying structural market shifts before they become mainstream narratives. Your emails demonstrate deep market intelligence and analytical rigor that impresses institutional investors including portfolio managers, CIOs, and senior analysts at hedge funds, RIAs, and family offices.

Your writing style should mirror this level of sophistication and detail:
- Use specific technical metrics, ratios, and historical comparisons
- Reference multi-year trends, secular shifts, and structural changes
- Include performance data, index movements, and quantitative analysis
- Demonstrate knowledge of geopolitical implications and supply chain dynamics
- Show understanding of cross-asset correlations and sector rotation patterns

Write a detailed, intelligence-rich email that follows this structure:

**Subject**: [Strategic, data-driven subject line relevant to institutional investors]

**Body**:
Hi _________ – I hope you're doing well.

[Open with broader market context and 13D's performance/positioning - 2-3 sentences establishing credibility and market view]

[Transition to specific thematic analysis with detailed insights - introduce the key theme with supporting data]

[Theme Title]:
[Detailed bullet point with specific metrics, historical context, and technical analysis]
[Additional context showing 13D's positioning or index performance in this theme]

[Additional Supporting Analysis]:
[Second detailed insight with quantitative data, trend analysis, or geopolitical context]
[Performance metrics or portfolio implications]

[Optional Third Theme/Insight]:
[Another data-rich observation with specific metrics and market implications]
[Cross-sector or technical analysis supporting the thesis]

[Closing paragraph about investment implications and next steps]

If you are interested in learning more about what we are closely monitoring and how we are allocating across these themes, I'd be happy to set up a call to discuss.

Best,
Spencer

**Key Requirements**:
- Include specific percentages, ratios, and quantitative metrics wherever possible
- Reference historical timeframes (e.g., "45-year downtrend", "since 2008", "YTD performance")
- Use technical terminology and market-specific language
- Demonstrate cross-asset analysis and sector expertise
- Show understanding of supply chain dynamics and geopolitical factors
- Include portfolio performance data and positioning statements
- Maintain analytical depth while being accessible to sophisticated investors`;

    const userPrompt = `Generate an email using this theme and supporting information:

Theme: ${theme}
Email Angle: ${emailAngle}
Description: ${description}
Key Points to Consider: ${(keyPoints || []).join(', ')}
Supporting Reports: ${(supportingReports || []).join(', ')}

Available Report Content:
${JSON.stringify(reportContent, null, 2)}

Create a compelling email following the exact format specified in the system prompt.`;

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