"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles, Search, Loader2, Star, Eye } from 'lucide-react';
import ProductCardSkeleton from '@/components/jewelry/ProductCardSkeleton';
import JewelryPageSkeleton from '@/components/jewelry/JewelryPageSkeleton';
import { useCustomToast } from '@/hooks/useCustomToast';
import SectionHeaderBar from '@/components/SectionHeaderBar';
import JewelryFilters from '@/components/jewelry/JewelryFilters';
import { useRouter } from 'next/navigation';
import WeddingBanner from '@/components/WeddingBanner';

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  description: string;
  image: string | null;
  images: string[];
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  variants: Array<{
    id: number;
    title: string;
    price: number;
    compareAtPrice: number | null;
    available: boolean;
    inventoryQuantity: number;
  }>;
  tags: string[];
  vendor: string;
  productType: string;
  url: string;
}

interface ProductCardProps {
  product: ShopifyProduct;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const displayPrice = product.price ? `$${product.price.toFixed(2)}` : 'Price on request';
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > (product.price || 0);
  
  // Get primary and secondary images
  const primaryImage = product.image;
  const secondaryImage = product.images && product.images.length > 1 ? product.images[1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-[#E0DBD7] overflow-hidden hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-[#F9F8F7] overflow-hidden">
        {/* Primary Image */}
        {primaryImage && !imageError && (
          <img
            src={primaryImage}
            alt={product.title}
            className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${
              isHovered && secondaryImage ? 'opacity-0' : 'opacity-100'
            }`}
            onError={() => setImageError(true)}
          />
        )}
        {/* Secondary Image - shows on hover */}
        {secondaryImage && (
          <img
            src={secondaryImage}
            alt={`${product.title} - alternate view`}
            className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        {!primaryImage && !imageError && (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-[#AB9C95]" />
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-2 right-2 bg-[#A85C36] text-white px-2 py-1 rounded text-xs font-semibold z-10">
            Sale
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h6 className="line-clamp-2 mb-1.5">
            {product.title}
          </h6>
          
          {/* Price */}
        <div className="flex items-center gap-2">
          {hasDiscount ? (
            <>
              <span className="text-base font-work-sans font-medium text-[#A85C36]">
                ${product.price?.toFixed(2)}
              </span>
              <span className="text-sm text-[#7A7A7A] line-through font-work-sans">
                ${product.compareAtPrice?.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-base font-work-sans font-medium text-[#332B42]">
              {displayPrice}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function JewelryStorePage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollY, setScrollY] = useState(0);
  
  // Filter states
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [selectedEarringTypes, setSelectedEarringTypes] = useState<string[]>([]);
  const [selectedNecklaceTypes, setSelectedNecklaceTypes] = useState<string[]>([]);
  const [selectedBraceletTypes, setSelectedBraceletTypes] = useState<string[]>([]);
  const router = useRouter();
  
  const { showErrorToast } = useCustomToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shopify/products?limit=250');
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showErrorToast('Failed to load jewelry. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update price range when products load
  useEffect(() => {
    if (products.length > 0) {
      const prices = products.map(p => p.price).filter(p => p !== null) as number[];
      if (prices.length > 0) {
        setPriceRange({
          min: Math.min(...prices),
          max: Math.max(...prices),
        });
      }
    }
  }, [products]);

  // Apply all filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchQuery || 
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Price filter
      const productPrice = product.price || 0;
      const matchesPrice = productPrice >= priceRange.min && productPrice <= priceRange.max;

      // Category filter - match on productType or tags (matching remicity.com logic)
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.some(cat => {
          const productType = product.productType?.toLowerCase() || '';
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          return productType.includes(cat.toLowerCase()) || 
                 tags.some((tag: string) => tag.includes(cat.toLowerCase()));
        });

      // Metal filter - match on tags, title, or description (matching remicity.com logic)
      const matchesMetal = selectedMetals.length === 0 ||
        selectedMetals.some(metal => {
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          const title = (product.title || '').toLowerCase();
          const description = (product.description || '').toLowerCase();
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
        });

      // Earring type filter - only for earrings (matching remicity.com logic)
      const matchesEarringType = selectedEarringTypes.length === 0 ||
        selectedEarringTypes.some(type => {
          const productType = product.productType?.toLowerCase() || '';
          if (!productType.includes('earring')) return false;
          
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          const title = (product.title || '').toLowerCase();
          const typeLower = type.toLowerCase();
          
          return tags.some((tag: string) => tag.includes(typeLower)) ||
                 title.includes(typeLower) ||
                 (type === 'Dangle' && (tags.some((t: string) => t.includes('dangle')) || title.includes('dangle'))) ||
                 (type === 'Hoops' && (tags.some((t: string) => t.includes('hoop')) || title.includes('hoop'))) ||
                 (type === 'Studs' && (tags.some((t: string) => t.includes('stud')) || title.includes('stud'))) ||
                 (type === 'Drops' && (tags.some((t: string) => t.includes('drop')) || title.includes('drop'))) ||
                 (type === 'Clips' && (tags.some((t: string) => t.includes('clip')) || title.includes('clip')));
        });

      // Necklace type filter - only for necklaces (matching remicity.com logic)
      const matchesNecklaceType = selectedNecklaceTypes.length === 0 ||
        selectedNecklaceTypes.some(type => {
          const productType = product.productType?.toLowerCase() || '';
          if (!productType.includes('necklace')) return false;
          
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          const title = (product.title || '').toLowerCase();
          const typeLower = type.toLowerCase();
          
          return tags.some((tag: string) => tag.includes(typeLower)) ||
                 title.includes(typeLower) ||
                 (type === 'Pendant' && (tags.some((t: string) => t.includes('pendant')) || title.includes('pendant'))) ||
                 (type === 'Chain' && (tags.some((t: string) => t.includes('chain')) || title.includes('chain')));
        });

      // Bracelet type filter - only for bracelets (matching remicity.com logic)
      const matchesBraceletType = selectedBraceletTypes.length === 0 ||
        selectedBraceletTypes.some(type => {
          const productType = product.productType?.toLowerCase() || '';
          if (!productType.includes('bracelet')) return false;
          
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          const title = (product.title || '').toLowerCase();
          const typeLower = type.toLowerCase();
          
          return tags.some((tag: string) => tag.includes(typeLower)) ||
                 title.includes(typeLower) ||
                 (type === 'Bangle' && (tags.some((t: string) => t.includes('bangle')) || title.includes('bangle'))) ||
                 (type === 'Cuff' && (tags.some((t: string) => t.includes('cuff')) || title.includes('cuff'))) ||
                 (type === 'Chain' && (tags.some((t: string) => t.includes('chain')) || title.includes('chain')));
        });

      return matchesSearch && matchesPrice && matchesCategory && matchesMetal &&
             matchesEarringType && matchesNecklaceType && matchesBraceletType;
    });
  }, [products, searchQuery, priceRange, selectedCategories, selectedMetals, 
      selectedEarringTypes, selectedNecklaceTypes, selectedBraceletTypes]);

  const handleProductClick = (product: ShopifyProduct) => {
    router.push(`/jewelry/${product.handle}`);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleMetalToggle = (metal: string) => {
    setSelectedMetals(prev =>
      prev.includes(metal)
        ? prev.filter(m => m !== metal)
        : [...prev, metal]
    );
  };

  const handleEarringTypeToggle = (type: string) => {
    setSelectedEarringTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleNecklaceTypeToggle = (type: string) => {
    setSelectedNecklaceTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleBraceletTypeToggle = (type: string) => {
    setSelectedBraceletTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Show skeleton while loading (after all hooks)
  if (loading && products.length === 0) {
    return <JewelryPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-linen mobile-scroll-container">
      <style jsx global>{`
        @media (max-width: 768px) {
          html, body {
            height: 100vh;
            overflow: hidden;
          }
          .mobile-scroll-container {
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .mobile-jewelry-content {
            padding-left: 1rem;
            padding-right: 1rem;
            max-width: 100%;
            overflow-x: hidden;
          }
        }
      `}</style>
      <WeddingBanner />
      
      {/* Discount Code Banner */}
      <div className="bg-[#A85C36] text-white py-3 px-4 text-center">
        <p className="text-sm font-work-sans font-semibold">
          Use Code: <span className="font-bold">PAIGE15</span> for 15% off!
        </p>
      </div>

      {/* Hero Section */}
      <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
        {/* Background Image with gradient fallback and parallax */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(/jewelryheader.jpg), linear-gradient(135deg, #805d93 0%, #A85C36 100%)',
            backgroundColor: '#805d93',
            transform: `translateY(${Math.min(scrollY * 0.3, 100)}px) scale(1.1)`,
            willChange: 'transform'
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h4 className="mb-4" style={{ color: 'white' }}>
            Find the Perfect Piece
          </h4>
          <p className="text-sm md:text-base text-white max-w-2xl leading-relaxed mb-4 font-work-sans">
            Find the perfect pieces for your special day—from elegant bridal jewelry to thoughtful thank-you gifts for your bridesmaids. Each piece is crafted to celebrate your love story.
          </p>
          <p className="text-xs md:text-sm text-white/90 max-w-2xl leading-relaxed mb-4 font-work-sans">
            Thanks to our partners at Remicity, we're able to offer you stunning, super quality jewelry pieces at great cost.
          </p>
          <a
            href="/jewelry/collections"
            className="inline-flex items-center gap-2 px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-[5px] transition-colors text-sm font-work-sans font-medium backdrop-blur-sm border border-white/30"
          >
            Browse Collections
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="app-content-container flex flex-col gap-2 py-4 mobile-jewelry-content pb-4">
        {/* Search Bar */}
        <div className="sticky top-0 z-30 bg-[#F3F2F0] pt-4 pb-3 -mx-4 px-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7A7A7A] w-5 h-5" />
            <input
              type="text"
              placeholder="Search jewelry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E0DBD7] rounded-[5px] bg-white text-[#332B42] placeholder:text-[#7A7A7A] focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Main Content: Filters + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[#E0DBD7] rounded-lg p-4 sticky top-6">
              <JewelryFilters
                products={products}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
                selectedMetals={selectedMetals}
                onMetalToggle={handleMetalToggle}
                selectedEarringTypes={selectedEarringTypes}
                onEarringTypeToggle={handleEarringTypeToggle}
                selectedNecklaceTypes={selectedNecklaceTypes}
                onNecklaceTypeToggle={handleNecklaceTypeToggle}
                selectedBraceletTypes={selectedBraceletTypes}
                onBraceletTypeToggle={handleBraceletTypeToggle}
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
                {filteredProducts.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-16 h-16 text-[#AB9C95] mx-auto mb-4" />
                    <p className="text-[#7A7A7A]">
                      {searchQuery || selectedCategories.length > 0 || selectedMetals.length > 0
                        ? 'No products found matching your filters.'
                        : 'No products available at this time.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onClick={() => handleProductClick(product)}
                        />
                      ))}
                    </div>

                    {/* Results Count */}
                    <div className="mt-3 text-sm text-[#7A7A7A] text-center">
                      Showing {filteredProducts.length} of {products.length} products
                    </div>
                  </>
                )}
              </div>
        </div>
        </div>
      </div>
    </div>
  );
}
