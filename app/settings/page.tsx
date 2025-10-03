"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuickStartCompletion } from "../../hooks/useQuickStartCompletion";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import WeddingBanner from "../../components/WeddingBanner";
// GlobalGmailBanner now handled globally in layout.tsx
import UnsavedChangesModal from "../../components/UnsavedChangesModal";
import GmailConfirmModal from "../../components/GmailConfirmModal";

// Import our new components
import ProfileTabs, { TABS } from "./components/ProfileTabs";
import { useProfileForm } from "./hooks/useProfileForm";
import VendorEmailFlagReviewModal from "../../components/VendorEmailFlagReviewModal";
import SettingsTabSkeleton from "./components/SettingsTabSkeleton";
import AccountTabSkeleton from "./components/AccountTabSkeleton";
import NotificationsTabSkeleton from "./components/NotificationsTabSkeleton";
import { AdminNavigation } from "../../components/AdminNavigation";
import GoogleMapsLoader from "../../components/GoogleMapsLoader";

// Lazy load tab components - only load when needed
const AccountTab = dynamic(() => import("./components/AccountTab"), {
  loading: () => <AccountTabSkeleton />
});

const WeddingTab = dynamic(() => import("./components/WeddingTab"), {
  loading: () => <SettingsTabSkeleton />
});

const PlanTab = dynamic(() => import("./components/PlanTab"), {
  loading: () => <SettingsTabSkeleton />
});

const IntegrationsTab = dynamic(() => import("./components/IntegrationsTab"), {
  loading: () => <SettingsTabSkeleton />
});

const NotificationsTab = dynamic(() => import("./components/NotificationsTab"), {
  loading: () => <NotificationsTabSkeleton />
});

const CreditsTab = dynamic(() => import("./components/CreditsTab"), {
  loading: () => <SettingsTabSkeleton />
});


export default function ProfilePage() {
  const { user, profileImageUrl, setProfileImageUrl, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Track Quick Start Guide completion
  useQuickStartCompletion();

  const getInitialTab = () => {
    const tabFromUrl = searchParams?.get('tab');
    return TABS.find(tab => tab.key === tabFromUrl)?.key || "account";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [jiggleWeddingDate, setJiggleWeddingDate] = useState(false);
  const [jiggleMaxBudget, setJiggleMaxBudget] = useState(false);
  const [showFlagReview, setShowFlagReview] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const pendingTabKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (searchParams?.get('highlight') === 'weddingDate' && activeTab === 'wedding') {
      setJiggleWeddingDate(true);
      setTimeout(() => setJiggleWeddingDate(false), 1000);
    }
    if (searchParams?.get('highlight') === 'maxBudget' && activeTab === 'wedding') {
      setJiggleMaxBudget(true);
      setTimeout(() => setJiggleMaxBudget(false), 1000);
    }
  }, [searchParams, activeTab]);

  const updateUserAsync = async (data: any) => {
    updateUser(data);
  };

  const {
    saving,
    jiggleAnimate,
    showGmailConfirmModal,
    pendingGoogleAction,
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
    // Wedding Planner state
    selectedPlannerMetadata,
    setSelectedPlannerMetadata,
    plannerSearch,
    setPlannerSearch,
    vibe,
    generatedVibes,
    guestCount,
    setGuestCount,
    maxBudget,
    setMaxBudget,
    selectedLocationType,
    setSelectedLocationType,
    weddingLocationCoords,
    hasUnsavedAccountChanges,
    hasUnsavedWeddingChanges,
    handleWeddingSave,
    handleAccountSave,
    handleGoogleAction,
    handleSetWeddingDate,
    setShowGmailConfirmModal,
    setPendingGoogleAction,
  } = useProfileForm(user, updateUserAsync);

  // Intercept tab changes if there are unsaved changes
  const handleTabChange = (tabKey: string) => {
    if ((hasUnsavedAccountChanges || hasUnsavedWeddingChanges) && tabKey !== activeTab) {
      pendingTabKeyRef.current = tabKey;
      setShowUnsavedModal(true);
    } else {
      setActiveTab(tabKey);
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', tabKey);
      router.push(`/settings?${params.toString()}`, { scroll: false });
    }
  };

  // Warn on browser navigation (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedAccountChanges || hasUnsavedWeddingChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedAccountChanges, hasUnsavedWeddingChanges]);

  // Handle modal actions
  const handleUnsavedCancel = () => {
    setShowUnsavedModal(false);
    pendingTabKeyRef.current = null;
  };
  const handleUnsavedConfirm = () => {
    setShowUnsavedModal(false);
    if (pendingTabKeyRef.current) {
      setActiveTab(pendingTabKeyRef.current);
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', pendingTabKeyRef.current);
      router.push(`/settings?${params.toString()}`, { scroll: false });
      pendingTabKeyRef.current = null;
    }
  };

  // Wedding banner logic

  // Create a wrapper for the wedding banner's onSetWeddingDate prop
  const handleBannerSetWeddingDate = () => {
    // This will be handled by the banner component itself
  };

  return (
    <>
      <GoogleMapsLoader />
      <AnimatePresence>
        {weddingDate && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <WeddingBanner localWeddingDate={weddingDate} />
            {/* GlobalGmailBanner now handled globally in layout.tsx */}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Admin Navigation - Only shows for admin users */}
      <AdminNavigation />
      
      <div className="app-content-container">
        <div className="max-w-[900px] mx-auto w-full">
          <h3 className="mb-8">Settings</h3>
          <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />
          {activeTab === "account" && (
            <AccountTab
              user={user}
              profileImageUrl={profileImageUrl}
              setProfileImageUrl={setProfileImageUrl}
              updateUser={updateUserAsync}
              saving={saving}
              onSave={handleAccountSave}
              email={email}
              userName={userName}
              setUserName={setUserName}
              partnerName={partnerName}
              setPartnerName={setPartnerName}
              partnerEmail={partnerEmail}
              setPartnerEmail={setPartnerEmail}
              plannerName={plannerName}
              setPlannerName={setPlannerName}
              plannerEmail={plannerEmail}
              setPlannerEmail={setPlannerEmail}
              // Wedding Planner state (for AccountTab only)
              selectedPlannerMetadata={selectedPlannerMetadata}
              setSelectedPlannerMetadata={setSelectedPlannerMetadata}
              plannerSearch={plannerSearch}
              setPlannerSearch={setPlannerSearch}
              hasUnsavedChanges={hasUnsavedAccountChanges}
            />
          )}
          {activeTab === "wedding" && (
            <WeddingTab
              weddingDate={weddingDate}
              setWeddingDate={setWeddingDate}
              weddingLocation={weddingLocation}
              setWeddingLocation={setWeddingLocation}
              weddingLocationUndecided={weddingLocationUndecided}
              setWeddingLocationUndecided={setWeddingLocationUndecided}
              hasVenue={hasVenue}
              setHasVenue={setHasVenue}
              selectedVenueMetadata={selectedVenueMetadata}
              setSelectedVenueMetadata={setSelectedVenueMetadata}
              venueSearch={venueSearch}
              setVenueSearch={setVenueSearch}
              vibe={vibe}
              generatedVibes={generatedVibes}
              guestCount={guestCount}
              setGuestCount={setGuestCount}
              maxBudget={maxBudget}
              setMaxBudget={setMaxBudget}
              selectedLocationType={selectedLocationType}
              setSelectedLocationType={setSelectedLocationType}
              weddingLocationCoords={weddingLocationCoords}
              jiggleAnimate={jiggleWeddingDate ? 'animate-jiggle' : ''}
              jiggleMaxBudget={jiggleMaxBudget ? 'animate-jiggle' : ''}
              saving={saving}
              hasUnsavedWeddingChanges={hasUnsavedWeddingChanges}
              onSave={handleWeddingSave}
            />
          )}
          {activeTab === "plan" && <PlanTab />}
          {activeTab === "credits" && <CreditsTab />}
          {activeTab === "integrations" && (
            <IntegrationsTab
              user={user}
              onGoogleAction={handleGoogleAction}
            />
          )}
          {activeTab === "notifications" && <NotificationsTab />}
          <UnsavedChangesModal
            isOpen={showUnsavedModal}
            onConfirm={handleUnsavedConfirm}
            onCancel={handleUnsavedCancel}
          />
          {showFlagReview && (
            <VendorEmailFlagReviewModal
              isOpen={showFlagReview}
              onClose={() => setShowFlagReview(false)}
            />
          )}
          <GmailConfirmModal
            isOpen={!!showGmailConfirmModal}
            onConfirm={async () => {
              if (pendingGoogleAction) {
                await pendingGoogleAction();
                setPendingGoogleAction(null);
              }
              setShowGmailConfirmModal(null);
            }}
            onCancel={() => {
              setPendingGoogleAction(null);
              setShowGmailConfirmModal(null);
            }}
            actionType="disconnect"
          />
        </div>
      </div>
    </>
  );
}