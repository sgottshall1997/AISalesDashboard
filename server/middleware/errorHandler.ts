import { Request, Response, NextFunction } from 'express';

export interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  console.error(`[Error ${new Date().toISOString()}]`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    status: err.status || 500,
    code: err.code
  });

  // Set default error status
  const status = err.status || 500;
  
  // Development vs Production error responses
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: {
      message: err.message || 'Internal Server Error',
      status,
      ...(isDevelopment && { 
        stack: err.stack,
        code: err.code 
      })
    },
    timestamp: new Date().toISOString(),
    path: req.url
  };

  res.status(status).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: `Route ${req.originalUrl} not found`,
      status: 404
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};