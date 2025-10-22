'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, MapPin, Star, DollarSign, Users, Camera, Flower2, Music, ChevronLeft, ChevronRight, Phone, Globe, Clock, WandSparkles } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';
import { createPortal } from 'react-dom';
import WeddingDetailsAccordion from './WeddingDetailsAccordion';
import Banner from '@/components/Banner';

// Utility function to filter wedding-related reviews
  const filterWeddingReviews = (reviews: any[]) => {
  if (!reviews || reviews.length === 0) return { weddingReviews: [], otherReviews: [] };
  
  const weddingKeywords = [
    'wedding', 'bride', 'groom', 'ceremony', 'reception', 'bridal', 
    'anniversary', 'engagement', 'married', 'nuptials', 'vows', 
    'wedding party', 'bridal party', 'wedding day', 'special day',
    'walked down the aisle', 'first dance', 'wedding cake', 'bouquet',
    'wedding venue', 'wedding reception', 'wedding ceremony'
  ];
  
  const weddingReviews: any[] = [];
  const otherReviews: any[] = [];
  
  reviews.forEach(review => {
    const reviewText = review.text?.toLowerCase() || '';
    const isWeddingReview = weddingKeywords.some(keyword => 
      reviewText.includes(keyword.toLowerCase())
    );
    
    if (isWeddingReview) {
      weddingReviews.push(review);
    } else {
      otherReviews.push(review);
    }
  });
  
  return { weddingReviews, otherReviews };
};

interface Vendor {
  id: string;
  name: string;
  category: string;
  price: string;
  rating: number;
  image?: string;
  images?: string[];
  vicinity?: string;
  address?: string;
  description?: string;
  phone?: string;
  internationalPhone?: string;
  website?: string;
  googleUrl?: string;
  openingHours?: any;
  currentOpeningHours?: any;
  coordinates?: {
    lat: number;
    lng: number;
  };
  reviews?: Array<{
    text: string;
    author_name: string;
    rating: number;
    time: number;
  }>;
  totalReviews?: number;
}

interface VendorSwipeInterfaceProps {
  vendors: {
    venues?: Vendor[];
    photographers?: Vendor[];
    florists?: Vendor[];
    caterers?: Vendor[];
    music?: Vendor[];
  };
  generatedData?: {
    weddingDate?: string;
    guestCount?: number;
    budgetAmount?: number;
    location?: string;
    additionalContext?: string;
  };
  onComplete: (likedVendors: Vendor[]) => void;
  onSkip: () => void;
  onUpdateGeneratedData?: (updatedData: any) => void;
  onboardingFavoritesCount?: number;
}

const categoryIcons = {
  'Venue': MapPin,
  'Photographer': Camera,
  'Florist': Flower2,
  'Caterer': Users,
  'DJ': Music,
  'Musician': Music,
  'Band': Music
};

// Memoized vendor card component for better performance
const VendorCard = React.memo<{
  vendor: Vendor;
  isLiked: boolean;
  isSelected: boolean;
  onSelect: (vendor: Vendor) => void;
  onToggleLike: (vendor: Vendor) => void;
  getCategoryIcon: (category: string) => any;
}>(({ vendor, isLiked, isSelected, onSelect, onToggleLike, getCategoryIcon }) => {
  const CategoryIcon = getCategoryIcon(vendor.category);
  
  return (
    <div
      className={`p-4 bg-white rounded-lg shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'border-[#A85C36] shadow-md' : 'border-gray-200'
      }`}
      onClick={() => onSelect(vendor)}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-[#F3F2F0] rounded-lg flex items-center justify-center flex-shrink-0">
          {vendor.image ? (
            <img
              src={vendor.image}
              alt={vendor.name}
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <CategoryIcon className="w-5 h-5 text-[#A85C36]" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-[#332B42] text-sm truncate">
              {vendor.name}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(vendor);
              }}
              className={`p-1 rounded-full transition-colors ${
                isLiked
                  ? 'bg-pink-100 text-pink-500'
                  : 'bg-gray-100 text-gray-400 hover:bg-pink-100 hover:text-pink-500'
              }`}
            >
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-[#5A4A42]">{vendor.rating} ({vendor.totalReviews || 0})</span>
            </div>
            <span className="text-xs text-[#5A4A42]">•</span>
            <span className="text-xs text-[#5A4A42]">{vendor.price}</span>
          </div>
          
          {vendor.vicinity && (
            <p className="text-xs text-[#5A4A42] mt-1 truncate">
              {vendor.vicinity}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

VendorCard.displayName = 'VendorCard';

const VendorSwipeInterface: React.FC<VendorSwipeInterfaceProps> = ({
  vendors,
  generatedData,
  onComplete,
  onSkip,
  onUpdateGeneratedData,
  onboardingFavoritesCount = 0
}) => {
  // Use the same favorites system as main vendor pages
  const { 
    favorites, 
    isFavorite, 
    toggleFavorite, 
    addFavorite, 
    removeFavorite 
  } = useFavoritesSimple();


  // Helper function to convert vendor to favorites format
  const vendorToFavoritesData = useCallback((vendor: any) => ({
    placeId: vendor.id,
    name: vendor.name,
    address: vendor.address,
    category: vendor.category,
    rating: vendor.rating,
    reviewCount: vendor.user_ratings_total || vendor.totalReviews,
    image: vendor.image || vendor.photos?.[0]?.photo_reference
  }), []);
  // Memoize expensive calculations
  const allVendors = useMemo(() => [
    ...(vendors.venues || []).map(v => ({ ...v, categoryKey: 'venues' })),
    ...(vendors.photographers || []).map(v => ({ ...v, categoryKey: 'photographers' })),
    ...(vendors.florists || []).map(v => ({ ...v, categoryKey: 'florists' })),
    ...(vendors.caterers || []).map(v => ({ ...v, categoryKey: 'caterers' })),
    ...(vendors.music || []).map(v => ({ ...v, categoryKey: 'music' }))
  ], [vendors]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedVendors, setSwipedVendors] = useState<Vendor[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('venues');
  const [selectedVendors, setSelectedVendors] = useState<{[category: string]: Vendor | null}>({});
  const [hoveredVendor, setHoveredVendor] = useState<Vendor | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [loadedImages, setLoadedImages] = useState<{[vendorId: string]: string[]}>({});
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  
  

  
  // Get the currently selected vendor for the active category
  const selectedVendor = selectedVendors[activeCategory] || null;
  
  // Debounced state updates for better performance
  const [debouncedSelectedVendor, setDebouncedSelectedVendor] = useState<Vendor | null>(null);

  // Debug component rendering
  useEffect(() => {
    console.log('🚀 VendorSwipeInterface component mounted/updated');
    console.log('📊 Current state:', {
      showImageGallery,
      selectedVendor: selectedVendor?.name || 'none',
      vendorsCount: Object.keys(vendors).length
    });
    
    // Debug generatedData structure
    console.log('🎯 Generated Data Debug:', generatedData);
    if (generatedData) {
      console.log('📅 Wedding Date:', generatedData.weddingDate);
      console.log('👥 Guest Count:', generatedData.guestCount);
      console.log('💰 Budget:', generatedData.budgetAmount);
      console.log('📍 Location:', generatedData.location);
      console.log('📝 Additional Context:', generatedData.additionalContext);
    }
    
    // Debug vendor data structure
    if (vendors && Object.keys(vendors).length > 0) {
      console.log('🔍 Vendor data structure:', vendors);
      Object.entries(vendors).forEach(([category, vendorList]) => {
        if (vendorList && vendorList.length > 0) {
          console.log(`📋 ${category} vendors:`, vendorList.map(v => ({
            name: v.name,
            rating: v.rating,
            totalReviews: v.totalReviews,
            reviewCount: v.totalReviews
          })));
        }
      });
    }
  }, [showImageGallery, selectedVendor, vendors, generatedData]);

  // Debug modal state
  useEffect(() => {
    console.log('showImageGallery state changed:', showImageGallery);
    console.log('selectedVendor:', selectedVendor?.name || 'none');
    console.log('Portal should render modal now!');
    if (showImageGallery && selectedVendor) {
      console.log('Modal should be visible now!', {
        showImageGallery,
        selectedVendor: selectedVendor.name,
        images: selectedVendor.images?.length || 0
      });
    }
  }, [showImageGallery, selectedVendor]);
  const { showSuccessToast } = useCustomToast();

  // Function to load images for a vendor on demand
  const loadVendorImages = useCallback(async (vendor: Vendor) => {
    if (loadedImages[vendor.id]) {
      return loadedImages[vendor.id]; // Already loaded
    }

    try {
      // If vendor already has images, use them
      if (vendor.images && vendor.images.length > 0) {
        setLoadedImages(prev => ({
          ...prev,
          [vendor.id]: vendor.images
        }));
        return vendor.images;
      }

      // Otherwise, fetch images using client-side Google Places API
      const { googlePlacesClientService } = await import('@/utils/googlePlacesClientService');
      const detailsResult = await googlePlacesClientService.getPlaceDetails(vendor.id);
      
      if (detailsResult.success && detailsResult.place?.photos && detailsResult.place.photos.length > 0) {
        const data = { photos: detailsResult.place.photos };
        const imageUrls = data.photos.map((photo: any) => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
        );
        
        setLoadedImages(prev => ({
          ...prev,
          [vendor.id]: imageUrls
        }));
        return imageUrls;
      }
      
      // Fallback: return empty array
      setLoadedImages(prev => ({
        ...prev,
        [vendor.id]: []
      }));
      return [];
    } catch (error) {
      console.error('Error loading vendor images:', error);
      setLoadedImages(prev => ({
        ...prev,
        [vendor.id]: []
      }));
      return [];
    }
  }, [loadedImages]);

  // Memoize category mapping and calculations
  const categoryMapping = useMemo(() => ({
    venues: { name: 'Venues', icon: MapPin, vendors: vendors.venues || [] },
    photographers: { name: 'Photographers', icon: Camera, vendors: vendors.photographers || [] },
    florists: { name: 'Florists', icon: Flower2, vendors: vendors.florists || [] },
    caterers: { name: 'Caterers', icon: Users, vendors: vendors.caterers || [] },
    music: { name: 'Music', icon: Music, vendors: vendors.music || [] }
  }), [vendors]);

  // Preload first image of visible vendors for better UX
  const preloadVisibleVendorImages = useCallback(() => {
    const currentVendors = categoryMapping[activeCategory as keyof typeof categoryMapping]?.vendors || [];
    // Preload first 3 vendors' first images
    currentVendors.slice(0, 3).forEach(vendor => {
      if (vendor.image && !loadedImages[vendor.id]) {
        const img = new Image();
        img.src = vendor.image;
      }
    });
  }, [activeCategory, categoryMapping, loadedImages]);

  // Preload images when category changes
  useEffect(() => {
    preloadVisibleVendorImages();
  }, [preloadVisibleVendorImages]);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Debounced selected vendor update for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSelectedVendor(selectedVendor);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedVendor]);

  const totalVendors = useMemo(() => 
    Object.values(categoryMapping).reduce((sum, cat) => sum + cat.vendors.length, 0), 
    [categoryMapping]
  );
  const totalLiked = favorites.length;

  // Memoize category icon function
  const getCategoryIcon = useCallback((category: string) => {
    switch (category.toLowerCase()) {
      case 'venue':
        return MapPin;
      case 'photographer':
        return Camera;
      case 'florist':
        return Flower2;
      case 'caterer':
        return Users;
      case 'dj':
      case 'music':
        return Music;
      default:
        return Users;
    }
  }, []);

  // Vendor data loaded

  // If no vendors, show message
  if (allVendors.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-[#332B42] mb-2">No vendors found</h3>
        <p className="text-sm text-gray-600 mb-4">
          We couldn't find any vendors in your area. You can skip this step and add vendors later.
        </p>
        <button
          onClick={onSkip}
          className="btn-primaryinverse"
        >
          Skip for now
        </button>
      </div>
    );
  }

  const handleSwipe = (direction: 'left' | 'right', vendor: Vendor) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    if (direction === 'right') {
      addFavorite(vendorToFavoritesData(vendor));
    }
    
    setSwipedVendors(prev => [...prev, vendor]);
    setCurrentIndex(prev => prev + 1);
    setIsFlipped(false); // Reset flip state for next card
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
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

  const currentVendor = allVendors[currentIndex];
  const remainingCount = allVendors.length - currentIndex;
  const progress = ((allVendors.length - remainingCount) / allVendors.length) * 100;

  if (!currentVendor) {
    // All vendors swiped
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full flex flex-col items-center justify-center text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6"
        >
          <Heart className="w-8 h-8 text-white" />
        </motion.div>
        
        <h5 className="h5 mb-3">Great choices!</h5>
        
        <p className="text-sm text-gray-600 mb-6">
          You liked {favorites.length} out of {allVendors.length} vendors. 
          {favorites.length === 0 && " No worries - you can always browse our vendor catalog for better results!"}
        </p>

        <button
          onClick={() => {
            // Convert favorites back to vendor format for compatibility
            const likedVendors = allVendors.filter(vendor => 
              isFavorite(vendor.id)
            );
            onComplete(likedVendors);
          }}
          className="btn-primary px-6 py-2 text-sm"
        >
          Continue to Review
        </button>
      </motion.div>
    );
  }

  const CategoryIcon = categoryIcons[currentVendor.category as keyof typeof categoryIcons] || Users;
  
  // Category display names
  const categoryDisplayNames: { [key: string]: string } = {
    'venues': 'Recommended Venues',
    'photographers': 'Recommended Photographers', 
    'florists': 'Recommended Florists',
    'caterers': 'Recommended Caterers',
    'music': 'Recommended DJs & Musicians'
  };

  // Get next category info for navigation
  const nextVendor = allVendors[currentIndex + 1];
  const nextCategoryName = nextVendor ? categoryDisplayNames[nextVendor.categoryKey] || `Recommended ${nextVendor.category || 'Vendors'}` : 'Complete';

  // Desktop grid layout
  if (!isMobile) {
    const currentVendors = categoryMapping[activeCategory as keyof typeof categoryMapping]?.vendors || [];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full h-full flex flex-col"
      >

        {/* Desktop Header */}
        <div className="flex-shrink-0 border-b border-gray-200 pt-2 pb-4 px-4">
          {/* AI Info Banner */}
          {showInfoBanner && (
            <div className="mb-4">
              <div className="bg-[#F3F2F0] border border-[#8B5CF6] p-3 text-sm shadow-md rounded">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[#332B42]">
                    We found these vendors based on your wedding details!
                  </p>
                  <button
                    onClick={() => setShowInfoBanner(false)}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-[#E3F2FD] transition-colors"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4 text-[#8B5CF6]" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h6 className="text-[#332B42]">Recommended Vendors</h6>
              <span className="ml-2 text-xs lg:text-xs text-[10px] text-[#7A7A7A] bg-[#EBE3DD] px-2 lg:px-1.5 py-0 lg:py-0.5 rounded-full font-work">
                {totalVendors}
              </span>
            </div>
          </div>
          
          {/* Description text */}
          <div className="mb-4">
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Please favorite the ones you like by clicking the heart icon on desktop or swiping right on mobile. You can always update your wedding details if something isn't quite right.
            </p>
          </div>
          
          {/* Category Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Object.entries(categoryMapping).map(([key, category]) => {
                const isActive = activeCategory === key;
                const likedInCategory = favorites.filter(fav => 
                  category.vendors.some(cv => cv.id === fav.placeId)
                ).length;
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`px-4 py-2 rounded font-work-sans text-sm font-medium border transition-colors duration-150 focus:outline-none flex items-center ${
                      isActive 
                        ? "bg-white border-[#A85C36] text-[#A85C36]" 
                        : "bg-[#F3F2F0] border-[#E0D6D0] text-[#332B42] hover:bg-[#E0D6D0]"
                    }`}
                  >
                    <category.icon className="w-4 h-4 mr-2" />
                    <span>{category.name}</span>
                    <span className="ml-2 text-xs lg:text-xs text-[10px] text-[#7A7A7A] bg-[#EBE3DD] px-2 lg:px-1.5 py-0 lg:py-0.5 rounded-full font-work">
                      {category.vendors.length}
                    </span>
                    {likedInCategory > 0 && (
                      <span className="ml-1 text-xs lg:text-xs text-[10px] text-[#7A7A7A] bg-[#EBE3DD] px-2 lg:px-1.5 py-0 lg:py-0.5 rounded-full font-work">
                        {likedInCategory}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Total Favorited Count */}
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-[#A85C36]" />
              <span className="text-sm font-medium text-[#332B42]">
                {onboardingFavoritesCount} Favorited
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Three-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* First Column - Vendor List */}
          <div className="w-1/4 overflow-y-auto border-r border-gray-200" style={{ backgroundColor: '#F3F2F0' }}>
            <div className="space-y-3 p-4">
              {currentVendors.map((vendor, index) => {
                const isLiked = isFavorite(vendor.id);
                const isSelected = selectedVendor?.id === vendor.id;
                const CategoryIcon = getCategoryIcon(vendor.category);
                
                return (
                  <motion.div
                    key={vendor.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group bg-white border rounded-[5px] flex flex-col items-start relative h-full min-h-[200px] cursor-pointer hover:shadow-lg hover:shadow-gray-300/50 transition-all duration-200 hover:-translate-y-1 ${
                      isSelected 
                        ? 'border-[#A85C36] border-2' 
                        : isLiked 
                          ? 'border-green-500' 
                          : 'border-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedVendors(prev => ({
                        ...prev,
                        [activeCategory]: vendor
                      }));
                    }}
                    onMouseEnter={() => setHoveredVendor(vendor)}
                    onMouseLeave={() => setHoveredVendor(null)}
                  >
                    {/* Heart icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('💖 Heart clicked for vendor:', vendor.name, 'Current isLiked:', isLiked);
                        console.log('💖 Vendor ID:', vendor.id, 'Favorites:', favorites.map(f => f.placeId));
                        toggleFavorite(vendorToFavoritesData(vendor));
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors z-20 shadow-md ${
                        isLiked
                          ? 'bg-white/90 text-pink-500 hover:text-pink-600'
                          : 'bg-white/80 text-gray-600 hover:bg-white'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${isLiked ? 'fill-current text-pink-500' : ''}`} />
                    </button>
                    
                    {/* Image */}
                    <div className="w-full min-h-[80px] h-20 bg-[#F3F2F0] rounded-t-[5px] flex items-center justify-center overflow-hidden">
                      {vendor.image && vendor.image !== '/Venue.png' && vendor.image.startsWith('http') ? (
                        <img
                          src={vendor.image}
                          alt={vendor.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${vendor.image && vendor.image !== '/Venue.png' && vendor.image.startsWith('http') ? 'hidden' : ''}`}>
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <CategoryIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 w-full flex flex-col justify-between p-3">
                      <div>
                        <h6 className="h6 mb-1 line-clamp-1">{vendor.name}</h6>
                        
                        <div className="flex items-center gap-1 text-xs mb-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-[#A85C36]">{vendor.rating} ({vendor.totalReviews || 0})</span>
                        </div>
                        
                        {vendor.price && (
                          <div className="text-xs text-[#332B42] mb-1">
                            {vendor.price}
                          </div>
                        )}
                        
                        {vendor.vicinity && (
                          <div className="text-xs text-[#332B42] line-clamp-1">
                            {vendor.vicinity}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Second Column - Vendor Details */}
          <div className="w-1/3 overflow-y-auto bg-white">
            {selectedVendor ? (
              <div className="py-6 px-4 h-full">
                {/* Vendor Name and Metadata */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[#332B42]">
                      {selectedVendor.name}
                    </h5>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(vendorToFavoritesData(selectedVendor));
                      }}
                      className={`p-1.5 rounded-full transition-colors shadow-md ${
                        isFavorite(selectedVendor.id)
                          ? 'bg-white/90 text-pink-500 hover:text-pink-600'
                          : 'bg-white/80 text-gray-600 hover:bg-white'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite(selectedVendor.id) ? 'fill-current text-pink-500' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Rating, Reviews, and Price */}
                  <div className="flex items-center gap-2 text-sm text-[#7A7A7A]">
                    {/* Star Rating with Review Count */}
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{selectedVendor.rating} ({selectedVendor.totalReviews || 0})</span>
                    </div>
                    
                    {/* Price */}
                    <span>•</span>
                    <span>{selectedVendor.price}</span>
                  </div>
                </div>

                {/* Image Gallery */}
                <div className="mb-6">
                  <div className="grid grid-cols-3 gap-2 mb-4 h-48">
                    {/* Google-style layout: 1 large image + 2 smaller images + 1 more indicator */}
                    {(() => {
                      const images = loadedImages[selectedVendor.id] || selectedVendor.images || [];
                      const hasMoreImages = images.length > 3;
                      
                      // If no images, show placeholder
                      if (images.length === 0) {
                        return (
                          <div className="col-span-3 aspect-video bg-[#F3F2F0] rounded-lg flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-gray-400" />
                              </div>
                              <p className="text-sm">No images available</p>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {/* Main large image (left side) */}
                          <div className="col-span-2 row-span-2 bg-[#F3F2F0] rounded-lg overflow-hidden">
                            <img
                              src={images[0]}
                              alt={`${selectedVendor.name} - Main image`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Second image (top right) */}
                          <div className="col-span-1 row-span-1 bg-[#F3F2F0] rounded-lg overflow-hidden">
                            <img
                              src={images[1]}
                              alt={`${selectedVendor.name} - Image 2`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Third image or "more" indicator (bottom right) */}
                          <div 
                            className="col-span-1 row-span-1 bg-[#F3F2F0] rounded-lg overflow-hidden relative cursor-pointer"
                            onClick={async () => {
                              if (selectedVendor) {
                                console.log('View all clicked, loading images for:', selectedVendor.name);
                                await loadVendorImages(selectedVendor);
                                setShowImageGallery(true);
                              }
                            }}
                          >
                            {images[2] ? (
                              <>
                                <img
                                  src={images[2]}
                                  alt={`${selectedVendor.name} - Image 3`}
                                  className="w-full h-full object-cover"
                                />
                                {/* Overlay for "more" indicator */}
                                {hasMoreImages && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="text-white text-center">
                                      <div className="text-lg font-semibold">+{images.length - 3}</div>
                                      <div className="text-xs">more</div>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <div className="text-lg font-semibold">+{images.length - 2}</div>
                                  <div className="text-xs">more</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                </div>

                {/* Basic Details */}
                <div className="mb-6">
                  <h6 className="mb-4">
                    Basic Details
                  </h6>
                  <div className="space-y-3">
                    {selectedVendor.address && (
                      <div className="flex items-start gap-2 text-[#364257]">
                        <MapPin className="w-3 h-3 text-[#A85C36] mt-0.5 flex-shrink-0" />
                        <span className="text-sm break-words font-work">{selectedVendor.address}</span>
                      </div>
                    )}
                    {selectedVendor.phone && (
                      <div className="flex items-center gap-2 text-[#364257]">
                        <Phone className="w-3 h-3 text-[#A85C36] flex-shrink-0" />
                        <span className="text-sm font-work">{selectedVendor.phone}</span>
                      </div>
                    )}
                    {selectedVendor.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-[#A85C36] flex-shrink-0" />
                        <a 
                          href={selectedVendor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#A85C36] hover:text-[#784528] underline text-sm break-all font-work"
                        >
                          Website
                        </a>
                        {selectedVendor.googleUrl && (
                          <>
                            <span className="text-[#A85C36]">•</span>
                            <a 
                              href={selectedVendor.googleUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[#A85C36] hover:text-[#784528] underline text-sm break-all font-work"
                            >
                              View on Google
                            </a>
                          </>
                        )}
                      </div>
                    )}
                    {!selectedVendor.website && selectedVendor.googleUrl && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-[#A85C36] flex-shrink-0" />
                        <a 
                          href={selectedVendor.googleUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#A85C36] hover:text-[#784528] underline text-sm break-all font-work"
                        >
                          View on Google
                        </a>
                      </div>
                    )}
                    {selectedVendor.openingHours && selectedVendor.openingHours.weekday_text && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#364257]">
                          <Clock className="w-3 h-3 text-[#A85C36] flex-shrink-0" />
                          <span className="text-sm font-work">Hours:</span>
                        </div>
                        <div className="ml-5 space-y-1">
                          {selectedVendor.openingHours.weekday_text.map((day: string, index: number) => (
                            <p key={index} className="text-sm text-[#364257] font-work">{day}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* About / Reviews */}
                {(selectedVendor.description || (selectedVendor.reviews && selectedVendor.reviews.length > 0)) && (
                  <div className="mb-6">
                    <h6 className="mb-4">
                      About / Reviews
                    </h6>
                    
                    {/* About Description */}
                    {selectedVendor.description && (
                      <div className="mb-4">
                        <p className="text-[#364257] leading-relaxed text-sm break-words font-work">
                          {selectedVendor.description}
                        </p>
                      </div>
                    )}
                    
                    {/* Reviews */}
                    {selectedVendor.reviews && selectedVendor.reviews.length > 0 && (() => {
                      const { weddingReviews, otherReviews } = filterWeddingReviews(selectedVendor.reviews);
                      const reviewsToShow = weddingReviews.length > 0 ? weddingReviews : otherReviews;
                      const reviewType = weddingReviews.length > 0 ? 'Wedding Reviews' : 'Reviews';
                      
                      return (
                        <div className="space-y-3">
                          {weddingReviews.length > 0 && otherReviews.length > 0 && (
                            <div className="text-xs text-[#7A7A7A] font-work mb-2">
                              Showing {reviewType} ({weddingReviews.length} wedding, {otherReviews.length} other)
                            </div>
                          )}
                          {reviewsToShow.map((review, index) => (
                            <div key={index} className="border-l-2 border-[#A85C36] pl-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-[#7A7A7A] font-work">
                                  {review.author_name}
                                </span>
                              </div>
                              <p className="text-[#364257] leading-relaxed text-sm break-words font-work">
                                {review.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center text-gray-500">
                  <img 
                    src="/first.png" 
                    alt="Select a vendor" 
                    className="w-20 h-20 mx-auto mb-3 object-contain"
                  />
                  <p className="text-sm">Select a vendor to view details</p>
                </div>
              </div>
            )}
          </div>

          {/* Third Column - Google Maps */}
          <div className="w-5/12 bg-white">
            {currentVendors.length > 0 ? (
              <div className="relative h-full w-full">
                {/* Map with vendor pins */}
                <iframe
                  key={`${selectedVendor?.id || 'no-selection'}-${activeCategory}`}
                  src={(() => {
                    // Get the wedding location from generatedData
                    const weddingLocation = generatedData?.location || 'Washington DC';
                    
                    // If a vendor is selected and has coordinates, show place with marker using vendor name
                    if (selectedVendor && selectedVendor.coordinates) {
                      const { lat, lng } = selectedVendor.coordinates;
                      console.log('🗺️ Using vendor coordinates:', { lat, lng, vendorName: selectedVendor.name });
                      // Use vendor name in search to get proper info box, then center on coordinates
                      return `https://www.google.com/maps/embed/v1/search?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(selectedVendor.name + ' ' + weddingLocation)}&center=${lat},${lng}&zoom=15&maptype=roadmap`;
                    }
                    
                    // If a vendor is selected but no coordinates, fall back to search
                    if (selectedVendor) {
                      console.log('🗺️ No coordinates for vendor, using search:', { vendorName: selectedVendor.name, coordinates: selectedVendor.coordinates });
                      return `https://www.google.com/maps/embed/v1/search?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(selectedVendor.name + ' ' + weddingLocation)}&zoom=15&maptype=roadmap`;
                    }
                    
                    // Otherwise, show all vendors in the current category with pins
                    // Use search API with specific vendor names to get better results
                    if (currentVendors.length > 0) {
                      // Create a search query with actual vendor names
                      const vendorNames = currentVendors.slice(0, 3).map(vendor => vendor.name).join(' OR ');
                      const searchQuery = `${vendorNames} ${weddingLocation}`;
                      
                      console.log('🗺️ Creating vendor-specific search map:', { 
                        vendorNames: currentVendors.slice(0, 3).map(v => v.name),
                        category: activeCategory,
                        query: searchQuery
                      });
                      
                      return `https://www.google.com/maps/embed/v1/search?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(searchQuery)}&zoom=12&maptype=roadmap`;
                    }
                    
                    // Fallback to generic category search if no vendors available
                    const categorySearchMap: { [key: string]: string } = {
                      'venues': `wedding venues ${weddingLocation}`,
                      'photographers': `wedding photographers ${weddingLocation}`,
                      'florists': `wedding florists ${weddingLocation}`,
                      'caterers': `wedding caterers ${weddingLocation}`,
                      'music': `wedding musicians ${weddingLocation}`
                    };
                    
                    const searchQuery = categorySearchMap[activeCategory] || `wedding venues ${weddingLocation}`;
                    console.log('🗺️ Fallback to generic search API:', { category: activeCategory, query: searchQuery });
                    return `https://www.google.com/maps/embed/v1/search?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(searchQuery)}&zoom=12&maptype=roadmap`;
                  })()}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                  
                  {/* Vendor list overlay */}
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-10">
                    <h6 className="font-semibold text-sm text-[#332B42] mb-2">
                      {activeCategory === 'venues' ? 'Venues' : 
                       activeCategory === 'photographers' ? 'Photographers' :
                       activeCategory === 'florists' ? 'Florists' :
                       activeCategory === 'caterers' ? 'Caterers' :
                       activeCategory === 'music' ? 'Musicians' : activeCategory}
                    </h6>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {currentVendors.map((vendor) => (
                        <div 
                          key={vendor.id}
                          className={`flex items-center gap-2 p-1 rounded text-xs ${
                            selectedVendor?.id === vendor.id ? 'bg-[#F3F2F0]' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            selectedVendor?.id === vendor.id ? 'bg-[#A85C36]' : 'bg-[#332B42]'
                          }`}></div>
                          <span className="truncate">{vendor.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No vendors to display on map</p>
                  </div>
                </div>
              )}
            </div>
        </div>
        


        {/* Image Gallery Modal - Rendered using direct portal */}
        {showImageGallery && selectedVendor && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            style={{ pointerEvents: 'auto', zIndex: 99998 }}
            onClick={() => setShowImageGallery(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-playfair font-medium text-[#332B42]">
                    {selectedVendor.name} - Photo Gallery
                  </h3>
                  <button
                    onClick={() => setShowImageGallery(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Gallery Grid */}
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                  {loadedImages[selectedVendor.id] && loadedImages[selectedVendor.id].length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {loadedImages[selectedVendor.id].map((image, index) => (
                        <div 
                          key={index}
                          className="aspect-square bg-[#F3F2F0] rounded-lg overflow-hidden"
                        >
                          <img
                            src={image}
                            alt={`${selectedVendor.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <p>Loading images...</p>
                    </div>
                  )}
                </div>
            </div>
          </div>,
          document.body
        )}
      </motion.div>
    );
  }

  // Mobile swipe layout
  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full flex flex-col"
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-gray-200 pb-4 mb-4">
        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex-1 max-w-xs">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className="text-xs text-gray-600 font-medium">
            {remainingCount} left
          </span>
        </div>

        {/* Category Header */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <CategoryIcon className="w-3 h-3 text-white" />
          </div>
          <h4 className="h4 text-[#332B42]">
            {categoryDisplayNames[currentVendor.categoryKey] || `Recommended ${currentVendor.category || 'Vendors'}`}
          </h4>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Swipe right to like, left to skip. We'll save your favorites!
        </p>
      </div>

      {/* Vendor Card Stack - Flexible Content */}
      <div className="flex-1 relative mb-6">
        <div className="relative h-80">
        <AnimatePresence>
          {/* Next card (background) */}
          {allVendors[currentIndex + 1] && (
            <motion.div
              key={`next-${allVendors[currentIndex + 1].id}`}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 0.95, opacity: 0.7 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="absolute inset-0 bg-white rounded-[5px] shadow-lg border border-[#AB9C95] p-4"
            >
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <CategoryIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Next vendor</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Current card */}
          <motion.div
            key={`current-${currentVendor.id}`}
            initial={{ scale: 1, opacity: 1, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ 
              scale: 0.8, 
              opacity: 0, 
              rotate: currentVendor.id === swipedVendors[swipedVendors.length - 1]?.id ? 
                (isFavorite(currentVendor.id) ? 15 : -15) : 0,
              x: currentVendor.id === swipedVendors[swipedVendors.length - 1]?.id ? 
                (isFavorite(currentVendor.id) ? 300 : -300) : 0
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onPanEnd={(event, info) => handlePanEnd(event, info, currentVendor)}
            whileDrag={{ scale: 1.05, rotate: 5 }}
            className="absolute inset-0 bg-white rounded-[5px] shadow-xl border border-[#AB9C95] cursor-grab active:cursor-grabbing"
            onClick={handleCardClick}
          >
            <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
              {/* Front side */}
              <motion.div
                className="absolute inset-0 h-full flex flex-col"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 300, damping: 30 }}
                style={{ 
                  backfaceVisibility: 'hidden',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Image */}
                <div className="w-full h-32 bg-[#F3F2F0] rounded-t-[5px] flex items-center justify-center overflow-hidden">
                  {currentVendor.image && currentVendor.image !== '/Venue.png' && currentVendor.image.startsWith('http') ? (
                    <img
                      src={currentVendor.image}
                      alt={currentVendor.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Image failed to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                      onLoad={() => {
                        // Image loaded
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${currentVendor.image && currentVendor.image !== '/Venue.png' && currentVendor.image.startsWith('http') ? 'hidden' : ''}`}>
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <CategoryIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 w-full flex flex-col justify-between p-4">
                  <div>
                    <h6 className="h6 mb-1">
                      {currentVendor.name}
                    </h6>
                    
                    <div className="flex items-center gap-1 text-xs mb-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-[#A85C36]">{currentVendor.rating.toFixed(2)} ({currentVendor.totalReviews || 0})</span>
                    </div>
                    
                    {currentVendor.price && (
                      <div className="text-xs text-[#332B42] mb-1">{currentVendor.price}</div>
                    )}
                    
                    <div className="flex items-start gap-1 text-xs text-[#332B42] mb-1">
                      <span>{currentVendor.vicinity || currentVendor.address || 'Local area'}</span>
                    </div>
                    
                    {currentVendor.category && (
                      <div className="flex items-center gap-1 text-xs text-[#AB9C95] mb-1">
                        <span>{currentVendor.category}</span>
                      </div>
                    )}
                  </div>

                  {/* Swipe Instructions */}
                  <div className="text-center mt-4">
                    <div className="flex justify-center gap-3">
                      <div className="flex items-center gap-1 text-red-500">
                        <X className="w-3 h-3" />
                        <span className="text-xs">Pass</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-500">
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">Like</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Tap to see more details</p>
                  </div>
                </div>
              </motion.div>

              {/* Back side */}
              <motion.div
                className="absolute inset-0 h-full flex flex-col"
                animate={{ rotateY: isFlipped ? 0 : -180 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 300, damping: 30 }}
                style={{ 
                  backfaceVisibility: 'hidden',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="flex-1 w-full flex flex-col p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="h6">{currentVendor.name}</h6>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFlipped(false);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {currentVendor.description && (
                      <div>
                        <h6 className="text-sm font-semibold text-[#332B42] mb-1">About</h6>
                        <p className="text-xs text-gray-600">{currentVendor.description}</p>
                      </div>
                    )}
                    
                    {currentVendor.address && (
                      <div>
                        <h6 className="text-sm font-semibold text-[#332B42] mb-1">Address</h6>
                        <p className="text-xs text-gray-600">{currentVendor.address}</p>
                      </div>
                    )}
                    
                    {currentVendor.phone && (
                      <div>
                        <h6 className="text-sm font-semibold text-[#332B42] mb-1">Phone</h6>
                        <p className="text-xs text-gray-600">{currentVendor.phone}</p>
                      </div>
                    )}
                    
                    {currentVendor.website && (
                      <div>
                        <h6 className="text-sm font-semibold text-[#332B42] mb-1">Website</h6>
                        <a 
                          href={currentVendor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-[#A85C36] hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-4">
                    <p className="text-xs text-gray-500 text-center">Tap to flip back</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>


    </motion.div>
    

    {/* Image Gallery Modal - Rendered using direct portal */}
    {showImageGallery && selectedVendor && typeof window !== 'undefined' && createPortal(
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
        style={{ pointerEvents: 'auto', zIndex: 99998 }}
        onClick={() => setShowImageGallery(false)}
      >
        <div 
          className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-playfair font-medium text-[#332B42]">
                {selectedVendor.name} - Photo Gallery
              </h3>
              <button
                onClick={() => setShowImageGallery(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Gallery Grid */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadedImages[selectedVendor.id] && loadedImages[selectedVendor.id].length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {loadedImages[selectedVendor.id].map((image, index) => (
                    <div 
                      key={index}
                      className="aspect-square bg-[#F3F2F0] rounded-lg overflow-hidden"
                    >
                      <img
                        src={image}
                        alt={`${selectedVendor.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <p>Loading images...</p>
                </div>
              )}
            </div>
        </div>
      </div>,
      document.body
    )}
    
    </>
  );
};

export default VendorSwipeInterface;
