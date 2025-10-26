/**
 * Feature flags for Intelligent Wedding Planning Agent
 * 2025 Implementation - Gradual rollout with safety controls
 */

export const AGENT_FEATURE_FLAGS = {
  // Core agent system
  INTELLIGENT_AGENT_ENABLED: 'intelligent_agent_v1_2025',
  
  // Individual capabilities (can be toggled independently)
  AGENT_TODO_INSIGHTS: 'agent_todo_insights_v1',
  AGENT_BUDGET_ANALYSIS: 'agent_budget_analysis_v1', 
  AGENT_VENDOR_RECOMMENDATIONS: 'agent_vendor_recs_v1',
  AGENT_PROACTIVE_ALERTS: 'agent_proactive_alerts_v1',
  
  // Advanced features (Phase 2+)
  AGENT_STREAMING_RESPONSES: 'agent_streaming_v1',
  AGENT_MULTIMODAL_ANALYSIS: 'agent_multimodal_v1',
  AGENT_CONVERSATIONAL_INTERFACE: 'agent_chat_v1'
} as const;

export type AgentFeatureFlag = typeof AGENT_FEATURE_FLAGS[keyof typeof AGENT_FEATURE_FLAGS];

/**
 * Safe feature flag checker with fallback
 */
export function isAgentFeatureEnabled(flag: AgentFeatureFlag, userId?: string): boolean {
  try {
    // Import here to avoid circular dependencies
    const { isAgentGloballyEnabled, isUserInTestGroup } = require('./agentConfig');
    
    // Check if globally enabled first
    if (!isAgentGloballyEnabled()) {
      return false;
    }
    
    // Check if user is in test group (if userId provided)
    if (userId && !isUserInTestGroup(userId)) {
      return false;
    }
    
    // Feature-specific logic can be added here
    // For now, all features follow the same pattern
    return true;
  } catch (error) {
    console.error('Feature flag check failed:', error);
    return false; // Fail safe - always disable on error
  }
}

/**
 * Agent feature availability checker
 */
export function getAgentFeatureAvailability(userId: string) {
  return {
    coreAgent: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.INTELLIGENT_AGENT_ENABLED, userId),
    todoInsights: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_TODO_INSIGHTS, userId),
    budgetAnalysis: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_BUDGET_ANALYSIS, userId),
    vendorRecs: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_VENDOR_RECOMMENDATIONS, userId),
    proactiveAlerts: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_PROACTIVE_ALERTS, userId)
  };
}
