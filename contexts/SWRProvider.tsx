'use client';

import { SWRConfig } from 'swr';
import { CACHE_CONFIG } from '../lib/cache';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        ...CACHE_CONFIG.swr,
        fetcher: async (url: string) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        },
        onError: (error) => {
          console.error('SWR Error:', error);
        },
        onSuccess: (data, key) => {
          // Don't log authentication requests
          if (!key.includes('/api/sessionLogin') && !key.includes('/api/auth/')) {
            console.log('SWR Success:', key, data);
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
} 