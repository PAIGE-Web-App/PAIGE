/**
 * VendorInstagramLink Component
 * 
 * Displays Instagram link for vendors with beautiful styling
 */

'use client';

import React from 'react';
import { Instagram } from 'lucide-react';

interface VendorInstagramLinkProps {
  handle: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'link' | 'icon';
  showHandle?: boolean;
}

export default function VendorInstagramLink({
  handle,
  size = 'md',
  variant = 'button',
  showHandle = true
}: VendorInstagramLinkProps) {
  const cleanHandle = handle.replace('@', '');
  const url = `https://www.instagram.com/${cleanHandle}`;

  const sizeClasses = {
    sm: {
      button: 'text-sm px-3 py-1.5 gap-1.5',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    md: {
      button: 'text-base px-4 py-2 gap-2',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    lg: {
      button: 'text-lg px-5 py-3 gap-2.5',
      icon: 'w-6 h-6',
      text: 'text-base'
    }
  };

  if (variant === 'icon') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white hover:opacity-90 transition-opacity p-2"
        title={`View @${cleanHandle} on Instagram`}
        aria-label={`View ${cleanHandle} on Instagram`}
      >
        <Instagram className={sizeClasses[size].icon} />
      </a>
    );
  }

  if (variant === 'link') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 text-[#A85C36] hover:underline transition-all ${sizeClasses[size].text}`}
        title={`View @${cleanHandle} on Instagram`}
      >
        <Instagram className={sizeClasses[size].icon} />
        {showHandle && <span>@{cleanHandle}</span>}
      </a>
    );
  }

  // Default button variant
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white hover:opacity-90 transition-opacity font-medium ${sizeClasses[size].button}`}
      title={`View @${cleanHandle} on Instagram`}
    >
      <Instagram className={sizeClasses[size].icon} />
      {showHandle && <span>@{cleanHandle}</span>}
    </a>
  );
}

