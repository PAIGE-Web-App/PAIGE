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
import { useRouter } from 'next/navigation';
import UnsavedChangesModal from "../../components/UnsavedChangesModal";
import imageCompression from 'browser-image-compression';

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
  const [activeTab, setActiveTab] = useState("account");
  const [saving, setSaving] = useState(false);
  const [showBannerLocal, setShowBannerLocal] = useState(true);

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

  // Sync local wedding details state with Firestore values on load
  useEffect(() => {
    if (firestorePartnerName) setPartnerName(firestorePartnerName);
    if (firestoreGuestCount !== null && firestoreGuestCount !== undefined) setGuestCount(firestoreGuestCount);
    if (firestoreBudget) setBudget(firestoreBudget);
    if (firestoreCityState) setCityState(firestoreCityState);
    if (firestoreStyle) setStyle(firestoreStyle);
  }, [firestorePartnerName, firestoreGuestCount, firestoreBudget, firestoreCityState, firestoreStyle]);

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

  // Mock for banner
  const handleSetWeddingDate = () => toast("Set wedding date clicked!");

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        userName,
        partnerName,
        weddingDate,
        guestCount,
        budget,
        cityState,
        style,
        showBanner: showBannerLocal,
        address,
      });
      toast.success("Profile updated!");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Google integration state
  const [integrationGoogleEmail, setIntegrationGoogleEmail] = useState<string | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const router = useRouter();

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
            <WeddingBanner daysLeft={previewDaysLeft} userName={navUserName} isLoading={profileLoading} onSetWeddingDate={handleSetWeddingDate} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="min-h-screen bg-[#F3F2F0] flex flex-col items-center py-12">
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-playfair font-semibold text-[#332B42] mb-8">Settings</h1>
          <div className="flex gap-2 mb-8">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`px-4 py-2 rounded font-work-sans text-sm font-medium border transition-colors duration-150 focus:outline-none ${activeTab === tab.key ? "bg-white border-[#A85C36] text-[#A85C36]" : "bg-[#F3F2F0] border-[#E0D6D0] text-[#332B42] hover:bg-[#E0D6D0]"}`}
                onClick={() => setActiveTab(tab.key)}
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
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    />
                  )}
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
                    disabled={saving || !isAccountChanged}
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
                <div className="mb-4 flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Your Name*</label>
                    <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Guest Count</label>
                    <input type="number" value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                  </div>
                </div>
                <div className="mb-4 flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Your Partner's Name*</label>
                    <input type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Budget</label>
                    <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                  </div>
                </div>
                <div className="mb-4 flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">City, State</label>
                    <input type="text" value={cityState} onChange={e => setCityState(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-work-sans text-[#332B42] mb-1">Style</label>
                    <input type="text" value={style} onChange={e => setStyle(e.target.value)} className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" disabled />
                  </div>
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