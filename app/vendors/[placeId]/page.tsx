"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MapPin, Globe, Star, ExternalLink, ChevronLeft, ChevronRight, Grid, X, BadgeCheck } from 'lucide-react';
import VendorContactModal from '@/components/VendorContactModal';
import { useCustomToast } from '@/hooks/useCustomToast';
import Breadcrumb from '@/components/Breadcrumb';
import CategoryPill from '@/components/CategoryPill';
import WeddingBanner from '@/components/WeddingBanner';
import RelatedVendorsSection from '@/components/RelatedVendorsSection';
import VendorComments from '@/components/VendorComments';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  isLikelyWeddingVenue, 
  mapGoogleTypesToCategory, 
  categoryToSlug, 
  getCategorySlug, 
  getCategoryLabel,
  addRecentlyViewedVendor 
} from '@/utils/vendorUtils';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useVendorDetails } from '@/hooks/useVendorCache';
import { generateVendorDetailBreadcrumbs } from '@/utils/breadcrumbUtils';
import { fetchVendorPhotos, fetchCommunityVendor, checkVendorExists } from '@/utils/apiService';

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
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);
  
  // Get user's wedding location from profile data
  const { weddingLocation: userWeddingLocation } = useUserProfileData();
  
  const placeId = params?.placeId as string;
  const location = searchParams?.get('location') || '';
  const categoryFromUrl = searchParams?.get('category') || '';
  const photoRefFromUrl = searchParams?.get('photoRef') || '';
  
  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOfficialVendor, setIsOfficialVendor] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [communityData, setCommunityData] = useState<any>(null);



  // Check if vendor is in user's favorites on mount
  useEffect(() => {
    if (!vendor || !user?.uid) return;
    
    // Check if vendor is favorited
    const favorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    console.log('Checking favorites for vendor:', vendor.id, 'Current favorites:', favorites);
    const isVendorFavorited = favorites.includes(vendor.id);
    console.log('Setting isFavorite to:', isVendorFavorited);
    setIsFavorite(isVendorFavorited);
    
    // Check if vendor is an official vendor (in user's vendors list)
    const checkIfOfficialVendor = async () => {
      try {
        console.log('Checking if vendor is official:', vendor.id, 'for user:', user.uid);
        // Check if vendor exists in user's My Vendors collection using optimized API service
        const data = await checkVendorExists(vendor.id, user.uid);
        console.log('Vendor existence check result:', data);
        if ((data as any).exists) {
          console.log('Setting isOfficialVendor to true');
          setIsOfficialVendor(true);
        } else {
          console.log('Setting isOfficialVendor to false');
          setIsOfficialVendor(false);
        }
        
        // Mark data as loaded after official vendor check
        setDataLoaded(true);
      } catch (error) {
        console.error('Error checking official vendor status:', error);
        setDataLoaded(true);
      }
    };
    
    checkIfOfficialVendor();
  }, [vendor, user]);

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



  // Use optimized vendor details hook
  const { vendorDetails: googleData, error: vendorError, isLoading: vendorLoading } = useVendorDetails(placeId);

  // Process vendor data from the hook
  useEffect(() => {
    if (!placeId) return;



    // Debug: Log the googleData state
    console.log('🔍 Vendor Detail Debug:', {
      placeId,
      googleData: !!googleData,
      googleDataStatus: googleData?.status,
      googleDataError: googleData?.error,
      googleDataResult: !!googleData?.result,
      vendorError,
      vendorLoading,
      googleDataKeys: googleData ? Object.keys(googleData) : 'no data'
    });

    // Use cached vendor details from hook
    if (!googleData || googleData.status !== 'OK' || !googleData.result) {
      console.log('❌ Falling back to error state because:', {
        noGoogleData: !googleData,
        statusNotOK: googleData?.status !== 'OK',
        noResult: !googleData?.result,
        actualStatus: googleData?.status
      });
      
      if (vendorError) {
        console.error('Vendor details error:', vendorError);
      }
      if (vendorLoading) {
        console.log('⏳ Still loading vendor data...');
        setLoading(true);
        return;
      }
      // Show error state if we're not loading and have an error
      setError('Failed to load vendor details');
      setLoading(false);
      return;
    }

    console.log('✅ Using real vendor data:', googleData.result?.name);

    // Transform Google Places data to our vendor format
    const vendorDetails: VendorDetails = {
      id: placeId,
      name: googleData.result?.name || 'Unknown Vendor',
      rating: googleData.result?.rating,
      reviewCount: googleData.result?.user_ratings_total,
      price: googleData.result?.price_level ? '$'.repeat(googleData.result.price_level) : undefined,
      amenities: googleData.result?.types || [],
      category: mapGoogleTypesToCategory(googleData.result?.types || [], googleData.result?.name),
      address: googleData.result?.formatted_address,
      website: googleData.result?.website,
      about: (() => {
        // Use Google's editorial summary if available (best quality)
        if (googleData.result?.editorial_summary?.overview) {
          return googleData.result.editorial_summary.overview;
        }

        // Enhanced template-based description using Google data
        const venueName = googleData.result?.name || 'this venue';
        const rating = googleData.result?.rating;
        const reviewCount = googleData.result?.user_ratings_total;
        const types = googleData.result?.types || [];
        const category = mapGoogleTypesToCategory(types, venueName);
        const priceLevel = googleData.result?.price_level;
        const businessStatus = googleData.result?.business_status;
        const openingHours = googleData.result?.opening_hours;
        
        // Start with a more engaging description
        let description = `${venueName}`;
        
        // Add category-specific context
        if (category === 'Venue' || category === 'Reception Venue') {
          description += ` is a premier ${category.toLowerCase()}`;
        } else if (category === 'Photographer') {
          description += ` is a talented ${category.toLowerCase()}`;
        } else if (category === 'Florist') {
          description += ` is a creative ${category.toLowerCase()}`;
        } else if (category === 'Caterer') {
          description += ` is an experienced ${category.toLowerCase()}`;
        } else if (category === 'Baker') {
          description += ` is a skilled ${category.toLowerCase()}`;
        } else if (category === 'DJ') {
          description += ` is a professional ${category.toLowerCase()}`;
        } else if (category === 'Beauty Salon') {
          description += ` is a luxurious ${category.toLowerCase()}`;
        } else if (category === 'Officiant') {
          description += ` is a dedicated ${category.toLowerCase()}`;
        } else {
          description += ` is a trusted ${category.toLowerCase()}`;
        }
        
        // Add location context
        if (googleData.result?.vicinity) {
          description += ` located in ${googleData.result.vicinity}`;
        }
        
        // Add price level context
        if (priceLevel !== undefined) {
          const priceDescriptions = {
            0: 'offering budget-friendly options',
            1: 'providing affordable services',
            2: 'delivering quality at a fair price',
            3: 'offering premium services',
            4: 'providing luxury experiences'
          };
          description += `, ${priceDescriptions[priceLevel] || 'offering excellent value'}`;
        }
        
        // Add rating context with more personality
        if (rating && reviewCount) {
          if (rating >= 4.5) {
            description += `. With an outstanding ${rating}-star rating from ${reviewCount} satisfied customers`;
          } else if (rating >= 4.0) {
            description += `. With a strong ${rating}-star rating from ${reviewCount} happy clients`;
          } else {
            description += `. With a ${rating}-star rating from ${reviewCount} reviews`;
          }
        } else if (rating) {
          description += `. With a ${rating}-star rating`;
        }
        
        // Add business status context
        if (businessStatus === 'OPERATIONAL') {
          description += ', they are actively serving couples';
        } else if (businessStatus === 'CLOSED_TEMPORARILY') {
          description += ' (currently closed temporarily)';
        }
        
        // Add opening hours context for wedding-relevant businesses
        if (openingHours?.weekday_text && (category === 'Venue' || category === 'Beauty Salon' || category === 'Photographer')) {
          const hasWeekendHours = openingHours.weekday_text.some(day => day.includes('Saturday') || day.includes('Sunday'));
          if (hasWeekendHours) {
            description += ' and offer weekend availability for your special day';
          }
        }
        
        // Add category-specific value propositions
        if (category === 'Venue' || category === 'Reception Venue') {
          description += '. Their elegant spaces provide the perfect backdrop for unforgettable wedding celebrations';
        } else if (category === 'Photographer') {
          description += '. They specialize in capturing the authentic moments and emotions that make your wedding day truly special';
        } else if (category === 'Florist') {
          description += '. Their artistic floral designs bring beauty and elegance to every wedding celebration';
        } else if (category === 'Caterer') {
          description += '. They create memorable dining experiences that delight your guests and complement your special day';
        } else if (category === 'Baker') {
          description += '. Their custom wedding cakes and desserts are crafted with care to sweeten your celebration';
        } else if (category === 'DJ') {
          description += '. They keep the celebration alive with music that gets everyone dancing and creates lasting memories';
        } else if (category === 'Beauty Salon') {
          description += '. They help brides and wedding parties look and feel their most beautiful on the big day';
        } else if (category === 'Officiant') {
          description += '. They create personalized ceremonies that reflect your love story and make your wedding day meaningful';
        } else {
          description += '. They are committed to making your wedding day everything you\'ve dreamed of';
        }
        
        description += '.';
        
        return description;
      })(),
      images: photoRefFromUrl 
        ? [
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRefFromUrl}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
            ...Array(15).fill("/Venue.png") // Fill remaining slots with placeholder
          ]
        : googleData.result?.photos && googleData.result.photos.length > 0
        ? [
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${googleData.result.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
            ...Array(15).fill("/Venue.png") // Fill remaining slots with placeholder
          ]
        : Array(16).fill("/Venue.png")
    };

    // Fetch photos and community data in parallel using optimized API service
    const fetchAdditionalData = async () => {
      try {
        console.log('🖼️ Fetching additional vendor data for:', placeId);
        
        // Test the photos API directly first
        try {
          const photosResponse = await fetch(`/api/vendor-photos/${placeId}`);
          const photosData = await photosResponse.json();
          console.log('📸 Direct photos API response:', photosResponse.status, photosData);
        } catch (error) {
          console.error('❌ Direct photos API error:', error);
        }
        
        const [photosData, communityData] = await Promise.all([
          fetchVendorPhotos(placeId),
          fetchCommunityVendor(placeId)
        ]);
        
        console.log('📸 Photos data:', photosData);
        console.log('👥 Community data:', communityData);
        
        if ((photosData as any).images && (photosData as any).images.length > 0) {
          console.log('✅ Setting vendor images:', (photosData as any).images.length, 'images');
          // Keep the first image from the catalog page approach, add additional images
          const additionalImages = (photosData as any).images.slice(1, 16); // Skip first image, take up to 15 more
          const allImages = [
            vendorDetails.images?.[0] || '/Venue.png', // Keep the first image (same as catalog)
            ...additionalImages
          ];
          
          // Update the vendor state with new images
          setVendor(prev => ({
            ...prev!,
            images: allImages
          }));
        } else {
          console.log('❌ No additional photos found, keeping first image from catalog approach');
        }
        
        if ((communityData as any).vendor) {
          console.log('✅ Setting community data');
          setCommunityData((communityData as any).vendor);
        } else {
          console.log('❌ No community data found');
        }
      } catch (error) {
        console.error('❌ Error fetching vendor photos or community data:', error);
        // Keep default images if photo fetch fails
      }
    };

    console.log('🎯 Setting vendor details:', {
      name: vendorDetails.name,
      imageCount: vendorDetails.images?.length || 0,
      firstImage: vendorDetails.images?.[0]
    });
    
    setVendor(vendorDetails);
    setLoading(false);
    
    // Add to recently viewed vendors
    addRecentlyViewedVendor({
      ...vendorDetails,
      image: vendorDetails.images?.[0] || '/Venue.png',
      mainTypeLabel: vendorDetails.category,
      source: { name: 'Google Places', url: '' }
    });

    // Fetch additional data in background
    console.log('🚀 Starting to fetch additional data...');
    fetchAdditionalData().then(() => {
      console.log('✅ Additional data fetch completed');
    }).catch((error) => {
      console.error('❌ Additional data fetch failed:', error);
    });
  }, [placeId, googleData, vendorError, vendorLoading]);

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
    console.log('toggleFavorite function called!');
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    // Update localStorage
    try {
      const favorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      if (newFavoriteState) {
        // Add to favorites if not already there
        if (!favorites.includes(vendor?.id)) {
          favorites.push(vendor?.id);
        }
      } else {
        // Remove from favorites
        const index = favorites.indexOf(vendor?.id);
        if (index > -1) {
          favorites.splice(index, 1);
        }
      }
      localStorage.setItem('vendorFavorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error updating localStorage favorites:', error);
    }
    
    // Show toast message
    if (newFavoriteState) {
      showSuccessToast(`Added ${vendor?.name} to favorites!`);
    } else {
      showSuccessToast(`Removed ${vendor?.name} from favorites`);
    }
    
    // Update community favorites count
    if (vendor && user?.uid) {
      try {
        console.log('Updating community favorites for vendor:', vendor.id, 'new state:', newFavoriteState);
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
          console.log('Community update successful, refreshing data...');
          // Refresh community data
          const communityResponse = await fetch(`/api/community-vendors?placeId=${vendor.id}`);
          const communityData = await communityResponse.json();
          console.log('Refreshed community data:', communityData);
          if (communityData.vendor) {
            setCommunityData(communityData.vendor);
            console.log('Updated community data state:', communityData.vendor);
            console.log('totalFavorites value:', communityData.vendor.totalFavorites);
            console.log('All community data fields:', Object.keys(communityData.vendor));
            console.log('Full community data object:', JSON.stringify(communityData.vendor, null, 2));
          } else {
            console.log('No vendor data in community response');
          }
        } else {
          console.error('Community update failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error updating community favorites:', error);
      }
    }
  };

  const toggleOfficialVendor = async () => {
    if (!vendor || !user?.uid) return;

    const newOfficialState = !isOfficialVendor;
    setIsOfficialVendor(newOfficialState);

    // Show toast message
    if (newOfficialState) {
      toast.success(`Marked as Official Vendor and Added to My Vendors!`);
    } else {
      toast.success(`Removed as Official Vendor and Removed from My Vendors!`);
    }

    try {
      if (newOfficialState) {
        // Add vendor to My Vendors
        const { addVendorToUserAndCommunity } = await import('@/lib/addVendorToUserAndCommunity');
        const result = await addVendorToUserAndCommunity({
          userId: user.uid,
          vendorMetadata: {
            place_id: vendor.id,
            name: vendor.name,
            formatted_address: vendor.address || '',
            website: vendor.website || '',
            formatted_phone_number: '',
            rating: vendor.rating,
            user_ratings_total: vendor.reviewCount,
            types: vendor.amenities || []
            // photos will be fetched by the function using place_id
          },
          category: vendor.category,
          selectedAsVenue: false,
          selectedAsVendor: false
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to add vendor');
        }
      } else {
        // Remove vendor from My Vendors
        // We'll need to implement this - for now, just update community status
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
            isOfficialVendor: false
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update community status');
        }
      }

      // Update community data
      const communityResponse = await fetch(`/api/community-vendors?placeId=${vendor.id}`);
      const communityData = await communityResponse.json();
      if (communityData.vendor) {
        setCommunityData(communityData.vendor);
      }
    } catch (error) {
      console.error('Error updating official vendor status:', error);
      // Revert state on error
      setIsOfficialVendor(!newOfficialState);
      toast.error('Failed to update official vendor status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linen">
        <div className="max-w-6xl mx-auto">
          <div className="app-content-container py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-96 bg-gray-200 rounded mb-6"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-linen">
        <div className="max-w-6xl mx-auto">
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
      <div className="max-w-6xl mx-auto">
        <div className="app-content-container py-8">
          {/* Breadcrumb */}
          <Breadcrumb
            items={generateVendorDetailBreadcrumbs({
              category: categoryFromUrl,
              location: userWeddingLocation || location,
              vendorName: vendor.name,
              vendorTypes: vendor.amenities,
              vendorAddress: vendor.address,
              userWeddingLocation: userWeddingLocation || undefined
            })}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Vendor Details */}
            <div className="lg:col-span-2">
              {/* Vendor Name and Overview */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-6 mb-4">
                  <h4 className="flex-1 min-w-0">
                    {vendor.name}
                  </h4>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Official Vendor Toggle */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {isOfficialVendor && dataLoaded && (
                          <BadgeCheck className="w-3 h-3 text-[#A85C36]" />
                        )}
                        <span className="text-xs text-[#364257]">Official Vendor</span>
                      </div>
                      {dataLoaded ? (
                        <button
                          onClick={toggleOfficialVendor}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:ring-offset-2 ${
                            isOfficialVendor ? 'bg-[#A85C36]' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              isOfficialVendor ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="h-6 w-11 bg-gray-200 rounded-full animate-pulse" />
                      )}
                    </div>

                    {dataLoaded ? (
                      <button
                        onClick={toggleFavorite}
                        className={`btn-primaryinverse ${
                          isFavorite ? 'bg-[#A85C36] text-white border-[#A85C36]' : ''
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${isFavorite ? 'fill-white' : ''}`} />
                        {isFavorite ? 'Favorited' : 'Favorite'}
                      </button>
                    ) : (
                      <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                    )}

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
                  {communityData?.totalFavorites > 0 && (
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-[#A85C36]" />
                      <span className="text-sm text-[#364257]">{communityData.totalFavorites} favorited</span>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-1 text-sm text-[#364257]">
                      <span>in</span>
                      <MapPin className="w-3 h-3" />
                      <span>{location}</span>
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
                <h5 className="mb-4">
                  Basic Details
                </h5>
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
                  <h5 className="mb-4">
                    About
                  </h5>
                  <p className="text-[#364257] leading-relaxed">
                    {vendor.about}
                  </p>
                </div>
              )}

              {/* Related Vendors */}
              <RelatedVendorsSection
                currentVendorId={vendor.id}
                category={vendor.category}
                location={userWeddingLocation || location}
              />
            </div>

            {/* Right Column - Comments */}
            <div className="lg:col-span-1 sticky top-4 h-[calc(100vh-14rem)]">
              {vendor && (
                <VendorComments 
                  vendorId={vendor.id} 
                  vendorName={vendor.name} 
                />
              )}
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