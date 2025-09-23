import React from 'react';
import { Info } from 'lucide-react';
import OptimizedTooltip from '../ui/OptimizedTooltip';

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
  maxWidth?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = React.memo(({
  content,
  className = "",
  iconClassName = "w-3 h-3 text-[#6B7280]",
  maxWidth = 'max-w-48'
}) => {
  return (
    <OptimizedTooltip
      content={content}
      position="top"
      maxWidth="max-w-none lg:max-w-none"
      className={className}
      tooltipClassName="whitespace-normal lg:whitespace-nowrap lg:min-w-max"
    >
      <Info className={iconClassName} />
    </OptimizedTooltip>
  );
});

InfoTooltip.displayName = 'InfoTooltip';

export default InfoTooltip;
