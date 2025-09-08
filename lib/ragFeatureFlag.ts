/**
 * RAG Feature Flag System
 * 
 * This module provides safe, configurable feature flags for the RAG system.
 * All RAG functionality is disabled by default and can be enabled gradually.
 */

export interface RAGConfig {
  enabled: boolean;
  betaUsers: string[];
  migrationPercentage: number;
  fallbackEnabled: boolean;
  monitoringEnabled: boolean;
}

/**
 * Get the current RAG configuration from environment variables
 */
export function getRAGConfig(): RAGConfig {
  return {
    enabled: process.env.ENABLE_RAG === 'true',
    betaUsers: process.env.RAG_BETA_USERS?.split(',').filter(Boolean) || [],
    migrationPercentage: parseInt(process.env.RAG_MIGRATION_PERCENTAGE || '0'),
    fallbackEnabled: process.env.RAG_FALLBACK_ENABLED !== 'false',
    monitoringEnabled: process.env.RAG_MONITORING_ENABLED === 'true'
  };
}

/**
 * Determine if a user should use the RAG system
 */
export function shouldUseRAG(userId: string, userEmail: string): boolean {
  const config = getRAGConfig();
  
  // RAG must be enabled globally
  if (!config.enabled) {
    return false;
  }
  
  // Check if user is in beta list
  if (config.betaUsers.includes(userEmail)) {
    return true;
  }
  
  // Check migration percentage (for gradual rollout)
  if (config.migrationPercentage > 0) {
    const userHash = hashUserId(userId);
    return (userHash % 100) < config.migrationPercentage;
  }
  
  return false;
}

/**
 * Simple hash function for consistent user assignment
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if fallback to original system is enabled
 */
export function isFallbackEnabled(): boolean {
  return getRAGConfig().fallbackEnabled;
}

/**
 * Check if monitoring is enabled
 */
export function isMonitoringEnabled(): boolean {
  return getRAGConfig().monitoringEnabled;
}

/**
 * Get RAG configuration for logging/monitoring
 */
export function getRAGConfigForLogging(): Omit<RAGConfig, 'betaUsers'> & { betaUserCount: number } {
  const config = getRAGConfig();
  return {
    enabled: config.enabled,
    migrationPercentage: config.migrationPercentage,
    fallbackEnabled: config.fallbackEnabled,
    monitoringEnabled: config.monitoringEnabled,
    betaUserCount: config.betaUsers.length
  };
}

/**
 * Emergency disable function (for instant rollback)
 */
export function emergencyDisableRAG(): void {
  process.env.ENABLE_RAG = 'false';
  process.env.RAG_BETA_USERS = '';
  process.env.RAG_MIGRATION_PERCENTAGE = '0';
  console.log('🚨 RAG system emergency disabled');
}

/**
 * Enable RAG for specific users (for testing)
 */
export function enableRAGForUsers(userEmails: string[]): void {
  process.env.ENABLE_RAG = 'true';
  process.env.RAG_BETA_USERS = userEmails.join(',');
  process.env.RAG_MIGRATION_PERCENTAGE = '0';
  console.log(`✅ RAG enabled for ${userEmails.length} users:`, userEmails);
}

/**
 * Set migration percentage (for gradual rollout)
 */
export function setMigrationPercentage(percentage: number): void {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Migration percentage must be between 0 and 100');
  }
  
  process.env.ENABLE_RAG = 'true';
  process.env.RAG_MIGRATION_PERCENTAGE = percentage.toString();
  console.log(`📊 RAG migration percentage set to ${percentage}%`);
}
