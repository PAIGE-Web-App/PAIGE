/**
 * Debug page to show current user ID
 * Temporary page for agent setup
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugUserIdPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Logged In</h1>
          <p className="text-gray-600 mb-4">Please log into your app first, then come back to this page.</p>
          <a 
            href="/login" 
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Your User ID for Agent Testing</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Copy This User ID:</h2>
            <div className="bg-white border border-blue-300 rounded-md p-4 font-mono text-sm break-all">
              {user.uid}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(user.uid)}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              📋 Copy to Clipboard
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-3">Next Steps:</h2>
            <ol className="list-decimal list-inside space-y-2 text-yellow-800 text-sm">
              <li>Copy your User ID above</li>
              <li>Open your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file</li>
              <li>Add these lines:
                <pre className="bg-yellow-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`# Intelligent Agent Testing (2025)
ENABLE_INTELLIGENT_AGENT=true
AGENT_TEST_USERS=${user.uid}`}
                </pre>
              </li>
              <li>Restart your dev server: <code className="bg-yellow-100 px-1 rounded">npm run dev</code></li>
              <li>Visit: <a href="/test-intelligent-agent" className="text-blue-600 underline">/test-intelligent-agent</a></li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Additional User Info:</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Display Name:</strong> {user.displayName || 'Not set'}</p>
              <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
              <p><strong>Created:</strong> {user.metadata.creationTime}</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a 
              href="/test-intelligent-agent" 
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700"
            >
              Go to Agent Test Page →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
