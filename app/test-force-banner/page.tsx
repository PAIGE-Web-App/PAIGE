'use client';

import { useState, useEffect } from 'react';
import { useGmailAuth } from '@/contexts/GmailAuthContext';
import GlobalGmailBanner from '@/components/GlobalGmailBanner';

export default function TestForceBanner() {
  const { needsReauth, setNeedsReauth } = useGmailAuth();
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Force show the banner for testing
    setNeedsReauth(true);
    setMessage('Banner should now be visible!');
  }, [setNeedsReauth]);

  const toggleBanner = () => {
    setNeedsReauth(!needsReauth);
    setMessage(`Banner ${needsReauth ? 'hidden' : 'shown'}`);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Add GlobalGmailBanner to test page */}
      <GlobalGmailBanner />
      
      <h1 className="text-2xl font-bold mb-6">Force Gmail Banner Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={toggleBanner}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Toggle Banner (needsReauth: {needsReauth.toString()})
        </button>
        
        {message && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            {message}
          </div>
        )}
        
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">Expected Behavior:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Yellow banner should appear at the top of the page</li>
            <li>Banner should say: "Gmail Authentication Required"</li>
            <li>Banner should have "Re-authenticate" button</li>
            <li>Banner should have "Learn more" link</li>
          </ul>
        </div>
        
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-semibold mb-2">If Banner Doesn't Appear:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Check browser console for errors</li>
            <li>Verify GmailAuthContext is working</li>
            <li>The banner might be hidden by CSS</li>
            <li>Check if there are multiple banner components</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
