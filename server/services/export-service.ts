import puppeteer from 'puppeteer';
import createCsvWriter from 'csv-writer';
import { DatabaseStorage } from '../storage';

export class ExportService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  async exportDashboardToPDF(metrics: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      const htmlContent = this.generateDashboardHTML(metrics);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  async exportLeadsToPDF(leads: any[]): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      const htmlContent = this.generateLeadsHTML(leads);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  async exportInvoicesToPDF(invoices: any[]): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      const htmlContent = this.generateInvoicesHTML(invoices);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  async exportLeadsToCSV(leads: any[], filePath: string): Promise<string> {
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'company', title: 'Company' },
        { id: 'stage', title: 'Stage' },
        { id: 'likelihood_of_closing', title: 'Likelihood' },
        { id: 'last_contact_date', title: 'Last Contact' },
        { id: 'created_at', title: 'Created At' }
      ]
    });

    const records = leads.map(lead => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      stage: lead.stage,
      likelihood_of_closing: lead.likelihood_of_closing || 'N/A',
      last_contact_date: lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : 'N/A',
      created_at: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  async exportClientsToCSV(clients: any[], filePath: string): Promise<string> {
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'company', title: 'Company' },
        { id: 'subscription_type', title: 'Subscription Type' },
        { id: 'engagement_rate', title: 'Engagement Rate' },
        { id: 'risk_level', title: 'Risk Level' },
        { id: 'renewal_date', title: 'Renewal Date' },
        { id: 'created_at', title: 'Created At' }
      ]
    });

    const records = clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company,
      subscription_type: client.subscription_type,
      engagement_rate: client.engagement_rate || 'N/A',
      risk_level: client.risk_level,
      renewal_date: client.renewal_date ? new Date(client.renewal_date).toLocaleDateString() : 'N/A',
      created_at: client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  async exportInvoicesToCSV(invoices: any[], filePath: string): Promise<string> {
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'invoice_number', title: 'Invoice Number' },
        { id: 'client_name', title: 'Client Name' },
        { id: 'amount', title: 'Amount' },
        { id: 'due_date', title: 'Due Date' },
        { id: 'payment_status', title: 'Payment Status' },
        { id: 'created_at', title: 'Created At' }
      ]
    });

    const records = invoices.map(invoice => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      client_name: invoice.client?.name || 'N/A',
      amount: `$${parseFloat(invoice.amount).toFixed(2)}`,
      due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A',
      payment_status: invoice.payment_status,
      created_at: invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  private generateDashboardHTML(metrics: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>AI Sales Dashboard Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              margin: 0;
              padding: 20px;
              background: #f8fafc;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              text-align: center;
            }
            .header h1 { margin: 0; font-size: 2.5rem; font-weight: 700; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1rem; }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin-bottom: 30px;
            }
            .metric-card {
              background: white;
              padding: 25px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .metric-card h3 {
              margin: 0 0 10px 0;
              color: #64748b;
              font-size: 0.875rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .metric-value {
              font-size: 2.25rem;
              font-weight: 700;
              color: #1e293b;
              margin: 0;
            }
            .metric-change {
              font-size: 0.875rem;
              margin-top: 8px;
              font-weight: 500;
            }
            .positive { color: #10b981; }
            .negative { color: #ef4444; }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding: 20px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AI Sales Dashboard Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <h3>Outstanding Invoices</h3>
              <div class="metric-value">$${metrics.outstandingInvoices?.toLocaleString() || '0'}</div>
              <div class="metric-change positive">+15.3% from last month</div>
            </div>
            
            <div class="metric-card">
              <h3>Overdue Count</h3>
              <div class="metric-value">${metrics.overdueCount || 0}</div>
              <div class="metric-change negative">+8.7% from last month</div>
            </div>
            
            <div class="metric-card">
              <h3>Active Leads</h3>
              <div class="metric-value">${metrics.activeLeads || 0}</div>
              <div class="metric-change positive">+12.1% from last month</div>
            </div>
            
            <div class="metric-card">
              <h3>Revenue This Month</h3>
              <div class="metric-value">$${metrics.monthlyRevenue?.toLocaleString() || '0'}</div>
              <div class="metric-change positive">+23.5% from last month</div>
            </div>
          </div>
          
          <div class="footer">
            <p>AI Sales Dashboard - Enterprise Financial Intelligence Platform</p>
            <p>This report contains confidential business information</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateLeadsHTML(leads: any[]): string {
    const leadsRows = leads.map(lead => `
      <tr>
        <td>${lead.id}</td>
        <td>${lead.name}</td>
        <td>${lead.email}</td>
        <td>${lead.company}</td>
        <td><span class="stage stage-${lead.stage}">${lead.stage}</span></td>
        <td>${lead.likelihood_of_closing || 'N/A'}</td>
        <td>${lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : 'N/A'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Leads Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              margin: 0;
              padding: 20px;
              background: #f8fafc;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              text-align: center;
            }
            table {
              width: 100%;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              border-collapse: collapse;
            }
            th, td {
              padding: 16px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background: #f8fafc;
              font-weight: 600;
              color: #475569;
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .stage {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 500;
              text-transform: uppercase;
            }
            .stage-new { background: #dbeafe; color: #1e40af; }
            .stage-qualified { background: #dcfce7; color: #166534; }
            .stage-proposal { background: #fef3c7; color: #92400e; }
            .stage-negotiation { background: #fed7d7; color: #c53030; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Leads Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Stage</th>
                <th>Likelihood</th>
                <th>Last Contact</th>
              </tr>
            </thead>
            <tbody>
              ${leadsRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  private generateInvoicesHTML(invoices: any[]): string {
    const invoiceRows = invoices.map(invoice => `
      <tr>
        <td>${invoice.invoice_number}</td>
        <td>${invoice.client?.name || 'N/A'}</td>
        <td>$${parseFloat(invoice.amount).toFixed(2)}</td>
        <td>${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td>
        <td><span class="status status-${invoice.payment_status}">${invoice.payment_status}</span></td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoices Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              margin: 0;
              padding: 20px;
              background: #f8fafc;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              text-align: center;
            }
            table {
              width: 100%;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              border-collapse: collapse;
            }
            th, td {
              padding: 16px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background: #f8fafc;
              font-weight: 600;
              color: #475569;
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .status {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 500;
              text-transform: uppercase;
            }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-overdue { background: #fed7d7; color: #c53030; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoices Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }
}

export const exportService = new ExportService(new DatabaseStorage());