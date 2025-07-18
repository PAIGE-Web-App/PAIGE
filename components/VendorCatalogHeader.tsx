import React from 'react';

interface VendorCatalogHeaderProps {
  isSearching: boolean;
  searchTerm: string;
  searchResults: any[];
  loading: boolean;
  vendors: any[];
  nextPageToken: string | null;
  error: string | null;
  categoryLabel: string;
  location: string;
}

export default function VendorCatalogHeader({
  isSearching,
  searchTerm,
  searchResults,
  loading,
  vendors,
  nextPageToken,
  error,
  categoryLabel,
  location
}: VendorCatalogHeaderProps) {
  const generateTitle = () => {
    if (isSearching) {
      return `Searching for "${searchTerm}"...`;
    }
    
    if (searchResults.length > 0) {
      return `Search results for "${searchTerm}" (${searchResults.length} found)`;
    }
    
    if (searchTerm && !isSearching) {
      return `No results found for "${searchTerm}"`;
    }
    
    if (loading) {
      return `Loading ${categoryLabel}...`;
    }
    
    if (vendors.length > 0) {
      if (nextPageToken && vendors.length === 20) {
        return `20+ ${categoryLabel} in ${location || 'All Locations'}`;
      }
      return `${vendors.length} ${categoryLabel} in ${location || 'All Locations'}`;
    }
    
    if (error) {
      return `No ${categoryLabel} found`;
    }
    
    return `${categoryLabel} in ${location || 'All Locations'}`;
  };

  return (
    <h2 className="text-2xl font-playfair font-medium text-[#332B42] mb-2">
      {generateTitle()}
    </h2>
  );
} 