import { db } from "./db";
import { clients, invoices, leads, content_reports, client_engagements, ai_suggestions } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database with sample data...");

  // Create sample clients
  const sampleClients = await db.insert(clients).values([
    {
      name: "Sarah Johnson",
      email: "sarah@techventures.com",
      company: "Tech Ventures LLC",
      subscription_type: "Premium",
      renewal_date: new Date("2025-12-15"),
      engagement_rate: "78.5",
      click_rate: "42.3",
      interest_tags: ["Tech", "AI", "Healthcare"],
      risk_level: "low",
      notes: "High engagement client, interested in AI sector analysis"
    },
    {
      name: "Michael Chen",
      email: "mchen@globalfund.com",
      company: "Global Investment Fund",
      subscription_type: "Enterprise",
      renewal_date: new Date("2026-03-20"),
      engagement_rate: "65.2",
      click_rate: "38.7",
      interest_tags: ["Global Markets", "Energy"],
      risk_level: "medium",
      notes: "Focuses on emerging markets and energy sector investments"
    },
    {
      name: "Emma Rodriguez",
      email: "erodriguez@capitalpartners.com",
      company: "Capital Partners",
      subscription_type: "Standard",
      renewal_date: new Date("2025-08-10"),
      engagement_rate: "45.8",
      click_rate: "22.1",
      interest_tags: ["Healthcare", "Biotech"],
      risk_level: "high",
      notes: "Lower engagement recently, may need follow-up"
    },
    {
      name: "David Kim",
      email: "dkim@innovationfund.com",
      company: "Innovation Fund",
      subscription_type: "Premium",
      renewal_date: new Date("2025-11-05"),
      engagement_rate: "82.3",
      click_rate: "45.9",
      interest_tags: ["Tech", "Innovation", "Startups"],
      risk_level: "low",
      notes: "Very active subscriber, strong interest in startup analysis"
    }
  ]).returning();

  console.log(`Created ${sampleClients.length} clients`);

  // Create sample invoices
  const sampleInvoices = await db.insert(invoices).values([
    {
      client_id: sampleClients[0].id,
      invoice_number: "INV-12345",
      amount: "15000.00",
      sent_date: new Date("2025-05-15"),
      payment_status: "overdue"
    },
    {
      client_id: sampleClients[2].id,
      invoice_number: "INV-12346",
      amount: "8500.00",
      sent_date: new Date("2025-05-28"),
      payment_status: "pending"
    },
    {
      client_id: sampleClients[3].id,
      invoice_number: "INV-12347",
      amount: "24000.00",
      sent_date: new Date("2025-05-30"),
      payment_status: "paid"
    }
  ]).returning();

  console.log(`Created ${sampleInvoices.length} invoices`);

  // Create sample leads
  const sampleLeads = await db.insert(leads).values([
    {
      name: "Jane Doe",
      email: "jane@abccapital.com",
      company: "ABC Capital",
      stage: "qualified",
      last_contact: new Date("2025-05-20"),
      next_step: "Schedule discovery call",
      notes: "Focuses on precious metals and emerging markets",
      interest_tags: ["Precious Metals", "Emerging Markets"]
    },
    {
      name: "Growth Partners",
      email: "contact@growthpartners.com",
      company: "Growth Partners",
      stage: "qualified",
      last_contact: new Date("2025-05-25"),
      next_step: "Send proposal",
      notes: "Needs assessment complete - high interest",
      interest_tags: ["Tech", "AI Investing"]
    },
    {
      name: "Digital Ventures",
      email: "info@digitalventures.com",
      company: "Digital Ventures",
      stage: "prospect",
      last_contact: new Date("2025-06-02"),
      next_step: "Send intro email",
      notes: "Initial contact made",
      interest_tags: []
    },
    {
      name: "Alpha Investments",
      email: "contact@alphainv.com",
      company: "Alpha Investments",
      stage: "proposal",
      last_contact: new Date("2025-06-01"),
      next_step: "Follow up on proposal",
      notes: "$25K proposal sent - awaiting response",
      interest_tags: ["Tech", "Healthcare"]
    }
  ]).returning();

  console.log(`Created ${sampleLeads.length} leads`);

  // Create sample content reports
  const sampleReports = await db.insert(content_reports).values([
    {
      title: "Report #66 – Global Tech Trends",
      type: "Report",
      published_date: new Date("2025-05-10"),
      open_rate: "72.0",
      click_rate: "35.0",
      engagement_level: "high",
      tags: ["Tech", "Global", "Trends"]
    },
    {
      title: "Report #65 – AI & Energy Markets",
      type: "Report",
      published_date: new Date("2025-04-30"),
      open_rate: "64.0",
      click_rate: "28.0",
      engagement_level: "medium",
      tags: ["AI", "Energy", "Markets"]
    },
    {
      title: "Report #64 – Healthcare Innovation",
      type: "Report",
      published_date: new Date("2025-04-15"),
      open_rate: "45.0",
      click_rate: "18.0",
      engagement_level: "low",
      tags: ["Healthcare", "Innovation", "Biotech"]
    }
  ]).returning();

  console.log(`Created ${sampleReports.length} content reports`);

  // Create sample client engagements
  const sampleEngagements = await db.insert(client_engagements).values([
    {
      client_id: sampleClients[0].id,
      report_id: sampleReports[0].id,
      opened: true,
      clicked: true,
      engagement_date: new Date("2025-05-10")
    },
    {
      client_id: sampleClients[1].id,
      report_id: sampleReports[0].id,
      opened: true,
      clicked: false,
      engagement_date: new Date("2025-05-11")
    },
    {
      client_id: sampleClients[2].id,
      report_id: sampleReports[1].id,
      opened: false,
      clicked: false,
      engagement_date: null
    }
  ]).returning();

  console.log(`Created ${sampleEngagements.length} client engagements`);

  // Create sample AI suggestions
  const sampleSuggestions = await db.insert(ai_suggestions).values([
    {
      type: "content_optimization",
      target_type: "client",
      target_id: sampleClients[2].id,
      suggestion: "Send personalized healthcare content to re-engage Emma Rodriguez",
      priority: "high",
      status: "pending"
    },
    {
      type: "upsell_opportunity",
      target_type: "client",
      target_id: sampleClients[0].id,
      suggestion: "Sarah Johnson shows high engagement - propose enterprise upgrade",
      priority: "medium",
      status: "pending"
    },
    {
      type: "content_recommendation",
      target_type: "lead",
      target_id: sampleLeads[0].id,
      suggestion: "Share precious metals analysis with Jane Doe based on interests",
      priority: "medium",
      status: "pending"
    }
  ]).returning();

  console.log(`Created ${sampleSuggestions.length} AI suggestions`);
  console.log("Database seeding completed successfully!");
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(console.error);
}