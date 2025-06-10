import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

export interface ContentSuggestion {
  type: "high_engagement" | "low_engagement" | "topic_match" | "renewal_opportunity";
  title: string;
  description: string;
  action: string;
  priority: "low" | "medium" | "high";
  clientsAffected: number;
}

export async function generateContentSuggestions(
  reports: any[],
  engagementData: any[]
): Promise<ContentSuggestion[]> {
  try {
    const prompt = `Analyze the following WILTW report performance and client engagement data to generate actionable content suggestions for 13D Research:

Reports: ${JSON.stringify(reports)}
Engagement Data: ${JSON.stringify(engagementData)}

Generate suggestions for:
1. High-performing content to leverage
2. Low-performing content to improve
3. Topic opportunities based on client interests
4. Renewal opportunities based on engagement

Return JSON array with objects containing: type, title, description, action, priority, clientsAffected`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content strategy expert for investment research. Analyze engagement data and provide actionable insights to improve client satisfaction and retention."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.suggestions || [];
  } catch (error) {
    console.error("AI content suggestions failed:", error);
    return [];
  }
}