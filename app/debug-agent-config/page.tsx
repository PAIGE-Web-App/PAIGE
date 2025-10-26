/**
 * Debug page to check agent configuration
 * Shows environment variables and feature flag status
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAgentConfig } from '@/lib/featureFlags/agentConfig';
import { isAgentFeatureEnabled, AGENT_FEATURE_FLAGS } from '@/lib/featureFlags/agentFlags';

export default function DebugAgentConfigPage() {
  const { user } = useAuth();
  
  // Get configuration
  const config = getAgentConfig();
  
  // Test feature flags
  const featureTests = user?.uid ? {
    coreAgent: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.INTELLIGENT_AGENT_ENABLED, user.uid),
    todoInsights: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_TODO_INSIGHTS, user.uid),
    budgetAnalysis: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_BUDGET_ANALYSIS, user.uid),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Agent Configuration Debug</h1>
        
        {/* Environment Variables */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment Variables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>NODE_ENV:</strong> {process.env.NODE_ENV}
            </div>
            <div>
              <strong>ENABLE_INTELLIGENT_AGENT:</strong> {process.env.NEXT_PUBLIC_ENABLE_INTELLIGENT_AGENT || 'undefined'}
            </div>
            <div>
              <strong>AGENT_TEST_USERS:</strong> {process.env.NEXT_PUBLIC_AGENT_TEST_USERS || 'undefined'}
            </div>
          </div>
        </div>

        {/* Agent Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Configuration</h2>
          <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>

        {/* User Info */}
        {user && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current User</h2>
            <div className="text-sm space-y-2">
              <div><strong>User ID:</strong> {user.uid}</div>
              <div><strong>Email:</strong> {user.email}</div>
            </div>
          </div>
        )}

        {/* Feature Flag Tests */}
        {featureTests && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Flag Tests</h2>
            <div className="space-y-2">
              {Object.entries(featureTests).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm">
                    <strong>{feature}:</strong> {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-3">Expected Configuration</h2>
          <p className="text-yellow-800 text-sm mb-3">
            For the agent to work, you should see:
          </p>
          <ul className="text-yellow-800 text-sm space-y-1 list-disc list-inside">
            <li><strong>globallyEnabled:</strong> true</li>
            <li><strong>testUsers:</strong> should include your User ID</li>
            <li><strong>All feature flags:</strong> should show "Enabled"</li>
          </ul>
          
          <div className="mt-4 p-3 bg-yellow-100 rounded text-xs">
            <strong>If environment variables show "undefined":</strong><br/>
            The variables need to be prefixed with <code>NEXT_PUBLIC_</code> for client-side access.
          </div>
        </div>
      </div>
    </div>
  );
}
