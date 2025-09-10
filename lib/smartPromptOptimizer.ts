/**
 * Smart Prompt Optimization Service
 * 
 * This service analyzes user behavior patterns and optimizes RAG prompts
 * for better personalization and effectiveness.
 */

import { adminDb } from '@/lib/firebaseAdmin';

interface UserBehaviorPattern {
  userId: string;
  preferredCategories: string[];
  completionRates: Record<string, number>;
  averageTaskDuration: Record<string, number>;
  preferredTimeline: 'early' | 'normal' | 'last-minute';
  budgetConsciousness: 'high' | 'medium' | 'low';
  vendorPreference: 'premium' | 'standard' | 'budget';
  lastUpdated: Date;
}

interface PromptOptimization {
  contextWeighting: Record<string, number>;
  categoryEmphasis: Record<string, number>;
  timelineAdjustments: Record<string, string>;
  personalizedInstructions: string[];
  effectivenessScore: number;
}

interface TodoGenerationMetrics {
  userId: string;
  promptType: string;
  contextUsed: string[];
  categoriesGenerated: string[];
  userSatisfaction?: number;
  completionRate?: number;
  generatedAt: Date;
}

class SmartPromptOptimizer {
  private behaviorCache = new Map<string, UserBehaviorPattern>();
  private optimizationCache = new Map<string, PromptOptimization>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Analyze user behavior patterns from their todo history
   */
  async analyzeUserBehavior(userId: string): Promise<UserBehaviorPattern> {
    // Check if userId is valid
    if (!userId) {
      return this.getDefaultBehaviorPattern();
    }

    // Check cache first
    const cached = this.behaviorCache.get(userId);
    if (cached && this.isCacheValid(cached.lastUpdated)) {
      return cached;
    }

    try {
      // Get user's todo history
      const todosSnapshot = await adminDb.collection('todos')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      const todos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Analyze patterns
      const behaviorPattern = this.extractBehaviorPattern(userId, todos);
      
      // Cache the result
      this.behaviorCache.set(userId, behaviorPattern);
      
      return behaviorPattern;
    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      // Return default pattern
      return this.getDefaultBehaviorPattern(userId);
    }
  }

  /**
   * Extract behavior patterns from todo data
   */
  private extractBehaviorPattern(userId: string, todos: any[]): UserBehaviorPattern {
    const categoryCounts: Record<string, number> = {};
    const categoryCompletions: Record<string, number> = {};
    const categoryDurations: Record<string, number[]> = {};
    const timelinePreferences: string[] = [];

    todos.forEach(todo => {
      const category = todo.category || 'Other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      if (todo.completed) {
        categoryCompletions[category] = (categoryCompletions[category] || 0) + 1;
      }

      // Analyze timeline preferences
      if (todo.deadline && todo.createdAt) {
        const deadline = new Date(todo.deadline);
        const created = new Date(todo.createdAt);
        const daysBetween = (deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysBetween > 180) timelinePreferences.push('early');
        else if (daysBetween < 30) timelinePreferences.push('last-minute');
        else timelinePreferences.push('normal');
      }
    });

    // Calculate completion rates
    const completionRates: Record<string, number> = {};
    Object.keys(categoryCounts).forEach(category => {
      const total = categoryCounts[category];
      const completed = categoryCompletions[category] || 0;
      completionRates[category] = total > 0 ? completed / total : 0;
    });

    // Determine preferred timeline
    const timelineCounts = timelinePreferences.reduce((acc, timeline) => {
      acc[timeline] = (acc[timeline] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredTimeline = Object.keys(timelineCounts).reduce((a, b) => 
      timelineCounts[a] > timelineCounts[b] ? a : b, 'normal'
    ) as 'early' | 'normal' | 'last-minute';

    // Get top preferred categories
    const preferredCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    return {
      userId,
      preferredCategories,
      completionRates,
      averageTaskDuration: {}, // Could be enhanced with actual duration data
      preferredTimeline,
      budgetConsciousness: 'medium', // Default, could be enhanced with budget data
      vendorPreference: 'standard', // Default, could be enhanced with vendor data
      lastUpdated: new Date()
    };
  }

  /**
   * Generate optimized prompt based on user behavior
   */
  async optimizePrompt(
    userId: string,
    basePrompt: string,
    ragContext: string,
    todoType: string,
    focusCategories: string[]
  ): Promise<{ optimizedPrompt: string; optimization: PromptOptimization }> {
    
    const behaviorPattern = await this.analyzeUserBehavior(userId);
    const optimization = this.generateOptimization(behaviorPattern, todoType, focusCategories);
    
    // Apply optimizations to the prompt
    const optimizedPrompt = this.applyOptimizations(basePrompt, ragContext, optimization);
    
    return { optimizedPrompt, optimization };
  }

  /**
   * Generate optimization strategy based on behavior patterns
   */
  private generateOptimization(
    behavior: UserBehaviorPattern,
    todoType: string,
    focusCategories: string[]
  ): PromptOptimization {
    
    const contextWeighting: Record<string, number> = {
      'todo_patterns': 1.0,
      'vendor_communications': 1.0,
      'file_analysis': 1.0,
      'wedding_best_practices': 1.0
    };

    const categoryEmphasis: Record<string, number> = {};
    const timelineAdjustments: Record<string, string> = {};
    const personalizedInstructions: string[] = [];

    // Weight context based on user preferences
    if (behavior.preferredTimeline === 'early') {
      contextWeighting['todo_patterns'] = 1.3; // Emphasize early planning
      personalizedInstructions.push('Focus on early planning tasks and longer timelines');
    } else if (behavior.preferredTimeline === 'last-minute') {
      contextWeighting['vendor_communications'] = 1.3; // Emphasize quick vendor coordination
      personalizedInstructions.push('Prioritize quick-turnaround tasks and urgent vendor coordination');
    }

    // Emphasize preferred categories
    behavior.preferredCategories.forEach(category => {
      categoryEmphasis[category] = 1.2;
    });

    // Adjust timeline based on user behavior
    if (behavior.preferredTimeline === 'early') {
      timelineAdjustments['venue'] = '8-12 months before';
      timelineAdjustments['catering'] = '6-9 months before';
      timelineAdjustments['photography'] = '6-9 months before';
    } else if (behavior.preferredTimeline === 'last-minute') {
      timelineAdjustments['venue'] = '3-6 months before';
      timelineAdjustments['catering'] = '2-4 months before';
      timelineAdjustments['photography'] = '2-4 months before';
    }

    // Add budget consciousness
    if (behavior.budgetConsciousness === 'high') {
      personalizedInstructions.push('Include budget-conscious alternatives and cost-saving tips');
    } else if (behavior.budgetConsciousness === 'low') {
      personalizedInstructions.push('Focus on premium options and luxury details');
    }

    return {
      contextWeighting,
      categoryEmphasis,
      timelineAdjustments,
      personalizedInstructions,
      effectivenessScore: 0.8 // Default, could be improved with feedback
    };
  }

  /**
   * Apply optimizations to the base prompt
   */
  private applyOptimizations(
    basePrompt: string,
    ragContext: string,
    optimization: PromptOptimization
  ): string {
    
    let optimizedPrompt = basePrompt;

    // Add personalized instructions
    if (optimization.personalizedInstructions.length > 0) {
      optimizedPrompt += `\n\n**Personalized Instructions:**\n${optimization.personalizedInstructions.join('\n')}`;
    }

    // Add timeline adjustments
    if (Object.keys(optimization.timelineAdjustments).length > 0) {
      optimizedPrompt += `\n\n**Timeline Adjustments:**\n`;
      Object.entries(optimization.timelineAdjustments).forEach(([category, timeline]) => {
        optimizedPrompt += `- ${category}: ${timeline}\n`;
      });
    }

    // Add category emphasis
    if (Object.keys(optimization.categoryEmphasis).length > 0) {
      optimizedPrompt += `\n\n**Category Emphasis:**\n`;
      Object.entries(optimization.categoryEmphasis).forEach(([category, weight]) => {
        optimizedPrompt += `- ${category}: ${weight}x emphasis\n`;
      });
    }

    // Weight the RAG context
    if (ragContext) {
      optimizedPrompt += `\n\n**Enhanced Context (Weighted):**\n${ragContext}`;
    }

    return optimizedPrompt;
  }

  /**
   * Track prompt effectiveness for continuous improvement
   */
  async trackPromptEffectiveness(
    userId: string,
    promptType: string,
    contextUsed: string[],
    categoriesGenerated: string[],
    userSatisfaction?: number
  ): Promise<void> {
    
    // Skip tracking if userId is invalid
    if (!userId) {
      return;
    }
    
    const metrics: TodoGenerationMetrics = {
      userId,
      promptType,
      contextUsed,
      categoriesGenerated,
      userSatisfaction,
      generatedAt: new Date()
    };

    try {
      // Store metrics for analysis
      await adminDb.collection('prompt_metrics').add(metrics);
      
      // Update effectiveness score
      await this.updateEffectivenessScore(userId, promptType, userSatisfaction);
    } catch (error) {
      console.error('Error tracking prompt effectiveness:', error);
    }
  }

  /**
   * Update effectiveness score based on user feedback
   */
  private async updateEffectivenessScore(
    userId: string,
    promptType: string,
    satisfaction?: number
  ): Promise<void> {
    
    if (satisfaction === undefined) return;

    const optimization = this.optimizationCache.get(userId);
    if (optimization) {
      // Simple moving average for effectiveness score
      const alpha = 0.1; // Learning rate
      optimization.effectivenessScore = 
        (1 - alpha) * optimization.effectivenessScore + alpha * (satisfaction / 5);
      
      this.optimizationCache.set(userId, optimization);
    }
  }

  /**
   * Get default behavior pattern for new users
   */
  private getDefaultBehaviorPattern(userId: string): UserBehaviorPattern {
    return {
      userId,
      preferredCategories: ['Venue', 'Catering', 'Photography'],
      completionRates: {},
      averageTaskDuration: {},
      preferredTimeline: 'normal',
      budgetConsciousness: 'medium',
      vendorPreference: 'standard',
      lastUpdated: new Date()
    };
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() < this.CACHE_TTL;
  }

  /**
   * Get default behavior pattern when userId is invalid
   */
  private getDefaultBehaviorPattern(): UserBehaviorPattern {
    return {
      userId: 'unknown',
      preferredCategories: ['general'],
      completionRates: { 'general': 0.8 },
      averageResponseTime: 2.5,
      preferredPromptStyle: 'balanced',
      lastUpdated: new Date()
    };
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    this.behaviorCache.delete(userId);
    this.optimizationCache.delete(userId);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): { 
    cachedUsers: number; 
    averageEffectiveness: number;
  } {
    const cachedUsers = this.behaviorCache.size;
    const effectivenessScores = Array.from(this.optimizationCache.values())
      .map(opt => opt.effectivenessScore);
    
    const averageEffectiveness = effectivenessScores.length > 0
      ? effectivenessScores.reduce((a, b) => a + b, 0) / effectivenessScores.length
      : 0;

    return { cachedUsers, averageEffectiveness };
  }
}

// Export singleton instance
export const smartPromptOptimizer = new SmartPromptOptimizer();
