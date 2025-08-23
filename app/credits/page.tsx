'use client';

import React, { useState } from 'react';
import { CreditDisplay } from '@/components/CreditDisplay';
import { useCredits } from '@/hooks/useCredits';
import { AIFeature } from '@/types/credits';

export default function CreditsPage() {
  const {
    credits,
    loading,
    error,
    creditHistory,
    validateCredits,
    useCredits: useCreditsFunction,
    addCredits,
    refreshCredits,
    getCreditUsagePercentage,
    isCreditsLow,
    isCreditsExhausted,
    getRemainingCredits,
    getSubscriptionInfo,
    canUseFeature
  } = useCredits();

  const [testFeature, setTestFeature] = useState<AIFeature>('draft_messaging');
  const [testAmount, setTestAmount] = useState(5);
  const [testResult, setTestResult] = useState<string>('');

  const handleTestValidation = async () => {
    setTestResult('Validating...');
    try {
      const validation = await validateCredits(testFeature);
      setTestResult(JSON.stringify(validation, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestUsage = async () => {
    setTestResult('Using credits...');
    try {
      const success = await useCreditsFunction(testFeature, { test: true });
      setTestResult(success ? 'Credits used successfully!' : 'Failed to use credits');
      if (success) {
        refreshCredits();
      }
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddCredits = async () => {
    setTestResult('Adding credits...');
    try {
      const success = await addCredits(testAmount, 'bonus', 'Test credit addition');
      setTestResult(success ? 'Credits added successfully!' : 'Failed to add credits');
      if (success) {
        refreshCredits();
      }
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="app-content-container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-content-container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h1 className="text-xl font-semibold text-red-800 mb-2">Error Loading Credits</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!credits) {
    return (
      <div className="app-content-container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h1 className="text-xl font-semibold text-yellow-800 mb-2">No Credits Found</h1>
          <p className="text-yellow-600">Please contact support to set up your credit account.</p>
        </div>
      </div>
    );
  }

  const subscriptionInfo = getSubscriptionInfo();

  return (
    <div className="app-content-container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Credits Dashboard</h1>
          <p className="text-gray-600">
            Manage your AI feature usage and monitor your credit consumption
          </p>
        </div>

        {/* Credit Display */}
        <div className="mb-8">
          <CreditDisplay variant="banner" />
        </div>

        {/* Credit Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Current Status */}
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining Credits:</span>
                <span className="font-semibold text-gray-900">{getRemainingCredits()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usage:</span>
                <span className="font-semibold text-gray-900">{Math.round(getCreditUsagePercentage())}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  isCreditsExhausted() ? 'text-red-600' :
                  isCreditsLow() ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {isCreditsExhausted() ? 'Exhausted' : 
                   isCreditsLow() ? 'Low' : 'Available'}
                </span>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-semibold text-gray-900 capitalize">{subscriptionInfo?.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User Type:</span>
                <span className="font-semibold text-gray-900 capitalize">{subscriptionInfo?.userType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Credits:</span>
                <span className="font-semibold text-gray-900">{subscriptionInfo?.monthlyCredits}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Access */}
        <div className="bg-white border rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Feature Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(['draft_messaging', 'todo_generation', 'file_analysis', 'message_analysis', 'integrated_planning', 'budget_generation', 'vibe_generation', 'vendor_suggestions', 'follow_up_questions'] as AIFeature[]).map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  canUseFeature(feature) ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm ${
                  canUseFeature(feature) ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {feature.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Testing Tools */}
        <div className="bg-white border rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Testing Tools</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Feature
              </label>
              <select
                value={testFeature}
                onChange={(e) => setTestFeature(e.target.value as AIFeature)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="draft_messaging">Draft Messaging</option>
                <option value="todo_generation">Todo Generation</option>
                <option value="file_analysis">File Analysis</option>
                <option value="message_analysis">Message Analysis</option>
                <option value="integrated_planning">Integrated Planning</option>
                <option value="budget_generation">Budget Generation</option>
                <option value="vibe_generation">Vibe Generation</option>
                <option value="vendor_suggestions">Vendor Suggestions</option>
                <option value="follow_up_questions">Follow-up Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Credits
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(parseInt(e.target.value) || 0)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="1"
                  max="100"
                />
                <button
                  onClick={handleAddCredits}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <button
                onClick={handleTestValidation}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Test Validation
              </button>
              <button
                onClick={handleTestUsage}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                Test Usage
              </button>
            </div>
          </div>

          {testResult && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Test Result:</h4>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </div>

        {/* Credit History */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Credit History</h3>
          {creditHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No credit transactions yet</p>
          ) : (
            <div className="space-y-3">
              {creditHistory.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      transaction.type === 'spent' ? 'bg-red-500' :
                      transaction.type === 'earned' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.description || transaction.feature.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          try {
                            const date = new Date(transaction.timestamp);
                            return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
                          } catch {
                            return 'Invalid date';
                          }
                        })()} • {transaction.type}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${
                    transaction.type === 'spent' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {transaction.type === 'spent' ? '-' : '+'}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
