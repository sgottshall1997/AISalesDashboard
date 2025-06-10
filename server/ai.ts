import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

function enforceWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  
  // Truncate to maxWords and ensure it ends properly
  const truncated = words.slice(0, maxWords).join(' ');
  
  // If we cut off mid-sentence, try to end at a complete sentence
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  // If we have a sentence ending in the last 20% of the text, use that
  if (lastSentenceEnd > truncated.length * 0.8) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  // Otherwise just truncate and add period if needed
  if (!truncated.match(/[.!?]$/)) {
    return truncated + '.';
  }
  
  return truncated;
}

export interface EmailGenerationRequest {
  type: "follow_up" | "renewal" | "overdue" | "lead_nurture" | "upsell";
  recipientName: string;
  recipientCompany: string;
  context: {
    amount?: number;
    daysOverdue?: number;
    invoiceNumber?: string;
    renewalDate?: string;
    engagementRate?: number;
    interestTags?: string[];
    lastInteraction?: string;
    riskLevel?: string;
    reportTitle?: string;
    proposalAmount?: number;
    stage?: string;
    reportSummary?: string;
    reportTags?: string[];
    reportType?: string;
  };
}

export interface EmailResponse {
  subject: string;
  body: string;
  tone: string;
  priority: "low" | "medium" | "high";
  bestSendTime?: string;
}

export async function generateEmail(request: EmailGenerationRequest): Promise<EmailResponse> {
  try {
    const prompt = buildEmailPrompt(request);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert sales communication specialist for 13D Research, a boutique investment research firm. Generate professional, personalized emails that are warm but business-appropriate. Always maintain a consultative tone and focus on value delivery. Respond with JSON in the specified format."
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
    
    // Enforce strict word count for lead nurture emails
    let emailBody = result.body || "Thank you for your continued partnership.";
    if (request.type === "lead_nurture") {
      emailBody = enforceWordLimit(emailBody, 80);
    }
    
    return {
      subject: result.subject || "Follow-up from 13D Research",
      body: emailBody,
      tone: result.tone || "professional",
      priority: result.priority || "medium",
      bestSendTime: result.bestSendTime
    };
  } catch (error) {
    console.error("AI email generation failed:", error);
    return generateFallbackEmail(request);
  }
}

function buildEmailPrompt(request: EmailGenerationRequest): string {
  const { type, recipientName, recipientCompany, context } = request;
  
  let basePrompt = `Generate a professional email for ${recipientName} at ${recipientCompany} for 13D Research. `;
  
  switch (type) {
    case "overdue":
      basePrompt += `This is a payment reminder for an overdue invoice #${context.invoiceNumber || "N/A"} of $${context.amount || 0} that is ${context.daysOverdue || 0} days overdue. Be polite but firm, and offer to help resolve any issues.`;
      break;
      
    case "renewal":
      basePrompt += `This is a subscription renewal email. Their renewal date is ${context.renewalDate || "soon"}. They have a ${context.engagementRate || 0}% engagement rate with our WILTW reports. Interest areas: ${context.interestTags?.join(", ") || "general research"}. Risk level: ${context.riskLevel || "medium"}. Emphasize value and ROI.`;
      break;
      
    case "follow_up":
      basePrompt += `This is a general follow-up email. Last interaction: ${context.lastInteraction || "recent contact"}. Interest areas: ${context.interestTags?.join(", ") || "investment research"}. Maintain relationship and suggest next steps.`;
      break;
      
    case "lead_nurture":
      basePrompt += `Generate a HIGH-RELEVANCE, CONCISE prospect email for ${recipientName} at ${recipientCompany}. This is a ${context.stage || "prospect"} stage lead with interests in: ${context.interestTags?.join(", ") || "investment research"}.`;
      
      if (context.reportTitle) {
        basePrompt += ` Reference our recent report "${context.reportTitle}"`;
        
        if (context.reportSummary) {
          basePrompt += ` with this content: "${context.reportSummary}"`;
        }
        
        if (context.reportTags && context.reportTags.length > 0) {
          basePrompt += ` covering: ${context.reportTags.join(", ")}`;
        }
      }
      
      basePrompt += `

ULTRA-STRICT REQUIREMENTS:
- HARD LIMIT: 80 words MAXIMUM for entire email body
- NO greeting pleasantries - start with their name only
- EXACTLY 2-3 bullet points, 10 words MAX each
- ONE sentence CTA - 5 words max
- Cut ALL unnecessary words, articles, conjunctions

MANDATORY FORMAT (copy this structure exactly):
Subject: [Direct market insight - 4 words max]

[Name],

[One hook sentence - 10 words max]:

• [Market insight - 10 words max]
• [Technical signal - 10 words max] 
• [Catalyst/trend - 10 words max]

[CTA - 5 words max]?

[Signature]

EXAMPLE:
Subject: Gold Breakout Confirms

Monica,

Precious metals signals validate your thesis:

• Silver miners breaking multi-year resistance
• Gold-CPI ratio hit decade highs
• Dollar weakness accelerating into metals

Want the breakdown?

Best,
Team

ENFORCE: Count every single word. If over 80 words, CUT content aggressively. NO exceptions.`;
      break;
      
    case "upsell":
      basePrompt += `This is an upsell email for a high-engagement client (${context.engagementRate || 0}% engagement rate). They're interested in: ${context.interestTags?.join(", ") || "premium research"}. Highlight premium features and exclusive benefits.`;
      break;
  }
  
  basePrompt += `\n\nReturn JSON with these fields:
  - subject: compelling email subject line
  - body: complete email body with proper salutation, content, and signature
  - tone: tone of the email (professional, friendly, urgent, etc.)
  - priority: email priority (low, medium, high)
  - bestSendTime: optimal send time (e.g., "Tuesday 10 AM")`;
  
  return basePrompt;
}

function generateFallbackEmail(request: EmailGenerationRequest): EmailResponse {
  const { type, recipientName, recipientCompany } = request;
  
  const fallbacks = {
    overdue: {
      subject: "Payment Reminder - Outstanding Invoice",
      body: `Hello ${recipientName},\n\nI hope this message finds you well. This is a friendly reminder regarding an outstanding invoice from 13D Research.\n\nPlease let us know if you need any additional information or if there are any issues we can help resolve.\n\nThank you for your prompt attention.\n\nBest regards,\n13D Research Team`,
      tone: "professional",
      priority: "high" as const
    },
    renewal: {
      subject: "Subscription Renewal - 13D Research",
      body: `Hello ${recipientName},\n\nThank you for your continued partnership with 13D Research. Your subscription renewal is coming up soon.\n\nWe'd love to discuss how our research continues to support ${recipientCompany}'s investment strategy.\n\nPlease let me know if you'd like to schedule a brief call.\n\nBest regards,\n13D Research Team`,
      tone: "professional",
      priority: "medium" as const
    },
    follow_up: {
      subject: "Following Up - 13D Research",
      body: `Hello ${recipientName},\n\nI wanted to follow up on our recent conversation and see how 13D Research can continue to support ${recipientCompany}.\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest regards,\n13D Research Team`,
      tone: "friendly",
      priority: "medium" as const
    },
    lead_nurture: {
      subject: `Key Signals Align with ${recipientCompany}'s Thesis`,
      body: `${recipientName},\n\nThree signals supporting your investment focus:\n\n• Momentum confirming your sector calls\n• Technical breakouts in your watchlist\n• Flow data backing your thesis\n\nWant the breakdown?\n\nBest,\n13D Research`,
      tone: "professional",
      priority: "medium" as const
    },
    upsell: {
      subject: "Exclusive Premium Research Access",
      body: `Hello ${recipientName},\n\nGiven your strong engagement with our research, I wanted to introduce you to our Premium tier.\n\nThis includes enhanced features that would be particularly valuable for ${recipientCompany}.\n\nWould you be interested in learning more?\n\nBest regards,\n13D Research Team`,
      tone: "professional",
      priority: "medium" as const
    }
  };
  
  return fallbacks[type] || fallbacks.follow_up;
}

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
