import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text, 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const borderWidth = 'border-[3px]';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} ${borderWidth} border-[#A85C36] border-t-transparent rounded-full animate-spin`}
      />
      {text && (
        <p className="text-[#364257] mt-4 text-center text-sm">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
