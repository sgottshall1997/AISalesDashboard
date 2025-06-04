import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-..." 
});

export interface EmailGenerationRequest {
  type: "invoice_reminder" | "renewal" | "followup" | "lead_outreach" | "upsell";
  clientName: string;
  context: {
    amount?: number;
    daysOverdue?: number;
    renewalDate?: string;
    interestTags?: string[];
    engagementRate?: number;
    lastInteraction?: string;
    recentReports?: string[];
    riskLevel?: string;
    notes?: string;
  };
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  tone: string;
  priority: "high" | "medium" | "low";
  suggestedSendTime?: string;
}

export async function generateEmail(request: EmailGenerationRequest): Promise<GeneratedEmail> {
  try {
    const prompt = createEmailPrompt(request);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert sales communication specialist for a boutique investment research firm (13D Research). Generate professional, personalized email communications that maintain relationships while driving business outcomes. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      subject: result.subject || "Follow-up from 13D Research",
      body: result.body || "Thank you for your continued partnership.",
      tone: result.tone || "professional",
      priority: result.priority || "medium",
      suggestedSendTime: result.suggestedSendTime
    };
  } catch (error) {
    console.error("Error generating email:", error);
    throw new Error("Failed to generate email content");
  }
}

function createEmailPrompt(request: EmailGenerationRequest): string {
  const { type, clientName, context } = request;
  
  let basePrompt = `Generate a professional email for ${clientName} from 13D Research. `;
  
  switch (type) {
    case "invoice_reminder":
      basePrompt += `This is a ${context.daysOverdue && context.daysOverdue > 7 ? 'firm but polite' : 'gentle'} reminder for an overdue invoice of $${context.amount} that is ${context.daysOverdue} days past due. `;
      break;
      
    case "renewal":
      basePrompt += `This is a renewal communication for a subscription expiring on ${context.renewalDate}. The client has ${context.engagementRate}% engagement rate and interests in: ${context.interestTags?.join(', ')}. Risk level: ${context.riskLevel}. `;
      break;
      
    case "followup":
      basePrompt += `This is a follow-up email based on recent engagement. Last interaction: ${context.lastInteraction}. Client interests: ${context.interestTags?.join(', ')}. `;
      break;
      
    case "lead_outreach":
      basePrompt += `This is outreach to a new lead. Their interests include: ${context.interestTags?.join(', ')}. Notes: ${context.notes}. `;
      break;
      
    case "upsell":
      basePrompt += `This is an upsell opportunity for a high-engagement client (${context.engagementRate}% engagement). Focus on premium features and exclusive content. `;
      break;
  }
  
  if (context.recentReports?.length) {
    basePrompt += `Reference recent WILTW reports they engaged with: ${context.recentReports.join(', ')}. `;
  }
  
  basePrompt += `
  
  Requirements:
  - Professional tone appropriate for investment professionals
  - Personalized based on client context and interests
  - Include relevant research insights or reports when appropriate
  - Clear call-to-action
  - Maintain 13D Research's expertise positioning
  
  Return JSON with: subject, body, tone, priority (high/medium/low), and suggestedSendTime (optional).`;
  
  return basePrompt;
}

export async function generateContentSuggestions(engagementData: {
  topicsClicked: string[];
  openRates: number[];
  clientInterests: string[];
}): Promise<{
  suggestions: string[];
  reasoning: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content strategy expert for an investment research firm. Analyze engagement data and suggest content opportunities."
        },
        {
          role: "user",
          content: `Based on this engagement data, suggest content topics and distribution strategies:
          
          Topics clicked: ${engagementData.topicsClicked.join(', ')}
          Average open rates: ${engagementData.openRates.join(', ')}%
          Client interests: ${engagementData.clientInterests.join(', ')}
          
          Provide specific, actionable content suggestions and explain the reasoning. Return as JSON with 'suggestions' array and 'reasoning' string.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      suggestions: result.suggestions || [],
      reasoning: result.reasoning || "Based on engagement patterns"
    };
  } catch (error) {
    console.error("Error generating content suggestions:", error);
    return {
      suggestions: ["Create follow-up content based on recent engagement"],
      reasoning: "Error generating AI suggestions"
    };
  }
}
