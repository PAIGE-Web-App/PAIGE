import React from 'react';

interface BudgetItem {
  id: string;
  amount: number;
  name: string;
}

interface BudgetDoughnutChartProps {
  budgetItems: BudgetItem[];
  allocatedAmount: number;
  className?: string;
}

export const BudgetDoughnutChart: React.FC<BudgetDoughnutChartProps> = ({
  budgetItems,
  allocatedAmount,
  className = ''
}) => {
  const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const isOverBudget = totalBudgetAmount > allocatedAmount;
  const percentage = allocatedAmount > 0 ? (totalBudgetAmount / allocatedAmount) * 100 : 0;

  // Color palette from theme
  const colors = [
    '#2563eb', '#16a34a', '#9333ea',
    '#ea580c', '#4f46e5', '#0d9488',
    '#db2777', '#84cc16', '#d97706',
    '#dc2626', '#A85C36'
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Background track circle */}
      <svg className="w-20 h-20" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={isOverBudget ? "#dc2626" : "#E0DBD7"}
          strokeWidth="7"
        />
        
        {/* Budget items segments or over-budget indicator */}
        {budgetItems.length > 0 && allocatedAmount > 0 && (
          <>
            {isOverBudget ? (
              // If over budget, show a solid red doughnut
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#dc2626"
                strokeWidth="7"
              />
            ) : (
              // Normal budget breakdown when under/at budget
              budgetItems.map((item, index) => {
                const itemPercentage = (item.amount / allocatedAmount) * 100;
                const previousItemsTotal = budgetItems.slice(0, index).reduce((sum, prevItem) =>
                  sum + (prevItem.amount / allocatedAmount) * 100, 0
                );
                const startAngle = (previousItemsTotal / 100) * 360;
                const endAngle = ((previousItemsTotal + itemPercentage) / 100) * 360;

                const color = colors[index % colors.length];

                // Calculate SVG arc path for doughnut segments
                const outerRadius = 42;
                const innerRadius = 35;
                const centerX = 50;
                const centerY = 50;

                const startRadians = (startAngle - 90) * Math.PI / 180;
                const endRadians = (endAngle - 90) * Math.PI / 180;

                // Calculate outer arc points
                const x1Outer = centerX + outerRadius * Math.cos(startRadians);
                const y1Outer = centerY + outerRadius * Math.sin(startRadians);
                const x2Outer = centerX + outerRadius * Math.cos(endRadians);
                const y2Outer = centerY + outerRadius * Math.sin(endRadians);

                // Calculate inner arc points
                const x1Inner = centerX + innerRadius * Math.cos(startRadians);
                const y1Inner = centerY + innerRadius * Math.sin(startRadians);
                const x2Inner = centerX + innerRadius * Math.cos(endRadians);
                const y2Inner = centerY + innerRadius * Math.sin(endRadians);

                const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

                // Create doughnut segment path
                const pathData = [
                  `M ${x1Outer} ${y1Outer}`,
                  `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
                  `L ${x2Inner} ${y2Inner}`,
                  `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
                  'Z'
                ].join(' ');

                return (
                  <path
                    key={item.id}
                    d={pathData}
                    fill={color}
                    stroke="none"
                  />
                );
              })
            )}
          </>
        )}
      </svg>

      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`text-lg font-bold ${isOverBudget ? 'text-red-500' : 'text-[#332B42]'}`}>
          {Math.round(percentage)}%
        </div>
      </div>

      {/* Helper text */}
      <div className="text-center mt-2">
        <div className="text-xs text-[#AB9C95]">
          {isOverBudget ? "Over budget - hover for details" : "Hover over chart for details"}
        </div>
      </div>

      {/* Hover tooltip */}
      <div className="group relative">
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-30">
          <div className="bg-[#332B42] text-white text-xs rounded-lg p-3 max-w-56 shadow-lg">
            <div className="max-h-32 overflow-y-auto">
              {budgetItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 mb-1 last:mb-0">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="truncate">{item.name}</span>
                  <span className="text-[#AB9C95] ml-auto">
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#332B42]"></div>
        </div>
      </div>
    </div>
  );
};
