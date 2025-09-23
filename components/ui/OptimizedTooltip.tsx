import React, { useState, useCallback, useMemo } from 'react';
import { Info } from 'lucide-react';

interface OptimizedTooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
  tooltipClassName?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
}

const OptimizedTooltip: React.FC<OptimizedTooltipProps> = React.memo(({
  content,
  children,
  className = "",
  iconClassName = "w-3 h-3 text-[#6B7280]",
  tooltipClassName = "",
  position = 'top',
  maxWidth = 'max-w-48'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const tooltipClasses = useMemo(() => {
    const baseClasses = `absolute px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity duration-200 pointer-events-none z-10 ${maxWidth} text-center whitespace-normal lg:whitespace-nowrap lg:min-w-max ${tooltipClassName}`;
    
    const positionClasses = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };

    return `${baseClasses} ${positionClasses[position]}`;
  }, [position, maxWidth, tooltipClassName]);

  const arrowClasses = useMemo(() => {
    const baseArrow = 'absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent';
    
    const arrowPositions = {
      top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900',
      left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900',
      right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900'
    };

    return `${baseArrow} ${arrowPositions[position]}`;
  }, [position]);

  return (
    <div 
      className={`group relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div className={`${tooltipClasses} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        {content}
        <div className={arrowClasses}></div>
      </div>
    </div>
  );
});

OptimizedTooltip.displayName = 'OptimizedTooltip';

export default OptimizedTooltip;
