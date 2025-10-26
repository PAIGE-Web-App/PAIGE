/**
 * Agent Coordinator - 2025 Implementation
 * 
 * OPTIMIZATION PRINCIPLES:
 * - Minimal Firestore reads through intelligent caching
 * - Parallel agent execution where possible
 * - Graceful degradation on failures
 * - Resource usage monitoring
 * - Feature flag integration
 */

import { BaseWeddingAgent, AgentContext, AgentAnalysisResult, AgentInsight } from './baseAgent';
import { TodoInsightsAgent } from './todoInsightsAgent';
import { isAgentFeatureEnabled, AGENT_FEATURE_FLAGS } from '../featureFlags/agentFlags';

export interface CoordinatedInsights {
  insights: AgentInsight[];
  summary: string;
  agentResults: Record<string, AgentAnalysisResult>;
  metadata: {
    totalProcessingTime: number;
    agentsExecuted: string[];
    cacheHitRate: number;
    timestamp: Date;
  };
}

export interface AgentExecutionConfig {
  enableTodoInsights: boolean;
  enableBudgetAnalysis: boolean;
  enableVendorRecommendations: boolean;
  enableProactiveAlerts: boolean;
  maxExecutionTime: number; // milliseconds
}

/**
 * Coordinates multiple agents and combines their insights
 */
export class WeddingPlanningAgentCoordinator {
  private context: AgentContext;
  private config: AgentExecutionConfig;
  private executionStartTime: number = 0;

  constructor(context: AgentContext, config?: Partial<AgentExecutionConfig>) {
    this.context = context;
    this.config = {
      enableTodoInsights: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_TODO_INSIGHTS, context.userId),
      enableBudgetAnalysis: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_BUDGET_ANALYSIS, context.userId),
      enableVendorRecommendations: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_VENDOR_RECOMMENDATIONS, context.userId),
      enableProactiveAlerts: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_PROACTIVE_ALERTS, context.userId),
      maxExecutionTime: 10000, // 10 seconds max
      ...config
    };
  }

  /**
   * Main coordination method - executes enabled agents and combines results
   */
  async generateInsights(): Promise<CoordinatedInsights> {
    this.executionStartTime = Date.now();
    
    try {
      this.log('Starting agent coordination', {
        userId: this.context.userId,
        config: this.config
      });

      // Execute agents in parallel for better performance
      const agentPromises = this.createAgentPromises();
      
      if (agentPromises.length === 0) {
        return this.createEmptyResult('No agents enabled for this user');
      }

      // Execute with timeout protection
      const results = await this.executeWithTimeout(agentPromises);
      
      // Combine and prioritize insights
      const combinedInsights = this.combineInsights(results);
      
      // Generate coordinated summary
      const summary = this.generateCoordinatedSummary(results);
      
      // Calculate metadata
      const metadata = this.calculateMetadata(results);

      this.log('Agent coordination completed', {
        totalInsights: combinedInsights.length,
        processingTime: metadata.totalProcessingTime,
        cacheHitRate: metadata.cacheHitRate
      });

      return {
        insights: combinedInsights,
        summary,
        agentResults: results,
        metadata
      };

    } catch (error) {
      console.error('[AgentCoordinator] Coordination failed:', error);
      return this.createEmptyResult('Agent coordination temporarily unavailable');
    }
  }

  /**
   * Create agent execution promises based on enabled features
   */
  private createAgentPromises(): Array<Promise<{ agentName: string; result: AgentAnalysisResult }>> {
    const promises: Array<Promise<{ agentName: string; result: AgentAnalysisResult }>> = [];

    // Todo Insights Agent
    if (this.config.enableTodoInsights) {
      const todoAgent = new TodoInsightsAgent(this.context);
      promises.push(
        this.wrapAgentExecution('TodoInsights', () => todoAgent.analyze())
      );
    }

    // Future agents will be added here as they're implemented
    // Budget Analysis Agent (Phase 2)
    // Vendor Recommendations Agent (Phase 2)
    // Proactive Alerts Agent (Phase 2)

    return promises;
  }

  /**
   * Wrap agent execution with error handling and logging
   */
  private async wrapAgentExecution(
    agentName: string, 
    execution: () => Promise<AgentAnalysisResult>
  ): Promise<{ agentName: string; result: AgentAnalysisResult }> {
    try {
      const result = await execution();
      this.log(`${agentName} completed successfully`, {
        insights: result.insights.length,
        processingTime: result.processingTime
      });
      return { agentName, result };
    } catch (error) {
      console.error(`[AgentCoordinator] ${agentName} failed:`, error);
      
      // Return empty result on failure
      return {
        agentName,
        result: {
          insights: [],
          summary: `${agentName} temporarily unavailable`,
          confidence: 0,
          processingTime: 0,
          cacheHit: false
        }
      };
    }
  }

  /**
   * Execute agent promises with timeout protection
   */
  private async executeWithTimeout(
    promises: Array<Promise<{ agentName: string; result: AgentAnalysisResult }>>
  ): Promise<Record<string, AgentAnalysisResult>> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Agent execution timeout')), this.config.maxExecutionTime);
    });

    try {
      const results = await Promise.race([
        Promise.allSettled(promises),
        timeoutPromise
      ]);

      const successfulResults: Record<string, AgentAnalysisResult> = {};
      
      if (Array.isArray(results)) {
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { agentName, result: agentResult } = result.value;
            successfulResults[agentName] = agentResult;
          } else {
            console.error(`Agent ${index} failed:`, result.reason);
          }
        });
      }

      return successfulResults;
    } catch (error) {
      console.error('[AgentCoordinator] Execution timeout or failure:', error);
      return {};
    }
  }

  /**
   * Combine insights from all agents and prioritize them
   */
  private combineInsights(results: Record<string, AgentAnalysisResult>): AgentInsight[] {
    const allInsights: AgentInsight[] = [];

    // Collect all insights
    Object.values(results).forEach(result => {
      allInsights.push(...result.insights);
    });

    // Sort by priority and type
    return allInsights.sort((a, b) => {
      // Priority order: urgent > alert > opportunity > recommendation
      const priorityOrder = { urgent: 4, alert: 3, opportunity: 2, recommendation: 1 };
      const aPriority = priorityOrder[a.type] || 0;
      const bPriority = priorityOrder[b.type] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Secondary sort by priority level
      const levelOrder = { high: 3, medium: 2, low: 1 };
      const aLevel = levelOrder[a.priority] || 0;
      const bLevel = levelOrder[b.priority] || 0;
      
      return bLevel - aLevel;
    });
  }

  /**
   * Generate a coordinated summary from all agent results
   */
  private generateCoordinatedSummary(results: Record<string, AgentAnalysisResult>): string {
    const agentSummaries = Object.entries(results)
      .filter(([_, result]) => result.insights.length > 0)
      .map(([agentName, result]) => result.summary)
      .filter(summary => summary && summary.trim() !== '');

    if (agentSummaries.length === 0) {
      return 'Your wedding planning is on track! No immediate actions needed.';
    }

    if (agentSummaries.length === 1) {
      return agentSummaries[0];
    }

    // Combine multiple summaries intelligently
    return `Wedding Planning Status: ${agentSummaries.join(' ')}`;
  }

  /**
   * Calculate execution metadata for monitoring
   */
  private calculateMetadata(results: Record<string, AgentAnalysisResult>) {
    const totalProcessingTime = Date.now() - this.executionStartTime;
    const agentsExecuted = Object.keys(results);
    const cacheHits = Object.values(results).filter(r => r.cacheHit).length;
    const cacheHitRate = agentsExecuted.length > 0 ? (cacheHits / agentsExecuted.length) * 100 : 0;

    return {
      totalProcessingTime,
      agentsExecuted,
      cacheHitRate,
      timestamp: new Date()
    };
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(message: string): CoordinatedInsights {
    return {
      insights: [],
      summary: message,
      agentResults: {},
      metadata: {
        totalProcessingTime: Date.now() - this.executionStartTime,
        agentsExecuted: [],
        cacheHitRate: 0,
        timestamp: new Date()
      }
    };
  }

  /**
   * Development logging
   */
  private log(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AgentCoordinator] ${message}`, data || '');
    }
  }

  /**
   * Get current configuration for debugging
   */
  getConfiguration(): AgentExecutionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (useful for testing)
   */
  updateConfiguration(updates: Partial<AgentExecutionConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
