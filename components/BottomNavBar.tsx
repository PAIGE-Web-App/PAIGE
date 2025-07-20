// components/BottomNavBar.tsx
import React from 'react';
import { ClipboardList, MessageSquare, Users, DollarSign } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: 'contacts' | 'messages' | 'todo' | 'budget';
  onTabChange: (tab: 'contacts' | 'messages' | 'todo' | 'budget') => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#F3F2F0] border-t border-[#AB9C95] flex justify-around items-center py-2 z-40 md:hidden">
      <button
        onClick={() => onTabChange('contacts')}
        className={`flex flex-col items-center text-xs font-medium px-3 py-1 rounded-md transition-colors
          ${activeTab === 'contacts' ? 'text-[#A85C36] bg-[#EBE3DD]' : 'text-[#332B42] hover:bg-[#E0DBD7]'}
        `}
      >
        <Users className="w-5 h-5 mb-1" />
        Contacts & Messages
      </button>
      <button
        onClick={() => onTabChange('todo')}
        className={`flex flex-col items-center text-xs font-medium px-3 py-1 rounded-md transition-colors
          ${activeTab === 'todo' ? 'text-[#A85C36] bg-[#EBE3DD]' : 'text-[#332B42] hover:bg-[#E0DBD7]'}
        `}
      >
        <ClipboardList className="w-5 h-5 mb-1" />
        To-do
      </button>
      <button
        onClick={() => onTabChange('budget')}
        className={`flex flex-col items-center text-xs font-medium px-3 py-1 rounded-md transition-colors
          ${activeTab === 'budget' ? 'text-[#A85C36] bg-[#EBE3DD]' : 'text-[#332B42] hover:bg-[#E0DBD7]'}
        `}
      >
        <DollarSign className="w-5 h-5 mb-1" />
        Budget
      </button>
    </div>
  );
};

export default BottomNavBar;
