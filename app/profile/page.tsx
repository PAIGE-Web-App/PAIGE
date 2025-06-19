"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import WeddingBanner from "../../components/WeddingBanner";
import { useUserProfileData } from "../../hooks/useUserProfileData";
import { AnimatePresence, motion } from "framer-motion";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { X, User, Pencil } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useRouter, useSearchParams } from 'next/navigation';
import UnsavedChangesModal from "../../components/UnsavedChangesModal";
import imageCompression from 'browser-image-compression';
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import VenueCard from '@/components/VenueCard';
import { useWeddingBanner } from "../../hooks/useWeddingBanner";

// Declare global variables provided by the Google Maps environment
declare const google: any;

const TABS = [
  { key: "account", label: "Account" },
  { key: "wedding", label: "Wedding Details" },
  { key: "plan", label: "Plan & Billing" },
  { key: "integrations", label: "Integrations" },
  { key: "notifications", label: "Notifications" },
];

// Helper to add cache-busting parameter
function addCacheBuster(url: string | null): string | null {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
}

// Helper to generate a blurred LQIP (base64) from a Blob
async function generateLQIP(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Resize the image to a tiny size and blur it
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 16; // LQIP size
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.filter = 'blur(2px)';
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(blob);
  });
}

export default function ProfilePage() {
  const { user, profileImageUrl, setProfileImageUrl } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or default to "account"
  const getInitialTab = () => {
    const tabFromUrl = searchParams?.get('tab');
    return TABS.find(tab => tab.key === tabFromUrl) ? tabFromUrl : "account";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [saving, setSaving] = useState(false);
  const [showBannerLocal, setShowBannerLocal] = useState(true);

  const [venueSearch, setVenueSearch] = useState("");
  const [venueSuggestions, setVenueSuggestions] = useState<any[]>([]);

  // Add venue search functionality
  const searchVenues = async (query: string) => {
    if (!query.trim()) {
      setVenueSuggestions([]);
      return;
    }

    try {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        query: query + ' wedding venue',
        type: 'establishment',
        fields: ['name', 'place_id', 'formatted_address', 'geometry'],
      };

      service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setVenueSuggestions(results);
        } else {
          setVenueSuggestions([]);
        }
      });
    } catch (error) {
      console.error('Error searching venues:', error);
      setVenueSuggestions([]);
    }
  };

  // Handle tab changes and update URL
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabKey);
    router.push(`/profile?${params.toString()}`, { scroll: false });
  };

  // Mock data for now
  const [weddingDate, setWeddingDate] = useState<string>("");
  const [showBanner, setShowBanner] = useState(true);
  const [userName, setUserName] = useState("Brock Yoon");
  const [partnerName, setPartnerName] = useState("Michelle Park");
  const [guestCount, setGuestCount] = useState(120);
  const [budget, setBudget] = useState("$30,000");
  const [cityState, setCityState] = useState("Dallas, TX");
  const [style, setStyle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [address, setAddress] = useState("");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Additional onboarding fields state
  const [weddingLocation, setWeddingLocation] = useState("");
  const [weddingLocationUndecided, setWeddingLocationUndecided] = useState(false);
  const [hasVenue, setHasVenue] = useState<boolean | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any>(null);
  const [vibe, setVibe] = useState<string[]>([]);
  const [vibeInputMethod, setVibeInputMethod] = useState('pills');
  const [generatedVibes, setGeneratedVibes] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<{ min: number; max: number } | null>(null);

  // Google Places integration state
  const [venueMetadata, setVenueMetadata] = useState<any>(null);
  const [selectedLocationType, setSelectedLocationType] = useState<string | null>(null);

  // Add email validation state
  const [emailError, setEmailError] = useState("");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Add name validation state
  const [userNameError, setUserNameError] = useState("");
  const [partnerNameError, setPartnerNameError] = useState("");

  // Email validation function
  const validateEmail = (emailValue: string) => {
    if (!emailValue.trim()) {
      setEmailError("Email address is required.");
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Name validation function
  const validateName = (name: string, fieldName: string) => {
    if (!name.trim()) {
      return `${fieldName} is required.`;
    }
    if (name.trim().length < 2) {
      return `${fieldName} must be at least 2 characters.`;
    }
    return "";
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // Clear error if field is empty (don't show error while typing)
    if (!newEmail.trim()) {
      setEmailError("");
    } else {
      // Validate in real-time as user types
      validateEmail(newEmail);
    }
  };

  // Handle email blur with validation
  const handleEmailBlur = () => {
    // Always validate on blur, even if empty
    validateEmail(email);
  };

  // Handle user name change with validation
  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUserName = e.target.value;
    setUserName(newUserName);
    // Clear error if field is empty (don't show error while typing)
    if (!newUserName.trim()) {
      setUserNameError("");
    } else {
      // Validate in real-time as user types
      const error = validateName(newUserName, "Your full name");
      setUserNameError(error);
    }
  };

  // Handle user name blur with validation
  const handleUserNameBlur = () => {
    // Always validate on blur, even if empty
    const error = validateName(userName, "Your full name");
    setUserNameError(error);
  };

  // Handle partner name change with validation
  const handlePartnerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPartnerName = e.target.value;
    setPartnerName(newPartnerName);
    // Clear error if field is empty (don't show error while typing)
    if (!newPartnerName.trim()) {
      setPartnerNameError("");
    } else {
      // Validate in real-time as user types
      const error = validateName(newPartnerName, "Your partner's name");
      setPartnerNameError(error);
    }
  };

  // Handle partner name blur with validation
  const handlePartnerNameBlur = () => {
    // Always validate on blur, even if empty
    const error = validateName(partnerName, "Your partner's name");
    setPartnerNameError(error);
  };

  // Use shared user profile data hook
  const {
    weddingDate: firestoreWeddingDate,
    userName: navUserName,
    daysLeft: firestoreDaysLeft,
    showBanner: globalShowBanner,
    profileLoading,
    partnerName: firestorePartnerName,
    guestCount: firestoreGuestCount,
    budget: firestoreBudget,
    cityState: firestoreCityState,
    style: firestoreStyle,
    userName: firestoreUserName,
    // Additional onboarding fields
    weddingLocation: firestoreWeddingLocation,
    weddingLocationUndecided: firestoreWeddingLocationUndecided,
    hasVenue: firestoreHasVenue,
    selectedVenue: firestoreSelectedVenue,
    selectedVenueMetadata: firestoreSelectedVenueMetadata,
    vibe: firestoreVibe,
    vibeInputMethod: firestoreVibeInputMethod,
    generatedVibes: firestoreGeneratedVibes,
    budgetRange: firestoreBudgetRange,
  } = useUserProfileData();

  // Set email from user object on mount and detect Google sign-in
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  useEffect(() => {
    if (user && user.email) {
      setEmail(user.email);
      if (user.providerData && user.providerData.some((provider) => provider.providerId === 'google.com')) {
        setIsGoogleUser(true);
      } else {
        setIsGoogleUser(false);
      }
    }
  }, [user]);

  // Calculate daysLeft for preview if local weddingDate is set
  let previewDaysLeft = firestoreDaysLeft;
  let previewWeddingDate = firestoreWeddingDate;
  if (weddingDate) {
    const localDate = new Date(weddingDate);
    previewWeddingDate = localDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = localDate.getTime() - today.getTime();
    previewDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Sync local showBanner state with global value on load
  useEffect(() => {
    setShowBannerLocal(!!globalShowBanner);
  }, [globalShowBanner]);

  // Fetch profile image from Firestore on mount (if exists)
  useEffect(() => {
    if (user) {
      const fetchProfileImage = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.profileImageUrl) {
            // Add cache-busting parameter to prevent showing old cached images
            const cacheBustedUrl = addCacheBuster(data.profileImageUrl);
            setProfileImageUrl(cacheBustedUrl);
          }
        }
      };
      fetchProfileImage();
    }
  }, [user]);

  // Handle avatar file selection
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image must be less than 1MB.");
      return;
    }
    // Compress and resize the image before setting
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
      setAvatarFile(compressedFile);
      setAvatarPreview(URL.createObjectURL(compressedFile));
    } catch (err) {
      toast.error("Failed to compress image.");
      return;
    }
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Helper to crop the image to a square using canvas
  async function getCroppedImg(imageSrc: string, crop: { x: number; y: number; width: number; height: number }) {
    const image = await createImage(imageSrc) as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  }

  function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new window.Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });
  }

  // Handle avatar upload (with placeholder crop logic)
  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    setAvatarUploading(true);
    try {
      let croppedBlob: Blob | null = null;
      try {
        // Use the actual cropped area if available, otherwise use a default crop
        const cropArea = croppedAreaPixels || { x: 0, y: 0, width: 200, height: 200 };
        croppedBlob = await getCroppedImg(URL.createObjectURL(avatarFile), cropArea);
      } catch (e) {
        toast.error("Failed to crop image: " + (e instanceof Error ? e.message : e));
        setAvatarUploading(false);
        return;
      }
      if (!croppedBlob) {
        toast.error("Failed to crop image: No blob returned");
        setAvatarUploading(false);
        return;
      }
      let fileRef;
      try {
        fileRef = storageRef(storage, `avatars/${user.uid}`);
        await uploadBytes(fileRef, croppedBlob);
      } catch (e) {
        toast.error("Failed to upload image to storage: " + (e instanceof Error ? e.message : e));
        setAvatarUploading(false);
        return;
      }
      let url = '';
      try {
        url = await getDownloadURL(fileRef);
      } catch (e) {
        toast.error("Failed to get download URL: " + (e instanceof Error ? e.message : e));
        setAvatarUploading(false);
        return;
      }
      let lqip = '';
      try {
        lqip = await generateLQIP(croppedBlob);
      } catch (e) {
        // fallback: just skip LQIP if it fails
        lqip = '';
      }
      try {
        await updateDoc(doc(db, "users", user.uid), { profileImageUrl: url, profileImageLQIP: lqip });
        setProfileImageUrl(url);
        toast.success("Profile image updated!");
      } catch (e) {
        toast.error("Failed to update user profile with image: " + (e instanceof Error ? e.message : e));
        setAvatarUploading(false);
        return;
      }
    } catch (err) {
      toast.error("Unexpected error during upload: " + (err instanceof Error ? err.message : err));
      setAvatarUploading(false);
    } finally {
      setAvatarUploading(false);
      setShowAvatarModal(false);
    }
  };

  // Track initial values for Wedding Details section
  const [weddingInitial, setWeddingInitial] = useState({
    weddingDate: '',
    userName: '',
    partnerName: '',
    guestCount: 0,
    budget: '',
    cityState: '',
    style: '',
    showBanner: true,
  });
  const [weddingSaved, setWeddingSaved] = useState(false);
  const [didLoadWeddingInitial, setDidLoadWeddingInitial] = useState(false);

  // Set initial values for Wedding Details section after Firestore data is loaded
  useEffect(() => {
    if (
      user &&
      !profileLoading &&
      firestorePartnerName !== undefined &&
      firestoreUserName !== undefined &&
      firestoreGuestCount !== undefined &&
      firestoreBudget !== undefined &&
      firestoreCityState !== undefined &&
      firestoreStyle !== undefined &&
      !didLoadWeddingInitial
    ) {
      setWeddingDate(firestoreWeddingDate ? firestoreWeddingDate.toISOString().slice(0, 10) : '');
      setUserName(firestoreUserName ?? '');
      setPartnerName(firestorePartnerName ?? '');
      setGuestCount(firestoreGuestCount ?? 0);
      setBudget(firestoreBudget ?? '');
      setCityState(firestoreCityState ?? '');
      setStyle(firestoreStyle ?? '');
      setShowBannerLocal(!!globalShowBanner);
      
      setWeddingInitial({
        weddingDate: firestoreWeddingDate ? firestoreWeddingDate.toISOString().slice(0, 10) : '',
        userName: firestoreUserName ?? '',
        partnerName: firestorePartnerName ?? '',
        guestCount: firestoreGuestCount ?? 0,
        budget: firestoreBudget ?? '',
        cityState: firestoreCityState ?? '',
        style: firestoreStyle ?? '',
        showBanner: !!globalShowBanner,
      });
      setDidLoadWeddingInitial(true);
    }
  }, [user, profileLoading, firestoreWeddingDate, firestoreUserName, firestorePartnerName, firestoreGuestCount, firestoreBudget, firestoreCityState, firestoreStyle, globalShowBanner, didLoadWeddingInitial]);

  // Reset didLoadWeddingInitial if user changes
  useEffect(() => {
    setDidLoadWeddingInitial(false);
  }, [user]);

  // Check if any Wedding Details field is changed
  const isWeddingChanged =
    weddingDate !== weddingInitial.weddingDate ||
    guestCount !== weddingInitial.guestCount ||
    budget !== weddingInitial.budget ||
    cityState !== weddingInitial.cityState ||
    style !== weddingInitial.style ||
    showBannerLocal !== weddingInitial.showBanner;

  // Save handler for Wedding Details section
  const handleWeddingSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const weddingDateObj = weddingDate ? new Date(weddingDate) : null;
      await updateDoc(doc(db, "users", user.uid), {
        weddingDate: weddingDateObj,
        guestCount,
        budget,
        cityState,
        style,
        showBanner: showBannerLocal,
      });
      setWeddingInitial({
        weddingDate,
        userName,
        partnerName,
        guestCount,
        budget,
        cityState,
        style,
        showBanner: showBannerLocal,
      });
      setWeddingSaved(true);
      setTimeout(() => setWeddingSaved(false), 2000);
      toast.success("Wedding details saved!");
    } catch (err) {
      toast.error("Failed to save wedding details");
    } finally {
      setSaving(false);
    }
  };

  // Google integration state
  const [integrationGoogleEmail, setIntegrationGoogleEmail] = useState<string | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);

  // Fetch connected Google account on mount and after connect/disconnect
  useEffect(() => {
    const fetchGoogleIntegration = async () => {
      if (!user) return;
      setIntegrationLoading(true);
      setIntegrationError(null);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const tokens = data.googleTokens;
          if (tokens && tokens.email) {
            setIntegrationGoogleEmail(tokens.email);
          } else {
            setIntegrationGoogleEmail(null);
          }
        }
      } catch (err) {
        setIntegrationError("Failed to fetch Google integration.");
      } finally {
        setIntegrationLoading(false);
      }
    };
    fetchGoogleIntegration();
  }, [user]);

  // Connect/Change Google
  const [showGmailConfirmModal, setShowGmailConfirmModal] = useState<null | 'disconnect' | 'change'>(null);
  const [pendingGoogleAction, setPendingGoogleAction] = useState<null | (() => void)>(null);

  const handleConnectGoogle = () => {
    if (!user) return;
    setShowGmailConfirmModal('change');
    setPendingGoogleAction(() => () => {
      const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
      window.location.href = `/api/auth/google/initiate?userId=${user.uid}&redirectUri=${redirectUri}`;
    });
  };

  const handleDisconnectGoogle = () => {
    if (!user) return;
    setShowGmailConfirmModal('disconnect');
    setPendingGoogleAction(() => async () => {
      setIntegrationLoading(true);
      setIntegrationError(null);
      try {
        await updateDoc(doc(db, "users", user.uid), { googleTokens: null });
        setIntegrationGoogleEmail(null);
        toast.success("Disconnected Google account.");
      } catch (err) {
        setIntegrationError("Failed to disconnect Google account.");
        toast.error("Failed to disconnect Google account.");
      } finally {
        setIntegrationLoading(false);
      }
    });
  };

  const isIntegrationConnected = !!integrationGoogleEmail;

  // Track initial values for Account section
  const [accountInitial, setAccountInitial] = useState({
    userName: '',
    partnerName: '',
    email: '',
  });
  const [accountSaved, setAccountSaved] = useState(false);
  const [didLoadAccountInitial, setDidLoadAccountInitial] = useState(false);

  // Set initial values for Account section and state variables only after Firestore data is loaded
  useEffect(() => {
    if (
      user &&
      !profileLoading &&
      firestorePartnerName !== undefined &&
      firestoreUserName !== undefined &&
      !didLoadAccountInitial
    ) {
      setUserName(firestoreUserName ?? '');
      setPartnerName(firestorePartnerName ?? '');
      setEmail(user?.email ?? '');
      setAccountInitial({
        userName: firestoreUserName ?? '',
        partnerName: firestorePartnerName ?? '',
        email: user?.email ?? '',
      });
      setDidLoadAccountInitial(true);
    }
  }, [user, profileLoading, firestoreUserName, firestorePartnerName, didLoadAccountInitial]);

  // Reset didLoadAccountInitial if user changes (e.g., logout/login)
  useEffect(() => {
    setDidLoadAccountInitial(false);
  }, [user]);

  // Check if any Account field is changed
  const isAccountChanged =
    userName !== accountInitial.userName ||
    partnerName !== accountInitial.partnerName ||
    email !== accountInitial.email;

  // Save handler for Account section
  const handleAccountSave = async () => {
    if (!user) return;
    
    // Validate all fields before saving
    const emailValid = validateEmail(email);
    const userNameValid = !validateName(userName, "Your full name");
    const partnerNameValid = !validateName(partnerName, "Your partner's name");
    
    if (!emailValid || !userNameValid || !partnerNameValid) {
      toast.error("Please fix the validation errors before saving.");
      return;
    }
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        userName,
        partnerName,
        email,
      });
      setAccountInitial({ userName, partnerName, email });
      setAccountSaved(true);
      setTimeout(() => setAccountSaved(false), 2000);
      toast.success("Account details saved!");
    } catch (err) {
      toast.error("Failed to save account details");
    } finally {
      setSaving(false);
    }
  };

  // Set initial values for Wedding section
  useEffect(() => {
    if (!profileLoading) {
      setWeddingLocation(firestoreWeddingLocation ?? '');
      setWeddingLocationUndecided(firestoreWeddingLocationUndecided ?? false);
      setHasVenue(firestoreHasVenue ?? null);
      setSelectedVenue(firestoreSelectedVenue ?? null);
      setSelectedVenueMetadata(firestoreSelectedVenueMetadata ?? null);
      setVibe(firestoreVibe ?? []);
      setVibeInputMethod(firestoreVibeInputMethod ?? 'pills');
      setGeneratedVibes(firestoreGeneratedVibes ?? []);
      setBudgetRange(firestoreBudgetRange ?? null);
    }
  }, [profileLoading, firestoreWeddingLocation, firestoreWeddingLocationUndecided, firestoreHasVenue, firestoreSelectedVenue, firestoreSelectedVenueMetadata, firestoreVibe, firestoreVibeInputMethod, firestoreGeneratedVibes, firestoreBudgetRange]);

  const { daysLeft, userName: bannerUserName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);

  return (
    <>
      <AnimatePresence mode="wait">
        {showBannerLocal && (
          <motion.div
            key="wedding-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <WeddingBanner
              daysLeft={daysLeft}
              userName={bannerUserName}
              isLoading={bannerLoading}
              onSetWeddingDate={handleSetWeddingDate}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="min-h-screen bg-[#F3F2F0] flex flex-col items-center py-12">
        <div className="w-full max-w-4xl">
          <h3 className="mb-8">Settings</h3>
          <div className="flex gap-2 mb-8">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`px-4 py-2 rounded font-work-sans text-sm font-medium border transition-colors duration-150 focus:outline-none ${activeTab === tab.key ? "bg-white border-[#A85C36] text-[#A85C36]" : "bg-[#F3F2F0] border-[#E0D6D0] text-[#332B42] hover:bg-[#E0D6D0]"}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "account" && (
            <div className="flex gap-8">
              {/* Account Details Only */}
              <div className="flex-1 bg-white rounded-lg p-8 shadow">
                <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Account Details</h2>
                <div className="flex flex-col items-center mb-4">
                  <div
                    className="w-16 h-16 rounded-full mb-2 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: '#7D7B7B' }}
                  >
                    {profileImageUrl ? (
                      <img
                        key={addCacheBuster(profileImageUrl) || ''}
                        src={addCacheBuster(profileImageUrl) || ''}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).src = ""; }}
                      />
                    ) : (
                      <User className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <button className="text-xs text-[#A85C36] underline mb-2 flex items-center gap-1" onClick={() => setShowAvatarModal(true)}>
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-work-sans text-[#332B42] mb-1">Email Address*</label>
                  {isGoogleUser ? (
                    <div className="flex items-center gap-2 bg-[#F3F2F0] px-3 py-2 rounded w-full">
                      <img src="/Google__G__logo.svg" alt="Google" className="w-5 h-5" title="Signed up with Google" />
                      <span className="text-sm text-[#332B42] break-all">{email}</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        className={`w-full px-3 py-2 border rounded bg-white text-sm focus:outline-none focus:ring-2 ${
                          emailError 
                            ? "border-red-500 focus:ring-red-500" 
                            : "border-[#AB9C95] focus:ring-[#A85C36]"
                        }`}
                      />
                      {emailError && (
                        <p className="text-red-500 text-xs mt-1">{emailError}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="mb-4 flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Your Full Name*</label>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={handleUserNameChange} 
                      onBlur={handleUserNameBlur} 
                      className={`w-full px-3 py-2 border rounded bg-white text-sm focus:outline-none focus:ring-2 ${
                        userNameError 
                          ? "border-red-500 focus:ring-red-500" 
                          : "border-[#AB9C95] focus:ring-[#A85C36]"
                      }`}
                    />
                    {userNameError && (
                      <p className="text-red-500 text-xs mt-1">{userNameError}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Your Partner's Name*</label>
                    <input 
                      type="text" 
                      value={partnerName} 
                      onChange={handlePartnerNameChange} 
                      onBlur={handlePartnerNameBlur} 
                      className={`w-full px-3 py-2 border rounded bg-white text-sm focus:outline-none focus:ring-2 ${
                        partnerNameError 
                          ? "border-red-500 focus:ring-red-500" 
                          : "border-[#AB9C95] focus:ring-[#A85C36]"
                      }`}
                    />
                    {partnerNameError && (
                      <p className="text-red-500 text-xs mt-1">{partnerNameError}</p>
                    )}
                  </div>
                </div>
                {!isGoogleUser && (
                  <div className="mb-4">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Password</label>
                    <button
                      className="text-xs text-[#A85C36] underline hover:opacity-80 mt-1 text-left"
                      type="button"
                      onClick={async () => {
                        if (!email) {
                          toast.error("No email found for this account.");
                          return;
                        }
                        try {
                          const auth = getAuth();
                          await sendPasswordResetEmail(auth, email);
                          toast.success(`Password reset email sent to ${email}`);
                        } catch (err) {
                          toast.error("Failed to send password reset email.");
                        }
                      }}
                    >
                      Reset Password
                    </button>
                  </div>
                )}
                <div className="flex justify-end items-center mt-6 gap-3">
                  {accountSaved && <span className="text-green-600 text-sm font-medium mr-2">Saved!</span>}
                  <button
                    className="btn-primary px-8 py-2 rounded font-semibold text-base disabled:opacity-60"
                    onClick={handleAccountSave}
                    disabled={saving || !isAccountChanged || !!emailError || !!userNameError || !!partnerNameError}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === "wedding" && (
            <div className="flex gap-8">
              {/* Wedding Details Only */}
              <div className="flex-1 bg-white rounded-lg p-8 shadow">
                <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Wedding Details</h2>
                
                {/* Wedding Date */}
                <div className="mb-4">
                  <label className="block text-xs font-work-sans text-[#332B42] mb-1">When's the big day?*</label>
                  <input
                    type="date"
                    value={firestoreWeddingDate ? firestoreWeddingDate.toISOString().slice(0, 10) : weddingDate}
                    onChange={e => setWeddingDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                  />
                  <label className="mt-2 flex items-center text-sm text-[#332B42] gap-2">
                    <input
                      type="checkbox"
                      checked={showBannerLocal}
                      onChange={() => setShowBannerLocal((prev) => !prev)}
                      className="form-checkbox rounded border-[#AB9C95] text-[#A85C36]"
                    />
                    Show on banner (recommended)
                  </label>
                </div>

                {/* Wedding Location */}
                <div className="mb-4">
                  <label className="block text-xs font-work-sans text-[#332B42] mb-1">Wedding Location</label>
                  {profileLoading ? (
                    <div className="animate-pulse bg-[#F3F2F0] h-[38px] rounded border border-[#AB9C95]" />
                  ) : weddingLocationUndecided ? (
                    <div className="px-3 py-2 bg-[#F3F2F0] rounded border border-[#AB9C95] text-sm text-[#332B42]">
                      We're working on location still!
                    </div>
                  ) : (
                    <PlacesAutocompleteInput
                      value={weddingLocation || firestoreWeddingLocation || ''}
                      onChange={setWeddingLocation}
                      setVenueMetadata={setVenueMetadata}
                      setSelectedLocationType={setSelectedLocationType}
                      placeholder="Enter wedding location"
                      types={['geocode']}
                    />
                  )}
                </div>

                {/* Venue Details */}
                <AnimatePresence mode="wait">
                  {/* Selected Venue Card */}
                  {hasVenue && selectedVenueMetadata && (
                    <AnimatePresence mode="wait">
                      <VenueCard
                        venue={selectedVenueMetadata}
                        onDelete={() => {
                          setHasVenue(false);
                          setSelectedVenue(null);
                          setSelectedVenueMetadata(null);
                          setVenueSearch("");
                        }}
                      />
                    </AnimatePresence>
                  )}

                  {/* Show venue search when user has no venue or hasn't made a choice yet */}
                  {(hasVenue === false || hasVenue === null) && (
                    <motion.div
                      key="venue-search"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                      className="mb-4"
                    >
                      <label className="block text-xs font-work-sans text-[#332B42] mb-1">Search for your venue</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={venueSearch}
                          onChange={(e) => {
                            setVenueSearch(e.target.value);
                            searchVenues(e.target.value);
                            setSelectedVenueMetadata(null); // Reset on change
                          }}
                          placeholder="Enter venue name"
                          className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                        />
                        {venueSuggestions.length > 0 && (
                          <ul className="absolute z-10 bg-white border border-[#AB9C95] rounded mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
                            {venueSuggestions.map((venue) => (
                              <li
                                key={venue.place_id}
                                className="px-3 py-2 cursor-pointer hover:bg-[#F3F2F0] text-sm"
                                onClick={() => {
                                  setSelectedVenue(venue);
                                  setVenueSearch(venue.name);
                                  setVenueSuggestions([]);
                                  // Fetch and set venue metadata
                                  const placesService = new google.maps.places.PlacesService(document.createElement('div'));
                                  placesService.getDetails({ placeId: venue.place_id, fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos', 'rating', 'user_ratings_total', 'types', 'url'] }, (place, status) => {
                                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                                      setSelectedVenueMetadata(place);
                                      setHasVenue(true);
                                    } else {
                                      setSelectedVenueMetadata(null);
                                    }
                                  });
                                }}
                              >
                                <div className="font-medium">{venue.name}</div>
                                <div className="text-xs text-gray-500">{venue.formatted_address}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Wedding Vibe */}
                {(vibe.length > 0 || generatedVibes.length > 0) && (
                  <div className="mb-4">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Wedding Vibe</label>
                    <div className="flex flex-wrap gap-2">
                      {[...vibe, ...generatedVibes].map((vibeItem, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-full border text-sm font-work-sans border-[#AB9C95] text-[#332B42] bg-white"
                        >
                          {vibeItem}
                        </span>
                      ))}
                    </div>
                    <a href="/inspiration" className="text-xs text-[#A85C36] underline mt-2 inline-block hover:opacity-80">
                      Update vibe
                    </a>
                  </div>
                )}

                {/* Guest Count */}
                <div className="mb-4">
                  <label className="block text-xs font-work-sans text-[#332B42] mb-1">Guest Count</label>
                  <input type="number" value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                </div>

                {/* Budget Range */}
                {budgetRange && (
                  <div className="mb-4">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Budget Range</label>
                    <div className="px-3 py-2 bg-[#F3F2F0] rounded border border-[#AB9C95] text-sm text-[#332B42]">
                      ${budgetRange.min.toLocaleString()} - ${budgetRange.max.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Legacy Budget Field */}
                <div className="mb-4 flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Budget</label>
                    <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">City, State</label>
                    <input type="text" value={cityState} onChange={e => setCityState(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                  </div>
                </div>

                {/* Style */}
                <div className="mb-4">
                  <label className="block text-xs font-work-sans text-[#332B42] mb-1">Style</label>
                  <input type="text" value={style} onChange={e => setStyle(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" disabled />
                </div>

                <div className="flex justify-end items-center mt-6 gap-3">
                  {weddingSaved && <span className="text-green-600 text-sm font-medium mr-2">Saved!</span>}
                  <button
                    className="btn-primary px-8 py-2 rounded font-semibold text-base disabled:opacity-60"
                    onClick={handleWeddingSave}
                    disabled={saving || !isWeddingChanged}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Plan Banner */}
          {activeTab === "account" && (
            <div className="mt-8">
              <div className="bg-orange-100 border border-orange-300 text-orange-800 px-4 py-2 rounded mb-4 text-sm font-medium">
                Try the Standard Plan for <span className="font-bold">free</span> for 15 days!
              </div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-playfair font-semibold mb-1 text-[#332B42]">Partner profile</h3>
                  <p className="text-sm text-[#332B42] max-w-xl">With a Standard Plan, you can add up to 1 extra member. Your partner will have access to all of the features you do and will share access to vendors and messages in your dashboard. Downgrade anytime.</p>
                </div>
                <button className="btn-primary px-6 py-2 rounded font-semibold text-base" disabled>Upgrade Plan</button>
              </div>
            </div>
          )}
          {activeTab === "integrations" && (
            <div className="flex gap-8">
              <div className="flex-1 bg-white rounded-lg p-8 shadow">
                <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Integrations</h2>
                {/* Login Provider Section */}
                <div className="mb-8">
                  <h3 className="text-base font-semibold text-[#332B42] mb-2">Login Provider</h3>
                  {isGoogleUser ? (
                    <div className="flex items-center gap-2 bg-[#F3F2F0] px-3 py-2 rounded w-full">
                      <img src="/Google__G__logo.svg" alt="Google" className="w-5 h-5" title="Signed up with Google" />
                      <span className="text-sm text-[#332B42] break-all">Google ({email})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#F3F2F0] px-3 py-2 rounded w-full">
                      <span className="text-sm text-[#332B42] break-all">Email/Password ({email})</span>
                    </div>
                  )}
                </div>
                {/* Google Contacts & Gmail Integration Section */}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-[#332B42] mb-2 flex items-center">
                    <img src="/Google__G__logo.svg" alt="Google" className="w-6 h-6 mr-2" />
                    Google Contacts & Gmail Integration
                  </h3>
                  {integrationLoading ? (
                    <div className="text-xs text-[#332B42] mb-2">Loading...</div>
                  ) : integrationError ? (
                    <div className="text-xs text-red-600 mb-2">{integrationError}</div>
                  ) : (
                    <div className="bg-[#F3F2F0] rounded p-4 mb-2">
                      {integrationGoogleEmail ? (
                        isGoogleUser && integrationGoogleEmail !== email ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <img src="/Google__G__logo.svg" alt="Google" className="w-5 h-5" />
                              <span className="text-sm text-[#332B42] break-all">Login: {email}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <img src="/Google__G__logo.svg" alt="Google" className="w-5 h-5" />
                              <span className="text-sm text-[#332B42] break-all">Contacts & Gmail: {integrationGoogleEmail}</span>
                              <div className="ml-auto flex gap-2">
                                <button className="btn-primaryinverse" onClick={handleDisconnectGoogle} disabled={integrationLoading}>Disconnect</button>
                                <button className="btn-primaryinverse" onClick={handleConnectGoogle} disabled={integrationLoading}>Change Account</button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 mb-2">
                            <img src="/Google__G__logo.svg" alt="Google" className="w-5 h-5" />
                            <span className="text-sm text-[#332B42] break-all">{integrationGoogleEmail || email}</span>
                            <div className="ml-auto flex gap-2">
                              <button className="btn-primaryinverse" onClick={handleDisconnectGoogle} disabled={integrationLoading}>Disconnect</button>
                              <button className="btn-primaryinverse" onClick={handleConnectGoogle} disabled={integrationLoading}>Change Account</button>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-between mb-2 w-full">
                          <div className="flex flex-col flex-1">
                            <span className="text-sm text-[#332B42]">
                              Connect your Google Account to import your emails, sync your Google Contacts, and send emails from Paige.
                            </span>
                            {!isGoogleUser && (
                              <span className="text-xs text-[#7A7A7A] mt-2">
                                Note: Connecting Google will not change your login method. If you want to login with Google, please create a new account and sign up with Google.
                              </span>
                            )}
                          </div>
                          <button className="btn-primary" style={{ marginLeft: 60 }} onClick={handleConnectGoogle} disabled={integrationLoading}>Connect</button>
                        </div>
                      )}
                      {integrationGoogleEmail && (
                        <div className="ml-7">
                          <ul className="list-disc text-sm text-[#332B42]">
                            <li>
                              This account is used to import your emails, sync your Google Contacts, and send emails from Paige.
                              {isGoogleUser && integrationGoogleEmail !== email ? ` (as ${integrationGoogleEmail})` : ''}
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Other tabs can be filled in later */}
        </div>
      </div>
      {/* Avatar Upload Modal (styled like UpgradePlanModal) */}
      <AnimatePresence>
        {showAvatarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAvatarModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white rounded-[10px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAvatarModal(false)}
                className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                title="Close"
              >
                <X size={20} />
              </button>
              <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4">Update Profile Image</h3>
              <div
                className={`w-full border border-[#AB9C95] px-3 py-6 rounded-[5px] text-sm flex flex-col items-center justify-center transition-colors duration-150 ${dragActive ? 'bg-[#F3F2F0] border-[#A85C36]' : 'bg-white'} mb-4`}
                onDragOver={e => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={e => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDrop={async e => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files && e.dataTransfer.files[0];
                  if (file) {
                    if (!file.type.startsWith('image/')) {
                      toast.error('Please upload a valid image file.');
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      return;
                    }
                    if (file.size > 1 * 1024 * 1024) {
                      toast.error('Image must be less than 1MB.');
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      return;
                    }
                    // Compress and resize the image before setting
                    try {
                      const compressedFile = await imageCompression(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 512,
                        useWebWorker: true,
                      });
                      setAvatarFile(compressedFile);
                      setAvatarPreview(URL.createObjectURL(compressedFile));
                    } catch (err) {
                      toast.error("Failed to compress image.");
                      return;
                    }
                  }
                }}
              >
                <div className="w-full flex flex-col items-center">
                  {!avatarFile && (
                    <div className="text-xs text-[#AB9C95] mb-2 text-center">No file chosen</div>
                  )}
                  {avatarFile && (
                    <div className="text-sm text-[#332B42] mb-2 text-center">Selected file: {avatarFile.name}</div>
                  )}
                  <label className="btn-primaryinverse block mx-auto mt-0 mb-2 text-center cursor-pointer" htmlFor="profile-image-upload">
                    Choose File
                    <input
                      id="profile-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center w-full">Drag & drop an image here, or click to select. Accepted formats: JPG, PNG, GIF, SVG, WebP. Max size: 1MB.</div>
                {avatarPreview && (
                  <div className="w-full flex flex-col items-center mt-2">
                    <div className="relative w-48 h-48 bg-[#F3F2F0] rounded-lg border border-[#AB9C95] overflow-hidden">
                      <Cropper
                        image={avatarPreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-4 w-full justify-center">
                      <label className="text-xs text-[#332B42]">Zoom</label>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 w-full mt-2">
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="btn-primaryinverse"
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleAvatarUpload}
                  disabled={avatarUploading || !avatarFile}
                >
                  {avatarUploading ? "Uploading..." : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <UnsavedChangesModal
        isOpen={!!showGmailConfirmModal}
        onCancel={() => setShowGmailConfirmModal(null)}
        onConfirm={async () => {
          setShowGmailConfirmModal(null);
          if (pendingGoogleAction) await pendingGoogleAction();
        }}
        title="Are you sure you want to do that?"
        message={
          "Disconnecting or changing your Gmail will cause synced contacts and imported emails from Google to stop syncing and will not allow you to send emails anymore. This will NOT change your login method or email."
        }
      />
    </>
  );
}

// PlacesAutocompleteInput component for Google Places integration
function PlacesAutocompleteInput({ value, onChange, setVenueMetadata, setSelectedLocationType, placeholder, types = ['geocode'], disabled = false }: { value: string; onChange: (val: string) => void; setVenueMetadata: (venue: any) => void; setSelectedLocationType: (type: string | null) => void; placeholder: string; types?: string[]; disabled?: boolean }) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types,
    },
    debounce: 300,
    defaultValue: value,
  });

  return (
    <div className="relative">
      <input
        value={disabled ? value : inputValue}
        onChange={e => {
          setValue(e.target.value);
          onChange(e.target.value);
          setVenueMetadata(null); // Reset venue metadata on input change
        }}
        disabled={disabled || !ready}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] appearance-none ${disabled ? 'bg-[#F3F2F0] text-[#AB9C95] cursor-not-allowed' : 'bg-white text-[#332B42]'}`}
      />
      {status === "OK" && data.length > 0 && !disabled && (
        <ul className="absolute z-10 bg-white border border-[#AB9C95] rounded mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
          {data.map(({ place_id, description, types }) => (
            <li
              key={place_id}
              className="px-3 py-2 cursor-pointer hover:bg-[#F3F2F0] text-sm"
              onClick={() => {
                setValue(description, false);
                onChange(description);
                clearSuggestions();
                // Set location type for parent
                const allowedTypes = ['locality', 'administrative_area_level_1', 'country'];
                let foundType = null;
                if (types && types.length > 0) {
                  foundType = types.find(type => allowedTypes.includes(type)) || null;
                }
                setSelectedLocationType(foundType);
                // Venue logic
                const venueTypes = ['street_address', 'premise', 'establishment', 'point_of_interest'];
                if (types && types.some(type => venueTypes.includes(type))) {
                  const placesService = new google.maps.places.PlacesService(document.createElement('div'));
                  placesService.getDetails({ placeId: place_id, fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos', 'rating', 'user_ratings_total', 'types', 'url'] }, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                      setVenueMetadata(place);
                    } else {
                      setVenueMetadata(null);
                    }
                  });
                } else {
                  setVenueMetadata(null);
                }
              }}
            >
              {description}
              <span className="text-xs text-gray-500 ml-2">
                {types?.includes('street_address') ? 'Address' :
                 types?.includes('premise') ? 'Venue' :
                 types?.includes('establishment') ? 'Venue' :
                 types?.includes('point_of_interest') ? 'Venue' :
                 types?.includes('locality') ? 'City' :
                 types?.includes('administrative_area_level_1') ? 'State' :
                 types?.includes('country') ? 'Country' : 'Location'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 