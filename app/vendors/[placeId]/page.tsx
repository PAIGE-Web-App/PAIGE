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
import { toast } from 'react-hot-toast';

// Helper function to detect if a venue is likely a wedding venue based on name
const isLikelyWeddingVenue = (name: string): boolean => {
  const venueKeywords = [
    'vineyard', 'winery', 'estate', 'mansion', 'manor', 'castle', 'palace',
    'garden', 'farm', 'ranch', 'barn', 'lodge', 'resort', 'hotel', 'inn',
    'club', 'hall', 'center', 'venue', 'wedding', 'events', 'reception',
    'ballroom', 'terrace', 'pavilion', 'gazebo', 'chapel', 'church'
  ];
  
  const lowerName = name.toLowerCase();
  return venueKeywords.some(keyword => lowerName.includes(keyword));
};

const mapGoogleTypesToCategory = (types: string[], venueName?: string): string => {
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
    'dj': 'DJ',
    // Specific venue types
    'lodging': 'Venue',
    'tourist_attraction': 'Venue',
    'amusement_park': 'Venue',
    'aquarium': 'Venue',
    'art_gallery': 'Venue',
    'museum': 'Venue',
    'park': 'Venue',
    'zoo': 'Venue'
  };
  
  // First, try to match specific types
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }
  
  // If we have generic types and a venue name, try to detect if it's a wedding venue
  const genericTypes = ['food', 'establishment', 'point_of_interest'];
  const hasGenericTypes = types.some(type => genericTypes.includes(type));
  
  if (hasGenericTypes && venueName && isLikelyWeddingVenue(venueName)) {
    return 'Venue';
  }
  
  return 'Other';
};

// Recently viewed tracking function
function addRecentlyViewedVendor(vendor) {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
    const existingIndex = recent.findIndex(v => v.id === vendor.id);
    
    // Remove if already exists
    if (existingIndex > -1) {
      recent.splice(existingIndex, 1);
    }
    
    // Add to beginning (most recent first)
    recent.unshift({
      ...vendor,
      viewedAt: new Date().toISOString()
    });
    
    // Keep only last 12 vendors
    const trimmed = recent.slice(0, 12);
    
    localStorage.setItem('paige_recently_viewed_vendors', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving recently viewed vendor:', error);
  }
}

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
  const [isOfficialVendor, setIsOfficialVendor] = useState(false);
  const [communityData, setCommunityData] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

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
        // Check if vendor exists in user's My Vendors collection
        const response = await fetch(`/api/check-vendor-exists?placeId=${vendor.id}&userId=${user.uid}`);
        const data = await response.json();
        console.log('Vendor existence check result:', data);
        console.log('Response status:', response.status);
        console.log('Full response data:', data);
        if (data.exists) {
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
          addRecentlyViewedVendor({
            ...mockVendor,
            image: mockVendor.images?.[0] || '/Venue.png',
            mainTypeLabel: mockVendor.category,
            source: { name: 'Mock Data', url: '' }
          });
          setLoading(false);
          return;
        }
        
        // Fetch vendor details from Google Places API
        const response = await fetch(`/api/google-place-details?placeId=${placeId}`);
        const data = await response.json();
        
        if (data.error || data.status === 'ZERO_RESULTS') {
          setVendor(mockVendor);
          addRecentlyViewedVendor({
            ...mockVendor,
            image: mockVendor.images?.[0] || '/Venue.png',
            mainTypeLabel: mockVendor.category,
            source: { name: 'Mock Data', url: '' }
          });
          setLoading(false);
          return;
        }
        
        if (!data.result) {
          setVendor(mockVendor);
          addRecentlyViewedVendor({
            ...mockVendor,
            image: mockVendor.images?.[0] || '/Venue.png',
            mainTypeLabel: mockVendor.category,
            source: { name: 'Mock Data', url: '' }
          });
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
          category: mapGoogleTypesToCategory(data.result?.types || [], data.result?.name),
          address: data.result?.formatted_address,
          website: data.result?.website,
          about: (() => {
            // Create a proper venue description from available data
            const venueName = data.result?.name || 'this venue';
            const rating = data.result?.rating;
            const reviewCount = data.result?.user_ratings_total;
            const types = data.result?.types || [];
            const category = mapGoogleTypesToCategory(types, venueName);
            
            // Create a professional description
            let description = `${venueName} is a beautiful ${category.toLowerCase()}`;
            
            // Add location context if available
            if (data.result?.vicinity) {
              description += ` located in ${data.result.vicinity}`;
            }
            
            // Add rating context
            if (rating && reviewCount) {
              description += `. With a ${rating}-star rating from ${reviewCount} guests`;
            } else if (rating) {
              description += `. With a ${rating}-star rating`;
            }
            
            // Add what they offer based on category
            if (category === 'Venue') {
              description += ', this venue provides an elegant setting for weddings and special events';
            } else if (category === 'Reception Venue') {
              description += ', offering a perfect space for wedding receptions and celebrations';
            } else if (category === 'Photographer') {
              description += ', specializing in capturing beautiful moments for your special day';
            } else if (category === 'Florist') {
              description += ', creating stunning floral arrangements for weddings and events';
            } else if (category === 'Caterer') {
              description += ', providing exceptional dining experiences for special occasions';
            } else if (category === 'Baker') {
              description += ', crafting delicious wedding cakes and desserts';
            } else if (category === 'DJ') {
              description += ', providing entertainment and music for celebrations';
            } else if (category === 'Beauty Salon') {
              description += ', offering professional beauty services for brides and wedding parties';
            } else {
              description += ', providing excellent services for your wedding day';
            }
            
            description += '.';
            
            return description;
          })(),
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
        
        // Add to recently viewed vendors
        addRecentlyViewedVendor({
          ...vendorDetails,
          image: vendorDetails.images?.[0] || '/Venue.png',
          mainTypeLabel: vendorDetails.category,
          source: { name: 'Google Places', url: '' }
        });
        
        // Fetch community vendor data
        try {
          console.log('Fetching community data for vendor:', placeId);
          const communityResponse = await fetch(`/api/community-vendors?placeId=${placeId}`);
          const communityData = await communityResponse.json();
          console.log('Initial community data response:', communityData);
          if (communityData.vendor) {
            setCommunityData(communityData.vendor);
            console.log('Set initial community data:', communityData.vendor);
          } else {
            console.log('No vendor data in community response');
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
                  <div className="flex items-center gap-3">
                    {/* Official Vendor Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#364257]">Official Vendor</span>
                      {dataLoaded ? (
                        <button
                          onClick={toggleOfficialVendor}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:ring-offset-2 ${
                            isOfficialVendor ? 'bg-[#A85C36]' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isOfficialVendor ? 'translate-x-6' : 'translate-x-1'
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