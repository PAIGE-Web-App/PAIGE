import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface BudgetMetricsProps {
  selectedCategory: any;
  totalBudget: number | null;
  totalSpent: number;
  maxBudget: number | null;
  budgetItems?: any[]; // Add budget items for pie chart
  onEditCategory?: (category: any) => void;
}

const BudgetMetrics: React.FC<BudgetMetricsProps> = ({
  selectedCategory,
  totalBudget,
  totalSpent,
  maxBudget,
  budgetItems = [],
  onEditCategory,
}) => {
  const router = useRouter();
  
  // Animation state for value updates
  const [animatingValues, setAnimatingValues] = useState<{
    categoryAllocated: boolean;
    totalBudget: boolean;
    maxBudget: boolean;
  }>({
    categoryAllocated: false,
    totalBudget: false,
    maxBudget: false,
  });
  
  // Refs to track previous values
  const prevValues = useRef({
    categoryAllocated: selectedCategory?.allocatedAmount || 0,
    totalBudget: totalBudget || 0,
    maxBudget: maxBudget || 0,
  });
  
  // Check for value changes and trigger animations
  useEffect(() => {
    const currentCategoryAllocated = selectedCategory?.allocatedAmount || 0;
    const currentTotalBudget = totalBudget || 0;
    const currentMaxBudget = maxBudget || 0;
    
    // Check if category allocated amount changed
    if (currentCategoryAllocated !== prevValues.current.categoryAllocated) {
      setAnimatingValues(prev => ({ ...prev, categoryAllocated: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, categoryAllocated: false })), 600);
      prevValues.current.categoryAllocated = currentCategoryAllocated;
    }
    
    // Check if total budget changed
    if (currentTotalBudget !== prevValues.current.totalBudget) {
      setAnimatingValues(prev => ({ ...prev, totalBudget: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, totalBudget: false })), 600);
      prevValues.current.totalBudget = currentTotalBudget;
    }
    
    // Check if max budget changed
    if (currentMaxBudget !== prevValues.current.maxBudget) {
      setAnimatingValues(prev => ({ ...prev, maxBudget: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, maxBudget: false })), 600);
      prevValues.current.maxBudget = currentMaxBudget;
    }
  }, [selectedCategory?.allocatedAmount, totalBudget, maxBudget]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDisplayAmount = (amount: number) => {
    if (amount === 0) {
      return '-';
    }
    return formatCurrency(amount);
  };

  const getBudgetStatus = () => {
    if (!maxBudget || !totalBudget) return { message: '', color: 'text-gray-600' };
    
    const percentage = (totalSpent / maxBudget) * 100;
    
    if (percentage > 100) {
      return { 
        message: `You're ${formatCurrency(totalSpent - maxBudget)} over your max budget.`, 
        color: 'text-red-600' 
      };
    } else if (percentage > 80) {
      return { 
        message: `You're approaching your max budget.`, 
        color: 'text-yellow-600' 
      };
    } else {
      return { 
        message: `You're ${formatCurrency(maxBudget - totalSpent)} under your max budget.`, 
        color: 'text-green-600' 
      };
    }
  };

  const budgetStatus = getBudgetStatus();
  const remaining = (maxBudget || 0) - totalSpent;

  return (
    <div className="bg-white border-b border-[#AB9C95]">
              {/* Budget Overview Cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-4">
        {/* Category Budget Card */}
        {selectedCategory && (
          <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 h-40 w-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-medium ${
                (selectedCategory.spentAmount || 0) > selectedCategory.allocatedAmount 
                  ? 'text-red-600' 
                  : 'text-[#AB9C95]'
              }`}>
                {selectedCategory.name}
              </h3>
              {onEditCategory && (
                <button 
                  onClick={() => onEditCategory(selectedCategory)}
                  className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
                  title="Edit category"
                >
                  <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                    ✏️
                  </span>
                </button>
              )}
            </div>
            <div className="text-lg font-bold text-[#332B42] mb-1">
              <span className={animatingValues.categoryAllocated ? 'animate-value-update' : ''}>
                {formatCurrency(selectedCategory.allocatedAmount)}
              </span>
            </div>
            <div className="text-sm text-[#AB9C95]">
              Budget allocated to this category
            </div>
            <div className="text-xs text-[#AB9C95] mt-1">
              {formatCurrency(selectedCategory.spentAmount || 0)} spent • {formatCurrency(selectedCategory.allocatedAmount - (selectedCategory.spentAmount || 0))} remaining
            </div>
          </div>
        )}
        
        {/* Category Budget Breakdown Pie Chart */}
        {selectedCategory && budgetItems.length > 0 && (
          <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 h-40 w-full">
            <h3 className="text-sm font-medium text-[#AB9C95] mb-3">Budget Breakdown</h3>
            <div className="flex items-center justify-center mb-3">
               {/* Multi-Color Doughnut Chart - Each item gets a unique color */}
               <div className="relative w-20 h-20 group">
                 {/* Background track ring - same width as doughnut segments */}
                 <svg className="absolute inset-0 w-20 h-20" viewBox="0 0 100 100">
                   <circle
                     cx="50"
                     cy="50"
                     r="42"
                     fill="none"
                     stroke={(() => {
                       const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + item.amount, 0);
                       const isOverBudget = totalBudgetAmount > selectedCategory.allocatedAmount;
                       return isOverBudget ? "#dc2626" : "#E0DBD7";
                     })()}
                     strokeWidth="7"
                   />
                 </svg>
                 
                 {/* Render each budget item as a colored segment using SVG for proper doughnut chart */}
                  {budgetItems.length > 0 && selectedCategory.allocatedAmount > 0 && (
                    <svg className="absolute inset-0 w-20 h-20" viewBox="0 0 100 100">
                      {(() => {
                        const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + item.amount, 0);
                        const isOverBudget = totalBudgetAmount > selectedCategory.allocatedAmount;
                        
                        // If over budget, show a solid red doughnut
                        if (isOverBudget) {
                          return (
                            <circle
                              cx="50"
                              cy="50"
                              r="42"
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="7"
                            />
                          );
                        }
                        
                        // Normal budget breakdown when under/at budget
                        return budgetItems.map((item, index) => {
                          const itemPercentage = (item.amount / selectedCategory.allocatedAmount) * 100;
                          const previousItemsTotal = budgetItems.slice(0, index).reduce((sum, prevItem) => 
                            sum + (prevItem.amount / selectedCategory.allocatedAmount) * 100, 0
                          );
                          const startAngle = (previousItemsTotal / 100) * 360;
                          const endAngle = ((previousItemsTotal + itemPercentage) / 100) * 360;
                          
                          // Color palette from your theme
                          const colors = [
                            '#2563eb', '#16a34a', '#9333ea', 
                            '#ea580c', '#4f46e5', '#0d9488',
                            '#db2777', '#84cc16', '#d97706', 
                            '#dc2626', '#A85C36'
                          ];
                          const color = colors[index % colors.length];
                          
                          // Calculate SVG arc path for doughnut segments (not filled pie slices)
                          const outerRadius = 42;
                          const innerRadius = 35; // Create the doughnut hole
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
                          
                          // Create doughnut segment path (not filled pie slice)
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
                        });
                      })()}
                    </svg>
                  )}
                 
                 {/* Centered percentage text - no background */}
                 <div className="absolute inset-0 flex items-center justify-center">
                   <span className={`text-sm font-medium leading-none ${
                     selectedCategory.allocatedAmount > 0 && 
                     (budgetItems.reduce((sum, item) => sum + item.amount, 0) / selectedCategory.allocatedAmount) * 100 > 100
                       ? 'text-red-500' 
                       : 'text-[#332B42]'
                   }`}>
                     {selectedCategory.allocatedAmount > 0 ? 
                       `${Math.round((budgetItems.reduce((sum, item) => sum + item.amount, 0) / selectedCategory.allocatedAmount) * 100)}%` : 
                       '0%'
                     }
                   </span>
                 </div>
                 
                 {/* Hover Tooltip with Budget Items and Colors - positioned below to avoid cutoff */}
                 <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
                   <div className="bg-[#332B42] text-white text-xs rounded-lg p-3 shadow-lg max-w-56 hover:opacity-100">
                     <div className="font-medium mb-2">Budget Items:</div>
                     <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                       {budgetItems.map((item, index) => {
                         const colors = [
                           '#2563eb', '#16a34a', '#9333ea', 
                           '#ea580c', '#4f46e5', '#0d9488',
                           '#db2777', '#84cc16', '#d97706', 
                           '#dc2626', '#A85C36'
                         ];
                         const color = colors[index % colors.length];
                         
                         return (
                           <div key={item.id} className="flex items-center justify-between min-w-0">
                             <div className="flex items-center min-w-0 flex-1">
                               <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: color }}></div>
                               <span className="truncate text-left">{item.name}</span>
                             </div>
                             <span className="text-[#A85C36] font-medium ml-2 flex-shrink-0">{formatCurrency(item.amount)}</span>
                           </div>
                         );
                       })}
                     </div>
                     <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#332B42]"></div>
                   </div>
                 </div>
               </div>
            </div>
             <div className="text-center">
               <div className="text-xs text-[#AB9C95]">
                 {(() => {
                   const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + item.amount, 0);
                   const isOverBudget = totalBudgetAmount > selectedCategory.allocatedAmount;
                   return isOverBudget ? "Over budget - hover for details" : "Hover over chart for details";
                 })()}
               </div>
             </div>
          </div>
        )}
        
        {/* Progress Bar Card */}
        <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white h-40 w-full">
          <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Budget Progress</h3>
          <div className="text-lg font-bold text-[#332B42] mb-2">
            {formatCurrency(totalSpent)} <span className="text-sm font-normal text-[#AB9C95]">Spent</span>
          </div>
          <div className="w-full bg-[#F3F2F0] rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ 
                width: `${Math.min((totalSpent / (maxBudget || 1)) * 100, 100)}%` 
              }}
            />
          </div>
          <div className="text-sm text-[#AB9C95] mb-2">
            {((totalSpent / (maxBudget || 1)) * 100).toFixed(1)}% used
          </div>
          <div className={`budget-status-text ${budgetStatus.color}`}>
            {budgetStatus.message}
          </div>
        </div>

        {/* Combined Remaining/Max Budget Card */}
        {maxBudget && (
          <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white h-40 w-full relative">
            <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Remaining Budget</h3>
            <div className="text-lg font-bold text-[#332B42] mb-1">
              <span className={animatingValues.totalBudget ? 'animate-value-update' : ''}>
                {formatCurrency(remaining)}
              </span>
            </div>
            <div className="text-xs text-[#AB9C95] mb-2">
              / {formatCurrency(maxBudget)}
            </div>
            <div className="budget-status-text text-green-600">
              On track
            </div>
            <button 
              onClick={() => router.push('/settings?tab=wedding&highlight=maxBudget')}
              className="absolute top-3 right-3 p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
              title="Update in settings"
            >
              <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                ✏️
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Budget Status - Only show helper text when no category selected */}
      {!selectedCategory && (
        <div className="text-sm text-[#AB9C95] px-4 pb-4">
          • Select a category to manage specific budget items
        </div>
      )}
    </div>
  );
};

export default BudgetMetrics; 