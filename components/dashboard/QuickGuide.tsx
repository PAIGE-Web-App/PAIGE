import React from 'react';
import Link from 'next/link';

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
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">1</div>
              <p className="text-sm text-[#5A4A42] font-work">
                <strong>Start with your profile:</strong> Add your partner and define your wedding style to get personalized recommendations.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">2</div>
              <p className="text-sm text-[#5A4A42] font-work">
                <strong>Set up your budget:</strong> Create a realistic budget and track expenses to stay on track financially.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">3</div>
              <p className="text-sm text-[#5A4A42] font-work">
                <strong>Connect with vendors:</strong> Import your contacts and use our AI-powered messaging to communicate efficiently.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">4</div>
              <p className="text-sm text-[#5A4A42] font-work">
                <strong>Stay organized:</strong> Create mood boards, manage tasks, and plan your seating chart all in one place.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8 pt-8">
              <Link 
                href="/messages"
                className="btn-primaryinverse no-underline flex-1 text-center"
              >
                Skip to Messages
              </Link>
              <Link 
                href="/settings"
                className="btn-primary no-underline flex-1 text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
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
