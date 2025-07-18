"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MapPin, Globe, Star, ExternalLink, ChevronLeft, ChevronRight, Grid, X } from 'lucide-react';
import VendorContactModal from '@/components/VendorContactModal';
import { useCustomToast } from '@/hooks/useCustomToast';
import Breadcrumb from '@/components/Breadcrumb';
import CategoryPill from '@/components/CategoryPill';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to map Google Places types to our category names
const mapGoogleTypesToCategory = (types: string[]): string => {
  if (!types || types.length === 0) return 'Other';
  
  const typeMap: Record<string, string> = {
    'restaurant': 'Reception Venue',
    'bakery': 'Baker',
    'jewelry_store': 'Jeweler',
    'hair_care': 'Hair Stylist',
    'clothing_store': 'Dress Shop',
    'beauty_salon': 'Beauty Salon',
    'spa': 'Spa',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'car_rental': 'Transportation',
    'travel_agency': 'Travel Agency',
    'wedding_planner': 'Wedding Planner',
    'officiant': 'Officiant',
    'suit_rental': 'Suit & Tux Rental',
    'makeup_artist': 'Makeup Artist',
    'stationery': 'Stationery',
    'rentals': 'Event Rental',
    'favors': 'Wedding Favor',
    'band': 'Musician',
    'dj': 'DJ'
  };
  
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }
  
  return 'Other';
};

// Helper function to convert category name to URL slug
const categoryToSlug = (category: string): string => {
  return category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Helper function to map display category back to Google Places type for URL
const getCategorySlug = (displayCategory: string): string => {
  const categoryToGoogleType: Record<string, string> = {
    'Reception Venue': 'restaurant',
    'Baker': 'bakery',
    'Jeweler': 'jewelry_store',
    'Hair Stylist': 'hair_care',
    'Dress Shop': 'clothing_store',
    'Beauty Salon': 'beauty_salon',
    'Spa': 'spa',
    'Photographer': 'photographer',
    'Florist': 'florist',
    'Caterer': 'caterer',
    'Transportation': 'car_rental',
    'Travel Agency': 'travel_agency',
    'Wedding Planner': 'wedding_planner',
    'Officiant': 'officiant',
    'Suit & Tux Rental': 'suit_rental',
    'Makeup Artist': 'makeup_artist',
    'Stationery': 'stationery',
    'Event Rental': 'rentals',
    'Wedding Favor': 'favors',
    'Musician': 'band',
    'DJ': 'dj'
  };
  
  return categoryToGoogleType[displayCategory] || categoryToSlug(displayCategory);
};

// Helper function to get the plural form for breadcrumb consistency
const getCategoryLabel = (displayCategory: string): string => {
  const categoryToPlural: Record<string, string> = {
    'Reception Venue': 'Reception Venues',
    'Baker': 'Bakeries & Cakes',
    'Jeweler': 'Jewelers',
    'Hair Stylist': 'Hair & Beauty',
    'Dress Shop': 'Bridal Salons',
    'Beauty Salon': 'Beauty Salons',
    'Spa': 'Spas',
    'Photographer': 'Photographers',
    'Florist': 'Florists',
    'Caterer': 'Catering',
    'Transportation': 'Car Rentals',
    'Travel Agency': 'Travel Agencies',
    'Wedding Planner': 'Wedding Planners',
    'Officiant': 'Officiants',
    'Suit & Tux Rental': 'Suit & Tux Rentals',
    'Makeup Artist': 'Makeup Artists',
    'Stationery': 'Stationery & Invitations',
    'Event Rental': 'Event Rentals',
    'Wedding Favor': 'Wedding Favors',
    'Musician': 'Bands',
    'DJ': 'DJs',
    'Videographer': 'Videographers'
  };
  
  return categoryToPlural[displayCategory] || displayCategory;
};

interface VendorDetails {
  id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  guestCapacity?: string;
  price?: string;
  amenities?: string[];
  source?: { name: string; url: string };
  category: string;
  address?: string;
  website?: string;
  about?: string;
  images?: string[];
  currentImageIndex?: number;
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showErrorToast, showSuccessToast } = useCustomToast();
  const { user } = useAuth();
  const placeId = params?.placeId as string;
  const location = searchParams?.get('location') || '';
  
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);

  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Check if vendor is in user's favorites on mount
  useEffect(() => {
    if (vendor && typeof window !== 'undefined') {
      const favs = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      setIsFavorite(favs.includes(vendor.id));
    }
  }, [vendor?.id]);
  const [communityData, setCommunityData] = useState<any>(null);

  // Handle escape key to close gallery
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImageGallery) {
        setShowImageGallery(false);
      }
    };

    if (showImageGallery) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showImageGallery]);

  // Mock data for now - replace with actual API call
  const mockVendor: VendorDetails = {
    id: placeId,
    name: "The Milestone | Aubrey by Walters Wedding Estates",
    rating: 4.8,
    reviewCount: 129,
    guestCapacity: "300+ Guests",
    price: "$",
    amenities: ["Outdoor Event Space"],
    source: { name: "The Knot", url: "https://www.theknot.com/" },
    category: "Reception Venue",
    address: "1301 W Sherman Drive, Aubrey, TX",
    website: "https://www.themilestone.com",
    about: "The Milestone Mansion is a stunning Georgian Estate-style Mansion sitting on 52 acres in the Aubrey countryside, nestled between towering oak trees. Two of our private suites, comfortable for your entire wedding party and family, while your guests arrive into the grand foyer to mix and mingle...",
    images: [
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png",
      "/Venue.png"
    ]
  };

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        setLoading(true);
        
        // For testing, use mock data if placeId is not a real Google Places ID
        if (!placeId || placeId.length < 10) {
          setVendor(mockVendor);
          setLoading(false);
          return;
        }
        
        // Fetch vendor details from Google Places API
        const response = await fetch(`/api/google-place-details?placeId=${placeId}`);
        const data = await response.json();
        
        if (data.error || data.status === 'ZERO_RESULTS') {
          setVendor(mockVendor);
          setLoading(false);
          return;
        }
        
        if (!data.result) {
          setVendor(mockVendor);
          setLoading(false);
          return;
        }
        
        // Transform Google Places data to our vendor format
        const vendorDetails: VendorDetails = {
          id: placeId,
          name: data.result?.name || 'Unknown Vendor',
          rating: data.result?.rating,
          reviewCount: data.result?.user_ratings_total,
          price: data.result?.price_level ? '$'.repeat(data.result.price_level) : undefined,
          amenities: data.result?.types || [],
          category: mapGoogleTypesToCategory(data.result?.types || []),
          address: data.result?.formatted_address,
          website: data.result?.website,
          about: data.result?.editorial_summary?.overview || 'The Milestone Mansion is a stunning Georgian Estate-style Mansion sitting on 52 acres in the Aubrey countryside, nestled between towering oak trees. Two of our private suites, comfortable for your entire wedding party and family, while your guests arrive into the grand foyer to mix and mingle...',
          images: [
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png",
            "/Venue.png"
          ]
        };
        
        // Fetch photos separately
        try {
          const photosResponse = await fetch(`/api/vendor-photos/${placeId}`);
          const photosData = await photosResponse.json();
          if (photosData.images && photosData.images.length > 0) {
            vendorDetails.images = photosData.images;
          }
        } catch (error) {
          console.error('Error fetching vendor photos:', error);
          // Keep default images if photo fetch fails
        }
        
        setVendor(vendorDetails);
        
        // Fetch community vendor data
        try {
          const communityResponse = await fetch(`/api/community-vendors?placeId=${placeId}`);
          const communityData = await communityResponse.json();
          if (communityData.vendor) {
            setCommunityData(communityData.vendor);
          }
        } catch (error) {
          console.error('Error fetching community data:', error);
        }
      } catch (error) {
        console.error('Error fetching vendor details:', error);
        // Use a try-catch for the toast to avoid infinite loops
        try {
          showErrorToast('Failed to load vendor details');
        } catch (toastError) {
          console.error('Toast error:', toastError);
        }
        // Fallback to mock data for now
        setVendor(mockVendor);
      } finally {
        setLoading(false);
      }
    };

    if (placeId) {
      fetchVendorDetails();
    }
  }, [placeId]); // Removed showErrorToast dependency

  const handlePreviousImage = () => {
    if (vendor?.images) {
      setCurrentImageIndex(prev => 
        prev === 0 ? vendor.images!.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (vendor?.images) {
      setCurrentImageIndex(prev => 
        prev === vendor.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const toggleFavorite = async () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    // Show toast message
    if (newFavoriteState) {
      showSuccessToast(`Added ${vendor?.name} to favorites!`);
    } else {
      showSuccessToast(`Removed ${vendor?.name} from favorites`);
    }
    
    // Update community favorites count
    if (vendor && user?.uid) {
      try {
        const response = await fetch('/api/community-vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
          placeId: vendor.id,
          vendorName: vendor.name,
          vendorAddress: vendor.address || '',
          vendorCategory: vendor.category,
          userId: user.uid,
          selectedAsVenue: false,
          selectedAsVendor: false,
          isFavorite: newFavoriteState // Add to favorites if favoriting
        })
        });
        
        if (response.ok) {
          // Refresh community data
          const communityResponse = await fetch(`/api/community-vendors?placeId=${vendor.id}`);
          const communityData = await communityResponse.json();
          if (communityData.vendor) {
            setCommunityData(communityData.vendor);
          }
        }
      } catch (error) {
        console.error('Error updating community favorites:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linen">
        <div className="app-content-container py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded mb-6"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-linen">
        <div className="app-content-container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-playfair text-[#332B42] mb-4">Vendor Not Found</h1>
            <p className="text-[#364257] mb-4">The vendor you're looking for doesn't exist or has been removed.</p>
            <button 
              onClick={() => router.back()}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      <div className="app-content-container py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Vendor Search', href: '/vendors/catalog' },
            { 
              label: location ? `${getCategoryLabel(vendor.category)} in ${location}` : getCategoryLabel(vendor.category), 
              href: location ? `/vendors/catalog/${getCategorySlug(vendor.category)}?location=${encodeURIComponent(location)}` : `/vendors/catalog/${getCategorySlug(vendor.category)}` 
            },
            { label: vendor.name, isCurrent: true }
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Vendor Details */}
          <div className="lg:col-span-2">
            {/* Vendor Name and Overview */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4>
                  {vendor.name}
                </h4>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFavorite}
                    className={`btn-primaryinverse ${
                      isFavorite ? 'bg-[#A85C36] text-white border-[#A85C36]' : ''
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </button>

                  <button
                    onClick={() => setShowContactModal(true)}
                    className="btn-primary"
                  >
                    Contact
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                {vendor.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{vendor.rating} ({vendor.reviewCount})</span>
                  </div>
                )}
                <CategoryPill category={vendor.category} />
                {location && (
                  <div className="flex items-center gap-1 text-sm text-[#364257]">
                    <span>in</span>
                    <MapPin className="w-3 h-3" />
                    <span>{location}</span>
                  </div>
                )}
                {/* Community Favorites Metadata */}
                {communityData && communityData.totalFavorites > 0 && (
                  <div className="flex items-center gap-1 text-sm text-[#364257]">
                    <Heart className="w-3 h-3 text-pink-500 fill-current" />
                    <span>{communityData.totalFavorites} {communityData.totalFavorites === 1 ? 'user' : 'users'}</span>
                  </div>
                )}
              </div>


            </div>

            {/* Image Gallery */}
            <div className="mb-8">
              <div className="relative h-96 bg-[#F3F2F0] rounded-lg overflow-hidden mb-4">
                {vendor.images && vendor.images.length > 0 && (
                  <>
                    <img
                      src={vendor.images[currentImageIndex]}
                      alt={`${vendor.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navigation Arrows */}
                    <button
                      onClick={handlePreviousImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Image Counter and Actions */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#364257]">
                  {currentImageIndex + 1} of {vendor.images?.length || 0}
                </span>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-3 py-1 text-sm text-[#364257] hover:text-[#A85C36] transition-colors">
                    <MapPin className="w-3 h-3" />
                    Map
                  </button>
                  <button 
                    onClick={() => setShowImageGallery(true)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-[#364257] hover:text-[#A85C36] transition-colors"
                  >
                    <Grid className="w-3 h-3" />
                    View all
                  </button>
                </div>
              </div>
            </div>

            {/* Basic Details */}
            <div className="mb-8">
              <h2 className="text-xl font-playfair font-medium text-[#332B42] mb-4">
                Basic Details
              </h2>
              <div className="space-y-3">
                {vendor.address && (
                  <div className="flex items-center gap-2 text-[#364257]">
                    <MapPin className="w-3 h-3 text-[#A85C36]" />
                    <span>{vendor.address}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-[#A85C36]" />
                    <a 
                      href={vendor.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#A85C36] hover:text-[#784528] underline"
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* About */}
            {vendor.about && (
              <div className="mb-8">
                <h2 className="text-xl font-playfair font-medium text-[#332B42] mb-4">
                  About
                </h2>
                <p className="text-[#364257] leading-relaxed">
                  {vendor.about}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Comments */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-playfair font-medium text-[#332B42] mb-4">
                Comments
              </h3>
              
              {/* Comments Area */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 min-h-[200px]">
                <p className="text-sm text-gray-500 text-center">
                  No comments yet. Be the first to share your experience!
                </p>
              </div>

              {/* Add Comment */}
              <div className="space-y-3">
                <textarea
                  placeholder="Add a comment. To tag someone enter @ and add their names."
                  className="w-full p-3 border border-[#AB9C95] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent"
                  rows={3}
                />
                <button className="flex items-center gap-2 px-4 py-2 bg-[#332B42] text-white rounded-lg hover:bg-[#2A2335] transition-colors">
                  <span className="text-sm font-medium">Send</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && vendor && (
        <VendorContactModal
          vendor={vendor}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {/* Image Gallery Modal */}
      <AnimatePresence>
        {showImageGallery && vendor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImageGallery(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-playfair font-medium text-[#332B42]">
                  {vendor.name} - Photo Gallery
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {vendor.images?.map((image, index) => (
                    <div 
                      key={index}
                      className="aspect-square bg-[#F3F2F0] rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setShowImageGallery(false);
                      }}
                    >
                      <img
                        src={image}
                        alt={`${vendor.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 