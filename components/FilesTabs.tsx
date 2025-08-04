import React from 'react';
import BadgeCount from './BadgeCount';

interface FilesTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  subfoldersCount: number;
  filesCount: number;
}

export default function FilesTabs({ activeTab, onTabChange, subfoldersCount, filesCount }: FilesTabsProps) {
  // Only show Subfolders tab if subfolders exist
  const tabs = [
    ...(subfoldersCount > 0 ? [{ key: "subfolders", label: "Subfolders", count: subfoldersCount }] : []),
    { key: "files", label: "Files", count: filesCount },
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