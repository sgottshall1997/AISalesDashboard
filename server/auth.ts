import express from 'express';
import session from 'express-session';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import connectPg from 'connect-pg-simple';

// Session configuration
export function configureSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PgStore = connectPg(session);
  
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

// Authentication middleware
export function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Login function
export async function authenticateUser(username: string, password: string) {
  try {
    // For this implementation, we'll use a simple password check
    // In production, you'd want to hash passwords
    if (password === 'spence') {
      // Check if user exists, if not create one
      let user = await db.select().from(users).where(eq(users.username, username)).limit(1);
      
      if (user.length === 0) {
        // Create user if it doesn't exist
        const [newUser] = await db.insert(users).values({
          username,
          password: 'spence' // In production, this should be hashed
        }).returning();
        return newUser;
      }
      
      return user[0];
    }
    
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}