/**
 * Test page for Intelligent Planning Assistant
 * 
 * DEVELOPMENT ONLY - Safe testing environment
 * - Feature flag controlled
 * - No impact on production users
 * - Easy to enable/disable for testing
 */

'use client';

import React, { useState } from 'react';
import IntelligentPlanningAssistant, { CompactIntelligentAssistant } from '@/components/IntelligentPlanningAssistant';
import { useAgentFeatureAvailability } from '@/hooks/useIntelligentAgent';
import { useAuth } from '@/contexts/AuthContext';

export default function TestIntelligentAgentPage() {
  const { user } = useAuth();
  const featureAvailability = useAgentFeatureAvailability();
  const [showCompact, setShowCompact] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to test the intelligent agent.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Intelligent Planning Assistant - Test Page
          </h1>
          <p className="text-gray-600">
            Testing the 2025 AI-powered wedding planning assistant
          </p>
        </div>

        {/* Feature Availability Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureStatus 
              name="Core Agent" 
              enabled={featureAvailability.coreAgent}
              description="Main intelligent agent system"
            />
            <FeatureStatus 
              name="Todo Insights" 
              enabled={featureAvailability.todoInsights}
              description="AI-powered todo analysis"
            />
            <FeatureStatus 
              name="Budget Analysis" 
              enabled={featureAvailability.budgetAnalysis}
              description="Smart budget optimization"
            />
            <FeatureStatus 
              name="Vendor Recommendations" 
              enabled={featureAvailability.vendorRecs}
              description="AI vendor matching"
            />
            <FeatureStatus 
              name="Proactive Alerts" 
              enabled={featureAvailability.proactiveAlerts}
              description="Predictive planning alerts"
            />
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test User Info</h2>
          <div className="space-y-2 text-sm">
            <p><strong>User ID:</strong> {user.uid}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          </div>
        </div>

        {/* Component Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Component Testing</h2>
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => setShowCompact(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                !showCompact 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Full Component
            </button>
            <button
              onClick={() => setShowCompact(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                showCompact 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Compact Component
            </button>
          </div>
        </div>

        {/* Agent Component */}
        <div className="space-y-8">
          {!showCompact ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Full Intelligent Assistant</h2>
              <IntelligentPlanningAssistant 
                maxInsights={10}
                showRefreshButton={true}
              />
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Compact Assistant</h2>
              <CompactIntelligentAssistant />
            </div>
          )}
        </div>

        {/* Development Notes */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Development Notes</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• This page is for development testing only</li>
            <li>• Features are controlled by environment variables and feature flags</li>
            <li>• No Firestore writes are performed - only reads for analysis</li>
            <li>• All operations are cached to minimize resource usage</li>
            <li>• Components gracefully degrade when features are disabled</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature status indicator component
 */
function FeatureStatus({ 
  name, 
  enabled, 
  description 
}: { 
  name: string; 
  enabled: boolean; 
  description: string; 
}) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
      <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
      <div>
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <div className="ml-auto">
        <span className={`text-xs px-2 py-1 rounded-full ${
          enabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  );
}
