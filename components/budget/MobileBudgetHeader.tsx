import React from 'react';
import { ArrowLeft, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import DropdownMenu from '@/components/DropdownMenu';

interface MobileBudgetHeaderProps {
  selectedCategory: any;
  onMobileBackToCategories: () => void;
  onEditCategory?: (category: any) => void;
  onDeleteCategory?: (category: any) => void;
}

const MobileBudgetHeader: React.FC<MobileBudgetHeaderProps> = React.memo(({
  selectedCategory,
  onMobileBackToCategories,
  onEditCategory,
  onDeleteCategory,
}) => {
  return (
    <div className="lg:hidden sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
      <div className="flex items-center w-full gap-4 px-4 py-3">
        {/* Left: Back Button + Category Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMobileBackToCategories}
            className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h6 className="text-lg font-medium text-[#332B42] truncate">
              {selectedCategory?.name || 'Budget'}
            </h6>
          </div>
        </div>

        {/* Right: More Actions Dropdown */}
        <div className="flex-shrink-0">
          <DropdownMenu
            trigger={
              <button className="p-2 hover:bg-[#EBE3DD] rounded-[5px] transition-colors">
                <MoreHorizontal className="w-4 h-4 text-[#AB9C95]" />
              </button>
            }
            items={[
              {
                label: 'Edit Category',
                icon: <Edit className="w-4 h-4" />,
                onClick: () => onEditCategory?.(selectedCategory),
                show: onEditCategory && selectedCategory,
              },
              {
                label: 'Delete Category',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => onDeleteCategory?.(selectedCategory),
                show: onDeleteCategory && selectedCategory,
                className: 'text-red-600 hover:text-red-700',
              },
            ].filter(item => item.show !== false)}
            align="right"
          />
        </div>
      </div>
    </div>
  );
});

MobileBudgetHeader.displayName = 'MobileBudgetHeader';

export default MobileBudgetHeader;
