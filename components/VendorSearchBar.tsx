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
}

export default function VendorSearchBar({
  searchTerm,
  onSearchChange,
  onClearSearch,
  isSearching,
  searchResults,
  categorySingular,
  categoryLabel
}: VendorSearchBarProps) {
  return (
    <div className={`relative flex-1 max-w-md ${searchResults.length > 0 ? 'bg-blue-50 p-2 rounded-lg border border-blue-200' : ''}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={`Search for specific ${categorySingular.toLowerCase()}...`}
          className="w-full border border-[#AB9C95] px-4 py-1 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] pl-10 pr-10 h-8"
        />
        {searchTerm && (
          <button
            onClick={onClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      {searchTerm && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-600">
            {isSearching 
              ? 'Searching...' 
              : searchResults.length > 0 
                ? `Found ${searchResults.length} results` 
                : 'No results found. Try a different search term.'
            }
          </p>
          {searchResults.length > 0 && (
            <button 
              onClick={onClearSearch}
              className="text-xs text-[#A85C36] hover:underline"
            >
              Back to all {categoryLabel.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
} 