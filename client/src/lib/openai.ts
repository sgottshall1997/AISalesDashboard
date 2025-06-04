// Utility functions for working with AI-generated content
export interface EmailTemplate {
  subject: string;
  body: string;
  type: "invoice_reminder" | "content_followup" | "lead_outreach" | "renewal" | "upsell";
}

export function formatEmailBody(body: string): string {
  // Add proper line breaks and formatting for display
  return body
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');
}

export function getEmailTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    invoice_reminder: "Invoice Reminder",
    content_followup: "Content Follow-up", 
    lead_outreach: "Lead Outreach",
    renewal: "Renewal Email",
    upsell: "Upsell Proposal",
  };
  return labels[type] || type;
}

export function calculateEmailTiming(type: string): string {
  const timings: Record<string, string> = {
    invoice_reminder: "Send immediately for overdue invoices",
    content_followup: "Best sent Tuesday-Thursday 10 AM",
    lead_outreach: "Tuesday 10 AM - highest response rates",
    renewal: "Send 30 days before renewal date",
    upsell: "After positive engagement with content",
  };
  return timings[type] || "Send at optimal time";
}
