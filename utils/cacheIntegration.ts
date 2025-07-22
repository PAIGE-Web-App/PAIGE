// utils/cacheIntegration.ts
// Simple cache integration utilities for common operations

import { advancedCache, cacheUtils } from './advancedCache';

/**
 * Cache user data
 */
export async function cacheUserData(userId: string, userData: any): Promise<void> {
  const key = cacheUtils.key('user', userId);
  await advancedCache.set(key, userData, cacheUtils.ttl.long, [cacheUtils.tags.user]);
}

/**
 * Get cached user data
 */
export async function getCachedUserData(userId: string): Promise<any | null> {
  const key = cacheUtils.key('user', userId);
  return await advancedCache.get(key);
}

/**
 * Cache vendor data
 */
export async function cacheVendorData(vendorId: string, vendorData: any): Promise<void> {
  const key = cacheUtils.key('vendor', vendorId);
  await advancedCache.set(key, vendorData, cacheUtils.ttl.veryLong, [cacheUtils.tags.vendor]);
}

/**
 * Get cached vendor data
 */
export async function getCachedVendorData(vendorId: string): Promise<any | null> {
  const key = cacheUtils.key('vendor', vendorId);
  return await advancedCache.get(key);
}

/**
 * Cache contact data
 */
export async function cacheContactData(contactId: string, contactData: any): Promise<void> {
  const key = cacheUtils.key('contact', contactId);
  await advancedCache.set(key, contactData, cacheUtils.ttl.medium, [cacheUtils.tags.contact]);
}

/**
 * Get cached contact data
 */
export async function getCachedContactData(contactId: string): Promise<any | null> {
  const key = cacheUtils.key('contact', contactId);
  return await advancedCache.get(key);
}

/**
 * Cache vendor list by category
 */
export async function cacheVendorList(category: string, vendors: any[]): Promise<void> {
  const key = cacheUtils.key('vendors', 'category', category);
  await advancedCache.set(key, vendors, cacheUtils.ttl.long, [cacheUtils.tags.vendor]);
}

/**
 * Get cached vendor list
 */
export async function getCachedVendorList(category: string): Promise<any[] | null> {
  const key = cacheUtils.key('vendors', 'category', category);
  return await advancedCache.get<any[]>(key);
}

/**
 * Invalidate user-related cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await advancedCache.invalidateByTags([cacheUtils.tags.user]);
}

/**
 * Invalidate vendor-related cache
 */
export async function invalidateVendorCache(): Promise<void> {
  await advancedCache.invalidateByTags([cacheUtils.tags.vendor]);
}

/**
 * Invalidate contact-related cache
 */
export async function invalidateContactCache(): Promise<void> {
  await advancedCache.invalidateByTags([cacheUtils.tags.contact]);
}

/**
 * Cache with automatic invalidation
 */
export async function cacheWithInvalidation<T>(
  key: string,
  data: T,
  ttl: number = cacheUtils.ttl.medium,
  tags: string[] = []
): Promise<void> {
  await advancedCache.set(key, data, ttl, tags);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return advancedCache.getStats();
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  await advancedCache.clear();
}

/**
 * Warm cache for specific data types
 */
export async function warmCacheForType(type: 'user' | 'vendor' | 'contact'): Promise<void> {
  switch (type) {
    case 'user':
      // Warm user cache - this would typically load recent users
      console.log('🔥 Warming user cache...');
      break;
    case 'vendor':
      // Warm vendor cache - this would typically load popular vendors
      console.log('🔥 Warming vendor cache...');
      break;
    case 'contact':
      // Warm contact cache - this would typically load recent contacts
      console.log('🔥 Warming contact cache...');
      break;
  }
}

/**
 * Cache decorator for methods
 */
export function cachedMethod<T extends (...args: any[]) => any>(
  keyPrefix: string,
  ttl: number = cacheUtils.ttl.medium,
  tags: string[] = []
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = cacheUtils.key(keyPrefix, propertyName, ...args.map(arg => String(arg)));
      
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

/**
 * Cache middleware for API routes
 */
export function cacheMiddleware(
  keyPrefix: string,
  ttl: number = cacheUtils.ttl.medium,
  tags: string[] = []
) {
  return async (req: Request, handler: (req: Request) => Promise<Response>) => {
    const url = new URL(req.url);
    const key = cacheUtils.key(keyPrefix, url.pathname, url.search);
    
    // Try to get from cache
    const cachedResponse = await advancedCache.get<string>(key);
    if (cachedResponse) {
      return new Response(cachedResponse, {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    // Execute handler and cache result
    const response = await handler(req);
    const responseText = await response.text();
    
    await advancedCache.set(key, responseText, ttl, tags);
    
    return new Response(responseText, {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  };
}

export default {
  cacheUserData,
  getCachedUserData,
  cacheVendorData,
  getCachedVendorData,
  cacheContactData,
  getCachedContactData,
  cacheVendorList,
  getCachedVendorList,
  invalidateUserCache,
  invalidateVendorCache,
  invalidateContactCache,
  cacheWithInvalidation,
  getCacheStats,
  clearAllCache,
  warmCacheForType,
  cachedMethod,
  cacheMiddleware
}; 