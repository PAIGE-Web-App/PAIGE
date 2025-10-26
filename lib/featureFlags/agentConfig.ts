/**
 * Agent Configuration - Environment-based feature control
 * 
 * SAFETY CONTROLS:
 * - Environment variable based activation
 * - User-specific testing
 * - Easy enable/disable for production
 */

/**
 * Get test users from environment variable
 */
export function getAgentTestUsers(): string[] {
  try {
    const testUsers = process.env.AGENT_TEST_USERS || process.env.NEXT_PUBLIC_AGENT_TEST_USERS || '';
    return testUsers.split(',').map(id => id.trim()).filter(id => id.length > 0);
  } catch (error) {
    console.error('Error parsing agent test users:', error);
    return [];
  }
}

/**
 * Check if agent features are globally enabled
 */
export function isAgentGloballyEnabled(): boolean {
  // Development mode - check environment variable
  if (process.env.NODE_ENV === 'development') {
    return process.env.ENABLE_INTELLIGENT_AGENT === 'true' || 
           process.env.NEXT_PUBLIC_ENABLE_INTELLIGENT_AGENT === 'true';
  }
  
  // Production mode - disabled by default for safety
  return process.env.ENABLE_INTELLIGENT_AGENT_PROD === 'true';
}

/**
 * Check if user is in test group
 */
export function isUserInTestGroup(userId: string): boolean {
  const testUsers = getAgentTestUsers();
  return testUsers.includes(userId);
}

/**
 * Get agent configuration for environment
 */
export function getAgentConfig() {
  return {
    globallyEnabled: isAgentGloballyEnabled(),
    testUsers: getAgentTestUsers(),
    environment: process.env.NODE_ENV,
    maxExecutionTime: parseInt(process.env.AGENT_MAX_EXECUTION_TIME || '10000'),
    cacheTimeout: parseInt(process.env.AGENT_CACHE_TIMEOUT || '300000'), // 5 minutes
    retryAttempts: parseInt(process.env.AGENT_RETRY_ATTEMPTS || '3')
  };
}

/**
 * Development helper to log agent configuration
 */
export function logAgentConfig(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Agent Config]', getAgentConfig());
  }
}
