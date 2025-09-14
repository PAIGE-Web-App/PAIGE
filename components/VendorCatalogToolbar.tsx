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
  filteredResultsCount?: number;
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
  onSuggestVendor,
  filteredResultsCount = 0
}: VendorCatalogToolbarProps) {
  return (
    <div className="w-full">
      {/* Filters on top */}
      <VendorCatalogFilters 
        category={category} 
        filterValues={filterValues} 
        onChange={onFilterChange} 
        vendors={vendors} 
      />
      
      {/* Search Bar full width */}
      <VendorSearchBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onClearSearch={onClearSearch}
        isSearching={isSearching}
        searchResults={searchResults}
        categorySingular={categorySingular}
        categoryLabel={categorySingular}
        onSuggestVendor={onSuggestVendor}
        filteredResultsCount={filteredResultsCount}
      />
    </div>
  );
} 