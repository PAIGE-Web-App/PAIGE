"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Search, Loader2 } from 'lucide-react';
import ProductCardSkeleton from '@/components/jewelry/ProductCardSkeleton';
import CollectionDetailPageSkeleton from '@/components/jewelry/CollectionDetailPageSkeleton';
import { useCustomToast } from '@/hooks/useCustomToast';
import CollectionFilters from '@/components/jewelry/CollectionFilters';
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

interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  description: string;
  image: string | null;
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
      <div className="relative aspect-square bg-[#F9F8F7] overflow-hidden">
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

      <div className="p-3">
        <h6 className="line-clamp-2 mb-1.5">
          {product.title}
        </h6>
        
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

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showErrorToast } = useCustomToast();
  const handle = params?.handle as string;
  
  const [collection, setCollection] = useState<ShopifyCollection | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states - collection pages use different filters (STYLE, METAL, TYPE)
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    if (handle) {
      fetchCollection();
      fetchProducts();
    }
  }, [handle]);

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

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/shopify/collections/${handle}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const data = await response.json();
      setCollection(data.collection);
    } catch (error) {
      console.error('Error fetching collection:', error);
      showErrorToast('Failed to load collection. Please try again later.');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shopify/collections/${handle}/products`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showErrorToast('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters - matching remicity.com collection page logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchQuery || 
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Price filter
      const productPrice = product.price || 0;
      const matchesPrice = productPrice >= priceRange.min && productPrice <= priceRange.max;

      // STYLE filter - match on tags and titles (Bangle, Bracelet, Cuff, Hearts, Hoops, Pendant, etc.)
      const matchesStyle = selectedStyles.length === 0 ||
        selectedStyles.some(style => {
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          const title = (product.title || '').toLowerCase();
          const styleLower = style.toLowerCase();
          
          if (style === 'Hearts') {
            return tags.some((t: string) => t.includes('heart')) || title.includes('heart');
          }
          return tags.some((t: string) => t.includes(styleLower)) || title.includes(styleLower);
        });

      // METAL filter - collection pages use Gold-Plated, Rhodium-Plated, etc.
      const matchesMetal = selectedMetals.length === 0 ||
        selectedMetals.some(metal => {
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          const title = (product.title || '').toLowerCase();
          const description = (product.description || '').toLowerCase();
          
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
          const metalLower = metal.toLowerCase();
          return tags.some((t: string) => t.includes(metalLower)) || title.includes(metalLower);
        });

      // TYPE filter - collection pages use simpler types (Bracelet, Necklace, Earring)
      const matchesType = selectedTypes.length === 0 ||
        selectedTypes.some(type => {
          const productType = product.productType?.toLowerCase() || '';
          const tags = (product.tags || []).map((t: string) => t.toLowerCase());
          const typeLower = type.toLowerCase();
          
          return productType.includes(typeLower) || tags.some((t: string) => t.includes(typeLower));
        });

      return matchesSearch && matchesPrice && matchesStyle && matchesMetal && matchesType;
    });
  }, [products, searchQuery, priceRange, selectedStyles, selectedMetals, selectedTypes]);

  const handleProductClick = (product: ShopifyProduct) => {
    router.push(`/jewelry/${product.handle}`);
  };

  const handleStyleToggle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const handleMetalToggle = (metal: string) => {
    setSelectedMetals(prev =>
      prev.includes(metal)
        ? prev.filter(m => m !== metal)
        : [...prev, metal]
    );
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (loading && !collection) {
    return <CollectionDetailPageSkeleton />;
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-linen">
        <WeddingBanner />
        <div className="app-content-container py-12 text-center">
          <h1 className="h2 mb-4">Collection Not Found</h1>
          <p className="text-[#7A7A7A] mb-6">The collection you are looking for does not exist.</p>
          <button onClick={() => router.push('/jewelry/collections')} className="btn-primary">
            Back to Collections
          </button>
        </div>
      </div>
    );
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
        }
      `}</style>
      <WeddingBanner />
      
      <div className="max-w-6xl mx-auto">
        <div className="app-content-container flex flex-col gap-2 py-4 pb-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#7A7A7A] mb-4">
            <button
              onClick={() => router.push('/jewelry')}
              className="hover:text-[#332B42] transition-colors"
            >
              All Jewelry
            </button>
            <span>/</span>
            <button
              onClick={() => router.push('/jewelry/collections')}
              className="hover:text-[#332B42] transition-colors"
            >
              Collections
            </button>
            <span>/</span>
            <span className="text-[#332B42]">{collection.title}</span>
          </div>

          {/* Collection Header */}
          <div className="mb-6">
            <h1 className="h2 mb-2">{collection.title}</h1>
          </div>

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
                <CollectionFilters
                  products={products}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                  selectedStyles={selectedStyles}
                  onStyleToggle={handleStyleToggle}
                  selectedMetals={selectedMetals}
                  onMetalToggle={handleMetalToggle}
                  selectedTypes={selectedTypes}
                  onTypeToggle={handleTypeToggle}
                />
              </div>
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              {filteredProducts.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-[#AB9C95] mx-auto mb-4" />
                  <p className="text-[#7A7A7A]">
                    {searchQuery || selectedStyles.length > 0 || selectedMetals.length > 0 || selectedTypes.length > 0
                      ? 'No products found matching your filters.'
                      : 'No products available in this collection.'}
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

