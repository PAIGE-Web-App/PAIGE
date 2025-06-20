'use client';

export default function TestEnv() {
  return (
    <div>
      <h1>Environment Variables Test</h1>
      <pre>
        NEXT_PUBLIC_FIREBASE_API_KEY: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'not set'}
      </pre>
    </div>
  );
} 