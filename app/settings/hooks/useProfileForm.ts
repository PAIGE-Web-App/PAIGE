"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { toast } from "react-hot-toast";
import { useUserProfileData } from "../../../hooks/useUserProfileData";

export function useProfileForm(user: any, updateUser: (data: any) => Promise<void>) {
  const [saving, setSaving] = useState(false);
  const [jiggleAnimate, setJiggleAnimate] = useState('');
  const [showGmailConfirmModal, setShowGmailConfirmModal] = useState<string | null>(null);
  const [pendingGoogleAction, setPendingGoogleAction] = useState<(() => Promise<void>) | null>(null);
  // Remove: const [forceProfileReload, setForceProfileReload] = useState(0);

  const {
    weddingDate: firestoreWeddingDate,
    weddingDateUndecided: firestoreWeddingDateUndecided,
    userName: firestoreUserName,
    partnerName: firestorePartnerName,
    partnerEmail: firestorePartnerEmail,
    plannerName: firestorePlannerName,
    plannerEmail: firestorePlannerEmail,
    guestCount: firestoreGuestCount,
    weddingLocation: firestoreWeddingLocation,
    weddingLocationUndecided: firestoreWeddingLocationUndecided,
    hasVenue: firestoreHasVenue,
    selectedVenueMetadata: firestoreSelectedVenueMetadata,
    selectedPlannerMetadata: firestoreSelectedPlannerMetadata,
    vibe: firestoreVibe,
    vibeInputMethod: firestoreVibeInputMethod,
    generatedVibes: firestoreGeneratedVibes,
    maxBudget: firestoreMaxBudget,
    additionalContext: firestoreAdditionalContext,
    profileLoading,
    reload: reloadUserProfile,
  } = useUserProfileData();

  // Account form state
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [plannerName, setPlannerName] = useState("");
  const [plannerEmail, setPlannerEmail] = useState("");

  // Wedding form state
  const [weddingDate, setWeddingDate] = useState<string>("");
  const [weddingDateUndecided, setWeddingDateUndecided] = useState(false);
  const [weddingLocation, setWeddingLocation] = useState("");
  const [weddingLocationUndecided, setWeddingLocationUndecided] = useState(false);
  const [hasVenue, setHasVenue] = useState<boolean | null>(null);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any>(null);
  const [venueSearch, setVenueSearch] = useState("");
  const [selectedPlannerMetadata, setSelectedPlannerMetadata] = useState<any>(null);
  const [plannerSearch, setPlannerSearch] = useState("");
  const [vibe, setVibe] = useState<string[]>([]);
  const [vibeInputMethod, setVibeInputMethod] = useState('pills');
  const [generatedVibes, setGeneratedVibes] = useState<string[]>([]);
  const [maxBudget, setMaxBudget] = useState<number>(40000);
  const [guestCount, setGuestCount] = useState(120);
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedLocationType, setSelectedLocationType] = useState<string | null>(null);
  const [weddingLocationCoords, setWeddingLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Sync with Firestore data
  useEffect(() => {
    if (!profileLoading) {
      // Account
      setEmail(user?.email || "");
      setUserName(firestoreUserName || "");
      setPartnerName(firestorePartnerName || "");
      setPartnerEmail(firestorePartnerEmail || "");
      setPlannerName(firestorePlannerName || "");
      setPlannerEmail(firestorePlannerEmail || "");

      // Wedding
      setWeddingDate(firestoreWeddingDate ? new Date(firestoreWeddingDate).toISOString().split('T')[0] : "");
      setWeddingDateUndecided(firestoreWeddingDateUndecided || false);
      setWeddingLocation(firestoreWeddingLocation || "");
      setWeddingLocationUndecided(firestoreWeddingLocationUndecided || false);
      setHasVenue(firestoreHasVenue);
      setSelectedVenueMetadata(firestoreSelectedVenueMetadata);
      setSelectedPlannerMetadata(firestoreSelectedPlannerMetadata);
      // Set coordinates from venue metadata if available
      if (firestoreSelectedVenueMetadata?.geometry?.location) {
        setWeddingLocationCoords({
          lat: firestoreSelectedVenueMetadata.geometry.location.lat,
          lng: firestoreSelectedVenueMetadata.geometry.location.lng
        });
      } else {
        setWeddingLocationCoords(null);
      }
      setVibe(firestoreVibe || []);
      setVibeInputMethod(firestoreVibeInputMethod || 'pills');
      setGeneratedVibes(firestoreGeneratedVibes || []);
      setMaxBudget(firestoreMaxBudget || 40000);
      setGuestCount(firestoreGuestCount || 120);
      setAdditionalContext(firestoreAdditionalContext || "");
    }
  }, [
    profileLoading,
    user,
    firestoreUserName,
    firestorePartnerName,
    firestorePartnerEmail,
    firestorePlannerName,
    firestorePlannerEmail,
    firestoreWeddingDate,
    firestoreWeddingLocation,
    firestoreWeddingLocationUndecided,
    firestoreHasVenue,
    firestoreSelectedVenueMetadata,
    firestoreSelectedPlannerMetadata,
    firestoreVibe,
    firestoreVibeInputMethod,
    firestoreGeneratedVibes,
    firestoreMaxBudget,
    firestoreGuestCount,
    firestoreAdditionalContext,
  ]);

  const hasUnsavedAccountChanges =
    userName !== (firestoreUserName || "") ||
    partnerName !== (firestorePartnerName || "") ||
    partnerEmail !== (firestorePartnerEmail || "") ||
    plannerName !== (firestorePlannerName || "") ||
    plannerEmail !== (firestorePlannerEmail || "");

  const hasUnsavedWeddingChanges = 
    weddingDate !== (firestoreWeddingDate ? new Date(firestoreWeddingDate).toISOString().split('T')[0] : "") ||
    weddingDateUndecided !== (firestoreWeddingDateUndecided || false) ||
    weddingLocation !== (firestoreWeddingLocation || "") ||
    weddingLocationUndecided !== (firestoreWeddingLocationUndecided || false) ||
    hasVenue !== firestoreHasVenue ||
    JSON.stringify(selectedVenueMetadata) !== JSON.stringify(firestoreSelectedVenueMetadata) ||
    JSON.stringify(vibe) !== JSON.stringify(firestoreVibe || []) ||
    vibeInputMethod !== (firestoreVibeInputMethod || 'pills') ||
    JSON.stringify(generatedVibes) !== JSON.stringify(firestoreGeneratedVibes || []) ||
    maxBudget !== firestoreMaxBudget ||
    guestCount !== (firestoreGuestCount || 120) ||
    additionalContext !== (firestoreAdditionalContext || "");

  const handleWeddingSave = async () => {
    if (!user?.uid) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const updateData: any = {
        weddingDate: weddingDate ? new Date(weddingDate) : deleteField(),
        weddingDateUndecided,
        weddingLocation,
        weddingLocationUndecided,
        hasVenue,
        vibe,
        vibeInputMethod,
        generatedVibes,
        maxBudget: maxBudget,
        guestCount,
        additionalContext,
      };

      if (selectedVenueMetadata) {
        const serializableVenue: any = {
          name: selectedVenueMetadata.name ?? null,
          place_id: selectedVenueMetadata.place_id ?? null,
          formatted_address: selectedVenueMetadata.formatted_address ?? null,
          url: selectedVenueMetadata.url ?? null,
          rating: selectedVenueMetadata.rating ?? null,
          user_ratings_total: selectedVenueMetadata.user_ratings_total ?? null,
          types: selectedVenueMetadata.types ?? null,
          geometry: null,
          photos: null,
        };

        if (selectedVenueMetadata.geometry && typeof selectedVenueMetadata.geometry.location.lat === 'function') {
          serializableVenue.geometry = {
            location: {
              lat: selectedVenueMetadata.geometry.location.lat(),
              lng: selectedVenueMetadata.geometry.location.lng(),
            },
            viewport: selectedVenueMetadata.geometry.viewport ? selectedVenueMetadata.geometry.viewport.toJSON() : null,
          };
        }

        if (selectedVenueMetadata.photos) {
          serializableVenue.photos = selectedVenueMetadata.photos.map((photo: any) => ({
            height: photo.height ?? null,
            width: photo.width ?? null,
            html_attributions: photo.html_attributions ?? [],
          }));
        }
        updateData.selectedVenueMetadata = serializableVenue;

        // Add venue to user's vendor management system (NOT as a messaging contact)
        try {
          const { addVendorToUserAndCommunity } = await import('../../../lib/addVendorToUserAndCommunity');
          const result = await addVendorToUserAndCommunity({
            userId: user.uid,
            vendorMetadata: selectedVenueMetadata,
            category: "Venue",
            selectedAsVenue: true,
            selectedAsVendor: false
          });

  

          if (result.success) {
    
            
            // Mark the venue as official (starred) in the user's vendor list
            try {
              const vendorRef = doc(db, `users/${user.uid}/vendors`, result.vendorId!);
              console.log('Updating vendor to isOfficial: true for vendorId:', result.vendorId);
              await updateDoc(vendorRef, {
                isOfficial: true,
                category: "Venue"
              });
              console.log('Marked venue as official in user vendor management system');
            } catch (error) {
              console.error('Error marking venue as official:', error);
              // Don't fail the save if this fails
            }
          } else {
            console.error('Failed to add venue to vendor management system:', result.error);
            // Don't fail the save if this fails
          }
        } catch (error) {
          console.error('Error adding venue to vendor management system:', error);
          // Don't fail the save if this fails
        }
      } else {
        updateData.selectedVenueMetadata = null;
      }

      await updateDoc(userRef, updateData);
      await updateUser(updateData);
      reloadUserProfile(); // Trigger profile data reload
      toast.success("Wedding details saved successfully!");
    } catch (error) {
      console.error("Error saving wedding details:", error);
      toast.error("Failed to save wedding details.");
    } finally {
      setSaving(false);
    }
  };

  const handleAccountSave = async () => {
    if (!user?.uid) return;

    // Validate required fields
    if (!userName.trim()) {
      toast.error("Your full name is required.");
      setSaving(false);
      return;
    }
    if (!partnerName.trim()) {
      toast.error("Your partner's full name is required.");
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const updateData: any = {
        userName,
        partnerName,
        partnerEmail,
        plannerName,
        plannerEmail,
      };

      // Handle wedding planner metadata and vendor addition/removal
      if (selectedPlannerMetadata) {
        const serializablePlanner: any = {
          name: selectedPlannerMetadata.name ?? null,
          place_id: selectedPlannerMetadata.place_id ?? null,
          formatted_address: selectedPlannerMetadata.formatted_address ?? null,
          url: selectedPlannerMetadata.url ?? null,
          rating: selectedPlannerMetadata.rating ?? null,
          user_ratings_total: selectedPlannerMetadata.user_ratings_total ?? null,
          types: selectedPlannerMetadata.types ?? null,
        };
        updateData.selectedPlannerMetadata = serializablePlanner;

        // Remove any existing wedding planner vendors first
        try {
          const { collection, query, where, getDocs, deleteDoc } = await import("firebase/firestore");
          const vendorsRef = collection(db, `users/${user.uid}/vendors`);
          const q = query(vendorsRef, where("category", "==", "Wedding Planner"));
          const querySnapshot = await getDocs(q);
          
          // Delete all existing wedding planner vendors
          const deletePromises = querySnapshot.docs.map(async (doc) => {
            await deleteDoc(doc.ref);
            console.log('Removed existing planner vendor:', doc.id);
          });
          
          await Promise.all(deletePromises);
          console.log('Successfully removed all existing wedding planner vendors');
        } catch (error) {
          console.error('Error removing existing planner vendors (Account):', error);
          // Don't fail the save if this fails
        }

        // Add new planner to user's vendor management system
        try {
          const { addVendorToUserAndCommunity } = await import('../../../lib/addVendorToUserAndCommunity');
          const result = await addVendorToUserAndCommunity({
            userId: user.uid,
            vendorMetadata: selectedPlannerMetadata,
            category: "Wedding Planner",
            selectedAsVenue: false,
            selectedAsVendor: true
          });

          console.log('Result from addVendorToUserAndCommunity for planner (Account):', result);

          if (result.success) {
            console.log('Successfully added planner to user vendor management system (Account)');
            
            // Mark the planner as official (starred) in the user's vendor list
            try {
              const vendorRef = doc(db, `users/${user.uid}/vendors`, result.vendorId!);
              console.log('Updating planner to isOfficial: true for vendorId (Account):', result.vendorId);
              await updateDoc(vendorRef, {
                isOfficial: true,
                category: "Wedding Planner"
              });
              console.log('Marked planner as official in user vendor management system (Account)');
            } catch (error) {
              console.error('Error marking planner as official (Account):', error);
              // Don't fail the save if this fails
            }
          } else {
            console.error('Failed to add planner to vendor management system (Account):', result.error);
            // Don't fail the save if this fails
          }
        } catch (error) {
          console.error('Error adding planner to vendor management system (Account):', error);
          // Don't fail the save if this fails
        }
      } else {
        updateData.selectedPlannerMetadata = null;
        
        // Remove planner from user's vendor management system
        try {
          const { collection, query, where, getDocs, deleteDoc } = await import("firebase/firestore");
          const vendorsRef = collection(db, `users/${user.uid}/vendors`);
          const q = query(vendorsRef, where("category", "==", "Wedding Planner"));
          const querySnapshot = await getDocs(q);
          
          // Delete all wedding planner vendors
          const deletePromises = querySnapshot.docs.map(async (doc) => {
            await deleteDoc(doc.ref);
            console.log('Removed planner vendor:', doc.id);
          });
          
          await Promise.all(deletePromises);
          console.log('Successfully removed all wedding planner vendors from user vendor management system');
        } catch (error) {
          console.error('Error removing planner from vendor management system (Account):', error);
          // Don't fail the save if this fails
        }
      }

      await updateDoc(userRef, updateData);
      await updateUser(updateData);
      reloadUserProfile(); // Trigger profile data reload
      
      // Send pending notifications if email was added
      const previousPartnerEmail = firestorePartnerEmail;
      const previousPlannerEmail = firestorePlannerEmail;
      
      // Check if partner email was added
      if (partnerEmail && partnerEmail !== previousPartnerEmail && partnerName) {
        try {
          await fetch('/api/notifications/send-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              assigneeType: 'partner',
              assigneeEmail: partnerEmail,
              assigneeName: partnerName
            })
          });
          console.log('Sent pending notifications to partner');
        } catch (error) {
          console.error('Failed to send pending notifications to partner:', error);
        }
      }
      
      // Check if planner email was added
      if (plannerEmail && plannerEmail !== previousPlannerEmail && plannerName) {
        try {
          await fetch('/api/notifications/send-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              assigneeType: 'planner',
              assigneeEmail: plannerEmail,
              assigneeName: plannerName
            })
          });
          console.log('Sent pending notifications to planner');
        } catch (error) {
          console.error('Failed to send pending notifications to planner:', error);
        }
      }
      
      toast.success("Account details saved successfully!");
    } catch (error) {
      console.error("Error saving account details:", error);
      toast.error("Failed to save account details.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleAction = useCallback((action: () => Promise<void>) => {
    setPendingGoogleAction(() => action);
    setShowGmailConfirmModal("disconnect");
  }, []);

  const handleSetWeddingDate = useCallback((date: string) => {
    setWeddingDate(date);
    if (!date) {
      setJiggleAnimate('animate-pulse');
      setTimeout(() => setJiggleAnimate(''), 1000);
    }
  }, []);

  const handleSetWeddingLocation = useCallback((location: string) => {
    setWeddingLocation(location);
    // Clear coordinates when location changes
    setWeddingLocationCoords(null);
  }, []);

  const handleSetSelectedVenueMetadata = useCallback((metadata: any) => {
    setSelectedVenueMetadata(metadata);
    // Update coordinates when venue metadata changes
    if (metadata?.geometry?.location) {
      setWeddingLocationCoords({
        lat: typeof metadata.geometry.location.lat === 'function' ? metadata.geometry.location.lat() : metadata.geometry.location.lat,
        lng: typeof metadata.geometry.location.lng === 'function' ? metadata.geometry.location.lng() : metadata.geometry.location.lng
      });
    } else {
      setWeddingLocationCoords(null);
    }
  }, []);

  const handleSetSelectedPlannerMetadata = useCallback((metadata: any) => {
    setSelectedPlannerMetadata(metadata);
  }, []);

  return {
    // State
    saving,
    jiggleAnimate,
    showGmailConfirmModal,
    pendingGoogleAction,
    
    // Account form state
    email,
    userName,
    setUserName,
    partnerName,
    setPartnerName,
    partnerEmail,
    setPartnerEmail,
    plannerName,
    setPlannerName,
    plannerEmail,
    setPlannerEmail,

    // Wedding form state
    weddingDate,
    setWeddingDate,
    weddingDateUndecided,
    setWeddingDateUndecided,
    weddingLocation,
    setWeddingLocation: handleSetWeddingLocation,
    weddingLocationUndecided,
    setWeddingLocationUndecided,
    hasVenue,
    setHasVenue,
    selectedVenueMetadata,
    setSelectedVenueMetadata: handleSetSelectedVenueMetadata,
    venueSearch,
    setVenueSearch,
    // Wedding Planner state (for AccountTab only)
    selectedPlannerMetadata,
    setSelectedPlannerMetadata: handleSetSelectedPlannerMetadata,
    plannerSearch,
    setPlannerSearch,
    vibe,
    setVibe,
    vibeInputMethod,
    setVibeInputMethod,
    generatedVibes,
    setGeneratedVibes,
    maxBudget,
    setMaxBudget,
    guestCount,
    setGuestCount,
    additionalContext,
    setAdditionalContext,
    selectedLocationType,
    setSelectedLocationType,
    weddingLocationCoords,
    
    // Computed values
    hasUnsavedAccountChanges,
    hasUnsavedWeddingChanges,
    
    // Actions
    handleWeddingSave,
    handleAccountSave,
    handleGoogleAction,
    handleSetWeddingDate,
    setShowGmailConfirmModal,
    setPendingGoogleAction,
  };
} 