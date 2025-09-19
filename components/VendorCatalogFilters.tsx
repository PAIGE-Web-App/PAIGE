import React, { useState, useEffect } from 'react';
import { useEdgeConfig } from '@/hooks/useEdgeConfig';

const DISTANCE_OPTIONS = [
  { label: 'Within 5 miles', value: 5 },
  { label: 'Within 10 miles', value: 10 },
  { label: 'Within 20 miles', value: 20 },
  { label: 'Within 50 miles', value: 50 }
];

const DEFAULT_FILTERS = [
  // Distance and rating filters temporarily hidden
  // { key: 'distance', label: 'Distance', type: 'dropdown', options: DISTANCE_OPTIONS },
  // { key: 'rating', label: 'Rating', type: 'dropdown', options: ['Any', '4+', '4.5+', '5'] }
];

// Price filter removed - not functional

// Fallback category filters (used if Edge Config fails)
const FALLBACK_CATEGORY_FILTERS = {
  restaurant: [
    { key: 'cuisine', label: 'Cuisine', type: 'dropdown', options: ['American', 'Italian', 'French', 'Asian', 'Mexican', 'Other'] }
  ],
  // Only include filters that actually work
};

function DropdownFilter({ filter, value, onChange }) {
  return (
    <label className="flex flex-col text-xs text-[#332B42]">
      {filter.label}
      <select
        className="border rounded px-2 py-1 mt-1"
        value={value || ''}
        onChange={e => onChange(filter.key, e.target.value)}
      >
        <option value="">Any</option>
        {filter.options.map(opt => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>{label}</option>
          );
        })}
      </select>
    </label>
  );
}

function ToggleFilter({ filter, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-[#332B42]">
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(filter.key, e.target.checked)}
        className="form-checkbox rounded border-[#AB9C95] text-[#A85C36]"
      />
      {filter.label}
    </label>
  );
}

function SliderFilter({ filter, value, onChange }) {
  return (
    <label className="flex flex-col text-xs text-[#332B42] min-w-[120px]">
      {filter.label}
      <input
        type="range"
        min={filter.min}
        max={filter.max}
        step={filter.step}
        value={value || filter.min}
        onChange={e => onChange(filter.key, Number(e.target.value))}
        className="w-full mt-1"
      />
      <span className="text-[10px] mt-1">{value || filter.min} {filter.unit}</span>
    </label>
  );
}

function MultiSelectFilter({ filter, value, onChange }) {
  const selected = value || [];
  return (
    <label className="flex flex-col text-xs text-[#332B42]">
      {filter.label}
      <div className="flex flex-wrap gap-1 mt-1">
        {filter.options.map(opt => (
          <button
            key={opt}
            type="button"
            className={`border rounded px-2 py-1 text-xs ${selected.includes(opt) ? 'bg-[#A85C36] text-white' : 'bg-[#F8F6F4] text-[#332B42]'}`}
            onClick={() => {
              if (selected.includes(opt)) {
                onChange(filter.key, selected.filter(v => v !== opt));
              } else {
                onChange(filter.key, [...selected, opt]);
              }
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </label>
  );
}

export default function VendorCatalogFilters({ category, filterValues, onChange, vendors }) {
  const { getConfig } = useEdgeConfig();
  const [categoryFilters, setCategoryFilters] = useState(FALLBACK_CATEGORY_FILTERS);
  
  // Load category filters from Edge Config with fallback
  useEffect(() => {
    const loadCategoryFilters = async () => {
      try {
        const edgeFilters = await getConfig('categoryFilters', FALLBACK_CATEGORY_FILTERS);
        setCategoryFilters(edgeFilters);
      } catch (error) {
        console.warn('Failed to load category filters from Edge Config, using fallback:', error);
        setCategoryFilters(FALLBACK_CATEGORY_FILTERS);
      }
    };
    
    loadCategoryFilters();
  }, [getConfig]);

  const dynamicFilters = categoryFilters[category] || [];
  let allFilters = [...DEFAULT_FILTERS, ...dynamicFilters];

  // Only show filters that actually work

  return (
    <div className="flex gap-4 flex-wrap mb-4">
      {allFilters.map(filter => {
        const value = filterValues?.[filter.key];
        if (filter.type === 'dropdown') {
          return <DropdownFilter key={filter.key} filter={filter} value={value} onChange={onChange} />;
        }
        if (filter.type === 'toggle') {
          return <ToggleFilter key={filter.key} filter={filter} value={value} onChange={onChange} />;
        }
        if (filter.type === 'slider') {
          return <SliderFilter key={filter.key} filter={filter} value={value} onChange={onChange} />;
        }
        if (filter.type === 'multi-select') {
          return <MultiSelectFilter key={filter.key} filter={filter} value={value} onChange={onChange} />;
        }
        return null;
      })}
    </div>
  );
} 