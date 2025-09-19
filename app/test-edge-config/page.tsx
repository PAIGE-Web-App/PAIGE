/**
 * Test Edge Config Page
 * This page tests if Edge Config is working properly
 * This page bypasses authentication for testing purposes
 */

import { get } from '@vercel/edge-config';

export default async function TestEdgeConfigPage() {
  let greeting = 'Hello from Edge Config!';
  let error = null;

  try {
    // Try to get a greeting from Edge Config
    const edgeGreeting = await get('greeting');
    if (edgeGreeting) {
      greeting = edgeGreeting as string;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Edge Config error:', err);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Edge Config Test
        </h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Greeting from Edge Config:
            </h2>
            <p className="text-green-700">{greeting}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Error:
              </h2>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">
              Next Steps:
            </h2>
            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
              <li>Replace the EDGE_CONFIG value in .env.local with your actual connection string</li>
              <li>Add a 'greeting' key to your Edge Config in Vercel dashboard</li>
              <li>Refresh this page to see the greeting from Edge Config</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
