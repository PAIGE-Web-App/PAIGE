import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-[#7A7A7A] mb-6">
      <Link 
        href="/seating-charts" 
        className="flex items-center gap-1 hover:text-[#A85C36] transition-colors"
      >
        <Home size={16} />
        Seating Charts
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={16} />
          {item.href && !item.isCurrent ? (
            <Link 
              href={item.href}
              className="hover:text-[#A85C36] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={item.isCurrent ? 'text-[#332B42] font-medium' : ''}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
