import React from 'react';

const BadgeCount: React.FC<{ count: number; className?: string }> = ({ count, className }) => (
  <span className={`ml-2 text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full font-work ${className || ''}`}>
    {count}
  </span>
);

export default BadgeCount; 