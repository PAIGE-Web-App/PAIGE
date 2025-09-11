import React, { useRef, useEffect } from 'react';
import { ListFilter } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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

  // Click-outside logic - matches main page logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside filter popover AND not on filter button
      const isFilterButton = (event.target as Element)?.closest('button[aria-label="Toggle Filters"]');
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node) && !isFilterButton) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
        onClick={(e) => {
          e.stopPropagation();
          setShowFilters(!showFilters);
        }}
        className="flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1 z-40 flex-shrink-0"
        aria-label="Toggle Filters"
        type="button"
      >
        <ListFilter className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {showFilters && (
          <motion.div
            ref={filterPopoverRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 min-w-[250px] space-y-3"
          >
            <div>
              <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Category</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <label key={category} className="flex items-center text-xs text-[#332B42] cursor-pointer">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterButtonPopover; 