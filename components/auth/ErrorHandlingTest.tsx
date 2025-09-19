/**
 * Test Component for Enhanced Error Handling
 * This component demonstrates the enhanced error handling capabilities
 */

import React from 'react';
import { useAuthError } from '@/hooks/useAuthError';

export function ErrorHandlingTest() {
  const { error, handleError, clearError, getErrorMessage, isError } = useAuthError();

  const testErrors = [
    { code: 'auth/invalid-credential', message: 'Invalid credentials' },
    { code: 'auth/popup-closed-by-user', message: 'Popup closed' },
    { code: 'auth/account-exists-with-different-credential', message: 'Account exists' },
    { code: 'auth/too-many-requests', message: 'Too many requests' },
    { code: 'auth/network-request-failed', message: 'Network error' },
    { code: 'MISSING_FIELDS', message: 'Missing fields' },
    { code: 'INVALID_EMAIL', message: 'Invalid email' },
    { code: 'SESSION_FAILED', message: 'Session failed' }
  ];

  const triggerError = (errorCode: string, message: string) => {
    handleError({ code: errorCode, message }, 'Test Error');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Enhanced Error Handling Test</h2>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Details</h3>
              <div className="mt-1 text-sm text-red-700">
                <p><strong>Code:</strong> {error.code}</p>
                <p><strong>Message:</strong> {getErrorMessage(error)}</p>
                <p><strong>Timestamp:</strong> {new Date(error.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div className="ml-3">
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Test Different Error Types</h3>
        <div className="grid grid-cols-2 gap-4">
          {testErrors.map((testError) => (
            <button
              key={testError.code}
              onClick={() => triggerError(testError.code, testError.message)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Test {testError.code}
            </button>
          ))}
        </div>
        
        <div className="pt-4">
          <button
            onClick={clearError}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Clear Error
          </button>
        </div>
      </div>

      {/* Error Status */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-semibold mb-2">Error Status</h3>
        <p><strong>Has Error:</strong> {error ? 'Yes' : 'No'}</p>
        <p><strong>Is Invalid Credentials:</strong> {isError('INVALID_CREDENTIALS') ? 'Yes' : 'No'}</p>
        <p><strong>Is Network Error:</strong> {isError('NETWORK_ERROR') ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
