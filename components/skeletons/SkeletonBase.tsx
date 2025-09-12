import React from 'react';

interface SkeletonBaseProps {
  className?: string;
  children: React.ReactNode;
}

export const SkeletonBase: React.FC<SkeletonBaseProps> = ({ className = '', children }) => (
  <div className={`animate-pulse ${className}`}>
    {children}
  </div>
);

// Standard skeleton elements
export const SkeletonText: React.FC<{ 
  className?: string; 
  lines?: number;
  width?: string;
}> = ({ className = '', lines = 1, width = 'w-24' }) => (
  <div className="space-y-1">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-4 bg-[#F3F2F0] rounded ${width} ${className}`}
        style={{ 
          width: i === lines - 1 ? '75%' : '100%' // Last line shorter
        }}
      />
    ))}
  </div>
);

export const SkeletonTitle: React.FC<{ 
  className?: string; 
  width?: string;
}> = ({ className = '', width = 'w-32' }) => (
  <div className={`h-5 bg-[#F3F2F0] rounded ${width} ${className}`} />
);

export const SkeletonSubtitle: React.FC<{ 
  className?: string; 
  width?: string;
}> = ({ className = '', width = 'w-24' }) => (
  <div className={`h-4 bg-[#F3F2F0] rounded ${width} ${className}`} />
);

export const SkeletonButton: React.FC<{ 
  className?: string; 
  width?: string;
  height?: string;
}> = ({ className = '', width = 'w-20', height = 'h-8' }) => (
  <div className={`${height} bg-[#F3F2F0] rounded ${width} ${className}`} />
);

export const SkeletonCard: React.FC<{ 
  className?: string; 
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`bg-white border border-[#E0DBD7] rounded-[5px] p-4 ${className}`}>
    {children}
  </div>
);

export const SkeletonProgressBar: React.FC<{ 
  className?: string; 
  width?: string;
}> = ({ className = '', width = 'w-full' }) => (
  <div className={`h-2 bg-[#E0DBD7] rounded-full ${width} ${className}`}>
    <div className="h-2 bg-[#F3F2F0] rounded-full w-3/4" />
  </div>
);

export const SkeletonAvatar: React.FC<{ 
  className?: string; 
  size?: 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={`${sizeClasses[size]} bg-[#F3F2F0] rounded-full ${className}`} />
  );
};

export const SkeletonIcon: React.FC<{ 
  className?: string; 
  size?: 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  return (
    <div className={`${sizeClasses[size]} bg-[#F3F2F0] rounded ${className}`} />
  );
};
