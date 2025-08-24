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
  onSelectCategory: (category: CategoryBreakdownItem) => void;
}

const CategoryBreakdownList: React.FC<CategoryBreakdownListProps> = React.memo(({ categories, formatCurrency, onSelectCategory }) => (
  <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
    {categories.map((category) => (
      <div 
        key={category.id} 
        className="border-b border-[#F3F2F0] pb-3 last:border-b-0 cursor-pointer hover:bg-[#F8F6F4] transition-colors duration-200 rounded-[5px] p-3"
        onClick={() => category.id && onSelectCategory(category)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            category.id && onSelectCategory(category);
          }
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: category.color || '#3B82F6' }}
            />
            <span className="font-medium text-[#332B42]">{category.name}</span>
          </div>
          <span className="text-sm text-gray-500">
            {formatCurrency(category.spent)} / {formatCurrency(category.allocatedAmount)}
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 mr-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  category.isOverBudget ? 'bg-red-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(category.utilization, 100)}%` }}
              />
            </div>
          </div>
          <span className={`text-xs ${
            category.isOverBudget ? 'text-red-600' : 'text-gray-600'
          }`}>
            {category.utilization.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
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
