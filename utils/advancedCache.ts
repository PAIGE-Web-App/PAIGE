// utils/advancedCache.ts
// Advanced caching system with Redis integration and multi-level caching

import Redis from 'ioredis';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// Cache configuration
interface CacheConfig {
  redisUrl?: string;
  defaultTTL: number;
  maxMemorySize: number;
  enableCompression: boolean;
  enableAnalytics: boolean;
}

// Cache entry with metadata
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size: number;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
  keysCount: number;
  averageTTL: number;
}

// Cache warming configuration
interface CacheWarmingConfig {
  enabled: boolean;
  interval: number;
  patterns: string[];
  priority: 'low' | 'normal' | 'high';
}

class AdvancedCache {
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private warmingConfig: CacheWarmingConfig;
  private warmingInterval: NodeJS.Timeout | null = null;
  private analyticsInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      redisUrl: process.env.REDIS_URL,
      defaultTTL: 300, // 5 minutes
      maxMemorySize: 100 * 1024 * 1024, // 100MB
      enableCompression: true,
      enableAnalytics: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      keysCount: 0,
      averageTTL: 0
    };

    this.warmingConfig = {
      enabled: true,
      interval: 300000, // 5 minutes
      patterns: ['user:*', 'vendor:*', 'contact:*'],
      priority: 'normal'
    };

    this.initializeRedis();
    this.startAnalytics();
    this.startCacheWarming();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    if (!this.config.redisUrl) {
      console.log('Redis URL not configured, using memory-only cache');
      return;
    }

    try {
      this.redis = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
        this.redis = null;
      });

      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.redis = null;
    }
  }

  /**
   * Get value from cache (multi-level)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Level 1: Memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.updateAccessStats(memoryEntry);
        this.stats.hits++;
        return memoryEntry.data as T;
      }

      // Level 2: Redis cache
      if (this.redis) {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const entry: CacheEntry<T> = JSON.parse(redisData);
          if (!this.isExpired(entry)) {
            // Promote to memory cache
            this.memoryCache.set(key, entry);
            this.updateAccessStats(entry);
            this.stats.hits++;
            return entry.data;
          } else {
            // Remove expired entry
            await this.delete(key);
          }
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache (multi-level)
   */
  async set<T>(
    key: string, 
    data: T, 
    ttl: number = this.config.defaultTTL,
    tags: string[] = []
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        tags,
        size: JSON.stringify(data).length
      };

      // Level 1: Memory cache
      this.memoryCache.set(key, entry);

      // Level 2: Redis cache
      if (this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(entry));
      }

      this.stats.sets++;
      this.updateStats();
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      
      if (this.redis) {
        await this.redis.del(key);
      }

      this.stats.deletes++;
      this.updateStats();
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Check memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (tags.some(tag => entry.tags.includes(tag))) {
          keysToDelete.push(key);
        }
      }

      // Check Redis cache
      if (this.redis) {
        const keys = await this.redis.keys('*');
        for (const key of keys) {
          try {
            const data = await this.redis.get(key);
            if (data) {
              const entry: CacheEntry = JSON.parse(data);
              if (tags.some(tag => entry.tags.includes(tag))) {
                keysToDelete.push(key);
              }
            }
          } catch (error) {
            // Skip invalid entries
          }
        }
      }

      // Delete all matching keys
      await Promise.all(keysToDelete.map(key => this.delete(key)));
      
      console.log(`Invalidated ${keysToDelete.length} cache entries for tags:`, tags);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          result.set(key, value);
        }
      })
    );

    return result;
  }

  /**
   * Set multiple values
   */
  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number; tags?: string[] }>): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, ttl, tags }) => 
        this.set(key, value, ttl, tags)
      )
    );
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl * 1000;
  }

  /**
   * Update access statistics
   */
  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.keysCount = this.memoryCache.size;
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    
    // Calculate memory usage
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    this.stats.memoryUsage = totalSize;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.redis) {
      await this.redis.flushall();
    }

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      keysCount: 0,
      averageTTL: 0
    };
  }

  /**
   * Start cache warming
   */
  private startCacheWarming(): void {
    if (!this.warmingConfig.enabled) return;

    this.warmingInterval = setInterval(() => {
      this.warmCache().catch(console.error);
    }, this.warmingConfig.interval);

    // Initial warm
    this.warmCache().catch(console.error);
  }

  /**
   * Warm cache with frequently accessed data
   */
  private async warmCache(): Promise<void> {
    try {
      console.log('🔥 Warming cache...');

      // Warm user data
      await this.warmUserData();
      
      // Warm vendor data
      await this.warmVendorData();
      
      // Warm contact data
      await this.warmContactData();

      console.log('✅ Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  /**
   * Warm user data cache
   */
  private async warmUserData(): Promise<void> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(usersQuery);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      await this.mset(
        users.map(user => ({
          key: `user:${user.id}`,
          value: user,
          ttl: 1800, // 30 minutes
          tags: ['user', 'profile']
        }))
      );
    } catch (error) {
      console.error('Error warming user data:', error);
    }
  }

  /**
   * Warm vendor data cache
   */
  private async warmVendorData(): Promise<void> {
    try {
      const vendorsQuery = query(
        collection(db, 'vendors'),
        where('rating', '>=', 4.0),
        orderBy('rating', 'desc'),
        limit(200)
      );
      
      const snapshot = await getDocs(vendorsQuery);
      const vendors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      await this.mset(
        vendors.map(vendor => ({
          key: `vendor:${vendor.id}`,
          value: vendor,
          ttl: 3600, // 1 hour
          tags: ['vendor', 'catalog']
        }))
      );
    } catch (error) {
      console.error('Error warming vendor data:', error);
    }
  }

  /**
   * Warm contact data cache
   */
  private async warmContactData(): Promise<void> {
    try {
      const contactsQuery = query(
        collection(db, 'contacts'),
        orderBy('lastMessage', 'desc'),
        limit(500)
      );
      
      const snapshot = await getDocs(contactsQuery);
      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      await this.mset(
        contacts.map(contact => ({
          key: `contact:${contact.id}`,
          value: contact,
          ttl: 900, // 15 minutes
          tags: ['contact', 'communication']
        }))
      );
    } catch (error) {
      console.error('Error warming contact data:', error);
    }
  }

  /**
   * Start analytics collection
   */
  private startAnalytics(): void {
    if (!this.config.enableAnalytics) return;

    this.analyticsInterval = setInterval(() => {
      this.logAnalytics();
    }, 60000); // Every minute
  }

  /**
   * Log cache analytics
   */
  private logAnalytics(): void {
    const stats = this.getStats();
    
    if (stats.hitRate < 0.5) {
      console.warn('⚠️ Low cache hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
    }

    if (stats.memoryUsage > this.config.maxMemorySize * 0.8) {
      console.warn('⚠️ High memory usage:', (stats.memoryUsage / 1024 / 1024).toFixed(1) + 'MB');
    }

    // Log performance metrics
    console.log('📊 Cache Stats:', {
      hitRate: (stats.hitRate * 100).toFixed(1) + '%',
      keys: stats.keysCount,
      memory: (stats.memoryUsage / 1024 / 1024).toFixed(1) + 'MB',
      hits: stats.hits,
      misses: stats.misses
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Global cache instance
export const advancedCache = new AdvancedCache();

// Cache decorator for functions
export function cached<T extends (...args: any[]) => any>(
  keyPrefix: string,
  ttl: number = 300,
  tags: string[] = []
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${keyPrefix}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cachedResult = await advancedCache.get(key);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      await advancedCache.set(key, result, ttl, tags);
      
      return result;
    };
  };
}

// Cache utilities
export const cacheUtils = {
  // Generate cache key
  key: (...parts: string[]) => parts.join(':'),
  
  // Cache tags
  tags: {
    user: 'user',
    vendor: 'vendor',
    contact: 'contact',
    message: 'message',
    email: 'email',
    notification: 'notification'
  },
  
  // TTL presets
  ttl: {
    short: 60,      // 1 minute
    medium: 300,    // 5 minutes
    long: 1800,     // 30 minutes
    veryLong: 3600, // 1 hour
    day: 86400      // 24 hours
  }
};

export default advancedCache; 