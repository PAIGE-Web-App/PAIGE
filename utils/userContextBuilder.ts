import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export interface UserContext {
  // Basic user info
  userName: string | null;
  partnerName: string | null;
  
  // Wedding details
  weddingDate: Date | null;
  weddingLocation: string | null;
  hasVenue: boolean | null;
  selectedVenueMetadata: any | null;
  guestCount: number | null;
  maxBudget: number | null;
  
  // Aesthetic & vibes
  vibe: string[];
  vibeInputMethod: string;
  generatedVibes: string[];
  
  // Planning progress
  completedTodos: string[];
  pendingTodos: string[];
  recentTodoCount: number;
  
  // Vendor connections
  selectedVendors: string[];
  favoriteVendors: string[];
  recentVendorInteractions: string[];
  
  // Planning timeline
  daysUntilWedding: number | null;
  planningStage: 'early' | 'mid' | 'late' | 'unknown';
  
  // Context metadata
  lastUpdated: Date;
  contextVersion: string;
}

export interface ContextOptions {
  includeTodos?: boolean;
  includeVendors?: boolean;
  maxTodoItems?: number;
  maxVendorItems?: number;
  forceRefresh?: boolean;
}

// Cache for user context to minimize Firebase reads
const contextCache = new Map<string, { context: UserContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class UserContextBuilder {
  private static instance: UserContextBuilder;
  private cache = contextCache;

  static getInstance(): UserContextBuilder {
    if (!UserContextBuilder.instance) {
      UserContextBuilder.instance = new UserContextBuilder();
    }
    return UserContextBuilder.instance;
  }

  /**
   * Build comprehensive user context for AI messaging
   */
  async buildUserContext(
    userId: string, 
    options: ContextOptions = {}
  ): Promise<UserContext> {
    const {
      includeTodos = true,
      includeVendors = true,
      maxTodoItems = 10,
      maxVendorItems = 5,
      forceRefresh = false
    } = options;

    // Check cache first
    const cacheKey = `${userId}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.context;
    }

    try {
      // Get user profile data (single read)
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      
      // Build base context from user profile
      const baseContext = this.buildBaseContext(userData);
      
      // Add planning stage based on wedding date
      const planningStage = this.calculatePlanningStage(baseContext.weddingDate || null, baseContext.daysUntilWedding || null);
      
      // Initialize context with base data
      let context: UserContext = {
        userName: baseContext.userName || null,
        partnerName: baseContext.partnerName || null,
        weddingDate: baseContext.weddingDate || null,
        weddingLocation: baseContext.weddingLocation || null,
        hasVenue: baseContext.hasVenue || null,
        selectedVenueMetadata: baseContext.selectedVenueMetadata || null,
        guestCount: baseContext.guestCount || null,
        maxBudget: baseContext.maxBudget || null,
        vibe: baseContext.vibe || [],
        vibeInputMethod: baseContext.vibeInputMethod || 'pills',
        generatedVibes: baseContext.generatedVibes || [],
        daysUntilWedding: baseContext.daysUntilWedding || null,
        planningStage,
        completedTodos: [],
        pendingTodos: [],
        recentTodoCount: 0,
        selectedVendors: [],
        favoriteVendors: [],
        recentVendorInteractions: [],
        lastUpdated: new Date(),
        contextVersion: '1.0'
      };

      // Add todo context if requested
      if (includeTodos) {
        try {
          const todoContext = await this.buildTodoContext(userId, maxTodoItems);
          context = { ...context, ...todoContext };
        } catch (error) {
          console.warn('[UserContextBuilder] Todo context failed, continuing without it:', error);
          // Continue without todo context
        }
      }

      // Add vendor context if requested
      if (includeVendors) {
        try {
          const vendorContext = await this.buildVendorContext(userId, maxVendorItems);
          context = { ...context, ...vendorContext };
        } catch (error) {
          console.warn('[UserContextBuilder] Vendor context failed, continuing without it:', error);
          // Continue without vendor context
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        context,
        timestamp: Date.now()
      });

      return context;

    } catch (error) {
      console.error('[UserContextBuilder] Error building user context:', error);
      throw error;
    }
  }

  /**
   * Build base context from user profile data
   */
  private buildBaseContext(userData: any): Partial<UserContext> {
    const processDate = (dateField: any): Date | null => {
      if (!dateField) return null;
      if (typeof dateField.toDate === 'function') return dateField.toDate();
      if (dateField instanceof Date) return dateField;
      return null;
    };

    const weddingDate = processDate(userData.weddingDate);
    const daysUntilWedding = weddingDate ? this.calculateDaysUntilWedding(weddingDate) : null;

    return {
      userName: userData.userName || null,
      partnerName: userData.partnerName || null,
      weddingDate,
      weddingLocation: userData.weddingLocation || null,
      hasVenue: userData.hasVenue || null,
      selectedVenueMetadata: userData.selectedVenueMetadata || null,
      guestCount: userData.guestCount || null,
      maxBudget: userData.maxBudget || null,
      vibe: userData.vibe || [],
      vibeInputMethod: userData.vibeInputMethod || 'pills',
      generatedVibes: userData.generatedVibes || [],
      daysUntilWedding: daysUntilWedding || null
    };
  }

  /**
   * Build todo context with recent items
   */
  private async buildTodoContext(userId: string, maxItems: number): Promise<Partial<UserContext>> {
    try {
      // Get recent todo items (single query from user's subcollection)
      const todoQuery = query(
        collection(db, 'users', userId, 'todoItems'),
        orderBy('createdAt', 'desc'),
        limit(maxItems)
      );

      const todoSnapshot = await getDocs(todoQuery);
      const todos = todoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const completedTodos = todos
        .filter((todo: any) => todo.isCompleted)
        .slice(0, 5)
        .map((todo: any) => todo.name);

      const pendingTodos = todos
        .filter((todo: any) => !todo.isCompleted)
        .slice(0, 5)
        .map((todo: any) => todo.name);

      return {
        completedTodos,
        pendingTodos,
        recentTodoCount: todos.length
      };

    } catch (error) {
      console.error('[UserContextBuilder] Error building todo context:', error);
      return {
        completedTodos: [],
        pendingTodos: [],
        recentTodoCount: 0
      };
    }
  }

  /**
   * Build vendor context with recent interactions
   */
  private async buildVendorContext(userId: string, maxItems: number): Promise<Partial<UserContext>> {
    try {
      // Get contacts (vendors) from user's subcollection
      const contactsQuery = query(
        collection(db, 'users', userId, 'contacts'),
        orderBy('createdAt', 'desc'),
        limit(maxItems)
      );

      const contactsSnapshot = await getDocs(contactsQuery);
      const contacts = contactsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const selectedVendors = contacts
        .slice(0, maxItems)
        .map((contact: any) => contact.name || 'Unknown Vendor')
        .filter(Boolean);

      return {
        selectedVendors,
        favoriteVendors: selectedVendors, // Use contacts as favorites since favorites are in localStorage
        recentVendorInteractions: selectedVendors.slice(0, 3)
      };

    } catch (error) {
      console.error('[UserContextBuilder] Error building vendor context:', error);
      return {
        selectedVendors: [],
        favoriteVendors: [],
        recentVendorInteractions: []
      };
    }
  }

  /**
   * Calculate days until wedding
   */
  private calculateDaysUntilWedding(weddingDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = weddingDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate planning stage based on wedding date
   */
  private calculatePlanningStage(weddingDate: Date | null, daysUntilWedding: number | null): 'early' | 'mid' | 'late' | 'unknown' {
    if (!weddingDate || daysUntilWedding === null) return 'unknown';
    
    if (daysUntilWedding > 180) return 'early';      // More than 6 months
    if (daysUntilWedding > 60) return 'mid';         // 2-6 months
    return 'late';                                    // Less than 2 months
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(userId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get context summary for debugging
   */
  getContextSummary(context: UserContext): string {
    return `
User: ${context.userName || 'Unknown'}
Wedding: ${context.weddingLocation || 'Location TBD'} on ${context.weddingDate ? context.weddingDate.toLocaleDateString() : 'Date TBD'}
Stage: ${context.planningStage} (${context.daysUntilWedding} days left)
Vibes: ${context.vibe.join(', ') || 'None set'}
Todos: ${context.pendingTodos.length} pending, ${context.completedTodos.length} completed
Vendors: ${context.selectedVendors.length} selected
Budget: ${context.maxBudget ? `$${context.maxBudget.toLocaleString()}` : 'Not set'}
    `.trim();
  }
}

// Export singleton instance
export const userContextBuilder = UserContextBuilder.getInstance();
