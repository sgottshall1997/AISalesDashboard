// Memory-based cache service (no Redis dependency)
interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

interface CacheItem {
  content: any;
  timestamp: number;
  expires: number;
  version: string;
}

export class CacheService {
  private memoryCache = new Map<string, CacheItem>();
  private defaultTTL = 3600; // 1 hour default

  // AI content caching
  async cacheAIResponse(key: string, content: any, options: CacheOptions = {}) {
    const { ttl = this.defaultTTL, prefix = 'ai:' } = options;
    const cacheKey = `${prefix}${key}`;
    
    try {
      const now = Date.now();
      this.memoryCache.set(cacheKey, {
        content,
        timestamp: now,
        expires: now + (ttl * 1000),
        version: '1.0'
      });
      
      // Clean up expired entries periodically
      this.cleanupExpired();
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async getCachedAIResponse(key: string, prefix = 'ai:') {
    const cacheKey = `${prefix}${key}`;
    
    try {
      const item = this.memoryCache.get(cacheKey);
      if (!item) return null;
      
      // Check if expired
      if (Date.now() > item.expires) {
        this.memoryCache.delete(cacheKey);
        return null;
      }
      
      return item.content;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Theme analysis caching
  async cacheThemeAnalysis(themeKey: string, analysis: any, ttl = 7200) {
    return this.cacheAIResponse(themeKey, analysis, { ttl, prefix: 'theme:' });
  }

  async getCachedThemeAnalysis(themeKey: string) {
    return this.getCachedAIResponse(themeKey, 'theme:');
  }

  // Performance metrics caching
  async cacheMetrics(key: string, metrics: any, ttl = 300) {
    return this.cacheAIResponse(key, metrics, { ttl, prefix: 'metrics:' });
  }

  async getCachedMetrics(key: string) {
    return this.getCachedAIResponse(key, 'metrics:');
  }

  // Clean up expired cache entries
  private cleanupExpired() {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Clear all cache
  async clearCache() {
    this.memoryCache.clear();
    return true;
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.memoryCache.size,
      entries: Array.from(this.memoryCache.keys())
    };
  }

  // Warm cache method for startup
  async warmCache() {
    // Initialize cache with any startup data if needed
    console.log('Memory cache initialized');
    return true;
  }
}

// Create singleton instance
export const cacheService = new CacheService();