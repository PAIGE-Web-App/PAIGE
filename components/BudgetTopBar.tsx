import React, { useState } from 'react';
import { Search, MoreHorizontal, Plus, Trash2, ArrowLeft, Edit } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import DropdownMenu from '@/components/DropdownMenu';

interface BudgetTopBarProps {
  selectedCategory: any;
  budgetSearchQuery: string;
  setBudgetSearchQuery: (val: string) => void;
  onAddItem: () => void;
  onEditCategory?: (category: any) => void;
  onDeleteCategory?: (category: any) => void;
  onMobileBackToCategories?: () => void;
}

const BudgetTopBar: React.FC<BudgetTopBarProps> = ({
  selectedCategory,
  budgetSearchQuery,
  setBudgetSearchQuery,
  onAddItem,
  onEditCategory,
  onDeleteCategory,
  onMobileBackToCategories,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchOpen &&
        searchInputRef.current &&
        !(searchInputRef.current.parentElement?.contains(event.target as Node))
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  return (
    <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
      <div className="flex items-center w-full gap-4 px-4 py-3">
        {/* Left: Mobile Back Button + Category Name and Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile Back Button */}
          {onMobileBackToCategories && (
            <button
              onClick={onMobileBackToCategories}
              className="lg:hidden p-1 hover:bg-[#EBE3DD] rounded-[5px] mr-1"
              aria-label="Back to categories"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          
          <div className="flex items-center">
            <h6 className="text-base font-playfair font-semibold text-[#332B42]">
              {selectedCategory ? selectedCategory.name : 'Wedding Budget'}
            </h6>
          </div>
          
        </div>

        {/* Center: Search and Filter - Only show when category is selected */}
        {selectedCategory && (
          <div className={`flex items-center transition-all duration-300 gap-3 ${searchOpen ? 'flex-grow min-w-0' : 'w-[32px] min-w-[32px]'}`} style={{ height: '32px' }}>
            <SearchBar
              value={budgetSearchQuery}
              onChange={setBudgetSearchQuery}
              placeholder="Search budget items..."
              isOpen={searchOpen}
              setIsOpen={setSearchOpen}
            />
          </div>
        )}

        {/* Right: Action Buttons - Consolidated */}
        <div className="flex-shrink-0 flex justify-end items-center gap-3 ml-auto">

          {/* Primary Action - Add Item when category selected */}
          {selectedCategory && (
            <button className="btn-primary flex items-center gap-2" onClick={onAddItem}>
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}

          {/* More Actions Dropdown */}
          <DropdownMenu
            trigger={
              <button className="p-2 hover:bg-[#EBE3DD] rounded-[5px] transition-colors">
                <MoreHorizontal className="w-4 h-4 text-[#AB9C95]" />
              </button>
            }
            items={[
              {
                label: 'Add Budget Item',
                icon: <Plus className="w-4 h-4" />,
                onClick: onAddItem,
                show: selectedCategory, // Only show in dropdown when category selected
              },
              {
                label: 'Edit Category',
                icon: <Edit className="w-4 h-4" />,
                onClick: () => onEditCategory?.(selectedCategory),
                show: selectedCategory, // Only show when category selected
              },
              {
                label: 'Delete Category',
                icon: <Trash2 className="w-4 h-4 text-red-500" />,
                onClick: () => onDeleteCategory?.(selectedCategory),
                show: selectedCategory, // Only show when category selected
                className: 'text-red-500 hover:text-red-600',
              },
            ].filter(item => item.show !== false)}
          />
        </div>
      </div>
    </div>
  );
};

export default BudgetTopBar; 