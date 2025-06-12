import { redisConnection } from './job-queue';

interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface OpenAIMetrics {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  responseTime: number;
  timestamp: number;
  success: boolean;
  error?: string;
  requestType: 'email' | 'analysis' | 'summary' | 'insights' | 'scoring';
}

interface CacheMetrics {
  operation: 'hit' | 'miss' | 'set' | 'invalidate';
  key: string;
  keyType: 'ai' | 'dashboard' | 'search' | 'scoring' | 'analysis';
  timestamp: number;
  responseTime?: number;
}

export class MonitoringService {
  private redis = redisConnection;

  // OpenAI API monitoring
  async logOpenAIRequest(metrics: OpenAIMetrics) {
    try {
      const logEntry = {
        ...metrics,
        timestamp: Date.now()
      };

      // Store individual request
      await this.redis.lpush('openai:requests', JSON.stringify(logEntry));
      await this.redis.ltrim('openai:requests', 0, 999); // Keep last 1000 requests

      // Update aggregated metrics
      await this.updateOpenAIAggregates(metrics);

      // Track cost metrics
      await this.trackCostMetrics(metrics);

      // Alert on high error rates
      if (!metrics.success) {
        await this.checkErrorRateThresholds();
      }

    } catch (error) {
      console.error('Failed to log OpenAI request:', error);
    }
  }

  // Cache performance monitoring
  async logCacheOperation(metrics: CacheMetrics) {
    try {
      const logEntry = {
        ...metrics,
        timestamp: Date.now()
      };

      await this.redis.lpush('cache:operations', JSON.stringify(logEntry));
      await this.redis.ltrim('cache:operations', 0, 4999); // Keep last 5000 operations

      // Update hit/miss ratios
      await this.updateCacheRatios(metrics);

    } catch (error) {
      console.error('Failed to log cache operation:', error);
    }
  }

  // API endpoint monitoring
  async logAPIRequest(metrics: APIMetrics) {
    try {
      const logEntry = {
        ...metrics,
        timestamp: Date.now()
      };

      await this.redis.lpush('api:requests', JSON.stringify(logEntry));
      await this.redis.ltrim('api:requests', 0, 2999); // Keep last 3000 requests

      // Update endpoint performance metrics
      await this.updateEndpointMetrics(metrics);

    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  }

  // Get OpenAI statistics
  async getOpenAIStats(timeRange = '24h') {
    try {
      const requests = await this.redis.lrange('openai:requests', 0, -1);
      const parsed = requests.map(r => JSON.parse(r));
      
      const now = Date.now();
      const timeRangeMs = this.parseTimeRange(timeRange);
      const filtered = parsed.filter(r => now - r.timestamp <= timeRangeMs);

      const stats = {
        totalRequests: filtered.length,
        successfulRequests: filtered.filter(r => r.success).length,
        failedRequests: filtered.filter(r => !r.success).length,
        averageResponseTime: this.calculateAverage(filtered.map(r => r.responseTime)),
        totalTokens: filtered.reduce((sum, r) => sum + r.totalTokens, 0),
        totalCost: filtered.reduce((sum, r) => sum + r.cost, 0),
        errorRate: filtered.length > 0 ? (filtered.filter(r => !r.success).length / filtered.length) * 100 : 0,
        requestsByType: this.groupBy(filtered, 'requestType'),
        requestsByModel: this.groupBy(filtered, 'model'),
        hourlyBreakdown: this.getHourlyBreakdown(filtered)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get OpenAI stats:', error);
      return null;
    }
  }

  // Get cache performance statistics
  async getCacheStats(timeRange = '24h') {
    try {
      const operations = await this.redis.lrange('cache:operations', 0, -1);
      const parsed = operations.map(o => JSON.parse(o));
      
      const now = Date.now();
      const timeRangeMs = this.parseTimeRange(timeRange);
      const filtered = parsed.filter(o => now - o.timestamp <= timeRangeMs);

      const hits = filtered.filter(o => o.operation === 'hit');
      const misses = filtered.filter(o => o.operation === 'miss');
      const total = hits.length + misses.length;

      const stats = {
        totalOperations: filtered.length,
        hitRate: total > 0 ? (hits.length / total) * 100 : 0,
        missRate: total > 0 ? (misses.length / total) * 100 : 0,
        operationsByType: this.groupBy(filtered, 'keyType'),
        averageResponseTime: this.calculateAverage(filtered.filter(o => o.responseTime).map(o => o.responseTime!)),
        hourlyBreakdown: this.getHourlyBreakdown(filtered)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  // Get API endpoint statistics
  async getAPIStats(timeRange = '24h') {
    try {
      const requests = await this.redis.lrange('api:requests', 0, -1);
      const parsed = requests.map(r => JSON.parse(r));
      
      const now = Date.now();
      const timeRangeMs = this.parseTimeRange(timeRange);
      const filtered = parsed.filter(r => now - r.timestamp <= timeRangeMs);

      const stats = {
        totalRequests: filtered.length,
        successfulRequests: filtered.filter(r => r.statusCode < 400).length,
        errorRequests: filtered.filter(r => r.statusCode >= 400).length,
        averageResponseTime: this.calculateAverage(filtered.map(r => r.responseTime)),
        requestsByEndpoint: this.groupBy(filtered, 'endpoint'),
        requestsByMethod: this.groupBy(filtered, 'method'),
        statusCodes: this.groupBy(filtered, 'statusCode'),
        hourlyBreakdown: this.getHourlyBreakdown(filtered)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get API stats:', error);
      return null;
    }
  }

  // Get comprehensive system health
  async getSystemHealth() {
    try {
      const [openaiStats, cacheStats, apiStats] = await Promise.all([
        this.getOpenAIStats('1h'),
        this.getCacheStats('1h'),
        this.getAPIStats('1h')
      ]);

      const health = {
        timestamp: Date.now(),
        status: 'healthy',
        openai: {
          status: openaiStats?.errorRate && openaiStats.errorRate < 5 ? 'healthy' : 'degraded',
          errorRate: openaiStats?.errorRate || 0,
          averageResponseTime: openaiStats?.averageResponseTime || 0,
          totalRequests: openaiStats?.totalRequests || 0
        },
        cache: {
          status: cacheStats?.hitRate && cacheStats.hitRate > 70 ? 'healthy' : 'degraded',
          hitRate: cacheStats?.hitRate || 0,
          totalOperations: cacheStats?.totalOperations || 0
        },
        api: {
          status: apiStats?.errorRequests && (apiStats.errorRequests / apiStats.totalRequests) < 0.05 ? 'healthy' : 'degraded',
          errorRate: apiStats?.totalRequests ? (apiStats.errorRequests / apiStats.totalRequests) * 100 : 0,
          averageResponseTime: apiStats?.averageResponseTime || 0,
          totalRequests: apiStats?.totalRequests || 0
        }
      };

      // Determine overall system status
      const components = [health.openai.status, health.cache.status, health.api.status];
      if (components.includes('degraded')) {
        health.status = 'degraded';
      }

      return health;
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        timestamp: Date.now(),
        status: 'error',
        error: 'Failed to retrieve system health metrics'
      };
    }
  }

  // Private helper methods
  private async updateOpenAIAggregates(metrics: OpenAIMetrics) {
    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `openai:aggregates:${hour}`;
    
    await this.redis.hincrby(key, 'requests', 1);
    await this.redis.hincrby(key, 'tokens', metrics.totalTokens);
    await this.redis.hincrbyfloat(key, 'cost', metrics.cost);
    
    if (!metrics.success) {
      await this.redis.hincrby(key, 'errors', 1);
    }
    
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days
  }

  private async trackCostMetrics(metrics: OpenAIMetrics) {
    const today = new Date().toISOString().split('T')[0];
    const costKey = `openai:cost:${today}`;
    
    await this.redis.hincrbyfloat(costKey, 'total', metrics.cost);
    await this.redis.hincrbyfloat(costKey, metrics.requestType, metrics.cost);
    await this.redis.expire(costKey, 30 * 24 * 60 * 60); // 30 days
  }

  private async updateCacheRatios(metrics: CacheMetrics) {
    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `cache:ratios:${hour}`;
    
    await this.redis.hincrby(key, metrics.operation, 1);
    await this.redis.hincrby(key, `${metrics.keyType}_${metrics.operation}`, 1);
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days
  }

  private async updateEndpointMetrics(metrics: APIMetrics) {
    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `api:metrics:${hour}`;
    
    await this.redis.hincrby(key, 'requests', 1);
    await this.redis.hincrby(key, `${metrics.method}_${metrics.endpoint}`, 1);
    
    if (metrics.statusCode >= 400) {
      await this.redis.hincrby(key, 'errors', 1);
    }
    
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days
  }

  private async checkErrorRateThresholds() {
    const recentErrors = await this.redis.lrange('openai:requests', 0, 99);
    const errorCount = recentErrors
      .map(r => JSON.parse(r))
      .filter(r => !r.success)
      .length;
    
    if (errorCount > 10) { // More than 10 errors in last 100 requests
      console.warn(`High OpenAI error rate detected: ${errorCount}/100 requests failed`);
      // Could trigger alerts, notifications, etc.
    }
  }

  private parseTimeRange(timeRange: string): number {
    const value = parseInt(timeRange);
    const unit = timeRange.slice(-1);
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000; // Default to 24 hours
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key]?.toString() || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private getHourlyBreakdown(array: any[]): Record<string, number> {
    return array.reduce((acc, item) => {
      const hour = new Date(item.timestamp).getHours();
      const key = `${hour}:00`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

export const monitoringService = new MonitoringService();