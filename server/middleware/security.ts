import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

// Input sanitization schemas
const emailSchema = z.string().email().max(255);
const textSchema = z.string().max(10000).refine(
  (text) => !containsMaliciousPatterns(text),
  { message: "Input contains potentially malicious content" }
);

const promptSchema = z.string().max(5000).refine(
  (prompt) => !containsPromptInjection(prompt),
  { message: "Input contains prompt injection patterns" }
);

// Security patterns to detect and block
function containsMaliciousPatterns(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(;|\-\-|\*|\/\*|\*\/)/,
    /(\bSCRIPT\b|\bALERT\b|\bONLOAD\b)/i
  ];

  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  return [...sqlPatterns, ...xssPatterns].some(pattern => pattern.test(input));
}

function containsPromptInjection(input: string): boolean {
  const injectionPatterns = [
    /ignore\s+(previous|all|above|prior)\s+(instructions|prompts)/i,
    /system\s*:\s*you\s+are\s+now/i,
    /pretend\s+to\s+be\s+(a\s+)?(different|new)/i,
    /forget\s+(everything|all)\s+(above|before)/i,
    /\[SYSTEM\]|\[ADMIN\]|\[ROOT\]/i,
    /act\s+as\s+(if\s+you\s+are\s+)?(jailbreak|dan)/i,
    /respond\s+only\s+with/i
  ];

  return injectionPatterns.some(pattern => pattern.test(input));
}

// Sanitize input by removing dangerous characters
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/(\-\-|\/\*|\*\/)/g, '') // Remove SQL comment patterns
    .trim();
}

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limit
export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later'
);

// AI endpoint rate limit (more restrictive)
export const aiRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 AI requests per minute
  'Too many AI requests, please wait before trying again'
);

// Auth rate limit (very restrictive)
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 login attempts per 15 minutes
  'Too many authentication attempts, please try again later'
);

// Input validation middleware
export function validateInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body, query, and params
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = schema.parse(req.body);
      }
      
      // Sanitize string fields in body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }
      
      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid input',
          details: error.errors
        });
      }
      
      return res.status(400).json({
        error: 'Input validation failed'
      });
    }
  };
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Content-specific validation schemas
export const emailValidation = z.object({
  recipientName: textSchema.optional(),
  recipientCompany: textSchema.optional(),
  subject: textSchema.optional(),
  content: textSchema.optional(),
  tone: z.enum(['professional', 'casual', 'formal']).optional()
});

export const searchValidation = z.object({
  query: z.string().min(3).max(200),
  type: z.string().max(50).optional(),
  dateRange: z.string().max(10).optional(),
  engagementLevel: z.string().max(20).optional(),
  limit: z.number().min(1).max(100).optional()
});

export const feedbackValidation = z.object({
  content_type: z.string().max(50),
  content_id: z.string().max(50),
  rating: z.boolean(),
  comment: z.string().max(1000).optional()
});

export const promptValidation = z.object({
  prompt: promptSchema,
  context: textSchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional()
});

// CORS security headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Prevent caching of sensitive endpoints
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

// Request logging for security monitoring
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(body) {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      contentLength: body ? body.length : 0
    };
    
    // Log suspicious activity
    if (res.statusCode >= 400 || duration > 5000) {
      console.warn('Security Alert:', logData);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

// Content Security Policy
export const cspHeader = (req: Request, res: Response, next: NextFunction) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  next();
};

export default {
  sanitizeInput,
  validateInput,
  securityHeaders,
  securityLogger,
  cspHeader,
  apiRateLimit,
  aiRateLimit,
  authRateLimit,
  emailValidation,
  searchValidation,
  feedbackValidation,
  promptValidation
};