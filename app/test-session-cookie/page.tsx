'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function TestSessionCookiePage() {
  const { user } = useAuth();
  const [cookies, setCookies] = useState<string>('');
  const [sessionCookie, setSessionCookie] = useState<string>('');
  const [clientSessionCookie, setClientSessionCookie] = useState<string>('');

  useEffect(() => {
    // Get all cookies
    const allCookies = document.cookie;
    setCookies(allCookies);
    
    // Check for __session cookie (HttpOnly server cookie)
    const sessionMatch = allCookies.match(/__session=([^;]+)/);
    if (sessionMatch) {
      setSessionCookie(sessionMatch[1]);
    }
    
    // Check for __client_session cookie (client-side cookie)
    const clientSessionMatch = allCookies.match(/__client_session=([^;]+)/);
    if (clientSessionMatch) {
      setClientSessionCookie(clientSessionMatch[1]);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Session Cookie Test</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Status</h2>
          <p className="text-sm text-gray-700">
            User: {user ? user.email : 'Not logged in'}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">All Cookies</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto text-left">
            {cookies || 'No cookies found'}
          </pre>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Server Session Cookie (__session)</h2>
          {sessionCookie ? (
            <div>
              <p className="text-green-600 mb-2">✅ Server session cookie found!</p>
              <p className="text-sm text-gray-700">Length: {sessionCookie.length} characters</p>
              <p className="text-sm text-gray-700">First 50 chars: {sessionCookie.substring(0, 50)}...</p>
            </div>
          ) : (
            <p className="text-red-600">❌ No server session cookie found</p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Client Session Cookie (__client_session)</h2>
          {clientSessionCookie ? (
            <div>
              <p className="text-green-600 mb-2">✅ Client session cookie found!</p>
              <p className="text-sm text-gray-700">Length: {clientSessionCookie.length} characters</p>
              <p className="text-sm text-gray-700">First 50 chars: {clientSessionCookie.substring(0, 50)}...</p>
            </div>
          ) : (
            <p className="text-red-600">❌ No client session cookie found</p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Test Messages Access</h2>
          <a 
            href="/messages" 
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try to Access Messages
          </a>
        </div>

        <p className="text-sm text-gray-600 mt-4">
          This page helps debug session cookie issues. Check the console for middleware logs.
        </p>
      </div>
    </div>
  );
}
