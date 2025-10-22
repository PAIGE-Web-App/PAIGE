'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestSpecificMessageAnalysis() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testSpecificMessage = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      // Test with the specific message that should generate todos
      const response = await fetch('/api/analyze-messages-for-todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          contactEmail: 'youngjedistudio@gmail.com' // The contact we just imported messages for
        }),
      });
      
      const data = await response.json();
      setResult(data);
      console.log('Specific message analysis result:', data);
    } catch (error) {
      console.error('Test error:', error);
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const testWithMockMessage = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      // Test with a mock message that should definitely generate todos
      const response = await fetch('/api/test-todo-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      
      const data = await response.json();
      setResult(data);
      console.log('Mock message analysis result:', data);
    } catch (error) {
      console.error('Test error:', error);
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Specific Message Analysis</h1>
      <p className="mb-4">Test the todo analysis with the actual imported messages.</p>
      
      <div className="space-y-4">
        <button
          onClick={testSpecificMessage}
          disabled={isLoading || !user?.uid}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
        >
          {isLoading ? 'Testing...' : 'Test with Imported Messages'}
        </button>
        
        <button
          onClick={testWithMockMessage}
          disabled={isLoading || !user?.uid}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test with Mock Message'}
        </button>
      </div>
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Analysis Results:</h2>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
