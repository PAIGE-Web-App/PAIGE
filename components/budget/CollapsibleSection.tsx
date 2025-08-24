import React from 'react';

interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = React.memo(({
  title,
  isCollapsed,
  onToggle,
  children,
  className = ''
}) => (
  <div className={`bg-white p-4 rounded-[10px] border border-[#E0DBD7] ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h6>{title}</h6>
      <button
        onClick={onToggle}
        className="text-[#6B7280] hover:text-[#332B42] transition-colors"
        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${title} section`}
      >
        <svg 
          className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
    {!isCollapsed && children}
  </div>
));

CollapsibleSection.displayName = 'CollapsibleSection';

export default CollapsibleSection;
