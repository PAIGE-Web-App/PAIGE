"use client";

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface CollectionFiltersProps {
  products: any[];
  priceRange: { min: number; max: number };
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  selectedStyles: string[];
  onStyleToggle: (style: string) => void;
  selectedMetals: string[];
  onMetalToggle: (metal: string) => void;
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
}

export default function CollectionFilters({
  products,
  priceRange,
  onPriceRangeChange,
  selectedStyles,
  onStyleToggle,
  selectedMetals,
  onMetalToggle,
  selectedTypes,
  onTypeToggle,
}: CollectionFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    style: true,
    metal: true,
    type: true,
  });

  // Extract STYLE filters from product tags and titles (matching remicity.com collection pages)
  const styles = useMemo(() => {
    const styleSet = new Set<string>();
    products.forEach(p => {
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      
      // Common style keywords from remicity.com collection pages
      if (tags.some((t: string) => t.includes('bangle')) || title.includes('bangle')) {
        styleSet.add('Bangle');
      }
      if (tags.some((t: string) => t.includes('bracelet')) || title.includes('bracelet')) {
        styleSet.add('Bracelet');
      }
      if (tags.some((t: string) => t.includes('cuff')) || title.includes('cuff')) {
        styleSet.add('Cuff');
      }
      if (tags.some((t: string) => t.includes('heart')) || title.includes('heart')) {
        styleSet.add('Hearts');
      }
      if (tags.some((t: string) => t.includes('hoop')) || title.includes('hoop')) {
        styleSet.add('Hoops');
      }
      if (tags.some((t: string) => t.includes('pendant')) || title.includes('pendant')) {
        styleSet.add('Pendant');
      }
      if (tags.some((t: string) => t.includes('stud')) || title.includes('stud')) {
        styleSet.add('Studs');
      }
      if (tags.some((t: string) => t.includes('dangle')) || title.includes('dangle')) {
        styleSet.add('Dangle');
      }
      if (tags.some((t: string) => t.includes('chain')) || title.includes('chain')) {
        styleSet.add('Chain');
      }
    });
    return Array.from(styleSet).sort();
  }, [products]);

  // Extract METAL filters - collection pages use different metals (Gold-Plated, Rhodium-Plated)
  const metals = useMemo(() => {
    const metalSet = new Set<string>();
    products.forEach(p => {
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      
      // Collection page metals
      if (tags.some((t: string) => t.includes('gold-plated') || t.includes('gold plated')) ||
          title.includes('gold') || description.includes('gold-plated')) {
        metalSet.add('Gold-Plated');
      }
      if (tags.some((t: string) => t.includes('rhodium-plated') || t.includes('rhodium plated')) ||
          title.includes('rhodium') || description.includes('rhodium-plated')) {
        metalSet.add('Rhodium-Plated');
      }
      if (tags.some((t: string) => t.includes('silver-plated') || t.includes('silver plated')) ||
          title.includes('silver') || description.includes('silver-plated')) {
        metalSet.add('Silver-Plated');
      }
      if (tags.some((t: string) => t.includes('vermeil')) || title.includes('vermeil')) {
        metalSet.add('Vermeil');
      }
    });
    return Array.from(metalSet).sort();
  }, [products]);

  // Extract TYPE filters - collection pages use simpler types (Bracelet, Necklace, Earring)
  const types = useMemo(() => {
    const typeSet = new Set<string>();
    products.forEach(p => {
      const productType = p.productType?.toLowerCase() || '';
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      
      if (productType.includes('bracelet') || tags.some((t: string) => t.includes('bracelet'))) {
        typeSet.add('Bracelet');
      }
      if (productType.includes('necklace') || tags.some((t: string) => t.includes('necklace'))) {
        typeSet.add('Necklace');
      }
      if (productType.includes('earring') || tags.some((t: string) => t.includes('earring'))) {
        typeSet.add('Earring');
      }
    });
    return Array.from(typeSet).sort();
  }, [products]);

  // Calculate counts
  const getStyleCount = (style: string) => {
    return products.filter(p => {
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      const styleLower = style.toLowerCase();
      
      if (style === 'Hearts') {
        return tags.some((t: string) => t.includes('heart')) || title.includes('heart');
      }
      return tags.some((t: string) => t.includes(styleLower)) || title.includes(styleLower);
    }).length;
  };

  const getMetalCount = (metal: string) => {
    return products.filter(p => {
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      const metalLower = metal.toLowerCase();
      
      if (metal === 'Gold-Plated') {
        return tags.some((t: string) => t.includes('gold-plated') || t.includes('gold plated')) ||
               title.includes('gold') || description.includes('gold-plated');
      }
      if (metal === 'Rhodium-Plated') {
        return tags.some((t: string) => t.includes('rhodium-plated') || t.includes('rhodium plated')) ||
               title.includes('rhodium') || description.includes('rhodium-plated');
      }
      if (metal === 'Silver-Plated') {
        return tags.some((t: string) => t.includes('silver-plated') || t.includes('silver plated')) ||
               title.includes('silver') || description.includes('silver-plated');
      }
      return tags.some((t: string) => t.includes(metalLower)) || title.includes(metalLower);
    }).length;
  };

  const getTypeCount = (type: string) => {
    return products.filter(p => {
      const productType = p.productType?.toLowerCase() || '';
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const typeLower = type.toLowerCase();
      
      return productType.includes(typeLower) || tags.some((t: string) => t.includes(typeLower));
    }).length;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate min/max prices from products
  const minPrice = useMemo(() => {
    const prices = products.map(p => p.price).filter(p => p !== null) as number[];
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [products]);

  const maxPrice = useMemo(() => {
    const prices = products.map(p => p.price).filter(p => p !== null) as number[];
    return prices.length > 0 ? Math.max(...prices) : 1000;
  }, [products]);

  return (
    <div className="w-full space-y-6">
      {/* Price Filter */}
      <div className="border-b border-[#E0DBD7] pb-4">
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
        >
          <span>PRICE ($)</span>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {expandedSections.price && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                value={priceRange.min}
                onChange={(e) => {
                  const newMin = Math.min(Math.max(Number(e.target.value), minPrice), priceRange.max);
                  onPriceRangeChange({ ...priceRange, min: newMin });
                }}
                className="w-full px-2 py-1 border border-[#E0DBD7] rounded text-sm text-[#332B42] focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Min"
              />
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                value={priceRange.max}
                onChange={(e) => {
                  const newMax = Math.max(Math.min(Number(e.target.value), maxPrice), priceRange.min);
                  onPriceRangeChange({ ...priceRange, max: newMax });
                }}
                className="w-full px-2 py-1 border border-[#E0DBD7] rounded text-sm text-[#332B42] focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Max"
              />
            </div>
            <div>
              <div className="text-xs text-[#7A7A7A] mb-2">
                ${priceRange.min} - ${priceRange.max}
              </div>
              <Slider
                range
                min={minPrice}
                max={maxPrice}
                value={[priceRange.min, priceRange.max]}
                onChange={(value) => {
                  const [min, max] = value as number[];
                  onPriceRangeChange({ min, max });
                }}
                className="w-full"
                styles={{
                  track: { backgroundColor: '#A85C36', height: 4 },
                  rail: { backgroundColor: '#E0DBD7', height: 4 },
                  handle: {
                    borderColor: '#A85C36',
                    backgroundColor: '#F3F2F0',
                    height: 18,
                    width: 18,
                    marginTop: -7,
                    opacity: 1,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  },
                }}
              />
              <div className="flex justify-between w-full text-xs text-[#7A7A7A] mt-1">
                <span>${minPrice}</span>
                <span>${maxPrice}+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STYLE Filter */}
      {styles.length > 0 && (
        <div className="border-b border-[#E0DBD7] pb-4">
          <button
            onClick={() => toggleSection('style')}
            className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
          >
            <span>STYLE</span>
            {expandedSections.style ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.style && (
            <div className="space-y-2">
              {styles.map((style) => (
                <label key={style} className="flex items-center justify-between text-sm text-[#332B42] cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStyles.includes(style)}
                      onChange={() => onStyleToggle(style)}
                      className="mr-2 rounded text-[#A85C36] focus:ring-[#A85C36]"
                    />
                    <span>{style}</span>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">({getStyleCount(style)})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* METAL Filter */}
      {metals.length > 0 && (
        <div className="border-b border-[#E0DBD7] pb-4">
          <button
            onClick={() => toggleSection('metal')}
            className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
          >
            <span>METAL</span>
            {expandedSections.metal ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.metal && (
            <div className="space-y-2">
              {metals.map((metal) => (
                <label key={metal} className="flex items-center justify-between text-sm text-[#332B42] cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedMetals.includes(metal)}
                      onChange={() => onMetalToggle(metal)}
                      className="mr-2 rounded text-[#A85C36] focus:ring-[#A85C36]"
                    />
                    <span>{metal}</span>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">({getMetalCount(metal)})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TYPE Filter */}
      {types.length > 0 && (
        <div className="pb-4">
          <button
            onClick={() => toggleSection('type')}
            className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
          >
            <span>TYPE</span>
            {expandedSections.type ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.type && (
            <div className="space-y-2">
              {types.map((type) => (
                <label key={type} className="flex items-center justify-between text-sm text-[#332B42] cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => onTypeToggle(type)}
                      className="mr-2 rounded text-[#A85C36] focus:ring-[#A85C36]"
                    />
                    <span>{type}</span>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">({getTypeCount(type)})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

