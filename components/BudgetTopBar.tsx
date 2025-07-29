import React, { useState } from 'react';
import { Search, Sparkles, Upload, Grid, List, MoreHorizontal, Plus } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import DropdownMenu from '@/components/DropdownMenu';

interface BudgetTopBarProps {
  selectedCategory: any;
  budgetSearchQuery: string;
  setBudgetSearchQuery: (val: string) => void;
  onShowAIAssistant: () => void;
  onShowCSVUpload: () => void;
  onAddItem: () => void;
  onEditCategory?: (category: any) => void;
  onDeleteCategory?: (category: any) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
}

const BudgetTopBar: React.FC<BudgetTopBarProps> = ({
  selectedCategory,
  budgetSearchQuery,
  setBudgetSearchQuery,
  onShowAIAssistant,
  onShowCSVUpload,
  onAddItem,
  onEditCategory,
  onDeleteCategory,
  viewMode,
  onViewModeChange,
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
        {/* Left: Category Name and Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center">
            <h6 className="text-base font-playfair font-semibold text-[#332B42]">
              {selectedCategory ? selectedCategory.name : 'Wedding Budget'}
            </h6>
          </div>
          
          {/* Action Buttons */}
          {selectedCategory && (
            <>
              {onEditCategory && (
                <button
                  onClick={() => onEditCategory(selectedCategory)}
                  className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                  title="Edit Category"
                >
                  <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                    ✏️
                  </span>
                </button>
              )}
              {onDeleteCategory && (
                <button
                  onClick={() => onDeleteCategory(selectedCategory)}
                  className="p-1 hover:bg-[#FDEAEA] rounded-[5px]"
                  title="Delete Category"
                >
                  <span className="inline-block align-middle text-[#D63030]">
                    🗑️
                  </span>
                </button>
              )}
              {/* Vertical divider */}
              <div className="h-6 border-l border-[#D6D3D1] mx-2" />
            </>
          )}
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
          {/* View Toggle - Only show when category is selected */}
          {selectedCategory && (
            <div className="flex rounded-full border border-gray-400 overflow-hidden" style={{ height: 32 }}>
              <button
                className={`flex items-center justify-center px-2 transition-colors duration-150 ${
                  viewMode === 'table' ? 'bg-[#EBE3DD]' : 'bg-white'
                } border-r border-gray-300`}
                style={{ outline: 'none' }}
                onClick={() => onViewModeChange('table')}
                type="button"
                title="Table View"
              >
                <List size={18} stroke={viewMode === 'table' ? '#A85C36' : '#364257'} />
              </button>
              <button
                className={`flex items-center justify-center px-2 transition-colors duration-150 ${
                  viewMode === 'cards' ? 'bg-[#EBE3DD]' : 'bg-white'
                }`}
                style={{ outline: 'none' }}
                onClick={() => onViewModeChange('cards')}
                type="button"
                title="Card View"
              >
                <Grid size={18} stroke={viewMode === 'cards' ? '#A85C36' : '#364257'} />
              </button>
            </div>
          )}

          {/* Primary Action - Add Item when category selected, AI Assistant when not */}
          {selectedCategory ? (
            <button className="btn-primary flex items-center gap-2" onClick={onAddItem}>
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          ) : (
            <button
              onClick={onShowAIAssistant}
              className="btn-gradient-purple flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
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
                label: 'Add with AI',
                icon: <Sparkles className="w-4 h-4" />,
                onClick: onShowAIAssistant,
                show: !selectedCategory, // Only show in dropdown when no category selected
              },
              {
                label: 'AI Assistant',
                icon: <Sparkles className="w-4 h-4" />,
                onClick: onShowAIAssistant,
                show: selectedCategory, // Show in dropdown when category selected
              },
              {
                label: 'Import CSV',
                icon: <Upload className="w-4 h-4" />,
                onClick: onShowCSVUpload,
              },
              {
                label: 'Add Budget Item',
                icon: <Plus className="w-4 h-4" />,
                onClick: onAddItem,
                show: selectedCategory, // Only show in dropdown when category selected
              },
            ].filter(item => item.show !== false)}
          />
        </div>
      </div>
    </div>
  );
};

export default BudgetTopBar; 