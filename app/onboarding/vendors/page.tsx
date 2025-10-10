'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import VendorSwipeInterface from '@/components/onboarding/VendorSwipeInterface';
import WeddingDetailsHeader from '@/components/onboarding/WeddingDetailsHeader';
import EditWeddingDetailsModal from '@/components/onboarding/EditWeddingDetailsModal';
import OnboardingProgressStepper from '@/components/onboarding/OnboardingProgressStepper';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, Users } from 'lucide-react';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';
import Script from 'next/script';
import VendorOnboardingSkeleton from '@/components/skeletons/VendorOnboardingSkeleton';

type OnboardingStep = 'vendors' | 'review';

export default function OnboardingVendorsPage() {
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
    weddingLocationUndecided: profileWeddingLocationUndecided
  } = useUserProfileData();
  const { favorites } = useFavoritesSimple();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('vendors');
  const [generatedData, setGeneratedData] = useState<any>(null);
  
  // Track onboarding favorites count (memoized to prevent unnecessary recalculations)
  const onboardingFavoritesCount = useMemo(() => {
    if (!generatedData?.vendors) return 0;
    
    const allOnboardingVendors = [
      ...(generatedData.vendors.venues || []),
      ...(generatedData.vendors.photographers || []),
      ...(generatedData.vendors.florists || []),
      ...(generatedData.vendors.caterers || []),
      ...(generatedData.vendors.music || [])
    ];
    
    return favorites.filter(fav => 
      allOnboardingVendors.some(vendor => vendor.id === fav.placeId)
    ).length;
  }, [favorites, generatedData]);
  const [likedVendors, setLikedVendors] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load generated data from localStorage (from previous step)
  useEffect(() => {
    const loadGeneratedData = () => {
      try {
        const storedData = localStorage.getItem('paige_generated_data');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setGeneratedData(parsedData);
          console.log('📊 Loaded generated data:', parsedData);
          
          // Log vendor data for debugging
          if (parsedData.vendors) {
            Object.entries(parsedData.vendors).forEach(([category, vendorList]: [string, any]) => {
              console.log(`📋 ${category} vendors in localStorage:`, vendorList);
            });
          }
        } else {
          console.log('❌ No generated data found in localStorage');
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('❌ Error loading generated data:', error);
        router.push('/dashboard');
        return;
      }
      setIsLoading(false);
    };

    loadGeneratedData();
  }, [router]);

  const handleVendorSwipeComplete = (vendors: any[]) => {
    console.log('✅ Vendor swiping completed with vendors:', vendors);
    setLikedVendors(vendors);
    router.push('/onboarding/todo');
  };

  const handleUpdateGeneratedData = (updatedData: any) => {
    setGeneratedData(updatedData);
    // Also update localStorage to persist changes
    localStorage.setItem('paige_generated_data', JSON.stringify(updatedData));
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
        console.log('📅 Wedding date added - regenerating todos with intelligent deadlines');
        try {
          const response = await fetch('/api/onboarding/generate-todos-optimized', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              weddingData: {
                userName: 'User', // We'll get this from profile
                partnerName: 'Partner', // We'll get this from profile
                weddingDate: editedValues.weddingDate,
                weddingDateUndecided: editedValues.weddingDateUndecided,
                weddingLocation: editedValues.location || profileWeddingLocation || '',
                maxBudget: editedValues.budgetAmount || profileMaxBudget || 40000,
                guestCount: editedValues.guestCount || profileGuestCount || 120,
                vibe: [], // We'll get this from profile
                additionalContext: editedValues.additionalContext || profileAdditionalContext || ''
              }
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.todos) {
              console.log('✅ Regenerated todos with intelligent deadlines:', result.todos);
              
              // Update the generatedData with new todos
              const updatedDataWithNewTodos = {
                ...updatedData,
                todos: result.todos.todos
              };
              await handleUpdateGeneratedData(updatedDataWithNewTodos);
              
              showSuccessToast('Wedding details updated! Todos regenerated with intelligent deadlines.');
            }
          } else {
            console.error('❌ Failed to regenerate todos:', await response.text());
            showErrorToast('Wedding details updated, but failed to regenerate todos with deadlines.');
          }
        } catch (error) {
          console.error('❌ Error regenerating todos:', error);
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
          ? deleteField() 
          : (updatedWeddingDetails.weddingDate ? new Date(updatedWeddingDetails.weddingDate) : deleteField());
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

  const handleGoogleMapsLoad = () => {
    console.log('✅ Google Maps API loaded successfully');
  };

  if (isLoading) {
    return <VendorOnboardingSkeleton />;
  }

  if (!generatedData) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#332B42]">No wedding data found. Redirecting...</p>
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
        <AnimatePresence mode="wait">
          {currentStep === 'vendors' && (
            <motion.div
              key="vendors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <VendorSwipeInterface
                vendors={generatedData.vendors}
                generatedData={generatedData}
                onComplete={handleVendorSwipeComplete}
                onSkip={() => router.push('/onboarding/todo')}
                onUpdateGeneratedData={handleUpdateGeneratedData}
                onboardingFavoritesCount={onboardingFavoritesCount}
              />
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>

      {/* Edit Wedding Details Modal */}
      <EditWeddingDetailsModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditModalSave}
        initialValues={{
          weddingDate: profileWeddingDate ? new Date(profileWeddingDate).toISOString().split('T')[0] : '',
          weddingDateUndecided: profileWeddingDateUndecided !== undefined ? profileWeddingDateUndecided : false,
          guestCount: profileGuestCount || 120,
          budgetAmount: profileMaxBudget || 40000,
          location: profileWeddingLocation || '',
          additionalContext: profileAdditionalContext || ''
        }}
      />

      {/* Footer with integrated stepper */}
      <div className="flex-shrink-0 bg-white border-t border-[#E0D6D0] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Favorited count */}
          <div className="text-sm text-[#332B42] font-work">
            {onboardingFavoritesCount} Favorited
          </div>
          
          {/* Center: Progress Stepper */}
          <OnboardingProgressStepper currentStep="vendors" />
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                console.log('Skip clicked');
                if (onboardingFavoritesCount === 0) {
                  setShowSkipModal(true);
                } else {
                  router.push('/onboarding/todo');
                }
              }}
              className="text-xs text-[#A85C36] hover:text-[#784528] font-work"
            >
              Skip for now
            </button>
            <button
              onClick={() => {
                console.log('Continue clicked');
                if (currentStep === 'vendors') {
                  if (onboardingFavoritesCount === 0) {
                    setShowSkipModal(true);
                  } else {
                    router.push('/onboarding/todo');
                  }
                } else {
                  router.push('/dashboard');
                }
              }}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* Skip Modal */}
      <AnimatePresence>
        {showSkipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]"
            onClick={() => setShowSkipModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white rounded-[5px] shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                <h3 className="font-playfair text-lg text-[#332B42]">Don't like the recommended vendors?</h3>
                <button onClick={() => setShowSkipModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Description */}
                <div>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to proceed to the To-do section without liking at least one recommended vendor? 
                    Favoriting vendors helps Paige create a more personalized wedding plan for you.
                  </p>
                </div>

                {/* Benefits */}
                <div>
                  <h6 className="text-sm font-medium text-[#332B42] mb-3">Benefits of favoriting vendors:</h6>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Heart className="w-4 h-4 text-[#A85C36] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Personalized recommendations based on your preferences</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-[#A85C36] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Better budget planning with your preferred vendors</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-[#A85C36] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">More accurate timeline and task recommendations</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with action buttons */}
              <div className="p-6 border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSkipModal(false)}
                    className="btn-primaryinverse flex-1 whitespace-nowrap"
                  >
                    Browse Vendors
                  </button>
                  <button
                    onClick={() => {
                      setShowSkipModal(false);
                      router.push('/onboarding/todo');
                    }}
                    className="btn-primary flex-1"
                  >
                    Skip anyway
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
