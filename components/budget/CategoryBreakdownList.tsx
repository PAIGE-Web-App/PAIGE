import React from 'react';

interface CategoryBreakdownItem {
  id?: string;
  name: string;
  color?: string;
  spent: number;
  allocatedAmount: number;
  remaining: number;
  utilization: number;
  itemCount: number;
  isOverBudget: boolean;
}

interface CategoryBreakdownListProps {
  categories: CategoryBreakdownItem[];
  formatCurrency: (amount: number) => string;
}

const CategoryBreakdownList: React.FC<CategoryBreakdownListProps> = React.memo(({ categories, formatCurrency }) => (
  <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
    {categories.map((category) => (
      <div key={category.id} className="border-b border-[#F3F2F0] pb-3 last:border-b-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color || '#A85C36' }}
            />
            <span className="font-medium text-[#332B42]">{category.name}</span>
          </div>
          <span className="text-sm text-[#6B7280]">
            {formatCurrency(category.spent)} / {formatCurrency(category.allocatedAmount)}
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 mr-3">
            <div className="w-full bg-[#E0DBD7] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  category.isOverBudget ? 'bg-red-500' : 'bg-[#A85C36]'
                }`}
                style={{ width: `${Math.min(category.utilization, 100)}%` }}
              />
            </div>
          </div>
          <span className={`text-xs ${
            category.isOverBudget ? 'text-red-600' : 'text-[#6B7280]'
          }`}>
            {category.utilization.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-[#6B7280]">
          <span>
            {category.itemCount} item{category.itemCount !== 1 ? 's' : ''}
          </span>
          <span>
            {category.remaining >= 0 
              ? `${formatCurrency(category.remaining)} remaining`
              : `${formatCurrency(Math.abs(category.remaining))} over`
            }
          </span>
        </div>
      </div>
    ))}
  </div>
));

CategoryBreakdownList.displayName = 'CategoryBreakdownList';

export default CategoryBreakdownList;
