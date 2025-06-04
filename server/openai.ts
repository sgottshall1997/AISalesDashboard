import OpenAI from "openai";
import { Client, Lead } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface EmailContext {
  invoice_number?: string;
  amount?: string;
  sent_date?: string;
  days_overdue?: number;
  subscription_type?: string;
  engagement_rate?: string;
  interest_tags?: string[];
  renewal_date?: string;
  stage?: string;
}

interface EmailResponse {
  subject: string;
  body: string;
  bestSendTime?: string;
  upgradeProb?: number;
}

export async function generateAIEmail(
  type: string,
  targetData: Client | Lead,
  context?: EmailContext
): Promise<EmailResponse> {
  try {
    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "invoice_reminder":
        systemPrompt = `You are a professional email assistant for 13D Research, a boutique investment research firm. Create polite but firm invoice reminder emails that maintain professional relationships while encouraging payment. Always maintain a helpful tone and offer assistance. Respond with JSON in this format: { "subject": "string", "body": "string", "bestSendTime": "string" }`;
        
        userPrompt = `Create an invoice reminder email for ${(targetData as any).name || (targetData as any).company}. 
        Invoice details:
        - Invoice number: ${context?.invoice_number}
        - Amount: $${context?.amount}
        - Sent date: ${context?.sent_date}
        - Days overdue: ${context?.days_overdue}
        
        Make it professional, polite but firm. Mention specific details and offer to help resolve any issues.`;
        break;

      case "renewal":
        systemPrompt = `You are a professional email assistant for 13D Research. Create personalized renewal emails that emphasize value proposition and client engagement. Reference their specific interests and usage patterns. Respond with JSON in this format: { "subject": "string", "body": "string", "bestSendTime": "string" }`;
        
        userPrompt = `Create a renewal email for ${(targetData as Client).company}.
        Client details:
        - Subscription type: ${context?.subscription_type}
        - Engagement rate: ${context?.engagement_rate}%
        - Interest tags: ${context?.interest_tags?.join(", ")}
        - Renewal date: ${context?.renewal_date}
        
        Emphasize their high engagement and suggest value-added services. Be personal and reference their specific interests.`;
        break;

      case "upsell":
        systemPrompt = `You are a professional email assistant for 13D Research. Create compelling upsell emails that focus on enhanced value and exclusive benefits. Reference client's high engagement as justification for premium services. Respond with JSON in this format: { "subject": "string", "body": "string", "bestSendTime": "string", "upgradeProb": number }`;
        
        userPrompt = `Create an upsell email for ${(targetData as Client).company}.
        Client details:
        - Current subscription: ${context?.subscription_type}
        - Engagement rate: ${context?.engagement_rate}% (high)
        - Interest tags: ${context?.interest_tags?.join(", ")}
        
        Focus on premium benefits like direct analyst access, custom research, and exclusive reports. Calculate upgrade probability based on engagement.`;
        break;

      case "lead_outreach":
        systemPrompt = `You are a professional email assistant for 13D Research. Create engaging outreach emails for prospects that introduce our research services and suggest relevant content. Match tone to lead stage. Respond with JSON in this format: { "subject": "string", "body": "string", "bestSendTime": "string" }`;
        
        userPrompt = `Create an outreach email for ${(targetData as Lead).name} at ${(targetData as Lead).company}.
        Lead details:
        - Stage: ${context?.stage}
        - Interest tags: ${(targetData as Lead).interest_tags?.join(", ")}
        - Notes: ${(targetData as Lead).notes}
        
        Introduce 13D Research and our WILTW reports. Suggest a relevant report based on their interests and propose next steps.`;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Add default best send time if not provided
    if (!result.bestSendTime) {
      result.bestSendTime = "Tuesday 10:00 AM";
    }

    // Calculate upgrade probability for upsell emails if not provided
    if (type === "upsell" && !result.upgradeProb && context?.engagement_rate) {
      const engagement = parseFloat(context.engagement_rate);
      result.upgradeProb = Math.min(90, Math.max(30, engagement + 10));
    }

    return result;
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Fallback email templates
    const fallbackEmails: Record<string, EmailResponse> = {
      invoice_reminder: {
        subject: `Payment Reminder - Invoice ${context?.invoice_number}`,
        body: `Dear ${(targetData as any).name || (targetData as any).company},\n\nThis is a friendly reminder that invoice ${context?.invoice_number} for $${context?.amount} is now ${context?.days_overdue} days overdue. Please let us know if you need any assistance or have questions about this invoice.\n\nBest regards,\n13D Research Team`,
        bestSendTime: "Tuesday 10:00 AM"
      },
      renewal: {
        subject: `Subscription Renewal - ${(targetData as Client).company}`,
        body: `Dear ${(targetData as Client).name},\n\nYour subscription with 13D Research is approaching renewal. We value your partnership and would love to continue providing you with our research insights.\n\nPlease let us know if you'd like to discuss renewal options.\n\nBest regards,\n13D Research Team`,
        bestSendTime: "Tuesday 10:00 AM"
      },
      upsell: {
        subject: `Exclusive Premium Access - ${(targetData as Client).company}`,
        body: `Dear ${(targetData as Client).name},\n\nBased on your high engagement with our research, we'd like to offer you access to our Premium tier with enhanced features and exclusive content.\n\nWould you be interested in learning more?\n\nBest regards,\n13D Research Team`,
        bestSendTime: "Tuesday 10:00 AM",
        upgradeProb: 75
      },
      lead_outreach: {
        subject: `Introduction to 13D Research`,
        body: `Dear ${(targetData as Lead).name},\n\nI hope this message finds you well. I'm reaching out to introduce 13D Research and our investment research services.\n\nI'd love to share some relevant insights with you. Are you available for a brief call this week?\n\nBest regards,\n13D Research Team`,
        bestSendTime: "Tuesday 10:00 AM"
      }
    };

    return fallbackEmails[type] || fallbackEmails.lead_outreach;
  }
}
