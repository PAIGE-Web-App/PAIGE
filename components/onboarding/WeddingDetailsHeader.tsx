'use client';

import React from 'react';
import { Calendar, Users, DollarSign, MapPin, Edit3, WandSparkles } from 'lucide-react';

interface WeddingDetailsHeaderProps {
  weddingDate: string | null;
  guestCount: number;
  budget: number;
  location: string;
  onEditClick: () => void;
}

const WeddingDetailsHeader: React.FC<WeddingDetailsHeaderProps> = ({
  weddingDate,
  guestCount,
  budget,
  location,
  onEditClick
}) => {
  // Format date for display
  const formatDate = (date: string | null): string => {
    if (!date) return 'TBD';
    try {
      // Parse the ISO date string (YYYY-MM-DD) in local timezone to avoid off-by-one day issues
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'TBD';
    }
  };

  // Format budget for display
  const formatBudget = (budget: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  return (
    <div className="bg-white border-b border-[#E0D6D0] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WandSparkles className="w-5 h-5 text-[#8B5CF6]" />
          <h1 className="h5">
            Your Wedding Plan
          </h1>
        </div>
        
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-[#A85C36]" />
            <span className="text-[#332B42] font-work">
              {formatDate(weddingDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-[#A85C36]" />
            <span className="text-[#332B42] font-work">
              {guestCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-[#A85C36]" />
            <span className="text-[#332B42] font-work">
              {formatBudget(budget)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-[#A85C36]" />
            <span className="text-[#332B42] font-work text-sm max-w-32 truncate">
              {location?.split(',')[0] || 'TBD'}
            </span>
          </div>
          <button
            onClick={onEditClick}
            className="flex items-center gap-1 p-1 text-[#A85C36] hover:text-[#784528] transition-colors"
            title="Edit wedding details"
          >
            <Edit3 className="w-3 h-3" />
            <span className="text-xs font-work">Update details</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeddingDetailsHeader;
