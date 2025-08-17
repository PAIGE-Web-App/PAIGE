import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue';
}

export default function NotificationBadge({ 
  count, 
  className = '', 
  size = 'md',
  color = 'red'
}: NotificationBadgeProps) {
  if (count === 0) return null;

  const sizeClasses = {
    sm: 'w-4 h-3 text-[10px] px-1',
    md: 'w-5 h-4 text-[10px] px-1',
    lg: 'w-6 h-5 text-xs px-1'
  };

  const colorClasses = {
    red: 'bg-red-500',
    blue: 'bg-blue-500'
  };

  return (
    <div 
      className={`absolute -top-1 -right-1 ${colorClasses[color]} rounded-full flex items-center justify-center text-white font-medium ${sizeClasses[size]} ${className}`}
    >
      <span className="leading-none">
        {count > 9 ? '9+' : count}
      </span>
    </div>
  );
} 