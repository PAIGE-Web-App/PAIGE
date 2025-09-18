import React from 'react';

interface DashboardWelcomeProps {
  userName: string;
}

export default function DashboardWelcome({ userName }: DashboardWelcomeProps) {
  return (
    <div className="text-center mb-8">
      <h3 className="text-[#332B42] mb-4 lg:h3">
        <span className="lg:hidden h5">Welcome to planning perfection, {userName}!</span>
        <span className="hidden lg:inline">Welcome to planning perfection, {userName}!</span>
      </h3>
      <p className="text-sm text-[#5A4A42] max-w-2xl mx-auto font-work">
        Let's get you set up with everything you need to plan your perfect wedding. 
        Track your progress and discover powerful features as you go.
      </p>
    </div>
  );
}
