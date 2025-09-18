import React from 'react';

interface ProgressOverviewProps {
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
}

export default function ProgressOverview({ 
  completedCount, 
  totalCount, 
  progressPercentage 
}: ProgressOverviewProps) {
  return (
    <div className="bg-white rounded-lg border border-[#E0DBD7] p-6">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-[#332B42]">Your Progress</h5>
        <span className="text-sm text-[#5A4A42] font-work">{completedCount} of {totalCount} completed</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            progressPercentage === 100 ? 'bg-green-600' : 'bg-[#A85C36]'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <p className="text-sm text-[#5A4A42] font-work">
        {progressPercentage === 100 
          ? "🎉 Congratulations! You've completed all the essential setup steps."
          : `You're ${progressPercentage}% complete with your Paige setup for the best wedding planning experience.`
        }
      </p>
    </div>
  );
}
