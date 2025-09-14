/**
 * Intelligent Prefetching Manager
 * Analyzes user behavior and prefetches likely-to-be-viewed content
 */

import React from 'react';

interface PrefetchTarget {
  url: string;
  priority: number;
  type: 'vendor' | 'category' | 'image' | 'api';
  metadata?: any;
}

interface UserBehavior {
  viewedVendors: string[];
  viewedCategories: string[];
  searchTerms: string[];
  timeSpent: { [key: string]: number };
  lastActivity: number;
}

class PrefetchManager {
  private static instance: PrefetchManager;
  private behavior: UserBehavior = {
    viewedVendors: [],
    viewedCategories: [],
    searchTerms: [],
    timeSpent: {},
    lastActivity: Date.now()
  };
  private prefetchQueue: PrefetchTarget[] = [];
  private isPrefetching = false;
  private readonly MAX_PREFETCH_ITEMS = 5;
  private readonly PREFETCH_DELAY = 1000; // 1 second delay

  static getInstance(): PrefetchManager {
    if (!PrefetchManager.instance) {
      PrefetchManager.instance = new PrefetchManager();
    }
    return PrefetchManager.instance;
  }

  /**
   * Initialize prefetch manager
   */
  initialize(): void {
    this.loadBehaviorFromStorage();
    this.startPrefetchLoop();
  }

  /**
   * Track user viewing a vendor
   */
  trackVendorView(vendorId: string, category: string, timeSpent: number = 0): void {
    this.behavior.viewedVendors.unshift(vendorId);
    this.behavior.viewedCategories.unshift(category);
    this.behavior.timeSpent[vendorId] = timeSpent;
    this.behavior.lastActivity = Date.now();

    // Keep only recent items
    this.behavior.viewedVendors = this.behavior.viewedVendors.slice(0, 20);
    this.behavior.viewedCategories = this.behavior.viewedCategories.slice(0, 10);

    this.saveBehaviorToStorage();
    this.schedulePrefetch();
  }

  /**
   * Track user search behavior
   */
  trackSearch(searchTerm: string): void {
    this.behavior.searchTerms.unshift(searchTerm);
    this.behavior.searchTerms = this.behavior.searchTerms.slice(0, 10);
    this.behavior.lastActivity = Date.now();

    this.saveBehaviorToStorage();
    this.schedulePrefetch();
  }

  /**
   * Get prefetch suggestions based on behavior
   */
  getPrefetchSuggestions(): PrefetchTarget[] {
    const suggestions: PrefetchTarget[] = [];

    // Prefetch related vendors based on viewed categories
    const recentCategories = [...new Set(this.behavior.viewedCategories.slice(0, 3))];
    recentCategories.forEach(category => {
      suggestions.push({
        url: `/api/google-places?category=${category}&location=Dallas, TX&maxResults=5`,
        priority: 0.8,
        type: 'api',
        metadata: { category }
      });
    });

    // Prefetch vendor details for recently viewed vendors
    const recentVendors = this.behavior.viewedVendors.slice(0, 3);
    recentVendors.forEach(vendorId => {
      suggestions.push({
        url: `/api/google-place-details?placeId=${vendorId}`,
        priority: 0.9,
        type: 'vendor',
        metadata: { vendorId }
      });
    });

    // Prefetch images for recently viewed vendors
    recentVendors.forEach(vendorId => {
      suggestions.push({
        url: `/api/vendor-photos/${vendorId}`,
        priority: 0.7,
        type: 'image',
        metadata: { vendorId }
      });
    });

    // Prefetch category pages based on search terms
    const searchCategories = this.extractCategoriesFromSearchTerms();
    searchCategories.forEach(category => {
      suggestions.push({
        url: `/vendors/catalog/${category}`,
        priority: 0.6,
        type: 'category',
        metadata: { category }
      });
    });

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Schedule prefetch operations
   */
  private schedulePrefetch(): void {
    if (this.isPrefetching) return;

    setTimeout(() => {
      this.executePrefetch();
    }, this.PREFETCH_DELAY);
  }

  /**
   * Execute prefetch operations
   */
  private async executePrefetch(): Promise<void> {
    if (this.isPrefetching) return;

    this.isPrefetching = true;
    const suggestions = this.getPrefetchSuggestions();
    const topSuggestions = suggestions.slice(0, this.MAX_PREFETCH_ITEMS);

    try {
      await Promise.allSettled(
        topSuggestions.map(suggestion => this.prefetchItem(suggestion))
      );
    } catch (error) {
      console.error('Prefetch execution failed:', error);
    } finally {
      this.isPrefetching = false;
    }
  }

  /**
   * Prefetch a single item
   */
  private async prefetchItem(target: PrefetchTarget): Promise<void> {
    try {
      const response = await fetch(target.url, {
        method: 'GET',
        headers: {
          'X-Prefetch': 'true' // Mark as prefetch request
        }
      });

      if (response.ok) {
        // Store in cache for future use
        await this.cachePrefetchedData(target, await response.clone());
        console.log(`Prefetched: ${target.url}`);
      }
    } catch (error) {
      console.warn(`Prefetch failed for ${target.url}:`, error);
    }
  }

  /**
   * Cache prefetched data
   */
  private async cachePrefetchedData(target: PrefetchTarget, response: Response): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const cache = await caches.open('paige-prefetch-cache');
      await cache.put(target.url, response);
    } catch (error) {
      console.error('Failed to cache prefetched data:', error);
    }
  }

  /**
   * Extract categories from search terms
   */
  private extractCategoriesFromSearchTerms(): string[] {
    const categoryKeywords = {
      'florist': ['flower', 'floral', 'bouquet', 'arrangement'],
      'photographer': ['photo', 'photography', 'camera', 'shoot'],
      'caterer': ['food', 'catering', 'meal', 'dinner'],
      'dj': ['music', 'dj', 'dance', 'entertainment'],
      'venue': ['venue', 'location', 'place', 'hall']
    };

    const categories: string[] = [];
    
    this.behavior.searchTerms.forEach(term => {
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => term.toLowerCase().includes(keyword))) {
          categories.push(category);
        }
      });
    });

    return [...new Set(categories)];
  }

  /**
   * Start prefetch loop for continuous optimization
   */
  private startPrefetchLoop(): void {
    // Prefetch every 30 seconds if user is active
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.behavior.lastActivity;
      if (timeSinceActivity < 5 * 60 * 1000) { // 5 minutes
        this.schedulePrefetch();
      }
    }, 30 * 1000);
  }

  /**
   * Load behavior from localStorage
   */
  private loadBehaviorFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('paige-user-behavior');
      if (stored) {
        this.behavior = { ...this.behavior, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load behavior from storage:', error);
    }
  }

  /**
   * Save behavior to localStorage
   */
  private saveBehaviorToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('paige-user-behavior', JSON.stringify(this.behavior));
    } catch (error) {
      console.error('Failed to save behavior to storage:', error);
    }
  }

  /**
   * Get behavior analytics
   */
  getAnalytics(): any {
    return {
      totalVendorViews: this.behavior.viewedVendors.length,
      totalCategoryViews: this.behavior.viewedCategories.length,
      totalSearches: this.behavior.searchTerms.length,
      averageTimeSpent: Object.values(this.behavior.timeSpent).reduce((a, b) => a + b, 0) / Object.keys(this.behavior.timeSpent).length || 0,
      lastActivity: new Date(this.behavior.lastActivity).toISOString()
    };
  }

  /**
   * Clear behavior data
   */
  clearBehavior(): void {
    this.behavior = {
      viewedVendors: [],
      viewedCategories: [],
      searchTerms: [],
      timeSpent: {},
      lastActivity: Date.now()
    };
    this.saveBehaviorToStorage();
  }
}

// Export singleton instance
export const prefetchManager = PrefetchManager.getInstance();

// React hook for prefetch management
export function usePrefetch() {
  const [isEnabled, setIsEnabled] = React.useState(true);

  React.useEffect(() => {
    if (isEnabled) {
      prefetchManager.initialize();
    }
  }, [isEnabled]);

  return {
    trackVendorView: (vendorId: string, category: string, timeSpent?: number) => 
      prefetchManager.trackVendorView(vendorId, category, timeSpent),
    trackSearch: (searchTerm: string) => 
      prefetchManager.trackSearch(searchTerm),
    getAnalytics: () => prefetchManager.getAnalytics(),
    clearBehavior: () => prefetchManager.clearBehavior(),
    isEnabled,
    setIsEnabled
  };
}
