import React from 'react';
import BadgeCount from './BadgeCount';

interface SectionHeaderBarProps {
  title: React.ReactNode;
  count?: number;
  children?: React.ReactNode;
}

const SectionHeaderBar: React.FC<SectionHeaderBarProps> = ({ title, count, children }) => {
  return (
    <div className="sticky top-0 z-10 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
      <div className="flex items-center w-full gap-4 px-6 py-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <h6 className="text-base font-playfair font-semibold text-[#332B42]">{title}</h6>
          {typeof count === 'number' && <BadgeCount count={count} />}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
};

export default SectionHeaderBar; 