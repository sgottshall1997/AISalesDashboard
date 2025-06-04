import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIEmail } from "./openai";
import { 
  insertClientSchema, insertInvoiceSchema, insertLeadSchema,
  insertContentReportSchema, insertClientEngagementSchema, insertAiSuggestionSchema,
  insertEmailHistorySchema, clients, invoices, leads, client_engagements, email_history
} from "@shared/schema";
import { db } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Clients routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(parseInt(req.params.id));
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const updates = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(parseInt(req.params.id), updates);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data" });
    }
  });

  // Invoices routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/overdue", async (req, res) => {
    try {
      const invoices = await storage.getOverdueInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue invoices" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ message: "Invalid invoice data" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      console.log("Update request body:", req.body);
      const updates = insertInvoiceSchema.partial().parse(req.body);
      console.log("Parsed updates:", updates);
      const invoice = await storage.updateInvoice(parseInt(req.params.id), updates);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({ message: "Invalid invoice data" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const deleted = await storage.deleteInvoice(invoiceId);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Leads routes
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/stage/:stage", async (req, res) => {
    try {
      const leads = await storage.getLeadsByStage(req.params.stage);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads by stage" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const updates = insertLeadSchema.partial().parse(req.body);
      const lead = await storage.updateLead(parseInt(req.params.id), updates);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data" });
    }
  });

  // Content Reports routes
  app.get("/api/content-reports", async (req, res) => {
    try {
      const reports = await storage.getAllContentReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content reports" });
    }
  });

  app.get("/api/content-reports/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const reports = await storage.getRecentReports(limit);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent reports" });
    }
  });

  app.post("/api/content-reports", async (req, res) => {
    try {
      const validatedData = insertContentReportSchema.parse(req.body);
      const report = await storage.createContentReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid content report data" });
    }
  });

  // AI Suggestions routes
  app.get("/api/ai-suggestions", async (req, res) => {
    try {
      const { target_type, priority } = req.query;
      const suggestions = await storage.getAiSuggestions(
        target_type as string,
        priority as string
      );
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI suggestions" });
    }
  });

  app.post("/api/ai-suggestions", async (req, res) => {
    try {
      const validatedData = insertAiSuggestionSchema.parse(req.body);
      const suggestion = await storage.createAiSuggestion(validatedData);
      res.status(201).json(suggestion);
    } catch (error) {
      res.status(400).json({ message: "Invalid AI suggestion data" });
    }
  });

  // AI Email Generation routes
  app.post("/api/ai/generate-email", async (req, res) => {
    try {
      const { type, clientId, leadId, context } = req.body;
      
      if (!type || (!clientId && !leadId)) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      let targetData;
      if (clientId) {
        targetData = await storage.getClient(clientId);
      } else if (leadId) {
        targetData = await storage.getLead(leadId);
      }

      if (!targetData) {
        return res.status(404).json({ message: "Target not found" });
      }

      const emailContent = await generateAIEmail(type, targetData, context);
      res.json(emailContent);
    } catch (error) {
      console.error("AI email generation error:", error);
      res.status(500).json({ message: "Failed to generate AI email" });
    }
  });

  app.post("/api/ai/generate-follow-up", async (req, res) => {
    try {
      const { clientId, emailType = "renewal" } = req.body;
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const emailContent = await generateAIEmail(emailType, client, {
        subscription_type: client.subscription_type,
        engagement_rate: client.engagement_rate,
        interest_tags: client.interest_tags,
        renewal_date: client.renewal_date
      });

      res.json(emailContent);
    } catch (error) {
      console.error("AI follow-up generation error:", error);
      res.status(500).json({ message: "Failed to generate follow-up email" });
    }
  });

  app.post("/api/ai/generate-invoice-reminder", async (req, res) => {
    try {
      const { invoiceId } = req.body;
      
      const invoices = await storage.getAllInvoices();
      const invoice = invoices.find(inv => inv.id === invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const daysSince = Math.floor(
        (Date.now() - new Date(invoice.sent_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      const emailContent = await generateAIEmail("invoice_reminder", invoice.client, {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        sent_date: invoice.sent_date,
        days_overdue: daysSince
      });

      res.json(emailContent);
    } catch (error) {
      console.error("AI invoice reminder generation error:", error);
      res.status(500).json({ message: "Failed to generate invoice reminder" });
    }
  });

  // Invoice detail endpoints
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoiceWithClient(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ error: "Failed to get invoice" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const updates = req.body;
      const invoice = await storage.updateInvoice(invoiceId, updates);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  // Email history endpoints
  app.get("/api/invoices/:id/emails", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const emails = await storage.getEmailHistory(invoiceId);
      res.json(emails);
    } catch (error) {
      console.error("Get email history error:", error);
      res.status(500).json({ error: "Failed to get email history" });
    }
  });

  app.post("/api/invoices/:id/emails", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const emailData = { ...req.body, invoice_id: invoiceId };
      const validatedData = insertEmailHistorySchema.parse(emailData);
      const email = await storage.createEmailHistory(validatedData);
      res.json(email);
    } catch (error) {
      console.error("Create email history error:", error);
      res.status(500).json({ error: "Failed to create email history" });
    }
  });

  // AI follow-up suggestion endpoint
  app.get("/api/invoices/:id/ai-suggestion", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const suggestion = await storage.getInvoiceAISuggestion(invoiceId);
      res.json(suggestion);
    } catch (error) {
      console.error("Get AI suggestion error:", error);
      res.status(500).json({ error: "Failed to get AI suggestion" });
    }
  });

  app.post("/api/invoices/:id/generate-followup", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoiceWithClient(invoiceId);
      const emailHistory = await storage.getEmailHistory(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const suggestion = await storage.generateInvoiceFollowUp(invoice, emailHistory);
      res.json(suggestion);
    } catch (error) {
      console.error("Generate follow-up error:", error);
      res.status(500).json({ error: "Failed to generate follow-up" });
    }
  });

  // Bulk delete endpoints
  app.delete("/api/invoices/all", async (req, res) => {
    try {
      const result = await db.delete(invoices);
      res.json({ success: true, message: "All invoices deleted" });
    } catch (error) {
      console.error('Delete invoices error:', error);
      res.status(500).json({ error: 'Failed to delete invoices' });
    }
  });

  app.delete("/api/leads/all", async (req, res) => {
    try {
      const result = await db.delete(leads);
      res.json({ success: true, message: "All leads deleted" });
    } catch (error) {
      console.error('Delete leads error:', error);
      res.status(500).json({ error: 'Failed to delete leads' });
    }
  });

  app.delete("/api/clients/all", async (req, res) => {
    try {
      // Delete related records first to avoid foreign key constraints
      await db.delete(client_engagements);
      await db.delete(invoices);
      await db.delete(clients);
      res.json({ success: true, message: "All clients deleted" });
    } catch (error) {
      console.error('Delete clients error:', error);
      res.status(500).json({ error: 'Failed to delete clients' });
    }
  });

  const httpServer = createServer(app);
  // CSV Upload endpoint
  app.post("/api/upload/csv", async (req, res) => {
    try {
      const multer = await import('multer');
      const csv = await import('csv-parser');
      const fs = await import('fs');
      
      // Configure multer for file uploads
      const upload = multer.default({
        dest: '/tmp/',
        fileFilter: (req, file, cb) => {
          if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
          } else {
            cb(new Error('Only CSV files are allowed'));
          }
        }
      });

      upload.single('file')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        const file = req.file;
        const uploadType = req.body.type;

        if (!file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
          const results: any[] = [];
          const errors: string[] = [];
          let processed = 0;
          let duplicates = 0;

          // Parse CSV file
          await new Promise((resolve, reject) => {
            fs.default.createReadStream(file.path)
              .pipe(csv.default())
              .on('data', (data) => results.push(data))
              .on('end', resolve)
              .on('error', reject);
          });

          // Process based on upload type
          if (uploadType === 'prospects') {
            for (let index = 0; index < results.length; index++) {
              const row = results[index];
              try {
                const leadData = {
                  name: row['Contact Name'] || row['Prospect Name'] || '',
                  email: `${(row['Contact Name'] || row['Prospect Name'] || '').toLowerCase().replace(/\s+/g, '.')}@${(row['Prospect Name'] || 'unknown').toLowerCase().replace(/\s+/g, '')}.com`,
                  company: row['Prospect Name'] || '',
                  stage: mapProspectStatus(row['Status'] || 'prospect'),
                  last_contact: parseDate(row['Last Contacted']) || parseDate(row['Date']),
                  next_step: row['Comments'] || null,
                  notes: `${row['Comments'] || ''} ${row['Type'] ? `(Source: ${row['Type']})` : ''}`.trim(),
                  interest_tags: []
                };

                // Check for existing lead by email
                const existingLeads = await storage.getAllLeads();
                const duplicate = existingLeads.find(l => l.email === leadData.email);
                
                if (duplicate) {
                  await storage.updateLead(duplicate.id, leadData);
                  duplicates++;
                } else {
                  await storage.createLead(leadData);
                }
                processed++;
              } catch (error: any) {
                errors.push(`Row ${index + 2}: ${error.message || 'Unknown error'}`);
              }
            }
          } else if (uploadType === 'invoices') {
            for (let index = 0; index < results.length; index++) {
              const row = results[index];
              try {
                // Parse your specific CSV column format
                const accountName = row['Account Name'] || '';
                const opportunityName = row['Opportunity Name'] || '';
                const invoiceAmount = row['Invoice Amount'] || '0';
                const daysOverdue = parseInt(row['Days Overdue'] || '0');
                const arNote = row['A/R And Invoicing Note'] || '';
                
                console.log(`Processing row ${index + 2}: ${accountName} - ${opportunityName} - ${invoiceAmount} - ${daysOverdue} days`);
                
                if (!accountName) {
                  errors.push(`Row ${index + 2}: Missing Account Name`);
                  continue;
                }

                if (!opportunityName) {
                  errors.push(`Row ${index + 2}: Missing Opportunity Name for ${accountName}`);
                  continue;
                }

                const clientEmail = `${accountName.toLowerCase().replace(/\s+/g, '.')}@company.com`;
                
                const allClients = await storage.getAllClients();
                let client = allClients.find(c => c.name.toLowerCase() === accountName.toLowerCase());

                if (!client) {
                  client = await storage.createClient({
                    name: accountName,
                    email: clientEmail,
                    company: accountName,
                    subscription_type: 'Standard',
                    renewal_date: null,
                    engagement_rate: null,
                    click_rate: null,
                    interest_tags: [],
                    risk_level: daysOverdue > 30 ? 'high' : daysOverdue > 0 ? 'medium' : 'low',
                    notes: arNote || 'Created from CSV import'
                  });
                }

                // Calculate sent date based on days overdue
                const currentDate = new Date();
                const sentDate = new Date(currentDate.getTime() - (daysOverdue * 24 * 60 * 60 * 1000));
                
                // All invoices with 0-29 days are pending since 0 means sent before due date
                let paymentStatus = 'pending';
                if (daysOverdue >= 30) {
                  paymentStatus = 'overdue';
                }
                
                const invoiceData = {
                  client_id: client.id,
                  invoice_number: opportunityName || `INV-${Date.now()}-${index}`,
                  amount: parseFloat(invoiceAmount.toString().replace(/[^0-9.-]/g, '') || '0').toFixed(2),
                  sent_date: sentDate,
                  payment_status: `${daysOverdue} days`,
                  last_reminder_sent: null
                };

                // Check for existing invoice by both invoice number and client
                const existingInvoices = await storage.getAllInvoices();
                const duplicate = existingInvoices.find(inv => 
                  inv.invoice_number === invoiceData.invoice_number && 
                  inv.client_id === invoiceData.client_id
                );
                
                if (duplicate) {
                  await storage.updateInvoice(duplicate.id, invoiceData);
                  duplicates++;
                } else {
                  await storage.createInvoice(invoiceData);
                }
                processed++;
              } catch (error: any) {
                errors.push(`Row ${index + 2}: ${error.message || 'Unknown error'}`);
              }
            }
          }

          // Clean up uploaded file
          try {
            fs.default.unlinkSync(file.path);
          } catch (error) {
            console.log('File cleanup error:', error);
          }

          res.json({
            success: errors.length === 0,
            processed,
            duplicates,
            errors: errors.slice(0, 10) // Limit to first 10 errors
          });

        } catch (processingError) {
          // Clean up uploaded file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          throw processingError;
        }
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: 'Failed to process CSV file' });
    }
  });

  return httpServer;
}

function mapProspectStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'active': 'qualified',
    'closed': 'converted',
    'non renewal': 'lost',
    'recycled': 'nurturing',
    'sold': 'converted',
    'qualified': 'qualified',
    'proposal': 'proposal'
  };
  
  return statusMap[status.toLowerCase()] || 'prospect';
}

function mapPaymentStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'paid': 'paid',
    'pending': 'pending',
    'overdue': 'overdue',
    'unpaid': 'overdue'
  };
  
  return statusMap[status.toLowerCase()] || 'pending';
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{1,2}-\w{3}$/ // DD-MMM
  ];
  
  for (const format of formats) {
    if (format.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}
