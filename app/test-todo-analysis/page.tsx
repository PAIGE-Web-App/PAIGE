'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestTodoAnalysis() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-todo-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      
      const data = await response.json();
      setResult(data);
      console.log('Test result:', data);
    } catch (error) {
      console.error('Test error:', error);
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Todo Analysis Test</h1>
      <p className="mb-4">Test the todo analysis functionality without using Gmail quota.</p>
      
      <button
        onClick={runTest}
        disabled={isLoading || !user?.uid}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Running Test...' : 'Run Todo Analysis Test'}
      </button>
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
