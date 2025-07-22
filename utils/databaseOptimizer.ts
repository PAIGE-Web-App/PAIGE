// utils/databaseOptimizer.ts
// Database optimization utilities for Firestore queries

import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  doc,
  startAfter,
  endBefore,
  QuerySnapshot,
  DocumentData,
  QueryConstraint,
  orderBy as firestoreOrderBy
} from 'firebase/firestore';

// Cache for frequently accessed data
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

interface OptimizedQueryOptions {
  limit?: number;
  cache?: boolean;
  cacheTTL?: number; // milliseconds
  useIndex?: boolean;
}

interface PaginationOptions {
  pageSize?: number;
  startAfter?: DocumentData;
  endBefore?: DocumentData;
}

// Optimized vendor queries
export class VendorQueryOptimizer {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getVendorsByCategory(
    category: string, 
    options: OptimizedQueryOptions = {}
  ): Promise<DocumentData[]> {
    const cacheKey = `vendors_category_${category}_${options.limit || 'all'}`;
    
    // Check cache first
    if (options.cache !== false) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTTL || this.CACHE_TTL)) {
        return cached.data;
      }
    }

    const constraints: QueryConstraint[] = [
      where('category', '==', category),
      orderBy('rating', 'desc'),
      orderBy('user_ratings_total', 'desc')
    ];

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(collection(db, 'vendors'), ...constraints);
    const snapshot = await getDocs(q);
    
    const vendors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cache the result
    if (options.cache !== false) {
      queryCache.set(cacheKey, {
        data: vendors,
        timestamp: Date.now(),
        ttl: options.cacheTTL || this.CACHE_TTL
      });
    }

    return vendors;
  }

  static async getVendorsByLocation(
    location: { lat: number; lng: number; radius: number },
    category?: string,
    options: OptimizedQueryOptions = {}
  ): Promise<DocumentData[]> {
    const cacheKey = `vendors_location_${location.lat}_${location.lng}_${location.radius}_${category || 'all'}`;
    
    if (options.cache !== false) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTTL || this.CACHE_TTL)) {
        return cached.data;
      }
    }

    const constraints: QueryConstraint[] = [
      where('business_status', '==', 'OPERATIONAL')
    ];

    if (category) {
      constraints.push(where('category', '==', category));
    }

    constraints.push(
      orderBy('rating', 'desc'),
      orderBy('user_ratings_total', 'desc')
    );

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(collection(db, 'vendors'), ...constraints);
    const snapshot = await getDocs(q);
    
    const vendors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by distance (client-side for now, could be optimized with geohashing)
    const filteredVendors = vendors.filter(vendor => {
      const vendorData = vendor as any;
      if (!vendorData.geometry?.location) return false;
      
      const distance = this.calculateDistance(
        location.lat, location.lng,
        vendorData.geometry.location.lat, vendorData.geometry.location.lng
      );
      
      return distance <= location.radius;
    });

    // Cache the result
    if (options.cache !== false) {
      queryCache.set(cacheKey, {
        data: filteredVendors,
        timestamp: Date.now(),
        ttl: options.cacheTTL || this.CACHE_TTL
      });
    }

    return filteredVendors;
  }

  static async getVendorById(
    vendorId: string,
    options: OptimizedQueryOptions = {}
  ): Promise<DocumentData | null> {
    const cacheKey = `vendor_${vendorId}`;
    
    if (options.cache !== false) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTTL || this.CACHE_TTL)) {
        return cached.data;
      }
    }

    const docRef = doc(db, 'vendors', vendorId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const vendor = {
      id: docSnap.id,
      ...docSnap.data()
    };

    // Cache the result
    if (options.cache !== false) {
      queryCache.set(cacheKey, {
        data: vendor,
        timestamp: Date.now(),
        ttl: options.cacheTTL || this.CACHE_TTL
      });
    }

    return vendor;
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

// Optimized todo queries
export class TodoQueryOptimizer {
  private static readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  static async getTodoItemsByList(
    userId: string,
    listId: string,
    options: OptimizedQueryOptions & PaginationOptions = {}
  ): Promise<DocumentData[]> {
    const cacheKey = `todo_items_${userId}_${listId}_${options.pageSize || 'all'}`;
    
    if (options.cache !== false) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTTL || this.CACHE_TTL)) {
        return cached.data;
      }
    }

    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      where('listId', '==', listId),
      orderBy('createdAt', 'desc')
    ];

    if (options.pageSize) {
      constraints.push(limit(options.pageSize));
    }

    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter));
    }

    if (options.endBefore) {
      constraints.push(endBefore(options.endBefore));
    }

    const q = query(collection(db, 'todoItems'), ...constraints);
    const snapshot = await getDocs(q);
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cache the result
    if (options.cache !== false) {
      queryCache.set(cacheKey, {
        data: items,
        timestamp: Date.now(),
        ttl: options.cacheTTL || this.CACHE_TTL
      });
    }

    return items;
  }

  static async getTodoListsByUser(
    userId: string,
    options: OptimizedQueryOptions = {}
  ): Promise<DocumentData[]> {
    const cacheKey = `todo_lists_${userId}`;
    
    if (options.cache !== false) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTTL || this.CACHE_TTL)) {
        return cached.data;
      }
    }

    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ];

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(collection(db, 'todoLists'), ...constraints);
    const snapshot = await getDocs(q);
    
    const lists = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cache the result
    if (options.cache !== false) {
      queryCache.set(cacheKey, {
        data: lists,
        timestamp: Date.now(),
        ttl: options.cacheTTL || this.CACHE_TTL
      });
    }

    return lists;
  }
}

// Optimized comment queries
export class CommentQueryOptimizer {
  private static readonly CACHE_TTL = 1 * 60 * 1000; // 1 minute

  static async getCommentsByVendor(
    placeId: string,
    options: OptimizedQueryOptions & PaginationOptions = {}
  ): Promise<DocumentData[]> {
    const cacheKey = `comments_${placeId}_${options.pageSize || 'all'}`;
    
    if (options.cache !== false) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTTL || this.CACHE_TTL)) {
        return cached.data;
      }
    }

    const constraints: QueryConstraint[] = [
      where('placeId', '==', placeId),
      orderBy('createdAt', 'desc')
    ];

    if (options.pageSize) {
      constraints.push(limit(options.pageSize));
    }

    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter));
    }

    const q = query(collection(db, 'vendorComments'), ...constraints);
    const snapshot = await getDocs(q);
    
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cache the result
    if (options.cache !== false) {
      queryCache.set(cacheKey, {
        data: comments,
        timestamp: Date.now(),
        ttl: options.cacheTTL || this.CACHE_TTL
      });
    }

    return comments;
  }
}

// Cache management utilities
export class CacheManager {
  static clearCache(): void {
    queryCache.clear();
  }

  static clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        queryCache.delete(key);
      }
    }
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: queryCache.size,
      keys: Array.from(queryCache.keys())
    };
  }

  static invalidateCache(pattern: string): void {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  }
}

// Auto-cleanup expired cache entries every 5 minutes
setInterval(() => {
  CacheManager.clearExpiredCache();
}, 5 * 60 * 1000); 