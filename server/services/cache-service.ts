import { redisConnection } from './job-queue';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private redis = redisConnection;
  private defaultTTL = 3600; // 1 hour default

  // AI content caching
  async cacheAIResponse(key: string, content: any, options: CacheOptions = {}) {
    const { ttl = this.defaultTTL, prefix = 'ai:' } = options;
    const cacheKey = `${prefix}${key}`;
    
    try {
      await this.redis.setex(cacheKey, ttl, JSON.stringify({
        content,
        timestamp: Date.now(),
        version: '1.0'
      }));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async getCachedAIResponse(key: string, prefix = 'ai:') {
    const cacheKey = `${prefix}${key}`;
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      return parsed.content;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Dashboard metrics caching
  async cacheDashboardMetrics(metrics: any, ttl = 300) { // 5 minutes
    return this.cacheAIResponse('dashboard:metrics', metrics, { ttl, prefix: 'metrics:' });
  }

  async getCachedDashboardMetrics() {
    return this.getCachedAIResponse('dashboard:metrics', 'metrics:');
  }

  // Lead scoring caching
  async cacheLeadScores(scores: any[], ttl = 1800) { // 30 minutes
    return this.cacheAIResponse('lead:scores', scores, { ttl, prefix: 'scoring:' });
  }

  async getCachedLeadScores() {
    return this.getCachedAIResponse('lead:scores', 'scoring:');
  }

  // Content analysis caching
  async cacheContentAnalysis(contentId: number, analysis: any, ttl = 7200) { // 2 hours
    return this.cacheAIResponse(`content:${contentId}`, analysis, { ttl, prefix: 'analysis:' });
  }

  async getCachedContentAnalysis(contentId: number) {
    return this.getCachedAIResponse(`content:${contentId}`, 'analysis:');
  }

  // Search results caching
  async cacheSearchResults(query: string, results: any[], ttl = 900) { // 15 minutes
    const queryHash = Buffer.from(query).toString('base64');
    return this.cacheAIResponse(`search:${queryHash}`, results, { ttl, prefix: 'search:' });
  }

  async getCachedSearchResults(query: string) {
    const queryHash = Buffer.from(query).toString('base64');
    return this.getCachedAIResponse(`search:${queryHash}`, 'search:');
  }

  // Email generation caching
  async cacheGeneratedEmail(recipientEmail: string, content: any, ttl = 3600) {
    const emailHash = Buffer.from(recipientEmail).toString('base64');
    return this.cacheAIResponse(`email:${emailHash}`, content, { ttl, prefix: 'generated:' });
  }

  async getCachedGeneratedEmail(recipientEmail: string) {
    const emailHash = Buffer.from(recipientEmail).toString('base64');
    return this.getCachedAIResponse(`email:${emailHash}`, 'generated:');
  }

  // Cache invalidation
  async invalidateCache(pattern: string) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  async invalidateAICache() {
    return this.invalidateCache('ai:*');
  }

  async invalidateDashboardCache() {
    return this.invalidateCache('metrics:*');
  }

  async invalidateLeadScoringCache() {
    return this.invalidateCache('scoring:*');
  }

  // Cache statistics
  async getCacheStats() {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      const aiKeys = await this.redis.keys('ai:*');
      const metricsKeys = await this.redis.keys('metrics:*');
      const scoringKeys = await this.redis.keys('scoring:*');
      const analysisKeys = await this.redis.keys('analysis:*');
      
      return {
        totalKeys: keyCount,
        aiContentKeys: aiKeys.length,
        metricsKeys: metricsKeys.length,
        scoringKeys: scoringKeys.length,
        analysisKeys: analysisKeys.length,
        memoryInfo: info
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }

  // Batch operations
  async setCacheItems(items: Array<{ key: string; value: any; ttl?: number; prefix?: string }>) {
    const pipeline = this.redis.pipeline();
    
    items.forEach(({ key, value, ttl = this.defaultTTL, prefix = 'batch:' }) => {
      const cacheKey = `${prefix}${key}`;
      pipeline.setex(cacheKey, ttl, JSON.stringify({
        content: value,
        timestamp: Date.now()
      }));
    });
    
    try {
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Batch cache set error:', error);
      return false;
    }
  }

  async getCacheItems(keys: string[], prefix = 'batch:') {
    const pipeline = this.redis.pipeline();
    
    keys.forEach(key => {
      pipeline.get(`${prefix}${key}`);
    });
    
    try {
      const results = await pipeline.exec();
      return results?.map(([error, result]) => {
        if (error || !result) return null;
        try {
          const parsed = JSON.parse(result as string);
          return parsed.content;
        } catch {
          return null;
        }
      }) || [];
    } catch (error) {
      console.error('Batch cache get error:', error);
      return [];
    }
  }

  // Cache warming
  async warmCache() {
    console.log('Warming cache with frequently accessed data...');
    
    try {
      // This would typically pre-load common dashboard metrics, 
      // popular search queries, etc.
      
      const warmingTasks = [
        { key: 'dashboard:overview', value: { status: 'warming' }, ttl: 300 },
        { key: 'metrics:summary', value: { status: 'warming' }, ttl: 600 }
      ];
      
      await this.setCacheItems(warmingTasks);
      console.log('Cache warming completed');
      return true;
    } catch (error) {
      console.error('Cache warming failed:', error);
      return false;
    }
  }
}

export const cacheService = new CacheService();