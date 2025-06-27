"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from "framer-motion";
import WeddingBanner from "../../components/WeddingBanner";
import { useWeddingBanner } from "../../hooks/useWeddingBanner";
import UnsavedChangesModal from "../../components/UnsavedChangesModal";

// Import our new components
import ProfileTabs, { TABS } from "./components/ProfileTabs";
import AccountTab from "./components/AccountTab";
import WeddingTab from "./components/WeddingTab";
import PlanTab from "./components/PlanTab";
import IntegrationsTab from "./components/IntegrationsTab";
import NotificationsTab from "./components/NotificationsTab";
import { useProfileForm } from "./hooks/useProfileForm";

export default function ProfilePage() {
  const { user, profileImageUrl, setProfileImageUrl, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getInitialTab = () => {
    const tabFromUrl = searchParams?.get('tab');
    return TABS.find(tab => tab.key === tabFromUrl)?.key || "account";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [jiggleWeddingDate, setJiggleWeddingDate] = useState(false);

  useEffect(() => {
    if (searchParams?.get('highlight') === 'weddingDate' && activeTab === 'wedding') {
      setJiggleWeddingDate(true);
      setTimeout(() => setJiggleWeddingDate(false), 1000);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabKey);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

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
    generatedVibes,
    guestCount,
    setGuestCount,
    budgetRange,
    setBudgetRange,
    selectedLocationType,
    setSelectedLocationType,
    hasUnsavedAccountChanges,
    hasUnsavedWeddingChanges,
    handleWeddingSave,
    handleAccountSave,
    handleGoogleAction,
    handleSetWeddingDate,
    setShowGmailConfirmModal,
    setPendingGoogleAction,
  } = useProfileForm(user, updateUserAsync);

  // Wedding banner logic
  const { daysLeft, isLoading: bannerLoading } = useWeddingBanner(router, weddingDate);

  // Create a wrapper for the wedding banner's onSetWeddingDate prop
  const handleBannerSetWeddingDate = () => {
    // This will be handled by the banner component itself
  };

  return (
    <>
      <AnimatePresence>
        {weddingDate && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <WeddingBanner
              daysLeft={daysLeft}
              userName={user?.displayName || user?.email || ""}
              isLoading={bannerLoading}
              onSetWeddingDate={handleBannerSetWeddingDate}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="min-h-screen bg-[#F3F2F0] flex flex-col items-center py-12">
        <div className="w-full max-w-4xl">
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
              budgetRange={budgetRange}
              setBudgetRange={setBudgetRange}
              selectedLocationType={selectedLocationType}
              setSelectedLocationType={setSelectedLocationType}
              jiggleAnimate={jiggleWeddingDate ? 'animate-jiggle' : ''}
              saving={saving}
              hasUnsavedWeddingChanges={hasUnsavedWeddingChanges}
              onSave={handleWeddingSave}
            />
          )}
          
          {activeTab === "plan" && <PlanTab />}
          
          {activeTab === "integrations" && (
            <IntegrationsTab
              user={user}
              onGoogleAction={handleGoogleAction}
            />
          )}
          
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </div>
      
      <UnsavedChangesModal
        isOpen={!!showGmailConfirmModal}
        onCancel={() => setShowGmailConfirmModal(null)}
        onConfirm={async () => {
          setShowGmailConfirmModal(null);
          if (pendingGoogleAction) await pendingGoogleAction();
        }}
        title="Are you sure you want to do that?"
        message="Disconnecting or changing your Gmail will cause synced contacts and imported emails from Google to stop syncing and will not allow you to send emails anymore. This will NOT change your login method or email."
      />
    </>
  );
}