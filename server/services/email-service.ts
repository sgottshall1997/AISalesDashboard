// Email service for scheduled reports and notifications
import { DatabaseStorage } from '../storage';

export interface EmailReport {
  recipient: string;
  subject: string;
  htmlContent: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export class EmailService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  // Generate weekly summary report
  async generateWeeklySummary(): Promise<EmailReport> {
    const dashboardStats = await this.storage.getDashboardStats();
    const leads = await this.storage.getAllLeads();
    const reports = await this.storage.getAllContentReports();
    
    // Get top performing leads
    const topLeads = leads
      .filter(lead => lead.likelihood_of_closing)
      .sort((a, b) => parseFloat(b.likelihood_of_closing || '0') - parseFloat(a.likelihood_of_closing || '0'))
      .slice(0, 5);

    // Get recent high-engagement content
    const highEngagementReports = reports
      .filter(report => report.engagement_level === 'high')
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
      .slice(0, 3);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Sales Intelligence Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f7fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 30px 20px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #2d3748; font-size: 18px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
          .metric { background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #667eea; }
          .metric-value { font-size: 28px; font-weight: bold; color: #2d3748; margin-bottom: 5px; }
          .metric-label { color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .lead-item { background: #f7fafc; padding: 15px; border-radius: 6px; margin-bottom: 10px; }
          .lead-name { font-weight: 600; color: #2d3748; margin-bottom: 5px; }
          .lead-details { color: #718096; font-size: 14px; }
          .report-item { padding: 12px; border-left: 3px solid #48bb78; background: #f0fff4; margin-bottom: 8px; border-radius: 0 4px 4px 0; }
          .report-title { font-weight: 600; color: #2d3748; font-size: 14px; }
          .report-meta { color: #718096; font-size: 12px; margin-top: 4px; }
          .footer { background: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 12px; }
          .cta-button { background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 15px 0; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weekly Sales Intelligence Report</h1>
            <p>Week ending ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>Key Performance Metrics</h2>
              <div class="metrics">
                <div class="metric">
                  <div class="metric-value">$${dashboardStats.outstandingInvoices?.toLocaleString() || '0'}</div>
                  <div class="metric-label">Outstanding Invoices</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${leads.length}</div>
                  <div class="metric-label">Active Leads</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Top Performing Leads</h2>
              ${topLeads.map(lead => `
                <div class="lead-item">
                  <div class="lead-name">${lead.name || 'Unknown'}</div>
                  <div class="lead-details">
                    ${lead.company || 'No company'} • Score: ${lead.likelihood_of_closing || 'N/A'}% • ${lead.engagement_level || 'Low'} engagement
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="section">
              <h2>High-Impact Content This Week</h2>
              ${highEngagementReports.map(report => `
                <div class="report-item">
                  <div class="report-title">${report.title}</div>
                  <div class="report-meta">${report.type} • Published ${new Date(report.published_date).toLocaleDateString()}</div>
                </div>
              `).join('')}
            </div>

            <div style="text-align: center;">
              <a href="/dashboard" class="cta-button">View Full Dashboard</a>
            </div>
          </div>
          
          <div class="footer">
            <p>AI Sales Dashboard • Automated Weekly Report</p>
            <p>This report was generated automatically based on your latest data.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      recipient: 'team@company.com',
      subject: `Weekly Sales Intelligence Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      htmlContent
    };
  }

  // Send email (placeholder - would integrate with actual email service)
  async sendEmail(emailReport: EmailReport): Promise<boolean> {
    try {
      // In production, integrate with services like:
      // - SendGrid
      // - AWS SES
      // - Mailgun
      // - Postmark
      
      console.log('Email would be sent:', {
        to: emailReport.recipient,
        subject: emailReport.subject,
        contentPreview: emailReport.htmlContent.substring(0, 100) + '...'
      });

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Schedule weekly reports
  async scheduleWeeklyReports(): Promise<void> {
    // This would integrate with a cron job or scheduler
    console.log('Weekly report scheduling configured');
    
    // Example implementation with node-cron:
    // cron.schedule('0 9 * * 1', async () => {
    //   const report = await this.generateWeeklySummary();
    //   await this.sendEmail(report);
    // });
  }
}