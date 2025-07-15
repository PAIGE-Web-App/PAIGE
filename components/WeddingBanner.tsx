'use client';

import React from 'react';

interface WeddingBannerProps {
  daysLeft: number | null;
  userName: string | null;
  isLoading: boolean;
  onSetWeddingDate: () => void;
}

const WeddingBanner: React.FC<WeddingBannerProps> = ({
  daysLeft,
  userName,
  isLoading,
  onSetWeddingDate
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#332B42] text-white text-center py-2 font-playfair text-sm tracking-wide">
        <div className="app-container px-4">
        <div className="animate-pulse">
          <div className="h-4 bg-[#4A3F5C] rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#332B42] text-white text-center py-2 font-playfair text-sm tracking-wide">
      <div className="app-container px-4">
      {daysLeft !== null ? (
        `${daysLeft} day${daysLeft !== 1 ? "s" : ""} until the big day!`
      ) : userName ? (
        <>
          Welcome back, {userName}. Have y'all decided your wedding date?
          <button
            onClick={onSetWeddingDate}
            className="ml-2 underline text-[#F3F2F0] hover:text-[#E0DBD7] text-sm"
          >
            Set it now
          </button>
        </>
      ) : (
        "Welcome back! Have y'all decided your wedding date?"
      )}
      </div>
    </div>
  );
};

export default WeddingBanner; 