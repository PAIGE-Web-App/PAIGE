"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { toast } from "react-hot-toast";
import { useUserProfileData } from "../../../hooks/useUserProfileData";

export function useProfileForm(user: any, updateUser: (data: any) => Promise<void>) {
  const [saving, setSaving] = useState(false);
  const [jiggleAnimate, setJiggleAnimate] = useState('');
  const [showGmailConfirmModal, setShowGmailConfirmModal] = useState<string | null>(null);
  const [pendingGoogleAction, setPendingGoogleAction] = useState<(() => Promise<void>) | null>(null);

  const {
    weddingDate: firestoreWeddingDate,
    userName: firestoreUserName,
    partnerName: firestorePartnerName,
    guestCount: firestoreGuestCount,
    weddingLocation: firestoreWeddingLocation,
    weddingLocationUndecided: firestoreWeddingLocationUndecided,
    hasVenue: firestoreHasVenue,
    selectedVenueMetadata: firestoreSelectedVenueMetadata,
    vibe: firestoreVibe,
    vibeInputMethod: firestoreVibeInputMethod,
    generatedVibes: firestoreGeneratedVibes,
    budgetRange: firestoreBudgetRange,
    profileLoading,
  } = useUserProfileData();

  // Account form state
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [partnerName, setPartnerName] = useState("");

  // Wedding form state
  const [weddingDate, setWeddingDate] = useState<string>("");
  const [weddingLocation, setWeddingLocation] = useState("");
  const [weddingLocationUndecided, setWeddingLocationUndecided] = useState(false);
  const [hasVenue, setHasVenue] = useState<boolean | null>(null);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any>(null);
  const [venueSearch, setVenueSearch] = useState("");
  const [vibe, setVibe] = useState<string[]>([]);
  const [vibeInputMethod, setVibeInputMethod] = useState('pills');
  const [generatedVibes, setGeneratedVibes] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<[number, number]>([30000, 50000]);
  const [guestCount, setGuestCount] = useState(120);
  const [selectedLocationType, setSelectedLocationType] = useState<string | null>(null);

  // Sync with Firestore data
  useEffect(() => {
    if (!profileLoading) {
      // Account
      setEmail(user?.email || "");
      setUserName(firestoreUserName || "");
      setPartnerName(firestorePartnerName || "");

      // Wedding
      setWeddingDate(firestoreWeddingDate ? new Date(firestoreWeddingDate).toISOString().split('T')[0] : "");
      setWeddingLocation(firestoreWeddingLocation || "");
      setWeddingLocationUndecided(firestoreWeddingLocationUndecided || false);
      setHasVenue(firestoreHasVenue);
      setSelectedVenueMetadata(firestoreSelectedVenueMetadata);
      setVibe(firestoreVibe || []);
      setVibeInputMethod(firestoreVibeInputMethod || 'pills');
      setGeneratedVibes(firestoreGeneratedVibes || []);
      setBudgetRange(
        firestoreBudgetRange && typeof firestoreBudgetRange === 'object' && 'min' in firestoreBudgetRange && 'max' in firestoreBudgetRange
          ? [firestoreBudgetRange.min, firestoreBudgetRange.max]
          : [30000, 50000]
      );
      setGuestCount(firestoreGuestCount || 120);
    }
  }, [
    profileLoading,
    user,
    firestoreUserName,
    firestorePartnerName,
    firestoreWeddingDate,
    firestoreWeddingLocation,
    firestoreWeddingLocationUndecided,
    firestoreHasVenue,
    firestoreSelectedVenueMetadata,
    firestoreVibe,
    firestoreVibeInputMethod,
    firestoreGeneratedVibes,
    firestoreBudgetRange,
    firestoreGuestCount,
  ]);

  const hasUnsavedAccountChanges =
    userName !== (firestoreUserName || "") ||
    partnerName !== (firestorePartnerName || "");

  const hasUnsavedWeddingChanges = 
    weddingDate !== (firestoreWeddingDate ? new Date(firestoreWeddingDate).toISOString().split('T')[0] : "") ||
    weddingLocation !== (firestoreWeddingLocation || "") ||
    weddingLocationUndecided !== (firestoreWeddingLocationUndecided || false) ||
    hasVenue !== firestoreHasVenue ||
    JSON.stringify(selectedVenueMetadata) !== JSON.stringify(firestoreSelectedVenueMetadata) ||
    JSON.stringify(vibe) !== JSON.stringify(firestoreVibe || []) ||
    vibeInputMethod !== (firestoreVibeInputMethod || 'pills') ||
    JSON.stringify(generatedVibes) !== JSON.stringify(firestoreGeneratedVibes || []) ||
    JSON.stringify(budgetRange) !== JSON.stringify(
      firestoreBudgetRange && typeof firestoreBudgetRange === 'object' && 'min' in firestoreBudgetRange && 'max' in firestoreBudgetRange
        ? [firestoreBudgetRange.min, firestoreBudgetRange.max]
        : [30000, 50000]
    ) ||
    guestCount !== (firestoreGuestCount || 120);

  const handleWeddingSave = async () => {
    if (!user?.uid) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const updateData: any = {
        weddingDate: weddingDate ? new Date(weddingDate) : null,
        weddingLocation,
        weddingLocationUndecided,
        hasVenue,
        vibe,
        vibeInputMethod,
        generatedVibes,
        budgetRange: budgetRange ? { min: budgetRange[0], max: budgetRange[1] } : null,
        guestCount,
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
      } else {
        updateData.selectedVenueMetadata = null;
      }

      await updateDoc(userRef, updateData);
      await updateUser(updateData);
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

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const updateData: any = {
        userName,
        partnerName,
      };

      await updateDoc(userRef, updateData);
      await updateUser(updateData);
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

    // Wedding form state
    weddingDate,
    setWeddingDate,
    weddingLocation,
    setWeddingLocation,
    weddingLocationUndecided,
    setWeddingLocationUndecided,
    hasVenue,
    setHasVenue,
    selectedVenueMetadata,
    setSelectedVenueMetadata,
    venueSearch,
    setVenueSearch,
    vibe,
    setVibe,
    vibeInputMethod,
    setVibeInputMethod,
    generatedVibes,
    setGeneratedVibes,
    budgetRange,
    setBudgetRange,
    guestCount,
    setGuestCount,
    selectedLocationType,
    setSelectedLocationType,
    
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