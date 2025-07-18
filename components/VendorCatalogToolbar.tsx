import React from 'react';
import VendorCatalogFilters from './VendorCatalogFilters';
import VendorSearchBar from './VendorSearchBar';

interface VendorCatalogToolbarProps {
  category: string;
  filterValues: any;
  onFilterChange: (key: string, value: any) => void;
  vendors: any[];
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  isSearching: boolean;
  searchResults: any[];
  categorySingular: string;
  bulkContactMode: boolean;
  onBulkContactToggle: () => void;
  onSuggestVendor: () => void;
}

export default function VendorCatalogToolbar({
  category,
  filterValues,
  onFilterChange,
  vendors,
  searchTerm,
  onSearchChange,
  onClearSearch,
  isSearching,
  searchResults,
  categorySingular,
  bulkContactMode,
  onBulkContactToggle,
  onSuggestVendor
}: VendorCatalogToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4 gap-2 w-full">
      {/* Filters on the left */}
      <VendorCatalogFilters 
        category={category} 
        filterValues={filterValues} 
        onChange={onFilterChange} 
        vendors={vendors} 
      />
      
      {/* Search Bar in the middle */}
      <VendorSearchBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onClearSearch={onClearSearch}
        isSearching={isSearching}
        searchResults={searchResults}
        categorySingular={categorySingular}
        categoryLabel={categorySingular}
      />
      
      {/* Action buttons on the right */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          className={`flex items-center gap-2 ${
            bulkContactMode 
              ? 'btn-primary bg-[#A85C36] text-white' 
              : 'btn-gradient-purple'
          }`}
          onClick={onBulkContactToggle}
          style={{ whiteSpace: 'nowrap' }}
        >
          {!bulkContactMode && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063A2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
            </svg>
          )}
          {bulkContactMode ? 'Cancel Bulk Contact' : 'Bulk Contact with AI'}
        </button>
        <button
          className="btn-primaryinverse flex-shrink-0"
          onClick={onSuggestVendor}
          style={{ whiteSpace: 'nowrap' }}
        >
          Suggest a {categorySingular}
        </button>
      </div>
    </div>
  );
} 