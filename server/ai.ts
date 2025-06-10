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

    const prompt = `Analyze the following WILTW research reports to identify frequent themes and suggest email topics for 13D Research:

Reports: ${JSON.stringify(reportData)}

Based on this content, identify:
1. FREQUENT THEMES - Topics that appear across multiple reports (e.g., Federal Reserve policy, China relations, energy markets)
2. EMERGING TRENDS - New themes gaining traction in recent reports
3. CROSS-SECTOR CONNECTIONS - How themes connect across different sectors/markets
4. DEEP DIVE OPPORTUNITIES - Complex topics that warrant detailed follow-up emails

For each suggestion, provide:
- type: one of "frequent_theme", "emerging_trend", "cross_sector", "deep_dive"
- title: catchy email subject line
- description: what the email would cover
- emailAngle: specific perspective/hook for the email
- supportingReports: array of report titles that support this theme
- keyPoints: 3-4 bullet points the email should cover
- priority: "high", "medium", or "low"

Return JSON with "suggestions" array containing these objects.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert investment research analyst and email marketing strategist. Identify patterns in research content to suggest compelling email topics that would engage institutional investors."
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