// Analytics service for tracking user interactions and business metrics
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
}

class AnalyticsService {
  private isEnabled: boolean;
  private events: AnalyticsEvent[] = [];

  constructor() {
    this.isEnabled = import.meta.env.PROD; // Only in production
  }

  // Track business-critical events
  track(event: string, properties?: Record<string, any>, userId?: string) {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      userId
    };

    this.events.push(analyticsEvent);
    
    // Send to backend for processing
    this.sendToBackend(analyticsEvent);
  }

  // Track page views
  page(pageName: string, properties?: Record<string, any>) {
    this.track('Page View', {
      page: pageName,
      ...properties
    });
  }

  // Track AI interactions
  trackAIInteraction(action: string, context: string, success: boolean) {
    this.track('AI Interaction', {
      action,
      context,
      success,
      performance: performance.now()
    });
  }

  // Track business metrics
  trackBusinessMetric(metric: string, value: number, context?: string) {
    this.track('Business Metric', {
      metric,
      value,
      context
    });
  }

  // Track lead scoring
  trackLeadScoring(leadId: string, score: number, factors: string[]) {
    this.track('Lead Scored', {
      leadId,
      score,
      factors,
      timestamp: new Date().toISOString()
    });
  }

  // Track email generation
  trackEmailGeneration(leadId: string, template: string, success: boolean) {
    this.track('Email Generated', {
      leadId,
      template,
      success,
      timestamp: new Date().toISOString()
    });
  }

  private async sendToBackend(event: AnalyticsEvent) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Get analytics data for dashboard
  async getAnalytics(timeRange: string = '7d') {
    try {
      const response = await fetch(`/api/analytics/dashboard?range=${timeRange}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return null;
    }
  }
}

export const analytics = new AnalyticsService();

// Hook for React components
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    page: analytics.page.bind(analytics),
    trackAIInteraction: analytics.trackAIInteraction.bind(analytics),
    trackBusinessMetric: analytics.trackBusinessMetric.bind(analytics),
    trackLeadScoring: analytics.trackLeadScoring.bind(analytics),
    trackEmailGeneration: analytics.trackEmailGeneration.bind(analytics)
  };
}