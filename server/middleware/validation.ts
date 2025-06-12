import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";

// Input sanitization and validation middleware
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize request body
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = schema.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
}

// SQL injection prevention middleware
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)|(-{2})|(%27)|(\')|(%3D)|(=)|(%3B)|(;)/gi;
  
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potential SQL injection patterns
      return value.replace(sqlInjectionPattern, '');
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
}

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI generation rate limiting
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 AI requests per minute
  message: {
    error: "AI generation rate limit exceeded, please wait before trying again."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Content Security Policy middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
}

// Request size limiting
export function limitRequestSize(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    const maxBytes = parseFloat(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024);
    
    if (contentLength && parseInt(contentLength) > maxBytes) {
      return res.status(413).json({
        error: 'Request payload too large'
      });
    }
    
    next();
  };
}

// Input validation schemas for common use cases
export const schemas = {
  email: z.string().email().max(254),
  
  clientData: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().max(254),
    company: z.string().min(1).max(255),
    subscription_type: z.string().optional(),
    renewal_date: z.string().datetime().optional(),
    engagement_rate: z.string().optional(),
    click_rate: z.string().optional(),
    interest_tags: z.array(z.string()).optional(),
    risk_level: z.enum(['low', 'medium', 'high']).optional(),
    notes: z.string().max(1000).optional()
  }),

  prospectData: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().max(254),
    company: z.string().min(1).max(255),
    interest_tags: z.array(z.string()).optional(),
    engagement_score: z.number().min(0).max(100).optional(),
    last_contacted: z.string().datetime().optional(),
    status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'closed']).optional(),
    notes: z.string().max(1000).optional(),
    how_heard: z.string().max(255).optional()
  }),

  emailGeneration: z.object({
    recipientName: z.string().min(1).max(255),
    recipientCompany: z.string().min(1).max(255),
    theme: z.string().min(1).max(500),
    emailAngle: z.string().max(1000).optional(),
    keyPoints: z.array(z.string()).optional(),
    supportingReports: z.array(z.string()).optional()
  }),

  contentReport: z.object({
    title: z.string().min(1).max(500),
    published_date: z.string().datetime(),
    type: z.string().max(100).optional(),
    source_type: z.string().max(100).optional(),
    open_rate: z.string().optional(),
    click_rate: z.string().optional(),
    engagement_level: z.enum(['low', 'medium', 'high']).optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().max(2000).optional(),
    key_insights: z.array(z.string()).optional(),
    target_audience: z.string().max(500).optional(),
    performance_metrics: z.record(z.unknown()).optional(),
    full_content: z.string().optional()
  }),

  taskData: z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    due_date: z.string().datetime().optional(),
    assigned_to: z.string().max(255).optional(),
    category: z.string().max(100).optional()
  })
};

// Error handling middleware for validation
export function validationErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      message: "Invalid request data",
      errors: err.errors.map(error => ({
        field: error.path.join('.'),
        message: error.message,
        received: error.received
      }))
    });
  }
  
  next(err);
}