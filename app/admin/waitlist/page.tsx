'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, Download, Calendar } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface WaitlistEntry {
  id: string;
  email: string;
  joinedAt: any;
  status: string;
  source: string;
}

export default function AdminWaitlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchWaitlist = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/waitlist', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch waitlist');
        }

        const data = await response.json();
        setWaitlist(data.waitlist);
        setCount(data.count);
      } catch (err: any) {
        setError(err.message || 'Failed to load waitlist');
      } finally {
        setLoading(false);
      }
    };

    fetchWaitlist();
  }, [user]);

  const exportToCSV = () => {
    const csv = [
      ['Email', 'Joined At', 'Status', 'Source'],
      ...waitlist.map(entry => [
        entry.email,
        new Date(entry.joinedAt?.toDate ? entry.joinedAt.toDate() : entry.joinedAt).toLocaleString(),
        entry.status,
        entry.source
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paige-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linen p-8">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-work">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-[#AB9C95] overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-playfair font-semibold mb-2 text-[#332B42]">Paige AI Waitlist</h1>
                <p className="text-gray-600 font-work text-sm">
                  <span className="font-semibold text-xl text-[#A85C36]">{count}</span> people waiting for early access
                </p>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-[#A85C36] text-white px-4 py-2 rounded-lg hover:bg-[#784528] transition-colors font-work font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-work">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-work">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-work">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-work">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {waitlist.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-work">
                      No waitlist entries yet
                    </td>
                  </tr>
                ) : (
                  waitlist.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-work text-sm text-gray-900">{entry.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-work text-sm text-gray-600">
                            {new Date(entry.joinedAt?.toDate ? entry.joinedAt.toDate() : entry.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full font-work ${
                          entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          entry.status === 'invited' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-work text-sm text-gray-600">
                        {entry.source}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

