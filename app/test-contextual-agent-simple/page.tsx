/**
 * Simple test page for contextual agent
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestContextualAgentSimple() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAgent = async () => {
    if (!user?.uid) {
      setError('Please log in first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/contextual-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: {
            page: 'todo',
            userAction: 'viewing',
            currentData: {
              todoItems: [
                { name: 'Research Wedding Bands', category: 'jewelry', priority: 'high' },
                { name: 'Select Main Venue & Set Wedding Date', category: 'venue', priority: 'high' },
                { name: 'Consult with Jewelry Expert', category: 'jewelry', priority: 'medium' },
              ]
            },
            weddingContext: {
              daysUntilWedding: 33,
              budget: 25000,
              location: 'Not set',
              style: ['elegant', 'modern']
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linen p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Simple Contextual Agent Test</h1>
        
        <button
          onClick={testAgent}
          disabled={loading || !user}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 mb-6"
        >
          {loading ? 'Testing Agent...' : 'Test Contextual Agent'}
        </button>

        {!user && (
          <p className="text-red-600 mb-4">Please log in to test the agent</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="font-semibold text-green-800 mb-4">Agent Response:</h3>
            <div className="space-y-4">
              <div>
                <strong>Summary:</strong> {result.summary}
              </div>
              <div>
                <strong>Confidence:</strong> {result.confidence}
              </div>
              <div>
                <strong>Insights ({result.insights?.length || 0}):</strong>
                {result.insights?.map((insight: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border mt-2">
                    <div className="font-medium text-gray-800">{insight.title}</div>
                    <div className="text-sm text-gray-600 mb-2">{insight.description}</div>
                    <div className="text-xs text-gray-500">
                      Type: {insight.type} | Priority: {insight.priority || 'N/A'} | Context: {insight.context || 'N/A'}
                    </div>
                    {insight.actions && insight.actions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-700">Actions:</div>
                        {insight.actions.map((action: any, actionIndex: number) => (
                          <div key={actionIndex} className="text-xs text-gray-600 ml-2">
                            • {action.label}: {action.action}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
