"use client";

import BadgeCount from './BadgeCount';

interface VendorTabsProps {
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  myVendorsCount: number;
  favoritesCount: number;
}

export default function VendorTabs({ activeTab, onTabChange, myVendorsCount, favoritesCount }: VendorTabsProps) {
  const tabs = [
    { key: "my-vendors", label: "My Vendors", count: myVendorsCount },
    { key: "favorites", label: "My Favorites", count: favoritesCount },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`px-4 py-2 rounded font-work-sans text-sm font-medium border transition-colors duration-150 focus:outline-none flex items-center ${
            activeTab === tab.key 
              ? "bg-white border-[#A85C36] text-[#A85C36]" 
              : "bg-[#F3F2F0] border-[#E0D6D0] text-[#332B42] hover:bg-[#E0D6D0]"
          }`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
          <BadgeCount count={tab.count} />
        </button>
      ))}
    </div>
  );
} 