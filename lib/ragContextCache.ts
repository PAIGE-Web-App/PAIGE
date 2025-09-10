/**
 * RAG Context Cache Service
 * 
 * This service provides intelligent caching for RAG contexts to improve
 * performance and reduce redundant processing.
 */

interface CachedContext {
  context: string;
  timestamp: Date;
  userId: string;
  queryHash: string;
  relevanceScore: number;
}

interface ContextCacheEntry {
  contexts: CachedContext[];
  lastAccessed: Date;
  accessCount: number;
}

class RAGContextCache {
  private cache = new Map<string, ContextCacheEntry>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_CONTEXTS_PER_USER = 10;
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Get cached context for a user query
   */
  async getCachedContext(
    userId: string, 
    query: string, 
    minRelevanceScore: number = 0.7
  ): Promise<string | null> {
    const queryHash = this.hashQuery(query);
    const cacheKey = `${userId}:${queryHash}`;
    
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if cache is still valid
    if (!this.isCacheValid(entry.lastAccessed)) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access tracking
    entry.lastAccessed = new Date();
    entry.accessCount++;

    // Find the most relevant context
    const relevantContexts = entry.contexts
      .filter(ctx => ctx.relevanceScore >= minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (relevantContexts.length > 0) {
      return relevantContexts[0].context;
    }

    return null;
  }

  /**
   * Cache context for future use
   */
  async cacheContext(
    userId: string,
    query: string,
    context: string,
    relevanceScore: number = 0.8
  ): Promise<void> {
    const queryHash = this.hashQuery(query);
    const cacheKey = `${userId}:${queryHash}`;
    
    const cachedContext: CachedContext = {
      context,
      timestamp: new Date(),
      userId,
      queryHash,
      relevanceScore
    };

    let entry = this.cache.get(cacheKey);
    if (!entry) {
      entry = {
        contexts: [],
        lastAccessed: new Date(),
        accessCount: 0
      };
    }

    // Add new context
    entry.contexts.push(cachedContext);
    entry.lastAccessed = new Date();

    // Limit contexts per user
    if (entry.contexts.length > this.MAX_CONTEXTS_PER_USER) {
      entry.contexts = entry.contexts
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, this.MAX_CONTEXTS_PER_USER);
    }

    this.cache.set(cacheKey, entry);

    // Cleanup if cache is too large
    this.cleanupCache();
  }

  /**
   * Get similar cached contexts for a query
   */
  async getSimilarContexts(
    userId: string,
    query: string,
    limit: number = 3
  ): Promise<string[]> {
    const queryWords = this.extractKeywords(query);
    const userEntries = Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith(`${userId}:`));

    const scoredContexts: { context: string; score: number }[] = [];

    userEntries.forEach(([key, entry]) => {
      if (!this.isCacheValid(entry.lastAccessed)) {
        this.cache.delete(key);
        return;
      }

      entry.contexts.forEach(cachedContext => {
        const similarityScore = this.calculateSimilarity(queryWords, cachedContext.context);
        if (similarityScore > 0.3) { // Minimum similarity threshold
          scoredContexts.push({
            context: cachedContext.context,
            score: similarityScore
          });
        }
      });
    });

    return scoredContexts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.context);
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.startsWith(`${userId}:`));
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalContexts: number;
    averageAccessCount: number;
    cacheHitRate: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const totalContexts = entries.reduce((sum, entry) => sum + entry.contexts.length, 0);
    const averageAccessCount = totalEntries > 0 
      ? entries.reduce((sum, entry) => sum + entry.accessCount, 0) / totalEntries 
      : 0;

    return {
      totalEntries,
      totalContexts,
      averageAccessCount,
      cacheHitRate: 0 // Could be enhanced with hit/miss tracking
    };
  }

  /**
   * Hash query for consistent caching
   */
  private hashQuery(query: string): string {
    // Simple hash function - could be enhanced with better hashing
    let hash = 0;
    const normalizedQuery = query.toLowerCase().trim();
    
    for (let i = 0; i < normalizedQuery.length; i++) {
      const char = normalizedQuery.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was',
      'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
    return stopWords.has(word);
  }

  /**
   * Calculate similarity between query and context
   */
  private calculateSimilarity(queryWords: string[], context: string): number {
    const contextWords = this.extractKeywords(context);
    const querySet = new Set(queryWords);
    const contextSet = new Set(contextWords);
    
    const intersection = new Set([...querySet].filter(x => contextSet.has(x)));
    const union = new Set([...querySet, ...contextSet]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(lastAccessed: Date): boolean {
    return Date.now() - lastAccessed.getTime() < this.CACHE_TTL;
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // Remove least recently accessed entries
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    const entriesToRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
    entriesToRemove.forEach(([key]) => this.cache.delete(key));
  }
}

// Export singleton instance
export const ragContextCache = new RAGContextCache();