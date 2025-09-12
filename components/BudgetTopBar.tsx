import React, { useState } from 'react';
import { MoreHorizontal, Plus, Trash2, Edit, Search } from 'lucide-react';
import DropdownMenu from '@/components/DropdownMenu';
import SearchBar from '@/components/SearchBar';

interface BudgetTopBarProps {
  selectedCategory: any;
  budgetSearchQuery: string;
  setBudgetSearchQuery: (val: string) => void;
  onAddItem: () => void;
  onEditCategory?: (category: any) => void;
  onDeleteCategory?: (category: any) => void;
}

const BudgetTopBar: React.FC<BudgetTopBarProps> = ({
  selectedCategory,
  budgetSearchQuery,
  setBudgetSearchQuery,
  onAddItem,
  onEditCategory,
  onDeleteCategory,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  React.useEffect(() => {
    if (!searchOpen) return;
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
    <div className="hidden lg:block sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
      <div className="flex items-center w-full gap-4 px-4 py-3">
        {/* Left: Category Name and Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Category Name */}
          <div className="flex-1 min-w-0">
            <h6 className="text-lg font-medium text-[#332B42] truncate">
              {selectedCategory?.name || 'Budget'}
            </h6>
          </div>
          
          {/* Search - Only show when category is selected */}
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
        </div>

        {/* Right: Action Buttons */}
        <div className="flex-shrink-0 flex justify-end items-center gap-3">
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
};

export default BudgetTopBar;