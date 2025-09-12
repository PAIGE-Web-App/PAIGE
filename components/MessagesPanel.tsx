import React from 'react';
import MessageArea from './MessageArea';
import { useUserProfileData } from '../hooks/useUserProfileData';

// Import standardized skeleton component
import MessagesSkeleton from './skeletons/MessagesSkeleton';

const MessagesPanel = ({
  contactsLoading,
  contacts,
  selectedContact,
  currentUser,
  isAuthReady,
  input,
  setInput,
  draftLoading,
  generateDraftMessage,
  selectedFiles,
  setSelectedFiles,
  setIsEditing,
  onContactSelect,
  setShowOnboardingModal,
  userName,
  showOnboardingModal,
  jiggleEmailField,
  setJiggleEmailField,
  mobileViewMode = 'contacts',
  onMobileBackToContacts,
}) => {
  // Get user profile data for AI draft personalization
  const { 
    userName: profileUserName, 
    partnerName, 
    weddingDate, 
    weddingLocation, 
    hasVenue, 
    guestCount, 
    maxBudget, 
    vibe 
  } = useUserProfileData();

  return (
    contactsLoading ? (
      <div className="flex flex-1 min-h-full h-full w-full items-center justify-center bg-white">
        <div className="w-full max-w-xl">
          <MessagesSkeleton />
        </div>
      </div>
    ) : (
      <section className={`messages-panel mobile-${mobileViewMode}-view`}>
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <img 
              src="/api/optimize-image?src=/wine.png&f=webp&q=85&w=192" 
              alt="Cheers" 
              className="w-48 h-48 mb-6" 
              loading="lazy"
            />
            <h4 className="mb-2">Cheers to your next chapter!</h4>
            <p className="text-base text-[#364257] mb-6 max-w-md text-center">
              Add your contacts to get started
            </p>
            <button
              className="btn-primary px-6 py-2 rounded-[8px] font-semibold text-base"
              onClick={() => setShowOnboardingModal(true)}
            >
              Set up your Unified Inbox
            </button>
          </div>
        ) : (
          <MessageArea
            selectedContact={selectedContact}
            currentUser={currentUser}
            isAuthReady={isAuthReady}
            contacts={contacts}
            input={input}
            setInput={setInput}
            draftLoading={draftLoading}
            generateDraft={() => {
              if (!selectedContact) {
                return Promise.resolve("");
              }
              return generateDraftMessage(selectedContact, [], currentUser?.uid, {
                userName: profileUserName || userName,
                partnerName,
                weddingDate,
                weddingLocation,
                hasVenue,
                guestCount,
                maxBudget,
                vibe: vibe || []
              });
            }}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            contactsLoading={contactsLoading}
            setIsEditing={setIsEditing}
            onContactSelect={onContactSelect}
            onSetupInbox={() => setShowOnboardingModal(true)}
            userName={userName || ''}
            jiggleEmailField={jiggleEmailField}
            setJiggleEmailField={setJiggleEmailField}
            mobileViewMode={mobileViewMode as 'contacts' | 'messages'}
            onMobileBackToContacts={onMobileBackToContacts}
          />
        )}
      </section>
    )
  );
};

export default MessagesPanel; 