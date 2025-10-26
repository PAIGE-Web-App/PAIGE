/**
 * Base Agent Class - 2025 Implementation
 * 
 * DESIGN PRINCIPLES:
 * - Read-only operations (no Firestore writes)
 * - Leverage existing API endpoints
 * - Minimal resource usage
 * - Fail-safe error handling
 * - Cache-friendly operations
 */

import { User } from 'firebase/auth';

export interface AgentInsight {
  id: string;
  type: 'urgent' | 'opportunity' | 'recommendation' | 'alert';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'todo' | 'budget' | 'vendor' | 'timeline' | 'communication';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AgentContext {
  userId: string;
  userEmail?: string;
  weddingDate?: Date | null;
  weddingLocation?: string | null;
  maxBudget?: number | null;
  guestCount?: number | null;
}

export interface AgentAnalysisResult {
  insights: AgentInsight[];
  summary: string;
  confidence: number;
  processingTime: number;
  cacheHit: boolean;
}

/**
 * Base class for all wedding planning agents
 * Provides common functionality and safety patterns
 */
export abstract class BaseWeddingAgent {
  protected context: AgentContext;
  protected startTime: number;

  constructor(context: AgentContext) {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Main analysis method - must be implemented by subclasses
   */
  abstract analyze(): Promise<AgentAnalysisResult>;

  /**
   * Get agent name for logging and debugging
   */
  abstract getAgentName(): string;

  /**
   * Generate a cache key for this agent's analysis
   */
  protected generateCacheKey(additionalParams?: Record<string, any>): string {
    const baseKey = `agent:${this.getAgentName()}:${this.context.userId}`;
    if (additionalParams) {
      const paramString = Object.entries(additionalParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      return `${baseKey}:${paramString}`;
    }
    return baseKey;
  }

  /**
   * Safe API call wrapper with error handling
   */
  protected async safeApiCall<T>(
    apiCall: () => Promise<T>,
    fallbackValue: T,
    operationName: string
  ): Promise<T> {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      console.error(`[${this.getAgentName()}] ${operationName} failed:`, error);
      return fallbackValue;
    }
  }

  /**
   * Create a standardized insight object
   */
  protected createInsight(
    type: AgentInsight['type'],
    title: string,
    description: string,
    category: AgentInsight['category'],
    priority: AgentInsight['priority'] = 'medium',
    metadata?: Record<string, any>
  ): AgentInsight {
    return {
      id: `${this.getAgentName()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      actionable: true,
      priority,
      category,
      metadata,
      createdAt: new Date()
    };
  }

  /**
   * Calculate processing time for performance monitoring
   */
  protected getProcessingTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Validate context has required fields
   */
  protected validateContext(requiredFields: (keyof AgentContext)[]): boolean {
    return requiredFields.every(field => {
      const value = this.context[field];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Log agent activity for debugging (development only)
   */
  protected log(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.getAgentName()}] ${message}`, data || '');
    }
  }
}

/**
 * Agent result builder utility
 */
export class AgentResultBuilder {
  private insights: AgentInsight[] = [];
  private summary = '';
  private confidence = 0.8;
  private cacheHit = false;

  addInsight(insight: AgentInsight): this {
    this.insights.push(insight);
    return this;
  }

  setSummary(summary: string): this {
    this.summary = summary;
    return this;
  }

  setConfidence(confidence: number): this {
    this.confidence = Math.max(0, Math.min(1, confidence));
    return this;
  }

  setCacheHit(cacheHit: boolean): this {
    this.cacheHit = cacheHit;
    return this;
  }

  build(processingTime: number): AgentAnalysisResult {
    return {
      insights: this.insights,
      summary: this.summary,
      confidence: this.confidence,
      processingTime,
      cacheHit: this.cacheHit
    };
  }
}
