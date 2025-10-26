/**
 * Intelligent Planning Assistant Component - 2025 Implementation
 * 
 * SAFETY FEATURES:
 * - Feature flag protection at component level
 * - Graceful loading and error states
 * - Minimal UI footprint
 * - No disruptive changes to existing layout
 * - Easy to disable/remove
 */

'use client';

import React from 'react';
import { useIntelligentAgent } from '@/hooks/useIntelligentAgent';
import { AgentInsight } from '@/lib/agents/baseAgent';
import { AlertCircle, CheckCircle, Lightbulb, Clock, RefreshCw } from 'lucide-react';

interface IntelligentPlanningAssistantProps {
  className?: string;
  maxInsights?: number;
  showRefreshButton?: boolean;
}

/**
 * Main component for displaying intelligent planning insights
 */
export default function IntelligentPlanningAssistant({
  className = '',
  maxInsights = 5,
  showRefreshButton = true
}: IntelligentPlanningAssistantProps) {
  const { insights, loading, error, lastUpdated, refresh, isEnabled } = useIntelligentAgent({
    autoRefresh: false, // Manual refresh only for now
    enabled: true
  });

  // Don't render if not enabled
  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`intelligent-assistant ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Planning Assistant</h3>
              {lastUpdated && (
                <p className="text-xs text-gray-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          
          {showRefreshButton && (
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Refresh insights"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && !insights && (
            <div className="flex items-center space-x-2 text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analyzing your wedding planning...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {insights && insights.insights.length > 0 && (
            <div className="space-y-3">
              {/* Summary */}
              {insights.summary && (
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {insights.summary}
                </div>
              )}

              {/* Insights */}
              <div className="space-y-2">
                {insights.insights.slice(0, maxInsights).map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>

              {/* Show more indicator */}
              {insights.insights.length > maxInsights && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  +{insights.insights.length - maxInsights} more insights available
                </div>
              )}
            </div>
          )}

          {insights && insights.insights.length === 0 && !loading && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Your wedding planning is on track! No immediate actions needed.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual insight card component
 */
function InsightCard({ insight }: { insight: AgentInsight }) {
  const getInsightIcon = () => {
    switch (insight.type) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'alert':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'opportunity':
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case 'recommendation':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInsightBorderColor = () => {
    switch (insight.type) {
      case 'urgent':
        return 'border-l-red-500';
      case 'alert':
        return 'border-l-orange-500';
      case 'opportunity':
        return 'border-l-blue-500';
      case 'recommendation':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getPriorityBadge = () => {
    if (insight.priority === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          High Priority
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`border-l-4 ${getInsightBorderColor()} bg-gray-50 p-3 rounded-r-md`}>
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0 mt-0.5">
          {getInsightIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">{insight.title}</p>
            {getPriorityBadge()}
          </div>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
          
          {/* Category badge */}
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
              {insight.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CompactIntelligentAssistant({ className = '' }: { className?: string }) {
  const { insights, loading, isEnabled } = useIntelligentAgent();

  if (!isEnabled || loading) {
    return null;
  }

  const urgentInsights = insights?.insights.filter(i => i.type === 'urgent' || i.priority === 'high') || [];

  if (urgentInsights.length === 0) {
    return null;
  }

  return (
    <div className={`compact-assistant ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {urgentInsights.length} urgent item{urgentInsights.length !== 1 ? 's' : ''} need attention
            </p>
            <p className="text-xs text-red-600">
              {urgentInsights[0].title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
