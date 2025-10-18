'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfileData } from '../hooks/useUserProfileData';

interface WeddingBannerProps {
  localWeddingDate?: string | null;
}

const WeddingBanner: React.FC<WeddingBannerProps> = ({
  localWeddingDate
}) => {
  const { user, userName, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Use the same hook as other pages for consistent data
  const { 
    weddingDate: firestoreWeddingDate, 
    weddingDateUndecided, 
    profileLoading: isLoading 
  } = useUserProfileData();

  // Calculate days left, months left, and remaining days
  const calculateTimeLeft = () => {
    const dateToUse = localWeddingDate ? new Date(localWeddingDate) : firestoreWeddingDate;

    if (!dateToUse) return { daysLeft: null, monthsLeft: null, remainingDays: null };
    
    const today = new Date();
    // Reset time portion to compare dates only
    today.setHours(0, 0, 0, 0);
    
    // Create a new date object from dateToUse to avoid modifying the original state
    const weddingDate = new Date(dateToUse);
    weddingDate.setHours(0, 0, 0, 0);
    
    // Calculate total days left (including the wedding day itself)
    const diffTime = weddingDate.getTime() - today.getTime();
    const totalDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (totalDaysLeft <= 0) {
      return { daysLeft: 0, monthsLeft: 0, remainingDays: 0 };
    }
    
    // Calculate months and remaining days
    let monthsLeft = 0;
    let remainingDays = totalDaysLeft;
    
    // Start from today and count months
    const currentDate = new Date(today);
    
    while (currentDate < weddingDate) {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
      if (nextMonth <= weddingDate) {
        monthsLeft++;
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        break;
      }
    }
    
    // Calculate remaining days after accounting for full months
    const monthsAheadDate = new Date(today.getFullYear(), today.getMonth() + monthsLeft, today.getDate());
    const remainingTime = weddingDate.getTime() - monthsAheadDate.getTime();
    remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    
    return { 
      daysLeft: totalDaysLeft, 
      monthsLeft, 
      remainingDays: Math.max(0, remainingDays) 
    };
  };

  const { daysLeft, monthsLeft, remainingDays } = calculateTimeLeft();

  const handleSetWeddingDate = () => {
    router.push('/settings?tab=wedding&highlight=weddingDate');
  };
  if (isLoading || authLoading) {
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
      {daysLeft !== null && !weddingDateUndecided && firestoreWeddingDate ? (
        (() => {
          if (daysLeft === 0) {
            return "Today is the big day!";
          }
          
          let countdownText = "";
          
          if (monthsLeft && monthsLeft > 0) {
            countdownText += `${monthsLeft} month${monthsLeft !== 1 ? "s" : ""}`;
            if (remainingDays && remainingDays > 0) {
              countdownText += ` and ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
            }
          } else if (remainingDays && remainingDays > 0) {
            countdownText += `${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
          } else {
            countdownText += `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
          }
          
          return `${countdownText} until the big day!`;
        })()
      ) : userName ? (
        <>
          Welcome back, {userName}. Have y'all decided your wedding date?
          <button
            onClick={handleSetWeddingDate}
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