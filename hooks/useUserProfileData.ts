import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export function useUserProfileData() {
  const { user, loading: authLoading } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [weddingDateUndecided, setWeddingDateUndecided] = useState<boolean>(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerEmail, setPartnerEmail] = useState<string | null>(null);
  const [plannerName, setPlannerName] = useState<string | null>(null);
  const [plannerEmail, setPlannerEmail] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [cityState, setCityState] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);

  // Additional onboarding fields
  const [weddingLocation, setWeddingLocation] = useState<string | null>(null);
  const [weddingLocationUndecided, setWeddingLocationUndecided] = useState<boolean>(false);
  const [hasVenue, setHasVenue] = useState<boolean | null>(null);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any>(null);
  const [selectedPlannerMetadata, setSelectedPlannerMetadata] = useState<any>(null);
  const [vibe, setVibe] = useState<string[]>([]);
  const [vibeInputMethod, setVibeInputMethod] = useState<string>('pills');
  const [generatedVibes, setGeneratedVibes] = useState<string[]>([]);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [additionalContext, setAdditionalContext] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Notification preferences
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<{
    sms: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  }>({
    sms: false,
    email: false,
    push: false,
    inApp: false
  });

  const [reloadCount, setReloadCount] = useState(0);
  const reload = () => setReloadCount((c) => c + 1);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.userName || null);
          setPartnerName(data.partnerName || null);
          setPartnerEmail(data.partnerEmail || null);
          setPlannerName(data.plannerName || null);
          setPlannerEmail(data.plannerEmail || null);
          setGuestCount(data.guestCount || null);
          setBudget(data.budget || null);
          setCityState(data.cityState || null);
          setStyle(data.style || null);
          setWeddingDateUndecided(data.weddingDateUndecided || false);

          // Additional onboarding fields
          setWeddingLocation(data.weddingLocation || null);
          setWeddingLocationUndecided(data.weddingLocationUndecided || false);
          setHasVenue(data.hasVenue || null);
          setSelectedVenueMetadata(data.selectedVenueMetadata || null);
          setSelectedPlannerMetadata(data.selectedPlannerMetadata || null);
          setVibe(data.vibe || []);
          setVibeInputMethod(data.vibeInputMethod || 'pills');
          setGeneratedVibes(data.generatedVibes || []);
          setMaxBudget(data.maxBudget || null);
          setAdditionalContext(data.additionalContext || null);
          // Note: imagePreview is not stored in Firestore due to size limits

          // Notification preferences
          setPhoneNumber(data.phoneNumber || null);
          setNotificationPreferences({
            sms: data.notificationPreferences?.sms || false,
            email: data.notificationPreferences?.email || false,
            push: data.notificationPreferences?.push || false,
            inApp: data.notificationPreferences?.inApp || false
          });

          // Only set wedding date if it exists AND is not undecided
          if (data.weddingDate?.seconds && !data.weddingDateUndecided) {
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
      } catch (error) {
        console.error('Error fetching user profile data:', error);
      } finally {
        setProfileLoading(false);
      }
    };
    
    if (!authLoading && user) {
      fetchUserData();
    } else if (!authLoading && !user) {
      setProfileLoading(false);
    }
  }, [authLoading, user, reloadCount]);

  return {
    userName,
    weddingDate,
    weddingDateUndecided,
    daysLeft,
    profileLoading,
    partnerName,
    partnerEmail,
    plannerName,
    plannerEmail,
    guestCount,
    budget,
    cityState,
    style,
    weddingLocation,
    weddingLocationUndecided,
    hasVenue,
    selectedVenueMetadata,
    selectedPlannerMetadata,
    vibe,
    vibeInputMethod,
    generatedVibes,
    maxBudget,
    additionalContext,
    imagePreview,
    phoneNumber,
    notificationPreferences,
    reload
  };
} 