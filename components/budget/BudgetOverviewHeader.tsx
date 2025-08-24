import React from 'react';

interface BudgetOverviewHeaderProps {
  title: string;
  subtitle: string;
}

const BudgetOverviewHeader: React.FC<BudgetOverviewHeaderProps> = React.memo(({ title, subtitle }) => (
  <div className="p-6 border-b border-[#E0DBD7] bg-white">
    <h6 className="mb-2">{title}</h6>
    <p className="text-[#6B7280]">{subtitle}</p>
  </div>
));

BudgetOverviewHeader.displayName = 'BudgetOverviewHeader';

export default BudgetOverviewHeader;
