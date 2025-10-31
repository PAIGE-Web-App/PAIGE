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
    const baseClasses = `absolute px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity duration-200 pointer-events-none z-10 ${maxWidth} whitespace-normal lg:whitespace-nowrap lg:min-w-max ${tooltipClassName}`;
    
    const positionClasses = {
      top: 'bottom-full right-0 mb-2 lg:left-1/2 lg:transform lg:-translate-x-1/2',
      bottom: 'top-full right-0 mt-2 lg:left-1/2 lg:transform lg:-translate-x-1/2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };

    return `${baseClasses} ${positionClasses[position]}`;
  }, [position, maxWidth, tooltipClassName]);

  const arrowClasses = useMemo(() => {
    const baseArrow = 'absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent';
    
    const arrowPositions = {
      top: 'top-full right-4 border-t-gray-900 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:right-auto',
      bottom: 'bottom-full right-4 border-b-gray-900 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:right-auto',
      left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900',
      right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900'
    };

    return `${baseArrow} ${arrowPositions[position]}`;
  }, [position]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(prev => !prev);
  }, []);

  return (
    <div 
      className={`group relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      <div className={`${tooltipClasses} ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {content}
        <div className={arrowClasses}></div>
      </div>
    </div>
  );
});

OptimizedTooltip.displayName = 'OptimizedTooltip';

export default OptimizedTooltip;
