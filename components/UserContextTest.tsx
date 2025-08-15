import React from 'react';
import { useFullContext } from '../hooks/useUserContext';

export default function UserContextTest() {
  const {
    context,
    loading,
    error,
    refreshContext,
    getContextSummary,
    userName,
    weddingLocation,
    planningStage,
    vibe,
    completedTodos,
    pendingTodos,
    selectedVendors
  } = useFullContext();

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-blue-700">Building user context...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="text-red-700 mb-2">Error loading context:</div>
        <div className="text-red-600 text-sm">{error}</div>
        <button
          onClick={refreshContext}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-gray-700">No user context available</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-green-800">✅ User Context Test</h3>
        <button
          onClick={refreshContext}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-green-700">User:</span>
            <span className="ml-2 text-green-600">{userName || 'Not set'}</span>
          </div>
          <div>
            <span className="font-medium text-green-700">Location:</span>
            <span className="ml-2 text-green-600">{weddingLocation || 'Not set'}</span>
          </div>
          <div>
            <span className="font-medium text-green-700">Planning Stage:</span>
            <span className="ml-2 text-green-600">{planningStage}</span>
          </div>
          <div>
            <span className="font-medium text-green-700">Days Left:</span>
            <span className="ml-2 text-green-600">{context.daysUntilWedding || 'Unknown'}</span>
          </div>
        </div>

        <div>
          <span className="font-medium text-green-700">Vibes:</span>
          <span className="ml-2 text-green-600">
            {vibe.length > 0 ? vibe.join(', ') : 'None set'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-green-700">Completed Todos:</span>
            <span className="ml-2 text-green-600">{completedTodos.length}</span>
            {completedTodos.length > 0 && (
              <ul className="ml-4 mt-1 text-xs text-green-600">
                {completedTodos.slice(0, 3).map((todo, i) => (
                  <li key={i}>• {todo}</li>
                ))}
                {completedTodos.length > 3 && <li>• ...and {completedTodos.length - 3} more</li>}
              </ul>
            )}
          </div>
          <div>
            <span className="font-medium text-green-700">Pending Todos:</span>
            <span className="ml-2 text-green-600">{pendingTodos.length}</span>
            {pendingTodos.length > 0 && (
              <ul className="ml-4 mt-1 text-xs text-green-600">
                {pendingTodos.slice(0, 3).map((todo, i) => (
                  <li key={i}>• {todo}</li>
                ))}
                {pendingTodos.length > 3 && <li>• ...and {pendingTodos.length - 3} more</li>}
              </ul>
            )}
          </div>
        </div>

        <div>
          <span className="font-medium text-green-700">Selected Vendors:</span>
          <span className="ml-2 text-green-600">
            {selectedVendors.length > 0 ? selectedVendors.join(', ') : 'None selected'}
          </span>
        </div>

        <div className="mt-4 p-2 bg-white rounded border">
          <div className="font-medium text-green-700 mb-1">Context Summary:</div>
          <pre className="text-xs text-green-600 whitespace-pre-wrap">
            {getContextSummary()}
          </pre>
        </div>

        <div className="text-xs text-green-600">
          Last updated: {context.lastUpdated.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
