// Simple in-memory job queue (no Redis dependency)
import { DatabaseStorage } from '../storage';
import { generateThemeBasedEmail } from '../ai';

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
    priority?: 'low' | 'medium' | 'high';
  };
}

type JobData = EmailGenerationJob | AIAnalysisJob;

// Simple job queue without Redis
class MemoryJobQueue {
  private jobs: Map<string, JobData> = new Map();
  private storage = new DatabaseStorage();

  async addJob(jobType: string, data: any, options: any = {}) {
    const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.jobs.set(jobId, { type: jobType as any, data });
    
    // Process immediately (no background processing)
    setTimeout(() => this.processJob(jobId), 0);
    
    return { id: jobId };
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      switch (job.type) {
        case 'email-generation':
          await this.processEmailGeneration(job.data);
          break;
        case 'ai-analysis':
          await this.processAIAnalysis(job.data);
          break;
      }
      this.jobs.delete(jobId);
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
    }
  }

  private async processEmailGeneration(data: any) {
    try {
      console.log(`Processing email generation for lead ${data.leadId}`);
      // Email generation logic would go here
    } catch (error) {
      console.error('Email generation failed:', error);
    }
  }

  private async processAIAnalysis(data: any) {
    try {
      console.log(`Processing AI analysis for content ${data.contentId}`);
      // AI analysis logic would go here
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
  }
}

// Create instances
const emailQueue = new MemoryJobQueue();
const aiQueue = new MemoryJobQueue();

// Export for compatibility
export { emailQueue, aiQueue };

// Export dummy connection for compatibility with monitoring service
export const redisConnection = {
  setex: () => Promise.resolve(),
  get: () => Promise.resolve(null),
  del: () => Promise.resolve(),
  sadd: () => Promise.resolve(),
  smembers: () => Promise.resolve([]),
  expire: () => Promise.resolve(),
  lpush: () => Promise.resolve(),
  ltrim: () => Promise.resolve(),
  lrange: () => Promise.resolve([]),
  hincrby: () => Promise.resolve(),
  hincrbyfloat: () => Promise.resolve(),
  hgetall: () => Promise.resolve({}),
  pipeline: () => ({
    exec: () => Promise.resolve([]),
    setex: () => {},
    del: () => {},
    sadd: () => {},
    expire: () => {},
    lpush: () => {},
    ltrim: () => {},
    hincrby: () => {},
    hincrbyfloat: () => {}
  }),
  info: () => Promise.resolve('memory_usage:0')
};