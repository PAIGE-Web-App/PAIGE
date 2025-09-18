import React from 'react';

export default function QuickGuide() {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="w-full lg:w-3/4 lg:pr-8">
          <h5 className="text-[#332B42] mb-2">
            A quick guide to planning your perfect wedding
          </h5>
          <p className="text-sm text-[#5A4A42] mb-4 font-work">
            From Paige's wedding planning experts
          </p>
          
          <ul className="space-y-3 list-disc list-inside">
            <li className="text-sm text-[#5A4A42] font-work">
              <strong>Start with your profile:</strong> Add your partner and define your wedding style to get personalized recommendations.
            </li>
            <li className="text-sm text-[#5A4A42] font-work">
              <strong>Set up your budget:</strong> Create a realistic budget and track expenses to stay on track financially.
            </li>
            <li className="text-sm text-[#5A4A42] font-work">
              <strong>Connect with vendors:</strong> Import your contacts and use our AI-powered messaging to communicate efficiently.
            </li>
            <li className="text-sm text-[#5A4A42] font-work">
              <strong>Stay organized:</strong> Create mood boards, manage tasks, and plan your seating chart all in one place.
            </li>
          </ul>
        </div>
        
        {/* Paige illustration - Hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block w-1/4">
          <div className="h-full rounded-lg overflow-hidden">
            <img 
              src="/Paige.png" 
              alt="Paige" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
