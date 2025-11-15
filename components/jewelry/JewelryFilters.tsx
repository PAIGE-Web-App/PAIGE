"use client";

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface JewelryFiltersProps {
  products: any[];
  priceRange: { min: number; max: number };
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  selectedMetals: string[];
  onMetalToggle: (metal: string) => void;
  selectedEarringTypes: string[];
  onEarringTypeToggle: (type: string) => void;
  selectedNecklaceTypes: string[];
  onNecklaceTypeToggle: (type: string) => void;
  selectedBraceletTypes: string[];
  onBraceletTypeToggle: (type: string) => void;
}

export default function JewelryFilters({
  products,
  priceRange,
  onPriceRangeChange,
  selectedCategories,
  onCategoryToggle,
  selectedMetals,
  onMetalToggle,
  selectedEarringTypes,
  onEarringTypeToggle,
  selectedNecklaceTypes,
  onNecklaceTypeToggle,
  selectedBraceletTypes,
  onBraceletTypeToggle,
}: JewelryFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    category: true,
    metal: true,
    earring: true,
    necklace: true,
    bracelet: true,
  });

  // Predefined filter options matching remicity.com exactly
  const predefinedCategories = ['Bracelets', 'Earrings', 'Necklaces', 'Rings'];
  const predefinedMetals = ['14K Solid Gold', 'Gold Vermeil', 'Sterling Silver', 'Two-Tone', 'Vermeil'];
  const predefinedEarringTypes = ['Dangle', 'Hoops', 'Studs', 'Drops', 'Clips'];
  const predefinedNecklaceTypes = ['Pendant', 'Chain'];
  const predefinedBraceletTypes = ['Bangle', 'Cuff', 'Chain'];

  // Filter to only show categories that have products
  const categories = useMemo(() => {
    return predefinedCategories.filter(cat => {
      return products.some(p => {
        const productType = p.productType?.toLowerCase() || '';
        const tags = (p.tags || []).map((t: string) => t.toLowerCase());
        return productType.includes(cat.toLowerCase()) || 
               tags.some((tag: string) => tag.includes(cat.toLowerCase()));
      });
    });
  }, [products]);

  // Filter to only show metals that have products
  const metals = useMemo(() => {
    return predefinedMetals.filter(metal => {
      return products.some(p => {
        const tags = (p.tags || []).map((t: string) => t.toLowerCase());
        const title = (p.title || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const metalLower = metal.toLowerCase();
        
        // Match metal names in tags, title, or description
        return tags.some((tag: string) => tag.includes(metalLower)) ||
               title.includes(metalLower) ||
               description.includes(metalLower) ||
               // Special cases for matching
               (metal === '14K Solid Gold' && (tags.some((t: string) => t.includes('14k') || t.includes('solid gold')))) ||
               (metal === 'Gold Vermeil' && (tags.some((t: string) => t.includes('vermeil')) || title.includes('vermeil'))) ||
               (metal === 'Sterling Silver' && (tags.some((t: string) => t.includes('sterling') || t.includes('silver')))) ||
               (metal === 'Two-Tone' && (tags.some((t: string) => t.includes('two-tone') || t.includes('two tone')))) ||
               (metal === 'Vermeil' && (tags.some((t: string) => t.includes('vermeil'))));
      });
    });
  }, [products]);

  // Filter to only show earring types that have products
  const earringTypes = useMemo(() => {
    return predefinedEarringTypes.filter(type => {
      return products.some(p => {
        const productType = p.productType?.toLowerCase() || '';
        if (!productType.includes('earring')) return false;
        
        const tags = (p.tags || []).map((t: string) => t.toLowerCase());
        const title = (p.title || '').toLowerCase();
        const typeLower = type.toLowerCase();
        
        return tags.some((tag: string) => tag.includes(typeLower)) ||
               title.includes(typeLower) ||
               // Special cases
               (type === 'Dangle' && (tags.some((t: string) => t.includes('dangle')) || title.includes('dangle'))) ||
               (type === 'Hoops' && (tags.some((t: string) => t.includes('hoop')) || title.includes('hoop'))) ||
               (type === 'Studs' && (tags.some((t: string) => t.includes('stud')) || title.includes('stud'))) ||
               (type === 'Drops' && (tags.some((t: string) => t.includes('drop')) || title.includes('drop'))) ||
               (type === 'Clips' && (tags.some((t: string) => t.includes('clip')) || title.includes('clip')));
      });
    });
  }, [products]);

  // Filter to only show necklace types that have products
  const necklaceTypes = useMemo(() => {
    return predefinedNecklaceTypes.filter(type => {
      return products.some(p => {
        const productType = p.productType?.toLowerCase() || '';
        if (!productType.includes('necklace')) return false;
        
        const tags = (p.tags || []).map((t: string) => t.toLowerCase());
        const title = (p.title || '').toLowerCase();
        const typeLower = type.toLowerCase();
        
        return tags.some((tag: string) => tag.includes(typeLower)) ||
               title.includes(typeLower) ||
               // Special cases
               (type === 'Pendant' && (tags.some((t: string) => t.includes('pendant')) || title.includes('pendant'))) ||
               (type === 'Chain' && (tags.some((t: string) => t.includes('chain')) || title.includes('chain')));
      });
    });
  }, [products]);

  // Filter to only show bracelet types that have products
  const braceletTypes = useMemo(() => {
    return predefinedBraceletTypes.filter(type => {
      return products.some(p => {
        const productType = p.productType?.toLowerCase() || '';
        if (!productType.includes('bracelet')) return false;
        
        const tags = (p.tags || []).map((t: string) => t.toLowerCase());
        const title = (p.title || '').toLowerCase();
        const typeLower = type.toLowerCase();
        
        return tags.some((tag: string) => tag.includes(typeLower)) ||
               title.includes(typeLower) ||
               // Special cases
               (type === 'Bangle' && (tags.some((t: string) => t.includes('bangle')) || title.includes('bangle'))) ||
               (type === 'Cuff' && (tags.some((t: string) => t.includes('cuff')) || title.includes('cuff'))) ||
               (type === 'Chain' && (tags.some((t: string) => t.includes('chain')) || title.includes('chain')));
      });
    });
  }, [products]);

  // Calculate counts for each filter - matching remicity.com logic
  const getCategoryCount = (category: string) => {
    return products.filter(p => {
      const productType = p.productType?.toLowerCase() || '';
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      return productType.includes(category.toLowerCase()) || 
             tags.some((tag: string) => tag.includes(category.toLowerCase()));
    }).length;
  };

  const getMetalCount = (metal: string) => {
    return products.filter(p => {
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      const metalLower = metal.toLowerCase();
      
      return tags.some((tag: string) => tag.includes(metalLower)) ||
             title.includes(metalLower) ||
             description.includes(metalLower) ||
             // Special cases for matching
             (metal === '14K Solid Gold' && (tags.some((t: string) => t.includes('14k') || t.includes('solid gold')))) ||
             (metal === 'Gold Vermeil' && (tags.some((t: string) => t.includes('vermeil')) || title.includes('vermeil'))) ||
             (metal === 'Sterling Silver' && (tags.some((t: string) => t.includes('sterling') || t.includes('silver')))) ||
             (metal === 'Two-Tone' && (tags.some((t: string) => t.includes('two-tone') || t.includes('two tone')))) ||
             (metal === 'Vermeil' && (tags.some((t: string) => t.includes('vermeil'))));
    }).length;
  };

  const getEarringTypeCount = (type: string) => {
    return products.filter(p => {
      const productType = p.productType?.toLowerCase() || '';
      if (!productType.includes('earring')) return false;
      
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      const typeLower = type.toLowerCase();
      
      return tags.some((tag: string) => tag.includes(typeLower)) ||
             title.includes(typeLower) ||
             (type === 'Dangle' && (tags.some((t: string) => t.includes('dangle')) || title.includes('dangle'))) ||
             (type === 'Hoops' && (tags.some((t: string) => t.includes('hoop')) || title.includes('hoop'))) ||
             (type === 'Studs' && (tags.some((t: string) => t.includes('stud')) || title.includes('stud'))) ||
             (type === 'Drops' && (tags.some((t: string) => t.includes('drop')) || title.includes('drop'))) ||
             (type === 'Clips' && (tags.some((t: string) => t.includes('clip')) || title.includes('clip')));
    }).length;
  };

  const getNecklaceTypeCount = (type: string) => {
    return products.filter(p => {
      const productType = p.productType?.toLowerCase() || '';
      if (!productType.includes('necklace')) return false;
      
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      const typeLower = type.toLowerCase();
      
      return tags.some((tag: string) => tag.includes(typeLower)) ||
             title.includes(typeLower) ||
             (type === 'Pendant' && (tags.some((t: string) => t.includes('pendant')) || title.includes('pendant'))) ||
             (type === 'Chain' && (tags.some((t: string) => t.includes('chain')) || title.includes('chain')));
    }).length;
  };

  const getBraceletTypeCount = (type: string) => {
    return products.filter(p => {
      const productType = p.productType?.toLowerCase() || '';
      if (!productType.includes('bracelet')) return false;
      
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      const title = (p.title || '').toLowerCase();
      const typeLower = type.toLowerCase();
      
      return tags.some((tag: string) => tag.includes(typeLower)) ||
             title.includes(typeLower) ||
             (type === 'Bangle' && (tags.some((t: string) => t.includes('bangle')) || title.includes('bangle'))) ||
             (type === 'Cuff' && (tags.some((t: string) => t.includes('cuff')) || title.includes('cuff'))) ||
             (type === 'Chain' && (tags.some((t: string) => t.includes('chain')) || title.includes('chain')));
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

      {/* Category Filter */}
      <div className="border-b border-[#E0DBD7] pb-4">
        <button
          onClick={() => toggleSection('category')}
          className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
        >
          <span>CATEGORY</span>
          {expandedSections.category ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {expandedSections.category && (
          <div className="space-y-2">
            {categories.map((category) => (
              <label key={category} className="flex items-center justify-between text-sm text-[#332B42] cursor-pointer">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => onCategoryToggle(category)}
                    className="mr-2 rounded text-[#A85C36] focus:ring-[#A85C36]"
                  />
                  <span>{category}</span>
                </div>
                <span className="text-xs text-[#7A7A7A]">({getCategoryCount(category)})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Metal Filter */}
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

      {/* Earring Types */}
      {earringTypes.length > 0 && (
        <div className="border-b border-[#E0DBD7] pb-4">
          <button
            onClick={() => toggleSection('earring')}
            className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
          >
            <span>EARRING</span>
            {expandedSections.earring ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.earring && (
            <div className="space-y-2">
              {earringTypes.map((type) => (
                <label key={type} className="flex items-center justify-between text-sm text-[#332B42] cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedEarringTypes.includes(type)}
                      onChange={() => onEarringTypeToggle(type)}
                      className="mr-2 rounded text-[#A85C36] focus:ring-[#A85C36]"
                    />
                    <span>{type}</span>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">({getEarringTypeCount(type)})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Necklace Types */}
      {necklaceTypes.length > 0 && (
        <div className="border-b border-[#E0DBD7] pb-4">
          <button
            onClick={() => toggleSection('necklace')}
            className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
          >
            <span>NECKLACE</span>
            {expandedSections.necklace ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.necklace && (
            <div className="space-y-2">
              {necklaceTypes.map((type) => (
                <label key={type} className="flex items-center justify-between text-sm text-[#332B42] cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedNecklaceTypes.includes(type)}
                      onChange={() => onNecklaceTypeToggle(type)}
                      className="mr-2 rounded text-[#A85C36] focus:ring-[#A85C36]"
                    />
                    <span>{type}</span>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">({getNecklaceTypeCount(type)})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bracelet Types */}
      {braceletTypes.length > 0 && (
        <div className="border-b border-[#E0DBD7] pb-4">
          <button
            onClick={() => toggleSection('bracelet')}
            className="w-full flex items-center justify-between text-sm font-semibold text-[#332B42] mb-3"
          >
            <span>BRACELET</span>
            {expandedSections.bracelet ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.bracelet && (
            <div className="space-y-2">
              {braceletTypes.map((type) => (
                <label key={type} className="flex items-center justify-between text-sm text-[#332B42] cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedBraceletTypes.includes(type)}
                      onChange={() => onBraceletTypeToggle(type)}
                      className="mr-2 rounded text-[#A85C36] focus:ring-[#A85C36]"
                    />
                    <span>{type}</span>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">({getBraceletTypeCount(type)})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

