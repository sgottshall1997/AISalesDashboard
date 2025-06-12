import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { DatabaseStorage } from '../storage';

interface WebSocketService {
  io: SocketIOServer;
  broadcastUpdate: (event: string, data: any) => void;
  broadcastToUser: (userId: string, event: string, data: any) => void;
  notifyDashboardUpdate: (metrics: any) => void;
  notifyNewLead: (lead: any) => void;
  notifyInvoiceUpdate: (invoice: any) => void;
  notifyAIContentGenerated: (content: any) => void;
}

export function createWebSocketService(
  httpServer: HttpServer,
  storage: DatabaseStorage
): WebSocketService {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join-user-room', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined room user:${userId}`);
    });

    // Join dashboard room for real-time metrics
    socket.on('join-dashboard', () => {
      socket.join('dashboard');
      console.log(`Socket ${socket.id} joined dashboard room`);
    });

    // Handle AI content requests
    socket.on('request-ai-content', async (data) => {
      try {
        socket.emit('ai-content-status', { status: 'processing', requestId: data.requestId });
        
        // Simulate AI processing (replace with actual AI service)
        setTimeout(() => {
          socket.emit('ai-content-ready', {
            requestId: data.requestId,
            content: `Generated content for: ${data.prompt}`,
            timestamp: new Date().toISOString()
          });
        }, 2000);
        
      } catch (error) {
        socket.emit('ai-content-error', {
          requestId: data.requestId,
          error: 'Failed to generate content'
        });
      }
    });

    // Handle lead scoring requests
    socket.on('request-lead-scoring', async (data) => {
      try {
        socket.emit('lead-scoring-status', { status: 'analyzing', requestId: data.requestId });
        
        const leads = await storage.getAllLeads();
        const scoredLeads = leads.map(lead => ({
          id: lead.id,
          name: lead.name,
          score: Math.round(Math.random() * 100),
          priority: Math.random() > 0.7 ? 'high' : 'medium'
        }));

        socket.emit('lead-scoring-complete', {
          requestId: data.requestId,
          scores: scoredLeads,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        socket.emit('lead-scoring-error', {
          requestId: data.requestId,
          error: 'Failed to score leads'
        });
      }
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Service methods
  const broadcastUpdate = (event: string, data: any) => {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  };

  const broadcastToUser = (userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  };

  const notifyDashboardUpdate = (metrics: any) => {
    io.to('dashboard').emit('dashboard-update', {
      metrics,
      timestamp: new Date().toISOString()
    });
  };

  const notifyNewLead = (lead: any) => {
    broadcastUpdate('new-lead', {
      lead,
      message: `New lead: ${lead.name} from ${lead.company}`
    });
  };

  const notifyInvoiceUpdate = (invoice: any) => {
    broadcastUpdate('invoice-update', {
      invoice,
      message: `Invoice ${invoice.invoice_number} updated to ${invoice.payment_status}`
    });
  };

  const notifyAIContentGenerated = (content: any) => {
    broadcastUpdate('ai-content-generated', {
      content,
      message: `New AI content generated: ${content.type}`
    });
  };

  // Periodic dashboard updates
  const startPeriodicUpdates = () => {
    setInterval(async () => {
      try {
        const dashboardStats = await storage.getDashboardStats();
        notifyDashboardUpdate(dashboardStats);
      } catch (error) {
        console.error('Failed to send periodic dashboard update:', error);
      }
    }, 30000); // Update every 30 seconds
  };

  // Start periodic updates
  startPeriodicUpdates();

  return {
    io,
    broadcastUpdate,
    broadcastToUser,
    notifyDashboardUpdate,
    notifyNewLead,
    notifyInvoiceUpdate,
    notifyAIContentGenerated
  };
}

export type { WebSocketService };