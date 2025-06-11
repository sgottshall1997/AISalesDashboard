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

    const systemPrompt = `You are a financial copywriter creating high-conviction email outreach for 13D Research, a leading independent research firm known for identifying structural market shifts before they become mainstream narratives. The target audience includes portfolio managers, CIOs, and senior analysts at hedge funds, RIAs, and family offices.

Your task: Based on the following content module, write a **high-performing prospecting email** with the following structure and tone:
- **Subject Line**: Compelling and curiosity-driven, relevant to institutional investors
- **Intro**: Warm but concise; acknowledge market context or thematic relevance
- **Core Insights**: 2–3 punchy bullet points with specific data or trends from the module
- **Closing CTA**: Invite the reader to request more insight or related research
- **Tone**: Strategic, intelligent, concise—some urgency, but no hard sell. The goal is to spark a conversation, not to push product.

Make the email feel personalized and research-driven. Avoid sounding generic, fluffy, or too promotional.

Format the output as follows:

---

**📩 Email Output**

**Subject**: [Compelling and curiosity-driven subject line]

**Body**:
Hi [First Name],

Hope you're doing well. [Acknowledge market context or thematic relevance in 1-2 sentences].

[Brief transition to insights from our analysis]:

• [Specific data point or trend #1 with concrete details]
• [Specific data point or trend #2 with concrete details]
• [Optional specific data point or trend #3 with concrete details]

[Brief statement about broader implications or what this signals for the market].

Let me know if you'd like me to send you the full piece or related reports on [relevant topic area].

Best,
Spencer

---

**Guidelines**:
- Keep the email under 200 words total
- Use specific data points, percentages, or concrete metrics when available
- Focus on structural shifts and early-stage signals
- Maintain authority without being pushy
- Each bullet should contain actionable intelligence`;

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

    return response.choices[0].message.content || "Failed to generate email";
  } catch (error) {
    console.error("Theme-based email generation failed:", error);
    throw new Error("Failed to generate email");
  }
}