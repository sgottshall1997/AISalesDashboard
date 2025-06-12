import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { securityHeaders, apiRateLimit, sanitizeInputs, limitRequestSize } from './middleware/validation';
import { createWebSocketService } from "./services/websocket-service";
// JobQueueService disabled - using in-memory alternatives
import { cacheService } from "./services/cache-service";
import { monitoringService } from "./services/monitoring-service";
import { DatabaseStorage } from "./storage";

const app = express();

// Trust proxy for accurate client IP detection and rate limiting
app.set('trust proxy', 1);

// Apply security headers early
app.use(securityHeaders);

// Input sanitization and rate limiting
app.use(sanitizeInputs);
app.use(limitRequestSize('10mb'));
app.use('/api/', apiRateLimit);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Initialize PostgreSQL session store
const PgSession = connectPgSimple(session);

// Setup session middleware globally
app.use(cookieParser());
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: false
  }),
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize enterprise services with graceful fallbacks
  const storage = new DatabaseStorage();
  
  try {
    const websocketService = createWebSocketService(server, storage);
    log("WebSocket service initialized for real-time updates");
  } catch (error) {
    log("WebSocket service unavailable - continuing without real-time features");
  }

  // Job queue service disabled - using in-memory alternatives for background processing
  log("Background processing using in-memory queue service");
  
  try {
    await cacheService.warmCache();
    log("Enterprise caching system active");
  } catch (error) {
    log("Caching service unavailable - continuing without Redis caching");
  }

  // Initialize email service with scheduled reports
  try {
    const { EmailService } = await import("./services/email-service");
    const emailService = new EmailService(storage);
    await emailService.scheduleWeeklyReports();
    log("Email scheduling configured: Weekly reports (Mon 9AM), Daily digest (Mon-Fri 8AM)");
  } catch (error) {
    log("Email service unavailable - continuing without scheduled reports");
  }

  log("Enterprise transformation: AI feedback, search indexing, security, monitoring, email automation active");

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 404 handler for unmatched API routes only
  app.use('/api/*', notFoundHandler);

  // Enhanced error handling middleware
  app.use(errorHandler);

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
