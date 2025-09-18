import React from 'react';
import Link from 'next/link';
import { MessageSquare, ClipboardList, DollarSign, Heart } from 'lucide-react';

export default function QuickActions() {
  return (
    <div className="mb-6">
      <h6 className="text-[#332B42] mb-4">Quick Actions</h6>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Link 
          href="/messages"
          className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] bg-white hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group no-underline"
        >
          <MessageSquare className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-work font-medium text-[#332B42]">Messages</span>
        </Link>
        <Link 
          href="/todo"
          className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] bg-white hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group no-underline"
        >
          <ClipboardList className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-work font-medium text-[#332B42]">To-Do</span>
        </Link>
        <Link 
          href="/budget"
          className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] bg-white hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group no-underline"
        >
          <DollarSign className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-work font-medium text-[#332B42]">Budget</span>
        </Link>
        <Link 
          href="/moodboards"
          className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] bg-white hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group no-underline"
        >
          <Heart className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-work font-medium text-[#332B42]">Mood Boards</span>
        </Link>
      </div>
    </div>
  );
}
