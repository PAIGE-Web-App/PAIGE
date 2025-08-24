import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center text-xs text-[#A85C36] ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-2 text-[#AB9C95]">/</span>}
          {item.href && !item.isCurrent ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : item.onClick && !item.isCurrent ? (
            <button
              onClick={item.onClick}
              className="hover:underline cursor-pointer text-[#A85C36]"
            >
              {item.label}
            </button>
          ) : (
            <span className={item.isCurrent ? 'text-[#332B42] font-medium' : ''}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
} 