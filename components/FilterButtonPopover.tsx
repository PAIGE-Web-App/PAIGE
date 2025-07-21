import React, { useRef, useEffect } from 'react';
import { ListFilter } from 'lucide-react';

interface FilterButtonPopoverProps {
  categories: string[];
  selectedCategories: string[];
  onSelectCategories: (cats: string[]) => void;
  showFilters: boolean;
  setShowFilters: (open: boolean) => void;
}

const FilterButtonPopover: React.FC<FilterButtonPopoverProps> = ({
  categories,
  selectedCategories,
  onSelectCategories,
  showFilters,
  setShowFilters,
}) => {
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFilters) return;
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, setShowFilters]);

  const handleCheckbox = (category: string) => {
    if (selectedCategories.includes(category)) {
      onSelectCategories(selectedCategories.filter((c) => c !== category));
    } else {
      onSelectCategories([...selectedCategories, category]);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1 z-10 flex-shrink-0"
        aria-label="Toggle Filter"
        type="button"
      >
        <ListFilter className="w-4 h-4" />
      </button>
      {showFilters && (
        <div
          ref={filterPopoverRef}
          className="absolute mt-2 right-0 p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 space-y-3"
          style={{ top: '100%', minWidth: 300, maxWidth: '90vw', width: 300 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#332B42]">Filter by Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category, i) => (
              <label key={`${category}-${i}`} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => handleCheckbox(category)}
                  className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                />
                {category}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterButtonPopover; 