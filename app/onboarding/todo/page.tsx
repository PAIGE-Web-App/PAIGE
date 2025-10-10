'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';
import ReviewFlow from '@/components/onboarding/ReviewFlow';
import WeddingDetailsHeader from '@/components/onboarding/WeddingDetailsHeader';
import EditWeddingDetailsModal from '@/components/onboarding/EditWeddingDetailsModal';
import OnboardingProgressStepper from '@/components/onboarding/OnboardingProgressStepper';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, Users } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';
import Script from 'next/script';

export default function OnboardingTodoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { 
    weddingDate: profileWeddingDate,
    weddingDateUndecided: profileWeddingDateUndecided,
    weddingLocation: profileWeddingLocation,
    guestCount: profileGuestCount,
    maxBudget: profileMaxBudget,
    additionalContext: profileAdditionalContext,
    weddingLocationUndecided: profileWeddingLocationUndecided,
    reload: reloadUserProfile
  } = useUserProfileData();
  const { favorites } = useFavoritesSimple();
  const [onboardingFavoritesCount, setOnboardingFavoritesCount] = useState(0);
  
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Handle Google Maps loading
  const handleGoogleMapsLoad = () => {
    setIsGoogleMapsLoaded(true);
  };

  // Load generated data from localStorage (from previous step) - only once on mount
  useEffect(() => {
    const loadGeneratedData = () => {
      try {
        const saved = localStorage.getItem('paige_generated_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('🔧 DEBUG: Loading initial data with', parsed.todos?.length, 'todos');
          console.log('🔧 DEBUG: Todo titles:', parsed.todos?.map((t: any) => t.name || t.title));
          setGeneratedData(parsed);
        } else {
          console.log('❌ No generated data found in localStorage');
          // Redirect back to vendors if no data
          router.push('/onboarding/vendors');
        }
      } catch (error) {
        console.error('Error loading generated data:', error);
        router.push('/onboarding/vendors');
      } finally {
        setIsLoading(false);
      }
    };

    loadGeneratedData();
  }, []); // Empty dependency array - only run once on mount

  // Track onboarding favorites count
  useEffect(() => {
    if (generatedData?.vendors) {
      // Count favorites that are from the current onboarding vendors
      const allOnboardingVendors = [
        ...(generatedData.vendors.venues || []),
        ...(generatedData.vendors.photographers || []),
        ...(generatedData.vendors.florists || []),
        ...(generatedData.vendors.caterers || []),
        ...(generatedData.vendors.music || [])
      ];
      
      const onboardingFavorites = favorites.filter(fav => 
        allOnboardingVendors.some(vendor => vendor.id === fav.placeId)
      );
      
      setOnboardingFavoritesCount(onboardingFavorites.length);
    }
  }, [favorites, generatedData]);

  const handleUpdateGeneratedData = async (updatedData: any) => {
    try {
      console.log('🔧 DEBUG: handleUpdateGeneratedData called with', updatedData.todos?.length, 'todos');
      setGeneratedData(updatedData);
      localStorage.setItem('paige_generated_data', JSON.stringify(updatedData));
      console.log('🔧 DEBUG: localStorage updated with', updatedData.todos?.length, 'todos');
    } catch (error) {
      console.error('Error updating generated data:', error);
    }
  };

  const handleEditModalSave = async (editedValues: any) => {
    if (!user) return;

    console.log('💾 Edit modal save called with values:', editedValues);

    try {
      // Update generatedData with edited values
      const updatedData = { ...generatedData, ...editedValues };
      await handleUpdateGeneratedData(updatedData);

      // Check if wedding date was updated - regenerate todos if needed
      const hasWeddingDate = editedValues.weddingDate && 
                            editedValues.weddingDate !== 'TBD' && 
                            editedValues.weddingDate !== '' && 
                            !editedValues.weddingDateUndecided;

      // Check if user previously had TBD and now has a real date (transition from TBD to real date)
      const previouslyHadTBD = profileWeddingDateUndecided || !profileWeddingDate;
      const nowHasRealDate = hasWeddingDate;
      const weddingDateTransitioned = previouslyHadTBD && nowHasRealDate;

      // Only regenerate todos if wedding date transitioned from TBD to a real date
      if (editedValues.weddingDate !== undefined && weddingDateTransitioned) {
        try {
          const weddingDataPayload = {
            userId: user.uid,
            weddingData: {
              userName: 'User',
              partnerName: 'Partner',
              weddingDate: editedValues.weddingDate,
              weddingDateUndecided: editedValues.weddingDateUndecided,
              weddingLocation: editedValues.location || profileWeddingLocation || '',
              maxBudget: editedValues.budgetAmount || profileMaxBudget || 40000,
              guestCount: editedValues.guestCount || profileGuestCount || 120,
              vibe: [],
              additionalContext: editedValues.additionalContext || profileAdditionalContext || ''
            }
          };
          
          const response = await fetch('/api/onboarding/generate-todos-optimized', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(weddingDataPayload)
          });
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.todos) {
              // Update the generatedData with new todos
              const updatedDataWithNewTodos = {
                ...updatedData,
                todos: result.todos.todos
              };
              
              await handleUpdateGeneratedData(updatedDataWithNewTodos);
              
              showSuccessToast('Wedding details updated successfully!');
            } else {
              showErrorToast('Wedding details updated, but failed to regenerate todos with deadlines.');
            }
          } else {
            showErrorToast('Wedding details updated, but failed to regenerate todos with deadlines.');
          }
        } catch (error) {
          console.error('Error regenerating todos:', error);
          showErrorToast('Wedding details updated, but failed to regenerate todos with deadlines.');
        }
      }

      // Prepare updated wedding details for Firestore
      const updatedWeddingDetails = {
        weddingDate: editedValues.weddingDate || generatedData?.weddingDate,
        weddingDateUndecided: editedValues.weddingDateUndecided !== undefined ? editedValues.weddingDateUndecided : (generatedData?.weddingDateUndecided || false),
        location: editedValues.location || generatedData?.location,
        budgetAmount: editedValues.budgetAmount || generatedData?.budgetAmount,
        guestCount: editedValues.guestCount || generatedData?.guestCount,
        additionalContext: editedValues.additionalContext || generatedData?.additionalContext || ''
      };

      // Save to Firestore
      const userRef = doc(db, 'users', user.uid);
      const firestoreUpdates: any = {};
      
      // Only update fields that were actually changed
      if (editedValues.weddingDate !== undefined || editedValues.weddingDateUndecided !== undefined) {
        // If wedding date is undecided, save null; otherwise save the date
        firestoreUpdates.weddingDate = updatedWeddingDetails.weddingDateUndecided 
          ? null 
          : (updatedWeddingDetails.weddingDate ? new Date(updatedWeddingDetails.weddingDate) : null);
        firestoreUpdates.weddingDateUndecided = updatedWeddingDetails.weddingDateUndecided;
      }
      if (editedValues.location !== undefined) {
        firestoreUpdates.weddingLocation = updatedWeddingDetails.location;
      }
      if (editedValues.budgetAmount !== undefined) {
        firestoreUpdates.maxBudget = updatedWeddingDetails.budgetAmount;
      }
      if (editedValues.guestCount !== undefined) {
        firestoreUpdates.guestCount = updatedWeddingDetails.guestCount;
      }
      if (editedValues.additionalContext !== undefined) {
        firestoreUpdates.additionalContext = updatedWeddingDetails.additionalContext;
      }

      // Update Firestore if there are changes
      if (Object.keys(firestoreUpdates).length > 0) {
        console.log('🔄 Saving to Firestore:', firestoreUpdates);
        await updateDoc(userRef, firestoreUpdates);
        console.log('✅ Updated user profile in Firestore:', firestoreUpdates);
      }

      // Save updated wedding details to localStorage for AI generation
      localStorage.setItem('paige_updated_wedding_details', JSON.stringify(updatedWeddingDetails));

      // Set the AI generation context to trigger full plan regeneration on dashboard
      const contextValue = editedValues.additionalContext || updatedWeddingDetails.additionalContext || 'Regenerating plan with updated details';
      localStorage.setItem('paige_ai_generation_context', contextValue);
      
      // Clear generated data so the AI generation modal can show
      localStorage.removeItem('paige_generated_data');
      
      // Keep the onboarding flag active so dashboard knows this is part of onboarding
      localStorage.setItem('paige_enhanced_onboarding_active', 'true');
      
      
      setShowEditModal(false);
      router.push('/dashboard');
      
      return;
      
    } catch (error) {
      console.error('Error updating wedding plan:', error);
      showErrorToast('Failed to update wedding details. Please try again.');
    }
  };

  const handleComplete = () => {
    console.log('✅ Review flow completed');
    router.push('/onboarding/budget');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
          <p className="text-sm text-[#7A7A7A]">Loading your wedding plan...</p>
        </div>
      </div>
    );
  }

  if (!generatedData) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#7A7A7A] mb-4">No wedding data found. Please go back and complete the vendor selection.</p>
          <button
            onClick={() => router.push('/onboarding/vendors')}
            className="btn-primary"
          >
            Go to Vendor Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2F0] flex flex-col">
      
      {/* Load Google Maps API */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
        strategy="afterInteractive"
        onLoad={handleGoogleMapsLoad}
      />
      <GoogleMapsLoader onLoad={handleGoogleMapsLoad} />
      
      {/* Header */}
      <WeddingDetailsHeader
        weddingDate={profileWeddingDate ? new Date(profileWeddingDate).toISOString().split('T')[0] : ''}
        guestCount={profileGuestCount || 120}
        budget={profileMaxBudget || 40000}
        location={profileWeddingLocation || ''}
        onEditClick={() => setShowEditModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="app-content-container h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ReviewFlow
              todos={generatedData.todos || []}
              budget={generatedData.budget || { total: 0, categories: [] }}
              likedVendors={[]} // We'll get this from favorites
              onComplete={handleComplete}
              onBack={() => router.push('/onboarding/vendors')}
              templateName={
                profileWeddingDateUndecided || !profileWeddingDate 
                  ? "Select Main Venue & Set Wedding Date" 
                  : "Full Wedding Checklist"
              }
              templateDescription={
                profileWeddingDateUndecided || !profileWeddingDate 
                  ? "This is the first step to successful wedding prep!" 
                  : "tasks to help you stay on track"
              }
              usedFallbackTodos={generatedData.usedFallbackTodos || false}
            />
          </div>
        </div>
      </div>

      {/* Footer with integrated stepper */}
      <div className="flex-shrink-0 bg-white border-t border-[#E0D6D0] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Empty space */}
          <div></div>
          
          {/* Center: Progress Stepper */}
          <OnboardingProgressStepper currentStep="todo" />
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setIsNavigating(true);
                router.push('/onboarding/vendors');
              }}
              disabled={isNavigating}
              className={`btn-primaryinverse ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isNavigating ? 'Loading...' : 'Back to Vendors'}
            </button>
            <button
              onClick={() => router.push('/onboarding/budget')}
              className="btn-primary"
            >
              Review Budget
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditWeddingDetailsModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditModalSave}
        initialValues={{
          // Use fresh profile data from Firestore, not stale localStorage data
          weddingDate: profileWeddingDate ? new Date(profileWeddingDate).toISOString().split('T')[0] : '',
          weddingDateUndecided: profileWeddingDateUndecided !== undefined ? profileWeddingDateUndecided : false,
          guestCount: profileGuestCount || 120,
          budgetAmount: profileMaxBudget || 40000,
          location: profileWeddingLocation || '',
          additionalContext: profileAdditionalContext || ''
        }}
      />

    </div>
  );
}
