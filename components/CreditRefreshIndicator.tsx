import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { UserCredits } from '@/types/credits';

interface CreditRefreshIndicatorProps {
  credits: UserCredits;
  variant?: 'compact' | 'full';
}

export default function CreditRefreshIndicator({ 
  credits, 
  variant = 'compact' 
}: CreditRefreshIndicatorProps) {
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const calculateTimeUntilRefresh = () => {
      const now = new Date();
      const lastRefresh = new Date(credits.lastCreditRefresh);
      
      // Calculate next refresh time (next midnight)
      const nextRefresh = new Date(lastRefresh);
      nextRefresh.setDate(nextRefresh.getDate() + 1);
      nextRefresh.setHours(0, 0, 0, 0);
      
      const timeDiff = nextRefresh.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeUntilRefresh('Refreshing soon...');
        setIsRefreshing(true);
        return;
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeUntilRefresh(`${hours}h ${minutes}m`);
      } else {
        setTimeUntilRefresh(`${minutes}m`);
      }
      
      setIsRefreshing(false);
    };

    calculateTimeUntilRefresh();
    const interval = setInterval(calculateTimeUntilRefresh, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [credits.lastCreditRefresh]);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-xs text-[#AB9C95]">
        <Clock className="w-3 h-3" />
        <span>
          {isRefreshing ? 'Refreshing...' : `Refreshes in ${timeUntilRefresh}`}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium text-[#332B42]">
          Daily Credit Refresh
        </span>
      </div>
      
      <div className="text-sm text-[#AB9C95]">
        {isRefreshing ? (
          <span className="text-[#A85C36] font-medium">
            Credits refreshing now...
          </span>
        ) : (
          <>
            <span>Next refresh in </span>
            <span className="font-medium text-[#332B42]">{timeUntilRefresh}</span>
          </>
        )}
      </div>
      
      <div className="text-xs text-[#AB9C95] mt-1">
        Last refreshed: {new Date(credits.lastCreditRefresh).toLocaleDateString()}
      </div>
    </div>
  );
}
