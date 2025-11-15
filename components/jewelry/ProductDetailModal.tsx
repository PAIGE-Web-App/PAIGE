"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductDetailModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  discountCode?: string;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  discountCode,
}: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || null);

  if (!product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [product.image].filter(Boolean);
  const currentImage = images[currentImageIndex] || product.image;
  const displayPrice = selectedVariant?.price || product.price;
  const hasDiscount = selectedVariant?.compareAtPrice && selectedVariant.compareAtPrice > displayPrice;

  const handleBuyNow = () => {
    let checkoutUrl = product.url;
    if (discountCode) {
      checkoutUrl += `?discount=${discountCode}`;
    }
    if (selectedVariant) {
      checkoutUrl += discountCode ? `&variant=${selectedVariant.id}` : `?variant=${selectedVariant.id}`;
    }
    window.open(checkoutUrl, '_blank');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-[#E0DBD7] px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-playfair font-semibold text-[#332B42]">{product.title}</h2>
                <button
                  onClick={onClose}
                  className="text-[#7A7A7A] hover:text-[#332B42] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="grid md:grid-cols-2 gap-6 p-6">
                {/* Image Gallery */}
                <div className="relative">
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
                    
                    {/* Image Navigation */}
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

                    {/* Sale Badge */}
                    {hasDiscount && (
                      <div className="absolute top-4 right-4 bg-[#A85C36] text-white px-3 py-1 rounded text-sm font-semibold">
                        Sale
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Gallery */}
                  {images.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto">
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
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-playfair font-semibold text-[#332B42] mb-2">
                      {product.title}
                    </h3>
                    {product.vendor && (
                      <p className="text-sm text-[#7A7A7A]">by {product.vendor}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-3">
                    {hasDiscount ? (
                      <>
                        <span className="text-3xl font-semibold text-[#A85C36]">
                          ${displayPrice.toFixed(2)}
                        </span>
                        <span className="text-lg text-[#7A7A7A] line-through">
                          ${selectedVariant?.compareAtPrice?.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-semibold text-[#332B42]">
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
                        {product.variants.map((variant: any) => (
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

                  {/* Description */}
                  {product.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-[#332B42] mb-2">Description</h4>
                      <div
                        className="text-sm text-[#7A7A7A] prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    </div>
                  )}

                  {/* Tags */}
                  {product.tags && product.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-[#332B42] mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag: string) => (
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

                  {/* Buy Now Button */}
                  <button
                    onClick={handleBuyNow}
                    className="w-full btn-primary py-3 text-base font-medium flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Buy Now on Remicity
                  </button>

                  {discountCode && (
                    <p className="text-xs text-[#7A7A7A] text-center">
                      Discount code "{discountCode}" will be applied at checkout
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

