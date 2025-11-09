import React, { useState, useEffect } from 'react';
import MessageArea from './MessageArea';
import { useUserProfileData } from '../hooks/useUserProfileData';
import { useEdgeConfig } from '../hooks/useEdgeConfig';

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

  const { getTextByPath, isAvailable } = useEdgeConfig();
  
  // UI text state with fallbacks
  const [uiText, setUiText] = useState({
    emptyStateTitle: "Cheers to your next chapter!",
    emptyStateDescription: "Add contacts to manage communication in one place. Paige scans messages to create/update to-dos and generates personalized email drafts. Connect Gmail for best results!",
    emptyStateCta: "Set up your Unified Inbox",
    emptyStateAlternative: "Check out the Vendor Catalog",
    emptyStateOr: "or"
  });

  // Load UI text from Edge Config (always try, fallback gracefully)
  useEffect(() => {
    const loadUIText = async () => {
      try {
        const title = await getTextByPath('messages.emptyState.title', "Cheers to your next chapter!");
        const description = await getTextByPath('messages.emptyState.description', "Add contacts to manage communication in one place. Paige scans messages to create/update to-dos and generates personalized email drafts. Connect Gmail for best results!");
        const cta = await getTextByPath('messages.emptyState.cta', "Set up your Unified Inbox");
        const alternative = await getTextByPath('messages.emptyState.alternativeCta', "Check out the Vendor Catalog");
        const or = await getTextByPath('messages.emptyState.or', "or");
        
        setUiText({
          emptyStateTitle: title,
          emptyStateDescription: description,
          emptyStateCta: cta,
          emptyStateAlternative: alternative,
          emptyStateOr: or
        });
      } catch (error) {
        console.warn('Failed to load UI text from Edge Config, using fallbacks:', error);
        // UI text state already has fallbacks, so no need to update
      }
    };

    loadUIText();
  }, [getTextByPath]);

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
              src="/cheers.png" 
              alt="Cheers" 
              className="w-48 h-48 mb-6" 
              loading="lazy"
            />
            <h4 className="mb-2">{uiText.emptyStateTitle}</h4>
            <p className="text-sm text-[#7A7A7A] mb-6 max-w-md text-center">
              {uiText.emptyStateDescription}
            </p>
            <button
              className="btn-primary px-6 py-2 rounded-[8px] font-semibold text-base"
              onClick={() => setShowOnboardingModal(true)}
            >
              {uiText.emptyStateCta}
            </button>
            <div className="text-center">
              <p className="text-[#364257] my-2 text-sm">{uiText.emptyStateOr}</p>
              <a 
                href="/vendors" 
                className="text-[#A85C36] hover:text-[#784528] text-sm font-medium underline"
              >
                {uiText.emptyStateAlternative}
              </a>
            </div>
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
            generateDraft={(contact, messages, userId, userData) => {
              if (!selectedContact) {
                return Promise.resolve("");
              }
              // Pass through the userData from MessageArea (which includes additionalContext)
              // Only use fallback defaults if userData is not provided
              const finalUserData = userData || {
                userName: profileUserName || userName,
                partnerName,
                weddingDate,
                weddingLocation,
                hasVenue,
                guestCount,
                maxBudget,
                vibe: vibe || []
              };
              return generateDraftMessage(contact || selectedContact, messages || [], userId || currentUser?.uid, finalUserData);
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