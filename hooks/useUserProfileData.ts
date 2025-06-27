import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export function useUserProfileData() {
  const { user, loading: authLoading } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [cityState, setCityState] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);

  // Additional onboarding fields
  const [weddingLocation, setWeddingLocation] = useState<string | null>(null);
  const [weddingLocationUndecided, setWeddingLocationUndecided] = useState<boolean>(false);
  const [hasVenue, setHasVenue] = useState<boolean | null>(null);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any>(null);
  const [vibe, setVibe] = useState<string[]>([]);
  const [vibeInputMethod, setVibeInputMethod] = useState<string>('pills');
  const [generatedVibes, setGeneratedVibes] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<{ min: number; max: number } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserName(data.userName || null);
        setPartnerName(data.partnerName || null);
        setGuestCount(data.guestCount || null);
        setBudget(data.budget || null);
        setCityState(data.cityState || null);
        setStyle(data.style || null);

        // Additional onboarding fields
        setWeddingLocation(data.weddingLocation || null);
        setWeddingLocationUndecided(data.weddingLocationUndecided || false);
        setHasVenue(data.hasVenue || null);
        setSelectedVenueMetadata(data.selectedVenueMetadata || null);
        setVibe(data.vibe || []);
        setVibeInputMethod(data.vibeInputMethod || 'pills');
        setGeneratedVibes(data.generatedVibes || []);
        setBudgetRange(data.budgetRange || null);
        // Note: imagePreview is not stored in Firestore due to size limits

        if (data.weddingDate?.seconds) {
          const date = new Date(data.weddingDate.seconds * 1000);
          setWeddingDate(date);
          const today = new Date();
          const diffTime = date.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysLeft(diffDays);
        } else {
          setWeddingDate(null);
          setDaysLeft(null);
        }
      }
      setProfileLoading(false);
    };
    if (!authLoading) fetchUserData();
  }, [user, authLoading]);

  return { 
    userName, 
    weddingDate, 
    daysLeft, 
    profileLoading, 
    partnerName, 
    guestCount, 
    budget, 
    cityState, 
    style,
    // Additional onboarding fields
    weddingLocation,
    weddingLocationUndecided,
    hasVenue,
    selectedVenueMetadata,
    vibe,
    vibeInputMethod,
    generatedVibes,
    budgetRange
  };
} 