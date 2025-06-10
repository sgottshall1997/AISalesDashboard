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
    const reportData = reports.map(report => ({
      title: report.title,
      tags: report.tags || [],
      summary: report.content_summary || '',
      content: report.full_content ? report.full_content.substring(0, 1500) : '',
      publishedDate: report.published_date
    }));

    const prompt = `Analyze the following 13D Research reports (WILTW & WATMTU) to identify themes and suggest compelling email topics for institutional investors:

Reports: ${JSON.stringify(reportData)}

Based on the ACTUAL CONTENT from these reports, identify investment themes and market insights. Focus on:

1. FREQUENT THEMES - Investment topics that appear across multiple reports (commodities, paradigm shifts, market cycles, asset allocation)
2. EMERGING TRENDS - New market developments or investment opportunities mentioned in recent reports
3. CROSS-SECTOR CONNECTIONS - How different markets/sectors relate (precious metals, inflation, bonds, equities)
4. DEEP DIVE OPPORTUNITIES - Complex investment themes that warrant detailed follow-up analysis

IMPORTANT: Base suggestions ONLY on the actual content provided. Look for:
- Specific investment strategies mentioned
- Market commentary and predictions
- Asset allocation recommendations
- Economic themes and philosophical insights
- References to specific sectors, commodities, or markets

For each suggestion, provide:
- type: one of "frequent_theme", "emerging_trend", "cross_sector", "deep_dive"
- title: compelling email subject line focused on investment insights
- description: what specific investment angle the email would cover
- emailAngle: unique perspective based on the report content
- supportingReports: array of specific report titles containing this theme
- keyPoints: 3-4 specific insights from the reports
- priority: "high" for major investment themes, "medium" for sector-specific, "low" for general insights

Return JSON with "suggestions" array containing these objects.`;

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

    const systemPrompt = `You are a financial content strategist tasked with drafting concise and engaging outreach emails to institutional investors. You will be given:

1. A list of recent investment research reports with full text.
2. A pre-selected content theme or angle, such as:
   - "The Power of Love and Suffering in Investment Decisions"
   - "The Rise of Commodities: A New Market Paradigm"

Your job is to:
- Scan all reports for content, data, or insights relevant to the chosen theme.
- Extract 2–4 key bullet points that support or exemplify the theme.
- Write a concise outreach email that opens with a hook aligned to the theme, summarizes 2–3 findings from the reports, and closes with an offer to share more material or discuss further.

Format the output as follows:

---

**📩 Email Output**

**Subject Line**: [Compelling subject related to theme]

**Body**:
Hi [First Name],

Hope you're doing well. I thought you might appreciate a few insights from our latest reports, especially through the lens of *[insert theme]*:

• [Bullet Point #1 from report]
• [Bullet Point #2 from report]
• [Optional Bullet Point #3]

We're seeing this theme emerge more broadly across sectors and geographies—highlighting the kind of structural shifts that 13D is known for tracking early.

Let me know if you'd like me to send over a few more pieces that explore this further.

Best,  
Spencer

---

**Notes for GPT**:
- Keep the email under 250 words.
- Prioritize high-impact or counterintuitive insights from the reports.
- Maintain a professional, yet human tone—this is going to a senior investor audience.`;

    const userPrompt = `Generate an email using this theme and supporting information:

Theme: ${theme}
Email Angle: ${emailAngle}
Description: ${description}
Key Points to Consider: ${keyPoints.join(', ')}
Supporting Reports: ${supportingReports.join(', ')}

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