import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  metadata?: Record<string, any>;
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response details
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Log request details
    const logEntry: LogEntry = {
      level: res.statusCode >= 400 ? 'error' : 'info',
      message: `${req.method} ${req.originalUrl}`,
      timestamp: new Date(),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      metadata: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        contentLength: body?.length || 0
      }
    };

    // Log to console with structured format
    console.log(`${new Date().toISOString()} [${req.method}] ${req.originalUrl} ${res.statusCode} ${responseTime}ms`);
    
    // Store critical errors in database for monitoring
    if (res.statusCode >= 500) {
      logError(logEntry).catch(console.error);
    }

    return originalSend.call(this, body);
  };

  next();
}

// Performance monitoring middleware
export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests (>1000ms)
    if (duration > 1000) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.originalUrl} took ${duration.toFixed(2)}ms`);
      
      const logEntry: LogEntry = {
        level: 'warn',
        message: `Slow request detected: ${req.method} ${req.originalUrl}`,
        timestamp: new Date(),
        endpoint: req.originalUrl,
        method: req.method,
        responseTime: duration,
        metadata: {
          threshold: 1000,
          actual: duration
        }
      };
      
      logError(logEntry).catch(console.error);
    }
  });
  
  next();
}

// Database error logging
async function logError(logEntry: LogEntry): Promise<void> {
  try {
    await storage.logSystemEvent({
      level: logEntry.level,
      message: logEntry.message,
      endpoint: logEntry.endpoint,
      method: logEntry.method,
      status_code: logEntry.statusCode,
      response_time: logEntry.responseTime,
      metadata: logEntry.metadata,
      created_at: logEntry.timestamp
    });
  } catch (error) {
    // Fallback to console if database logging fails
    console.error('Failed to log to database:', error);
    console.error('Original log entry:', logEntry);
  }
}

// Error tracking middleware
export function errorTracker(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const logEntry: LogEntry = {
    level: 'error',
    message: err.message || 'Unknown error',
    timestamp: new Date(),
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: err.status || 500,
    metadata: {
      errorId,
      stack: err.stack,
      body: req.body,
      query: req.query,
      params: req.params
    }
  };

  // Log error details
  console.error(`ERROR [${errorId}]: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  
  // Store in database for analysis
  logError(logEntry).catch(console.error);

  // Send structured error response
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    errorId,
    timestamp: new Date().toISOString()
  });
}

// Health check logging
export function healthCheckLogger(endpoint: string, status: 'healthy' | 'unhealthy', details?: any) {
  const logEntry: LogEntry = {
    level: status === 'healthy' ? 'info' : 'error',
    message: `Health check: ${endpoint} is ${status}`,
    timestamp: new Date(),
    endpoint: `/health/${endpoint}`,
    metadata: {
      status,
      details
    }
  };

  console.log(`HEALTH: ${endpoint} - ${status.toUpperCase()}`);
  
  if (status === 'unhealthy') {
    logError(logEntry).catch(console.error);
  }
}

// Business logic audit logging
export function auditLogger(action: string, userId: string, details: any) {
  const logEntry: LogEntry = {
    level: 'info',
    message: `Audit: ${action}`,
    timestamp: new Date(),
    userId,
    metadata: {
      action,
      details
    }
  };

  console.log(`AUDIT [${userId}]: ${action}`);
  logError(logEntry).catch(console.error);
}

// API usage analytics
export function apiAnalytics(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Track API usage patterns
    const analytics = {
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    // Store analytics data (async, non-blocking)
    storage.recordApiUsage(analytics).catch(error => {
      console.warn('Failed to record API analytics:', error);
    });
  });

  next();
}