import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  activeConnections: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private maxMetricsHistory = 1000;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startSystemMonitoring();
  }

  private startSystemMonitoring() {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Collect every minute
  }

  private collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Calculate requests per minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.metrics.filter(m => 
      m.timestamp.getTime() > oneMinuteAgo
    );

    // Calculate average response time
    const totalResponseTime = recentRequests.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = recentRequests.length > 0 
      ? totalResponseTime / recentRequests.length 
      : 0;

    // Calculate error rate
    const errorRequests = recentRequests.filter(m => m.statusCode >= 400);
    const errorRate = recentRequests.length > 0 
      ? (errorRequests.length / recentRequests.length) * 100 
      : 0;

    const systemMetric: SystemMetrics = {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      memoryUsage,
      uptime,
      activeConnections: 0, // Would need server instance to get actual count
      requestsPerMinute: recentRequests.length,
      averageResponseTime,
      errorRate
    };

    this.systemMetrics.push(systemMetric);

    // Keep only recent system metrics
    if (this.systemMetrics.length > 60) { // Keep 1 hour of data
      this.systemMetrics.shift();
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add request ID to request for tracing
      (req as any).requestId = requestId;

      // Override res.end to capture metrics
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const metric: PerformanceMetrics = {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          memoryUsage: process.memoryUsage(),
          timestamp: new Date(),
          userAgent: req.headers['user-agent'],
          ip: req.ip
        };

        monitor.recordMetric(metric);
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);

    // Track request counts
    const key = `${metric.method}:${metric.url}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    // Track error counts
    if (metric.statusCode >= 400) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  public getMetrics(timeRange: number = 3600000): PerformanceMetrics[] {
    const cutoff = Date.now() - timeRange;
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  public getSystemMetrics(): SystemMetrics[] {
    return this.systemMetrics.slice(-60); // Last hour
  }

  public getTopSlowEndpoints(limit: number = 10): Array<{endpoint: string, averageTime: number, count: number}> {
    const endpointTimes = new Map<string, number[]>();

    this.metrics.forEach(metric => {
      const endpoint = `${metric.method}:${metric.url}`;
      if (!endpointTimes.has(endpoint)) {
        endpointTimes.set(endpoint, []);
      }
      endpointTimes.get(endpoint)!.push(metric.responseTime);
    });

    return Array.from(endpointTimes.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        count: times.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  public getErrorRates(): Array<{endpoint: string, errorRate: number, totalRequests: number}> {
    const results: Array<{endpoint: string, errorRate: number, totalRequests: number}> = [];

    this.requestCounts.forEach((totalRequests, endpoint) => {
      const errorCount = this.errorCounts.get(endpoint) || 0;
      const errorRate = (errorCount / totalRequests) * 100;
      
      results.push({
        endpoint,
        errorRate,
        totalRequests
      });
    });

    return results.sort((a, b) => b.errorRate - a.errorRate);
  }

  public getHealthStatus() {
    const recentMetrics = this.getMetrics(300000); // Last 5 minutes
    const systemMetric = this.systemMetrics[this.systemMetrics.length - 1];

    if (!systemMetric) {
      return { status: 'unknown', message: 'No metrics available' };
    }

    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    const memoryUsagePercent = (systemMetric.memoryUsage.used / systemMetric.memoryUsage.total) * 100;

    // Health thresholds
    if (avgResponseTime > 5000 || memoryUsagePercent > 90 || systemMetric.errorRate > 10) {
      return { 
        status: 'critical', 
        message: 'System performance is degraded',
        details: {
          avgResponseTime,
          memoryUsagePercent,
          errorRate: systemMetric.errorRate
        }
      };
    }

    if (avgResponseTime > 2000 || memoryUsagePercent > 70 || systemMetric.errorRate > 5) {
      return { 
        status: 'warning', 
        message: 'System performance needs attention',
        details: {
          avgResponseTime,
          memoryUsagePercent,
          errorRate: systemMetric.errorRate
        }
      };
    }

    return { 
      status: 'healthy', 
      message: 'System is operating normally',
      details: {
        avgResponseTime,
        memoryUsagePercent,
        errorRate: systemMetric.errorRate
      }
    };
  }

  public cleanup() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

export const monitor = new PerformanceMonitor();
export default monitor;