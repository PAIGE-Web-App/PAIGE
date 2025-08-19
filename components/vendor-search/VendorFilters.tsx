import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { VendorCategory } from '@/types/vendor';
import SelectField from '@/components/SelectField';

interface VendorFiltersProps {
  category: string;
  setCategory: (category: string) => void;
  location: string;
  setLocation: (location: string) => void;
  priceRange: { min: string; max: string };
  setPriceRange: (range: { min: string; max: string }) => void;
  rating: number;
  setRating: (rating: number) => void;
  distance: number;
  setDistance: (distance: number) => void;
  expandedFilters: { price: boolean; rating: boolean; distance: boolean };
  setExpandedFilters: (filters: { price: boolean; rating: boolean; distance: boolean }) => void;
  categories: VendorCategory[];
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function VendorFilters({
  category,
  setCategory,
  location,
  setLocation,
  priceRange,
  setPriceRange,
  rating,
  setRating,
  distance,
  setDistance,
  expandedFilters,
  setExpandedFilters,
  categories,
  isCollapsed: externalCollapsed,
  onToggleCollapse
}: VendorFiltersProps) {
  const { weddingLocation } = useUserProfileData();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setIsCollapsed = onToggleCollapse || setInternalCollapsed;



  return (
    <div className={`${isCollapsed ? 'bg-transparent' : 'bg-white'} border border-[#AB9C95] rounded-[5px] h-full flex flex-col transition-colors duration-300`}>
      {/* Collapsed State - Just Filter Icon */}
      {isCollapsed && (
        <div className="p-4 flex-shrink-0">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center hover:bg-[#F3F2F0] rounded transition-colors"
          >
            <Filter size={20} className="text-[#A85C36]" />
          </button>
        </div>
      )}
      
      <div className={`p-4 flex-1 transition-all duration-300 ease-in-out relative ${isCollapsed ? 'h-0 opacity-0 overflow-hidden pointer-events-none' : 'h-auto opacity-100'}`}>
        <h5 className="h5 mb-4 flex items-center gap-2">
          <Filter size={18} className="text-[#A85C36]" />
          Search Filters
        </h5>
        
        {/* Category */}
        <div className="mb-6">
          <SelectField
            label="Category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categories.map(cat => ({ value: cat.value, label: cat.label }))}
          />
        </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[#332B42]">Location</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter city, state, or zip"
            className="w-full border pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
          />
          <a
            href="/settings?tab=wedding&highlight=weddingLocation"
            className="text-xs text-[#A85C36] underline mt-1 inline-block hover:text-[#784528] transition-colors"
          >
            Update default location
          </a>
        </label>
      </div>

      {/* Distance */}
      <div className="mb-6">
        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#332B42]">Distance</span>
            <button
              onClick={() => setExpandedFilters({ ...expandedFilters, distance: !expandedFilters.distance })}
              className="text-[#A85C36] hover:text-[#784528] hover:bg-[#F3F2F0] p-1 rounded transition-colors"
            >
              {expandedFilters.distance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          {expandedFilters.distance && (
            <select
              value={distance}
              onChange={(e) => setDistance(parseInt(e.target.value))}
              className="w-full border pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
              <option value={100}>100 miles</option>
            </select>
          )}
        </label>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#332B42]">Price Range</span>
            <button
              onClick={() => setExpandedFilters({ ...expandedFilters, price: !expandedFilters.price })}
              className="text-[#A85C36] hover:text-[#784528] hover:bg-[#F3F2F0] p-1 rounded transition-colors"
            >
              {expandedFilters.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          {expandedFilters.price && (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                className="flex-1 border pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                className="flex-1 border pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
              />
            </div>
          )}
        </label>
      </div>

      {/* Rating Filter */}
      <div className="mb-6">
        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#332B42]">Minimum Rating</span>
            <button
              onClick={() => setExpandedFilters({ ...expandedFilters, rating: !expandedFilters.rating })}
              className="text-[#A85C36] hover:text-[#784528] hover:bg-[#F3F2F0] p-1 rounded transition-colors"
            >
              {expandedFilters.rating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          {expandedFilters.rating && (
            <div className="space-y-2">
              {[4, 4.5, 5].map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer hover:bg-[#F3F2F0] p-2 rounded transition-colors">
                  <input
                    type="radio"
                    name="rating"
                    value={r}
                    checked={rating === r}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="text-[#A85C36]"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[#332B42]">{r}+</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < r ? "text-yellow-400 fill-current" : "text-gray-300"}
                        />
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </label>
      </div>
      </div>
      
      {/* Collapsible Toggle Button */}
      <div className="border-t border-[#AB9C95] p-3 flex-shrink-0 group">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 text-sm text-[#A85C36] hover:text-[#784528] transition-colors py-2"
        >
          {isCollapsed ? (
            <>
              <ChevronRight size={16} />
              <span className="hidden group-hover:inline text-xs">Expand</span>
            </>
          ) : (
            <>
              <ChevronLeft size={16} />
              <span className="hidden group-hover:inline text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
