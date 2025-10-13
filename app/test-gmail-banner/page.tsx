'use client';

import { useState } from 'react';
import GlobalGmailBanner from '@/components/GlobalGmailBanner';

export default function TestGmailBanner() {
  const [result, setResult] = useState<string>('');

  const triggerBanner = () => {
    // Simulate the custom event that would be triggered by the error handler
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('gmail-auth-required', {
        detail: { timestamp: Date.now(), test: true }
      });
      window.dispatchEvent(event);
      setResult('Custom event "gmail-auth-required" dispatched! Check if banner appears.');
      console.log('Test: Dispatched gmail-auth-required event');
    }
  };

  const testApiCall = async () => {
    try {
      const response = await fetch('/api/test/gmail-auth-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      const data = await response.json();
      setResult(`API Response: ${JSON.stringify(data)}`);
    } catch (error) {
      setResult(`API Error: ${error}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Add GlobalGmailBanner to test page */}
      <GlobalGmailBanner />
      
      <h1 className="text-2xl font-bold mb-6">Test Gmail Auth Banner</h1>
      
      <div className="space-y-4">
        <button
          onClick={triggerBanner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Trigger Banner (Custom Event)
        </button>
        
        <button
          onClick={testApiCall}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-4"
        >
          Test API Call
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre>{result}</pre>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Trigger Banner (Custom Event)" to simulate the error handler</li>
            <li>Check if the yellow Gmail banner appears at the top of the page</li>
            <li>If it appears, the custom event system is working correctly</li>
            <li>If it doesn't appear, there might be an issue with the GmailAuthContext</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
