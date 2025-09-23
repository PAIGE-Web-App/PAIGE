"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MapPin, Globe, Star, ExternalLink, ChevronLeft, ChevronRight, Grid, X, BadgeCheck, WandSparkles, ArrowLeft } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import CategoryPill from '@/components/CategoryPill';
import WeddingBanner from '@/components/WeddingBanner';
import ProgressiveImage from '@/components/ProgressiveImage';
import { Suspense, lazy } from 'react';

// Lazy load non-critical components
const VendorContactModal = lazy(() => import('@/components/VendorContactModal'));
const FlagVendorModal = lazy(() => import('@/components/FlagVendorModal'));
const RelatedVendorsSection = lazy(() => import('@/components/RelatedVendorsSection'));
const VendorComments = lazy(() => import('@/components/VendorComments'));
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';

import { 
  isLikelyWeddingVenue, 
  mapGoogleTypesToCategory, 
  categoryToSlug, 
  getCategorySlug, 
  getCategoryLabel,
  getCategoryFromSlug,
  addRecentlyViewedVendor 
} from '@/utils/vendorUtils';
import { useConsolidatedUserData } from '@/hooks/useConsolidatedUserData';
import { useVendorDetails } from '@/hooks/useVendorCache';
import { usePrefetch } from '@/utils/prefetchManager';
import { fetchVendorPhotos, checkVendorExists } from '@/utils/apiService';
import { getVendorImages } from '@/utils/vendorImageUtils';
import ConfirmVenueUnmarkModal from '@/components/ConfirmVenueUnmarkModal';
import { isSelectedVenue, clearSelectedVenue } from '@/utils/venueUtils';

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
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Get user's wedding location from consolidated user data
  const { weddingLocation: userWeddingLocation } = useConsolidatedUserData();
  
  // Initialize prefetch tracking
  const { trackVendorView } = usePrefetch();
  
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
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedVendorForFlag, setSelectedVendorForFlag] = useState<any>(null);
  const [selectedVendorForContact, setSelectedVendorForContact] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOfficialVendor, setIsOfficialVendor] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isUpdatingOfficial, setIsUpdatingOfficial] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [showVenueUnmarkModal, setShowVenueUnmarkModal] = useState(false);
  const [isSelectedVenueState, setIsSelectedVenueState] = useState(false);
  const [isSelectedVendorState, setIsSelectedVendorState] = useState(false);
  
  // Track if vendor has been processed to prevent multiple processing
  const processedVendorRef = useRef<string | null>(null);
  
  // Optimistic state management for instant UI updates
  const [optimisticStates, setOptimisticStates] = useState({
    favorite: null as boolean | null,
    official: null as boolean | null
  });
  
  // Use the simplified favorites hook
  const { isFavorite: isVendorFavorited, toggleFavorite: toggleVendorFavorite } = useFavoritesSimple();

  // Get the current display state (optimistic or actual)
  const displayFavorite = optimisticStates.favorite !== null ? optimisticStates.favorite : isVendorFavorited(vendor?.id || '');
  const displayOfficial = optimisticStates.official !== null ? optimisticStates.official : isOfficialVendor;

  // Check if vendor is an official vendor (in user's vendors list)
  const checkIfOfficialVendor = async () => {
    // Skip check if we're in the middle of an optimistic update
    if (isUpdatingOfficial) return;
    
    // Skip check if vendor or user is not available
    if (!vendor || !user?.uid) return;
    
    try {

      
      // Use Firestore directly for faster response
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const vendorsRef = collection(db, `users/${user.uid}/vendors`);
      const q = query(vendorsRef, where("placeId", "==", vendor.id));
      const querySnapshot = await getDocs(q);
      
      const isOfficial = !querySnapshot.empty;
      
      
      // Set state immediately without waiting for API
      setIsOfficialVendor(isOfficial);
      setDataLoaded(true);
      
    } catch (error) {
      console.error('Error checking official vendor status:', error);
      setDataLoaded(true);
    }
  };

  // Check if vendor is the selected venue
  const checkIfSelectedVenue = async () => {
    if (!vendor || !user?.uid) return;
    
    try {
      const isVenue = await isSelectedVenue(user.uid, vendor.id);
      setIsSelectedVenueState(isVenue);
    } catch (error) {
      console.error('Error checking if vendor is selected venue:', error);
    }
  };

  // Check if vendor is selected for their category
  const checkIfSelectedVendor = async () => {
    if (!vendor || !user?.uid) return;
    
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (userData?.selectedVendors) {
        const categoryKey = vendor.category.toLowerCase().replace(/[^a-z0-9]/g, '');
        const categoryVendors = userData.selectedVendors[categoryKey] || [];
        const isSelected = categoryVendors.some((v: any) => v.place_id === vendor.id);
        setIsSelectedVendorState(isSelected);
      }
    } catch (error) {
      console.error('Error checking if vendor is selected:', error);
    }
  };

  // Check if vendor is in user's favorites on mount
  useEffect(() => {
    if (!vendor || !user?.uid) return;
    
    // Check if vendor is favorited
    const favorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    const isVendorFavorited = favorites.includes(vendor.id);
    setIsFavorite(isVendorFavorited);
    
    // Check if vendor is an official vendor
    checkIfOfficialVendor();
    
    // Check if vendor is the selected venue
    checkIfSelectedVenue();
    
    // Check if vendor is selected for their category
    checkIfSelectedVendor();
  }, [vendor, user]);

  // Listen for favorites changes from other components
  useEffect(() => {
    const handleFavoritesChange = (event: CustomEvent) => {
      if (vendor && event.detail.favorites) {
        const isVendorFavorited = event.detail.favorites.includes(vendor.id);

        
        // Only update if not in the middle of an optimistic update
        if (!isUpdatingFavorite) {
          setIsFavorite(isVendorFavorited);
        }
      }
    };

    window.addEventListener('vendorFavoritesChanged', handleFavoritesChange as EventListener);
    
    return () => {
      window.removeEventListener('vendorFavoritesChanged', handleFavoritesChange as EventListener);
    };
  }, [vendor, isUpdatingFavorite]);

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

  // Debug logging (only when there are issues)
  if (vendorError || (vendorLoading && !googleData)) {
    console.log('🔍 Vendor Details Debug:', {
      placeId,
      googleData: googleData ? 'present' : 'null',
      googleDataStatus: googleData?.status,
      vendorError,
      vendorLoading,
      loading,
      error
    });
  }

  // Process vendor data from the hook
  useEffect(() => {
    if (!placeId) return;
    
    // Reset processed vendor ref when placeId changes
    if (processedVendorRef.current !== placeId) {
      processedVendorRef.current = null;
    }





    // Use cached vendor details from hook
    // Only log when there are issues
    if (vendorError || (vendorLoading && !googleData)) {
      console.log('🔄 Processing vendor data:', {
        googleData: googleData ? 'present' : 'null',
        googleDataStatus: googleData?.status,
        hasResult: !!googleData?.result,
        vendorError,
        vendorLoading
      });
    }

    if (!googleData || googleData.status !== 'OK' || !googleData.result) {
      if (vendorError) {
        console.error('Vendor details error:', vendorError);
        setError('Failed to load vendor details');
        setLoading(false);
        return;
      }
      if (vendorLoading) {
        // Only set loading to true if we don't have a vendor yet
        if (!vendor) {
          setLoading(true);
        }
        return;
      }
      // If not loading and no data, show error
      setError('Failed to load vendor details');
      setLoading(false);
      return;
    }

    // Prevent multiple processing of the same data
    if (processedVendorRef.current === googleData.result.place_id) {
      return;
    }

    // If we already have a vendor and it's the same one, don't process again
    if (vendor && vendor.id === googleData.result.place_id) {
      setLoading(false);
      return;
    }

    

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
      images: Array(16).fill("/Venue.png") // Start with placeholders, will be updated with real images
    };

    // Fetch photos and community data using unified image handling
    const fetchAdditionalData = async () => {
      try {

        
        // Create a vendor object for the unified image system
        const vendorForImages = {
          id: placeId,
          placeId: placeId,
          name: vendorDetails.name,
          image: vendorDetails.images?.[0],
          images: vendorDetails.images
        };
        
        // Use unified image handling to get the best available images
        const imageData = await getVendorImages(vendorForImages);
        

        
        if (imageData.hasRealImages && imageData.allImages.length > 0) {
          // Update the vendor state with real images
          setVendor(prev => ({
            ...prev!,
            images: imageData.allImages
          }));
        }
        
      } catch (error) {
        console.error('❌ Error fetching vendor images:', error);
        // Keep default images if photo fetch fails
      }
    };


    
    setVendor(vendorDetails);
    setLoading(false);
    processedVendorRef.current = googleData.result.place_id;
    
    // Add to recently viewed vendors
    addRecentlyViewedVendor({
      ...vendorDetails,
      image: vendorDetails.images?.[0] || '/Venue.png',
      mainTypeLabel: vendorDetails.category,
      source: { name: 'Google Places', url: '' }
    });

    // Track vendor view for prefetching
    trackVendorView(placeId, vendorDetails.category);

    // Fetch additional data in background
    fetchAdditionalData().catch((error) => {
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
    if (!vendor || isUpdatingFavorite) return;
    
    setIsUpdatingFavorite(true);
    
    try {
      await toggleVendorFavorite({
        placeId: vendor.id,
        name: vendor.name,
        address: vendor.address,
        category: vendor.category || 'Vendor',
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        image: vendor.images?.[0]
      });
      
    } catch (error) {
      console.error('Error updating favorites:', error);
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const toggleOfficialVendor = async () => {
    if (!vendor || !user?.uid || isUpdatingOfficial) return;

    const newOfficialState = !displayOfficial;
    
    // Check if trying to unmark a selected venue
    if (!newOfficialState && isSelectedVenueState) {
      setShowVenueUnmarkModal(true);
      return;
    }
    
    // INSTANT OPTIMISTIC UPDATE
    setOptimisticStates(prev => ({ ...prev, official: newOfficialState }));
    setIsUpdatingOfficial(true);

    // Show immediate feedback
    if (newOfficialState) {
              showSuccessToast(`Marked as Official Vendor and Added to My Vendors!`);
      } else {
        showSuccessToast(`Removed as Official Vendor and Removed from My Vendors!`);
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
          },
          category: vendor.category,
          selectedAsVenue: false,
          selectedAsVendor: true
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to add vendor');
        }
      } else {
        // Remove vendor from My Vendors
        const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const vendorsRef = collection(db, `users/${user.uid}/vendors`);
        const q = query(vendorsRef, where("placeId", "==", vendor.id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const vendorDoc = querySnapshot.docs[0];
          await deleteDoc(vendorDoc.ref);
          console.log('Removed vendor from user collection:', vendor.id);
        }

        // Update community status with request deduplication
        const { deduplicatedRequest } = await import('@/utils/requestDeduplicator');
        const response = await deduplicatedRequest.post('/api/community-vendors', {
          placeId: vendor.id,
          vendorName: vendor.name,
          vendorAddress: vendor.address || '',
          vendorCategory: vendor.category,
          userId: user.uid,
          selectedAsVenue: false,
          selectedAsVendor: false,
          removeFromSelected: true
        });

        // Response is already processed by deduplicatedRequest
      }

      // Success - commit the optimistic update
      setIsOfficialVendor(newOfficialState);
      setOptimisticStates(prev => ({ ...prev, official: null }));
      
    } catch (error) {
      console.error('Error updating official vendor status:', error);
      
      // Revert optimistic update on failure
      setOptimisticStates(prev => ({ ...prev, official: null }));
      setIsOfficialVendor(!newOfficialState);
              showErrorToast('Failed to update official vendor status');
    } finally {
      setIsUpdatingOfficial(false);
    }
  };

  // Flag modal handlers
  const handleShowFlagModal = (vendor: any) => {
    setSelectedVendorForFlag(vendor);
    setShowFlagModal(true);
  };

  // Venue unmark modal handlers
  const handleConfirmVenueUnmark = async () => {
    if (!vendor || !user?.uid) return;
    
    // Clear the selected venue from wedding settings
    const success = await clearSelectedVenue(user.uid);
    if (success) {
      showSuccessToast('Selected venue cleared and unmarked as official');
      // Update local state immediately
      setIsSelectedVenueState(false);
    }
    
    // Proceed with unmarking as official vendor
    setShowVenueUnmarkModal(false);
    
    // Reset optimistic state and proceed with normal unmarking
    setOptimisticStates(prev => ({ ...prev, official: null }));
    setIsUpdatingOfficial(false);
    
    // Call the toggle function again to proceed with unmarking
    const newOfficialState = false;
    setOptimisticStates(prev => ({ ...prev, official: newOfficialState }));
    setIsUpdatingOfficial(true);
    
    // Continue with the unmarking logic...
    try {
      // Remove vendor from My Vendors
      const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const vendorsRef = collection(db, `users/${user.uid}/vendors`);
      const q = query(vendorsRef, where("placeId", "==", vendor.id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const vendorDoc = querySnapshot.docs[0];
        await deleteDoc(vendorDoc.ref);
        console.log('Removed vendor from user collection:', vendor.id);
      }
      
      // Update community database with request deduplication
      const { deduplicatedRequest } = await import('@/utils/requestDeduplicator');
      await deduplicatedRequest.post('/api/community-vendors', {
        placeId: vendor.id,
        vendorName: vendor.name,
        vendorAddress: vendor.address || '',
        vendorCategory: vendor.category,
        userId: user.uid,
        selectedAsVenue: false,
        selectedAsVendor: false,
        removeFromSelected: true
      });

      // Success - commit the optimistic update
      setIsOfficialVendor(false);
      setOptimisticStates(prev => ({ ...prev, official: null }));
      showSuccessToast('Removed as Official Vendor and Removed from My Vendors!');
      
    } catch (error) {
      console.error('Error updating official vendor status:', error);
      
      // Revert optimistic update on failure
      setOptimisticStates(prev => ({ ...prev, official: null }));
      setIsOfficialVendor(true);
      showErrorToast('Failed to update official vendor status');
    } finally {
      setIsUpdatingOfficial(false);
    }
  };

  const handleGoToSettings = () => {
    setShowVenueUnmarkModal(false);
    router.push('/settings?tab=wedding');
  };

  // Handle setting vendor as selected venue
  const handleSetAsSelectedVenue = async () => {
    if (!vendor || !user?.uid) return;
    
    try {
      const { updateSelectedVenue } = await import('@/utils/venueUtils');
      
      // Create venue metadata from vendor data
      const venueMetadata = {
        place_id: vendor.id,
        name: vendor.name,
        formatted_address: vendor.address || '',
        website: vendor.website || null,
        formatted_phone_number: null,
        rating: vendor.rating || null,
        user_ratings_total: vendor.reviewCount || null,
        vicinity: null,
        types: vendor.amenities || [],
        photos: []
      };
      
      const success = await updateSelectedVenue(user.uid, venueMetadata);
      if (success) {
        showSuccessToast(`${vendor.name} set as your selected venue!`);
        setIsSelectedVenueState(true);
      } else {
        showErrorToast('Failed to set venue');
      }
    } catch (error) {
      console.error('Error setting selected venue:', error);
      showErrorToast('Failed to set venue');
    }
  };

  // Handle setting vendor as selected for their category
  const handleSetAsSelected = async () => {
    if (!vendor || !user?.uid) return;
    
    try {
      // First, mark as official using the existing working function
      await toggleOfficialVendor();
      
      // Then, set as selected vendor for their category
      const { doc, updateDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Get current user data
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Create vendor metadata
      const vendorMetadata = {
        place_id: vendor.id,
        name: vendor.name,
        formatted_address: vendor.address || '',
        website: vendor.website || null,
        formatted_phone_number: null,
        rating: vendor.rating || null,
        user_ratings_total: vendor.reviewCount || null,
        vicinity: null,
        types: vendor.amenities || [],
        photos: [],
        category: vendor.category
      };
      
      // Get current selected vendors or initialize
      const currentSelectedVendors = userData?.selectedVendors || {};
      
      // Add to selected vendors for this category
      const categoryKey = vendor.category.toLowerCase().replace(/[^a-z0-9]/g, '');
      const currentCategoryVendors = currentSelectedVendors[categoryKey] || [];
      
      // Check if already selected
      const isAlreadySelected = currentCategoryVendors.some((v: any) => v.place_id === vendor.id);
      
      if (!isAlreadySelected) {
        // Add to selected vendors
        const updatedSelectedVendors = {
          ...currentSelectedVendors,
          [categoryKey]: [...currentCategoryVendors, vendorMetadata]
        };
        
        await updateDoc(userRef, {
          selectedVendors: updatedSelectedVendors
        });
        
        setIsSelectedVendorState(true);
        showSuccessToast(`${vendor.name} added as selected ${vendor.category}!`);
      } else {
        showSuccessToast(`${vendor.name} is already selected as ${vendor.category}!`);
      }
      
    } catch (error) {
      console.error('Error setting selected vendor:', error);
      showErrorToast('Failed to set as selected vendor');
    }
  };

  // Handle unselecting vendor from their category
  const handleUnselectVendor = async () => {
    if (!vendor || !user?.uid) return;
    
    try {
      const { doc, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Get current user data
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (userData?.selectedVendors) {
        const categoryKey = vendor.category.toLowerCase().replace(/[^a-z0-9]/g, '');
        const currentCategoryVendors = userData.selectedVendors[categoryKey] || [];
        
        // Remove this vendor from the category
        const updatedCategoryVendors = currentCategoryVendors.filter((v: any) => v.place_id !== vendor.id);
        
        const updatedSelectedVendors = {
          ...userData.selectedVendors,
          [categoryKey]: updatedCategoryVendors
        };
        
        await updateDoc(userRef, {
          selectedVendors: updatedSelectedVendors
        });
        
        // Also remove the vendor from the vendor management collection
        const vendorsRef = collection(db, `users/${user.uid}/vendors`);
        const vendorQuery = query(vendorsRef, where("placeId", "==", vendor.id));
        const vendorSnapshot = await getDocs(vendorQuery);
        
        if (!vendorSnapshot.empty) {
          // Delete the vendor document from the vendors collection
          const vendorDoc = vendorSnapshot.docs[0];
          await deleteDoc(vendorDoc.ref);
        }
        
        setIsSelectedVendorState(false);
        showSuccessToast(`${vendor.name} removed from selected ${vendor.category}!`);
      }
      
    } catch (error) {
      console.error('Error unselecting vendor:', error);
      showErrorToast('Failed to unselect vendor');
    }
  };

  const handleFlagVendor = async (reason: string, customReason?: string) => {
    if (!selectedVendorForFlag) return;
    
    try {
      const { deduplicatedRequest } = await import('@/utils/requestDeduplicator');
      await deduplicatedRequest.post('/api/flag-vendor', {
        vendorId: selectedVendorForFlag.id,
        vendorName: selectedVendorForFlag.name,
        reason,
        customReason
      });

      showSuccessToast('Vendor flagged successfully');
      setShowFlagModal(false);
      setSelectedVendorForFlag(null);
    } catch (error) {
      console.error('Error flagging vendor:', error);
      showErrorToast('Failed to flag vendor');
    }
  };

  // Debug loading state (only when there are issues)
  if (vendorError || (vendorLoading && !googleData)) {
    console.log('🔍 Loading state check:', { 
      loading, 
      vendor: !!vendor, 
      placeId, 
      showContactModal, 
      selectedVendorForContact: !!selectedVendorForContact,
      vendorImages: vendor?.images?.length || 0,
      firstImage: vendor?.images?.[0] || 'none'
    });
  }

  if (loading) {
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
            .mobile-vendor-content {
              padding-left: 1rem;
              padding-right: 1rem;
              max-width: 100%;
              overflow-x: hidden;
            }
          }
        `}</style>
        <div className="max-w-6xl mx-auto">
          <div className="app-content-container flex flex-col gap-4 py-8 mobile-vendor-content pb-6">
            {/* Back Button and Loading State - Same Row */}
            <div className="flex items-start justify-between gap-4 mb-4 mt-2">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0 mt-1"
                aria-label="Back to previous page"
              >
                <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
              </button>
              
              {/* Loading Placeholder - Centered */}
              <div className="flex-1 flex justify-center min-w-0">
                <div className="h-8 bg-gray-200 rounded w-1/4 max-w-[calc(100vw-8rem)]"></div>
              </div>
              
              {/* Right Spacer for Balance */}
              <div className="w-7 flex-shrink-0"></div>
            </div>
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
            .mobile-vendor-content {
              padding-left: 1rem;
              padding-right: 1rem;
              max-width: 100%;
              overflow-x: hidden;
            }
          }
        `}</style>
        <WeddingBanner />
        <div className="max-w-6xl mx-auto">
          <div className="app-content-container flex flex-col gap-4 py-8 mobile-vendor-content pb-6">
            {/* Back Button and Error Title - Same Row */}
            <div className="flex items-start justify-between gap-4 mb-4 mt-2">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0 mt-1"
                aria-label="Back to previous page"
              >
                <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
              </button>
              
              {/* Error Title - Centered with wrapping */}
              <div className="flex-1 flex justify-center min-w-0">
                <h1 className="h5 text-center break-words hyphens-auto max-w-[calc(100vw-8rem)]">Vendor Not Found</h1>
              </div>
              
              {/* Right Spacer for Balance */}
              <div className="w-7 flex-shrink-0"></div>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[#364257] mb-4 text-center">The vendor you're looking for doesn't exist or has been removed.</p>
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
          .mobile-vendor-content {
            padding-left: 1rem;
            padding-right: 1rem;
            max-width: 100%;
            overflow-x: hidden;
          }
        }
      `}</style>
      <WeddingBanner />
      <div className="max-w-6xl mx-auto">
        <div className="app-content-container flex flex-col gap-4 py-8 mobile-vendor-content pb-6">
          {/* Mobile Header - Full width */}
          <div className="lg:hidden sticky top-0 z-10 bg-linen pt-6 -mx-4 px-4">
            <div className="flex items-start justify-between gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0 mt-1"
                aria-label="Back to previous page"
              >
                <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
              </button>
              
              {/* Vendor Name - Centered with wrapping */}
              <div className="flex-1 flex justify-center min-w-0">
                <h5 className="h5 text-center break-words hyphens-auto max-w-[calc(100vw-8rem)]">
                  {vendor.name}
                </h5>
              </div>
              
              {/* Right Spacer for Balance */}
              <div className="w-7 flex-shrink-0"></div>
            </div>
            
            {/* Mobile Metadata - Centered */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-4">
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
              </div>
            </div>
            
            {/* Mobile Action Buttons - Centered */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-3">
                {/* Selected Venue Toggle - Only show when venue is selected */}
                {dataLoaded && isSelectedVenueState && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3 text-[#A85C36]" />
                      <span className="text-xs text-[#364257]">Selected Venue</span>
                    </div>
                    <button
                      onClick={handleConfirmVenueUnmark}
                      disabled={isUpdatingOfficial}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:ring-offset-2 ${
                        displayOfficial ? 'bg-[#A85C36]' : 'bg-gray-200'
                      } ${isUpdatingOfficial ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          displayOfficial ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Selected Vendor Toggle - Only show when vendor is selected for their category */}
                {dataLoaded && isSelectedVendorState && !isSelectedVenueState && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3 text-[#A85C36]" />
                      <span className="text-xs text-[#364257]">Selected {vendor.category}</span>
                    </div>
                    <button
                      onClick={handleUnselectVendor}
                      disabled={isUpdatingOfficial}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:ring-offset-2 ${
                        isSelectedVendorState ? 'bg-[#A85C36]' : 'bg-gray-200'
                      } ${isUpdatingOfficial ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          isSelectedVendorState ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center gap-2">
                  {/* Select as [Category] Button - For all vendor types that aren't currently selected */}
                  {dataLoaded && !isSelectedVendorState && !isSelectedVenueState && (
                    <button
                      onClick={handleSetAsSelected}
                      className="btn-primaryinverse"
                    >
                      Select as {vendor.category}
                    </button>
                  )}

                  {/* Loading state for Select button */}
                  {!dataLoaded && (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                  )}

                  {/* Favorite Toggle - Icon only to save space */}
                  {dataLoaded ? (
                    <button
                      onClick={toggleFavorite}
                      disabled={isUpdatingFavorite}
                      className={`p-2 transition-colors ${
                        displayFavorite 
                          ? 'text-pink-500 hover:text-pink-600' 
                          : 'text-gray-600 hover:text-gray-700'
                      } ${isUpdatingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={displayFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`w-4 h-4 ${displayFavorite ? 'fill-current text-pink-500' : ''}`} />
                    </button>
                  ) : (
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                  )}

                  {/* Primary Action - Contact */}
                  <button
                    onClick={() => {
                      setSelectedVendorForContact(vendor);
                      setShowContactModal(true);
                    }}
                    className="btn-primary"
                  >
                    Contact
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Vendor Details */}
            <div className="lg:col-span-2">
              {/* Desktop Header - Only spans left column */}
              <div className="hidden lg:block sticky top-0 z-10 bg-linen pt-6 -mx-4 px-4 mb-2">
                <div className="flex items-center justify-between gap-4">
                  {/* Back Button */}
                  <button
                    onClick={() => router.back()}
                    className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0"
                    aria-label="Back to previous page"
                  >
                    <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
                  </button>
                  
                  {/* Vendor Name - Left aligned */}
                  <div className="flex-1 min-w-0">
                    <h5 className="h5 text-left truncate">
                      {vendor.name}
                    </h5>
                  </div>
                  
                  {/* Action Buttons - Right aligned */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Favorite Toggle - Icon only to save space */}
                    {dataLoaded ? (
                      <button
                        onClick={toggleFavorite}
                        disabled={isUpdatingFavorite}
                        className={`p-2 transition-colors ${
                          displayFavorite 
                            ? 'text-pink-500 hover:text-pink-600' 
                            : 'text-gray-600 hover:text-gray-700'
                        } ${isUpdatingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={displayFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`w-4 h-4 ${displayFavorite ? 'fill-current text-pink-500' : ''}`} />
                      </button>
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                    )}

                    {/* Selected Venue Toggle - Only show when venue is selected */}
                    {dataLoaded && isSelectedVenueState && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-[#A85C36]" />
                          <span className="text-xs text-[#364257]">Selected Venue</span>
                        </div>
                        <button
                          onClick={handleConfirmVenueUnmark}
                          disabled={isUpdatingOfficial}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:ring-offset-2 ${
                            displayOfficial ? 'bg-[#A85C36]' : 'bg-gray-200'
                          } ${isUpdatingOfficial ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              displayOfficial ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Selected Vendor Toggle - Only show when vendor is selected for their category */}
                    {dataLoaded && isSelectedVendorState && !isSelectedVenueState && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-[#A85C36]" />
                          <span className="text-xs text-[#364257]">Selected {vendor.category}</span>
                        </div>
                        <button
                          onClick={handleUnselectVendor}
                          disabled={isUpdatingOfficial}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:ring-offset-2 ${
                            isSelectedVendorState ? 'bg-[#A85C36]' : 'bg-gray-200'
                          } ${isUpdatingOfficial ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              isSelectedVendorState ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Select as [Category] Button - For all vendor types that aren't currently selected */}
                    {dataLoaded && !isSelectedVendorState && !isSelectedVenueState && (
                      <button
                        onClick={handleSetAsSelected}
                        className="btn-primaryinverse"
                      >
                        Select as {vendor.category}
                      </button>
                    )}

                    {/* Loading state for Select button */}
                    {!dataLoaded && (
                      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                    )}

                    {/* Primary Action - Contact */}
                    <button
                      onClick={() => {
                        setSelectedVendorForContact(vendor);
                        setShowContactModal(true);
                      }}
                      className="btn-primary"
                    >
                      Contact
                    </button>
                  </div>
                </div>
              </div>
              {/* Vendor Overview */}
              <div className="mb-6">
                
                {/* Desktop Metadata - Left aligned (hidden on mobile) */}
                <div className="hidden lg:flex justify-start mb-4">
                  <div className="flex items-center gap-4">
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
                  </div>
                </div>
                

                {/* Selected Venue AI Banner */}
                {isSelectedVenueState && (
                  <div className="mt-4 bg-[#805d93] text-white p-4 rounded-lg shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <WandSparkles className="w-5 h-5 text-white" strokeWidth={1} />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-sm mb-1 text-white">
                          This vendor has been marked as your official {vendor.category}
                        </h5>
                        <p className="text-sm opacity-90 text-white">
                          Their details will be used to generate your personalized content when relevant!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Image Gallery */}
              <div className="mb-8">
                <div className="relative h-96 bg-[#F3F2F0] rounded-lg overflow-hidden mb-4">
                  {vendor.images && vendor.images.length > 0 && (
                    <>
                      <ProgressiveImage
                        key={`main-${vendor.images[currentImageIndex]}-${currentImageIndex}`}
                        src={vendor.images[currentImageIndex]}
                        alt={`${vendor.name} - Image ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                        priority={true}
                        threshold={0.1}
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

              {/* Comments - Mobile only, between vendor details and related vendors */}
              <div className="lg:hidden mb-8">
                {vendor && (
                  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>}>
                    <VendorComments 
                      vendorId={vendor.id} 
                      vendorName={vendor.name} 
                    />
                  </Suspense>
                )}
              </div>

              {/* Related Vendors */}
              <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>}>
                <RelatedVendorsSection
                  currentVendorId={vendor.id}
                  category={vendor.category}
                  location={userWeddingLocation || location}
                  onShowFlagModal={handleShowFlagModal}
                  onShowContactModal={(vendor) => {
                    setSelectedVendorForContact(vendor);
                    setShowContactModal(true);
                  }}
                />
              </Suspense>
                </div>

            {/* Right Column - Comments (Desktop only) */}
            <div className="hidden lg:block lg:col-span-1 sticky top-4 h-[calc(100vh-14rem)]">
              {vendor && (
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>}>
                  <VendorComments 
                    vendorId={vendor.id} 
                    vendorName={vendor.name} 
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && selectedVendorForContact && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-pulse bg-white h-96 w-96 rounded-lg"></div></div>}>
          <VendorContactModal
            vendor={selectedVendorForContact}
            isOpen={showContactModal}
            onClose={() => {
              setShowContactModal(false);
              setSelectedVendorForContact(null);
            }}
          />
        </Suspense>
      )}

      {/* Flag Modal */}
      {showFlagModal && selectedVendorForFlag && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-pulse bg-white h-64 w-96 rounded-lg"></div></div>}>
          <FlagVendorModal
            vendor={selectedVendorForFlag}
            onClose={() => {
              setShowFlagModal(false);
              setSelectedVendorForFlag(null);
            }}
            onSubmit={handleFlagVendor}
            isSubmitting={false}
          />
        </Suspense>
      )}

      {/* Venue Unmark Modal */}
      <ConfirmVenueUnmarkModal
        open={showVenueUnmarkModal}
        onClose={() => setShowVenueUnmarkModal(false)}
        onConfirm={handleConfirmVenueUnmark}
        onGoToSettings={handleGoToSettings}
        vendorName={vendor?.name || ''}
      />

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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {vendor.images?.map((image, index) => (
                    <div 
                      key={index}
                      className="aspect-square bg-[#F3F2F0] rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setShowImageGallery(false);
                      }}
                    >
                      <ProgressiveImage
                        key={`thumb-${image}-${index}`}
                        src={image}
                        alt={`${vendor.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        priority={index < 3} // Load first 3 images with priority
                        threshold={0.1}
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