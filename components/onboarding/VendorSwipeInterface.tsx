'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, MapPin, Star, DollarSign, Users, Camera, Flower2, Music } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface Vendor {
  id: string;
  name: string;
  category: string;
  price: string;
  rating: number;
  image?: string;
  location?: string;
  description?: string;
}

interface VendorSwipeInterfaceProps {
  vendors: Vendor[];
  onComplete: (likedVendors: Vendor[]) => void;
  onBack: () => void;
}

const categoryIcons = {
  'Venue': MapPin,
  'Photographer': Camera,
  'Florist': Flower2,
  'Caterer': Users,
  'DJ': Music,
  'Band': Music
};

const VendorSwipeInterface: React.FC<VendorSwipeInterfaceProps> = ({
  vendors,
  onComplete,
  onBack
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVendors, setLikedVendors] = useState<Vendor[]>([]);
  const [swipedVendors, setSwipedVendors] = useState<Vendor[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const { showSuccessToast } = useCustomToast();

  const handleSwipe = (direction: 'left' | 'right', vendor: Vendor) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    if (direction === 'right') {
      setLikedVendors(prev => [...prev, vendor]);
      showSuccessToast(`Liked ${vendor.name}!`);
    }
    
    setSwipedVendors(prev => [...prev, vendor]);
    setCurrentIndex(prev => prev + 1);
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handlePanEnd = (event: any, info: PanInfo, vendor: Vendor) => {
    if (isAnimating) return;
    
    const threshold = 100;
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      if (offset > 0 || velocity > 0) {
        handleSwipe('right', vendor);
      } else {
        handleSwipe('left', vendor);
      }
    }
  };

  const currentVendor = vendors[currentIndex];
  const remainingCount = vendors.length - currentIndex;
  const progress = ((vendors.length - remainingCount) / vendors.length) * 100;

  if (!currentVendor) {
    // All vendors swiped
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl mx-auto text-center"
      >
        <div className="mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center"
          >
            <Heart className="w-12 h-12 text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-playfair font-semibold text-[#332B42] mb-4">
            Great choices!
          </h1>
          
          <p className="text-[#364257] text-lg mb-6">
            You liked {likedVendors.length} out of {vendors.length} vendors. 
            {likedVendors.length === 0 && " No worries - you can always browse our vendor catalog for better results!"}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onBack}
            className="btn-primaryinverse px-8 py-3 rounded-lg font-semibold text-base"
          >
            Back
          </button>
          <button
            onClick={() => onComplete(likedVendors)}
            className="btn-primary px-8 py-3 rounded-lg font-semibold text-base flex items-center gap-2"
          >
            Continue to Review
          </button>
        </div>
      </motion.div>
    );
  }

  const CategoryIcon = categoryIcons[currentVendor.category as keyof typeof categoryIcons] || Users;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-playfair font-semibold text-[#332B42] mb-4">
          Swipe through vendors we think you'll love
        </h1>
        <p className="text-[#364257] text-lg mb-6">
          Swipe right to like, left to pass. We'll show you 5 vendors from each category.
        </p>
        
        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex-1 max-w-xs">
            <div className="w-full bg-[#E0D6D0] rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-[#A85C36] to-[#8B4513] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className="text-sm text-[#364257] font-medium">
            {remainingCount} left
          </span>
        </div>
      </div>

      {/* Vendor Card Stack */}
      <div className="relative h-96 mb-8">
        <AnimatePresence>
          {/* Next card (background) */}
          {vendors[currentIndex + 1] && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 0.95, opacity: 0.7 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="absolute inset-0 bg-white rounded-2xl shadow-lg border border-[#AB9C95] p-6"
            >
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <CategoryIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Next vendor</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Current card */}
          <motion.div
            key={currentVendor.id}
            initial={{ scale: 1, opacity: 1, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ 
              scale: 0.8, 
              opacity: 0, 
              rotate: currentVendor.id === swipedVendors[swipedVendors.length - 1]?.id ? 
                (swipedVendors[swipedVendors.length - 1] === likedVendors.find(v => v.id === currentVendor.id) ? 15 : -15) : 0,
              x: currentVendor.id === swipedVendors[swipedVendors.length - 1]?.id ? 
                (swipedVendors[swipedVendors.length - 1] === likedVendors.find(v => v.id === currentVendor.id) ? 300 : -300) : 0
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onPanEnd={(event, info) => handlePanEnd(event, info, currentVendor)}
            whileDrag={{ scale: 1.05, rotate: 5 }}
            className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-[#AB9C95] p-6 cursor-grab active:cursor-grabbing"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#A85C36] to-[#8B4513] rounded-full flex items-center justify-center">
                    <CategoryIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#332B42]">
                      {currentVendor.category}
                    </h3>
                    <p className="text-sm text-[#364257]">
                      {currentVendor.location || 'Local vendor'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium text-[#332B42]">
                    {currentVendor.rating}
                  </span>
                </div>
              </div>

              {/* Vendor Info */}
              <div className="flex-1 flex flex-col justify-center">
                <h2 className="text-2xl font-playfair font-semibold text-[#332B42] mb-4 text-center">
                  {currentVendor.name}
                </h2>
                
                {currentVendor.description && (
                  <p className="text-[#364257] text-center mb-6">
                    {currentVendor.description}
                  </p>
                )}

                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#A85C36]" />
                    <span className="text-lg font-semibold text-[#332B42]">
                      {currentVendor.price}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="text-lg font-semibold text-[#332B42]">
                      {currentVendor.rating}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Swipe Instructions */}
              <div className="text-center">
                <p className="text-sm text-[#364257] mb-2">
                  Swipe right to like, left to pass
                </p>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-1 text-red-500">
                    <X className="w-4 h-4" />
                    <span className="text-sm">Pass</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">Like</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => handleSwipe('left', currentVendor)}
          disabled={isAnimating}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        
        <button
          onClick={onBack}
          className="btn-primaryinverse px-6 py-3 rounded-lg font-semibold text-base"
        >
          Back
        </button>
        
        <button
          onClick={() => handleSwipe('right', currentVendor)}
          disabled={isAnimating}
          className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Heart className="w-8 h-8" />
        </button>
      </div>
    </motion.div>
  );
};

export default VendorSwipeInterface;
