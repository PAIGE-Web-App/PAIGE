"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, ChevronLeft, ChevronRight, Star, Loader2 } from 'lucide-react';
import ProductDetailPageSkeleton from '@/components/jewelry/ProductDetailPageSkeleton';
import { useCustomToast } from '@/hooks/useCustomToast';
import SectionHeaderBar from '@/components/SectionHeaderBar';
import WeddingBanner from '@/components/WeddingBanner';
import useSWR from 'swr';

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


export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showErrorToast } = useCustomToast();
  const handle = params?.handle as string;
  
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // SWR fetcher function
  const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }
    const data = await response.json();
    return data.product;
  };

  // Use SWR for request deduplication and caching
  const { data: productData, error, isLoading } = useSWR<ShopifyProduct>(
    handle ? `/api/shopify/products/${handle}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
    }
  );

  // Update product state when SWR data changes
  useEffect(() => {
    if (productData) {
      setProduct(productData);
      if (productData.variants && productData.variants.length > 0) {
        setSelectedVariant(productData.variants[0]);
      }
    }
  }, [productData]);

  // Update loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Error fetching product:', error);
      showErrorToast('Failed to load product. Please try again later.');
    }
  }, [error, showErrorToast]);

  const images = product?.images && product.images.length > 0 
    ? product.images 
    : product?.image 
      ? [product.image] 
      : [];
  
  const currentImage = images[currentImageIndex];
  const displayPrice = selectedVariant?.price || product?.price;
  const hasDiscount = selectedVariant?.compareAtPrice && selectedVariant.compareAtPrice > displayPrice;

  const handleBuyNow = () => {
    let checkoutUrl = product?.url || '';
    if (selectedVariant) {
      checkoutUrl += `?variant=${selectedVariant.id}`;
    }
    window.open(checkoutUrl, '_blank');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

      if (loading) {
        return <ProductDetailPageSkeleton />;
      }

  if (!product) {
    return (
      <div className="min-h-screen bg-linen">
        <SectionHeaderBar title="Product Not Found" />
        <div className="app-content-container py-12 text-center">
          <p className="text-[#7A7A7A] mb-4">The product you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/jewelry')}
            className="btn-primary"
          >
            Back to Jewelry Store
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
          .mobile-jewelry-content {
            padding-left: 1rem;
            padding-right: 1rem;
            max-width: 100%;
            overflow-x: hidden;
          }
        }
      `}</style>
      <WeddingBanner />
      <div className="max-w-6xl mx-auto">
        <div className="app-content-container flex flex-col gap-4 py-8 mobile-jewelry-content pb-6">
          {/* Mobile Header */}
          <div className="lg:hidden sticky top-0 z-10 bg-linen pt-6 -mx-4 px-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <button
                onClick={() => router.push('/jewelry')}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0 mt-1"
                aria-label="Back to jewelry"
              >
                <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
              </button>
              <div className="flex-1 flex justify-center min-w-0">
                <h5 className="h5 text-center break-words hyphens-auto max-w-[calc(100vw-8rem)]">
                  {product.title}
                </h5>
              </div>
              <div className="w-7 flex-shrink-0"></div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/jewelry')}
              className="flex items-center gap-2 text-sm text-[#7A7A7A] hover:text-[#332B42] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jewelry
            </button>
          </div>
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-[#F9F8F7] rounded-lg overflow-hidden">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-16 h-16 text-[#AB9C95]" />
                </div>
              )}
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#332B42]" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-[#332B42]" />
                  </button>
                </>
              )}

              {hasDiscount && (
                <div className="absolute top-4 right-4 bg-[#A85C36] text-white px-3 py-1 rounded text-sm font-semibold">
                  Sale
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                      currentImageIndex === index
                        ? 'border-[#A85C36]'
                        : 'border-[#E0DBD7]'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h4 className="mb-2">
                {product.title}
              </h4>
              {product.vendor && (
                <p className="text-sm text-[#7A7A7A]">by {product.vendor}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              {hasDiscount ? (
                <>
                  <span className="text-2xl font-work-sans font-medium text-[#A85C36]">
                    ${displayPrice?.toFixed(2)}
                  </span>
                  <span className="text-lg text-[#7A7A7A] line-through font-work-sans">
                    ${selectedVariant?.compareAtPrice?.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-work-sans font-medium text-[#332B42]">
                  ${displayPrice?.toFixed(2) || 'Price on request'}
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 1 && (
              <div>
                <label className="block text-sm font-semibold text-[#332B42] mb-2">
                  Select Variant
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 border rounded text-sm transition-colors ${
                        selectedVariant?.id === variant.id
                          ? 'border-[#A85C36] bg-[#A85C36] text-white'
                          : 'border-[#E0DBD7] text-[#332B42] hover:border-[#A85C36]'
                      }`}
                    >
                      {variant.title} - ${variant.price.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buy Now Button */}
            <button
              onClick={handleBuyNow}
              className="w-full btn-primary py-3 text-base font-medium flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Buy Now on Remicity
            </button>

            {/* Description */}
            {product.description && (
              <div className="border-t border-[#E0DBD7] pt-6">
                <h6 className="mb-3">Description</h6>
                <div
                  className="text-sm text-[#7A7A7A] prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="border-t border-[#E0DBD7] pt-6">
                <h6 className="mb-2">Tags</h6>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-[#F9F8F7] text-xs text-[#7A7A7A] rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-[#E0DBD7] pt-8 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-playfair font-semibold text-[#332B42]">Reviews</h2>
          </div>
          
          <div className="text-center py-8 bg-white rounded-lg border border-[#E0DBD7]">
            <Star className="w-12 h-12 text-[#AB9C95] mx-auto mb-3" />
            <p className="text-[#7A7A7A] mb-2">View reviews on Remicity.com</p>
            <p className="text-xs text-[#7A7A7A] mb-4">
              Customer reviews are available on our partner's website.
            </p>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#A85C36] text-white rounded-[5px] hover:bg-[#8a4a2a] transition-colors text-sm font-work-sans font-medium"
            >
              View Reviews on Remicity.com
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </a>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

