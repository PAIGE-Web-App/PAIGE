'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function DowngradeTester() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const testDowngrade = async (action: string) => {
    if (!user) {
      toast.error('Please log in to test');
      return;
    }

    setLoading(action);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/billing/test-downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        if (action === 'simulate-downgrade') {
          // Refresh the page to show the warning
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        toast.error(data.error || 'Test failed');
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Test failed');
    } finally {
      setLoading(null);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h6 className="text-yellow-800 font-semibold mb-2">🧪 Downgrade Testing (Dev Only)</h6>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => testDowngrade('simulate-downgrade')}
          disabled={loading === 'simulate-downgrade'}
          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading === 'simulate-downgrade' ? 'Loading...' : 'Simulate Downgrade'}
        </button>
        
        <button
          onClick={() => testDowngrade('execute-downgrade')}
          disabled={loading === 'execute-downgrade'}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading === 'execute-downgrade' ? 'Loading...' : 'Execute Downgrade'}
        </button>
        
        <button
          onClick={() => testDowngrade('reset-to-premium')}
          disabled={loading === 'reset-to-premium'}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === 'reset-to-premium' ? 'Loading...' : 'Reset to Premium'}
        </button>
      </div>
      <p className="text-xs text-yellow-700 mt-2">
        1. Click "Simulate Downgrade" to set past renewal date<br/>
        2. Refresh page to see warning<br/>
        3. Click "Execute Downgrade" to actually downgrade<br/>
        4. Click "Reset to Premium" to restore
      </p>
    </div>
  );
}
