"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { gmailClientService } from '@/utils/gmailClientService';

export default function TestClientGmailPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');

  const testGmailAvailability = async () => {
    if (!user?.uid) {
      setResult('❌ User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const isAvailable = await gmailClientService.isGmailAvailable(user.uid);
      setResult(isAvailable ? '✅ Gmail is available and authenticated' : '❌ Gmail is not available or not authenticated');
    } catch (error: any) {
      setResult(`❌ Error checking Gmail availability: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGmailSend = async () => {
    if (!user?.uid) {
      setResult('❌ User not authenticated');
      return;
    }

    if (!testEmail) {
      setResult('❌ Please enter a test email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await gmailClientService.sendNewMessage(user.uid, {
        to: testEmail,
        subject: 'Test Email from Paige Client-Side Gmail',
        body: 'This is a test email sent using the new client-side Gmail API integration. If you receive this, the client-side Gmail functionality is working correctly!',
      });

      if (result.success) {
        setResult(`✅ Test email sent successfully! Message ID: ${result.messageId}`);
      } else {
        setResult(`❌ Failed to send test email: ${result.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Error sending test email: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Test Client-Side Gmail API
          </h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Gmail Availability Test
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Check if Gmail is properly authenticated and available for client-side API calls.
              </p>
              <button
                onClick={testGmailAvailability}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test Gmail Availability'}
              </button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Gmail Send Test
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Send a test email using the client-side Gmail API.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  placeholder="Enter test email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={testGmailSend}
                  disabled={isLoading || !testEmail}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>

            {result && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <h3 className="font-semibold text-gray-700 mb-2">Result:</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">{result}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
