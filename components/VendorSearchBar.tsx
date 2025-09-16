import React from 'react';
import { Search, X } from 'lucide-react';

interface VendorSearchBarProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  isSearching: boolean;
  searchResults: any[];
  categorySingular: string;
  categoryLabel: string;
  onSuggestVendor: () => void;
  filteredResultsCount?: number;
}

export default function VendorSearchBar({
  searchTerm,
  onSearchChange,
  onClearSearch,
  isSearching,
  searchResults,
  categorySingular,
  categoryLabel,
  onSuggestVendor,
  filteredResultsCount = 0
}: VendorSearchBarProps) {
  return (
    <div className="w-full">
      <div className="relative">
        <Search className="w-4 h-4 text-[#364257] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={`Search for specific ${categorySingular}...`}
          className="pl-12 pr-9 w-full h-8 border border-[#E0DBD7] rounded-[5px] bg-white text-base focus:outline-none focus:border-[#A85C36] transition-all duration-300"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
        />
        {searchTerm && (
          <button
            onClick={onClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#364257] hover:text-[#A85C36] transition-opacity duration-200 opacity-100"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {searchTerm && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-600">
            {isSearching 
              ? `Searching for "${searchTerm}"...`
              : filteredResultsCount > 0 
                ? `Found ${filteredResultsCount} results` 
                : 'No results found. Try a different search term.'
            }
          </p>
          {filteredResultsCount > 0 && (
            <button 
              onClick={onClearSearch}
              className="text-xs text-[#A85C36] hover:underline"
            >
              Back to all {categoryLabel}
            </button>
          )}
        </div>
      )}
      <div className="mt-2">
        <button 
          onClick={onSuggestVendor}
          className="text-xs text-[#A85C36] hover:underline"
        >
          Unable to find {categorySingular}? Suggest a new one
        </button>
      </div>
    </div>
  );
} 