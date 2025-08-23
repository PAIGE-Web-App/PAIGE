"use client";

import { useRouter, useSearchParams } from 'next/navigation';

export const TABS = [
  { key: "account", label: "Account" },
  { key: "wedding", label: "Wedding Details" },
  { key: "plan", label: "Plan & Billing" },
  { key: "credits", label: "Credits" },
  { key: "integrations", label: "Integrations" },
  { key: "notifications", label: "Notifications" },
];

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex gap-2 mb-8">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`px-4 py-2 rounded font-work-sans text-sm font-medium border transition-colors duration-150 focus:outline-none ${
            activeTab === tab.key 
              ? "bg-white border-[#A85C36] text-[#A85C36]" 
              : "bg-[#F3F2F0] border-[#E0D6D0] text-[#332B42] hover:bg-[#E0D6D0]"
          }`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 