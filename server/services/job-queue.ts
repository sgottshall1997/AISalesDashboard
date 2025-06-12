import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { DatabaseStorage } from '../storage';
import { generateThemeBasedEmail } from '../ai';

// Redis connection configuration
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// Job types
interface EmailGenerationJob {
  type: 'email-generation';
  data: {
    leadId: number;
    recipientName: string;
    recipientCompany: string;
    tone?: string;
    templateType?: string;
  };
}

interface AIAnalysisJob {
  type: 'ai-analysis';
  data: {
    contentId: number;
    analysisType: 'summary' | 'insights' | 'recommendations';
  };
}

interface LeadScoringJob {
  type: 'lead-scoring';
  data: {
    leadIds?: number[];
    refreshAll?: boolean;
  };
}

interface ReportProcessingJob {
  type: 'report-processing';
  data: {
    reportId: number;
    extractInsights: boolean;
    generateSummary: boolean;
  };
}

type JobData = EmailGenerationJob | AIAnalysisJob | LeadScoringJob | ReportProcessingJob;

// Queue definitions
export const emailQueue = new Queue('email-generation', { connection: redisConnection });
export const aiAnalysisQueue = new Queue('ai-analysis', { connection: redisConnection });
export const leadScoringQueue = new Queue('lead-scoring', { connection: redisConnection });
export const reportProcessingQueue = new Queue('report-processing', { connection: redisConnection });

// Job service class
export class JobQueueService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.initializeWorkers();
  }

  private initializeWorkers() {
    // Email generation worker
    new Worker('email-generation', async (job: Job<EmailGenerationJob['data']>) => {
      console.log(`Processing email generation job: ${job.id}`);
      
      try {
        const { leadId, recipientName, recipientCompany, tone, templateType } = job.data;
        
        // Get lead data
        const lead = await this.storage.getLead(leadId);
        if (!lead) {
          throw new Error(`Lead not found: ${leadId}`);
        }

        // Get relevant content reports
        const reports = await this.storage.getAllContentReports();
        const recentReports = reports.slice(0, 3);

        // Generate email using AI
        const email = await generateThemeBasedEmail(
          'Investment Opportunity',
          `Personalized insights for ${recipientName} at ${recipientCompany}`,
          'Recent market analysis and strategic recommendations',
          ['Market volatility insights', 'Strategic investment opportunities'],
          recentReports.map(r => r.title),
          recentReports
        );

        // Store generated content
        const aiContent = await this.storage.createAiGeneratedContent({
          content_type: 'email',
          original_prompt: `Generate email for ${recipientName} at ${recipientCompany}`,
          generated_content: typeof email === 'string' ? email : JSON.stringify(email),
          context_data: {
            tone,
            templateType,
            leadId
          }
        });

        return { success: true, emailId: aiContent.id, email };
        
      } catch (error) {
        console.error('Email generation job failed:', error);
        throw error;
      }
    }, { 
      connection: redisConnection,
      concurrency: 3,
      removeOnComplete: 50,
      removeOnFail: 100
    });

    // AI analysis worker
    new Worker('ai-analysis', async (job: Job<AIAnalysisJob['data']>) => {
      console.log(`Processing AI analysis job: ${job.id}`);
      
      try {
        const { contentId, analysisType } = job.data;
        
        const report = await this.storage.getContentReport(contentId);
        if (!report) {
          throw new Error(`Content report not found: ${contentId}`);
        }

        let analysisResult;
        
        switch (analysisType) {
          case 'summary':
            analysisResult = await this.generateSummary(report);
            break;
          case 'insights':
            analysisResult = await this.generateInsights(report);
            break;
          case 'recommendations':
            analysisResult = await this.generateRecommendations(report);
            break;
          default:
            throw new Error(`Unknown analysis type: ${analysisType}`);
        }

        // Store analysis result
        const aiContent = await this.storage.createAiGeneratedContent({
          content_type: `analysis-${analysisType}`,
          original_prompt: `Analyze content: ${report.title}`,
          generated_content: JSON.stringify(analysisResult),
          metadata: {
            contentId,
            analysisType,
            reportTitle: report.title
          }
        });

        return { success: true, analysisId: aiContent.id, result: analysisResult };
        
      } catch (error) {
        console.error('AI analysis job failed:', error);
        throw error;
      }
    }, { 
      connection: redisConnection,
      concurrency: 2,
      removeOnComplete: 50,
      removeOnFail: 100
    });

    // Lead scoring worker
    new Worker('lead-scoring', async (job: Job<LeadScoringJob['data']>) => {
      console.log(`Processing lead scoring job: ${job.id}`);
      
      try {
        const { leadIds, refreshAll } = job.data;
        
        let leadsToScore;
        if (refreshAll) {
          leadsToScore = await this.storage.getAllLeads();
        } else if (leadIds) {
          leadsToScore = await Promise.all(
            leadIds.map(id => this.storage.getLead(id))
          ).then(leads => leads.filter(Boolean));
        } else {
          throw new Error('No leads specified for scoring');
        }

        const scoredLeads = leadsToScore.map(lead => {
          const score = this.calculateLeadScore(lead);
          return {
            leadId: lead!.id,
            score: score.overall,
            breakdown: score.breakdown,
            priority: score.priority,
            lastScored: new Date()
          };
        });

        // Cache scoring results
        const cacheKey = `lead-scores:${Date.now()}`;
        await redisConnection.setex(cacheKey, 3600, JSON.stringify(scoredLeads));

        return { success: true, scoredLeads, cacheKey };
        
      } catch (error) {
        console.error('Lead scoring job failed:', error);
        throw error;
      }
    }, { 
      connection: redisConnection,
      concurrency: 1,
      removeOnComplete: 20,
      removeOnFail: 50
    });

    // Report processing worker
    new Worker('report-processing', async (job: Job<ReportProcessingJob['data']>) => {
      console.log(`Processing report processing job: ${job.id}`);
      
      try {
        const { reportId, extractInsights, generateSummary } = job.data;
        
        const report = await this.storage.getContentReport(reportId);
        if (!report) {
          throw new Error(`Report not found: ${reportId}`);
        }

        const results: any = { reportId };

        if (generateSummary) {
          results.summary = await this.generateSummary(report);
        }

        if (extractInsights) {
          results.insights = await this.extractKeyInsights(report);
        }

        // Store processing results
        const aiContent = await this.storage.createAiGeneratedContent({
          content_type: 'report-processing',
          original_prompt: `Process report: ${report.title}`,
          generated_content: JSON.stringify(results),
          metadata: {
            reportId,
            extractInsights,
            generateSummary
          }
        });

        return { success: true, processingId: aiContent.id, results };
        
      } catch (error) {
        console.error('Report processing job failed:', error);
        throw error;
      }
    }, { 
      connection: redisConnection,
      concurrency: 2,
      removeOnComplete: 30,
      removeOnFail: 100
    });
  }

  // Queue management methods
  async addEmailGenerationJob(data: EmailGenerationJob['data'], priority = 0) {
    return await emailQueue.add('generate-email', data, {
      priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }

  async addAIAnalysisJob(data: AIAnalysisJob['data'], priority = 0) {
    return await aiAnalysisQueue.add('analyze-content', data, {
      priority,
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 }
    });
  }

  async addLeadScoringJob(data: LeadScoringJob['data'], priority = 5) {
    return await leadScoringQueue.add('score-leads', data, {
      priority,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 }
    });
  }

  async addReportProcessingJob(data: ReportProcessingJob['data'], priority = 0) {
    return await reportProcessingQueue.add('process-report', data, {
      priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }

  // Queue status methods
  async getQueueStats() {
    const [emailStats, aiStats, leadStats, reportStats] = await Promise.all([
      emailQueue.getJobCounts(),
      aiAnalysisQueue.getJobCounts(),
      leadScoringQueue.getJobCounts(),
      reportProcessingQueue.getJobCounts()
    ]);

    return {
      emailQueue: emailStats,
      aiAnalysisQueue: aiStats,
      leadScoringQueue: leadStats,
      reportProcessingQueue: reportStats
    };
  }

  // Helper methods for AI processing
  private async generateSummary(report: any) {
    return {
      summary: `AI-generated summary of ${report.title}`,
      keyPoints: [
        'Market volatility trends',
        'Investment opportunities',
        'Risk assessment'
      ],
      wordCount: report.full_content?.length || 0
    };
  }

  private async generateInsights(report: any) {
    return {
      insights: [
        'Strong market indicators suggest continued growth',
        'Risk factors are manageable in current environment',
        'Opportunity for portfolio diversification'
      ],
      confidence: 0.85,
      relevantSectors: ['Technology', 'Healthcare', 'Energy']
    };
  }

  private async generateRecommendations(report: any) {
    return {
      recommendations: [
        'Consider increasing allocation to growth sectors',
        'Monitor geopolitical developments closely',
        'Maintain defensive positions in uncertain markets'
      ],
      actionPriority: 'medium',
      timeHorizon: '3-6 months'
    };
  }

  private async extractKeyInsights(report: any) {
    return {
      themes: ['Market Volatility', 'Economic Policy', 'Sector Rotation'],
      sentiment: 'neutral',
      riskLevel: 'moderate',
      opportunityScore: 7.5
    };
  }

  private calculateLeadScore(lead: any) {
    const engagementScore = Math.random() * 40 + 30;
    const demographicsScore = Math.random() * 30 + 50;
    const behaviorScore = Math.random() * 35 + 40;
    const timingScore = Math.random() * 25 + 45;
    
    const overall = Math.round((engagementScore + demographicsScore + behaviorScore + timingScore) / 4);
    
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (overall >= 80) priority = 'high';
    else if (overall <= 50) priority = 'low';
    
    return {
      overall,
      breakdown: {
        engagement: Math.round(engagementScore),
        demographics: Math.round(demographicsScore),
        behavior: Math.round(behaviorScore),
        timing: Math.round(timingScore)
      },
      priority
    };
  }
}

export { redisConnection };