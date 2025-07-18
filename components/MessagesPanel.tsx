import React from 'react';
import MessageArea from './MessageArea';

// Skeleton component for messages
const MessagesSkeleton = () => (
  <div className="space-y-4 p-3 animate-pulse">
    {/* Received Message Skeleton */}
    <div
      key="received-skeleton"
      className="max-w-[80%] px-3 py-2 rounded-[15px_15px_15px_0] mr-auto bg-gray-50"
    >
      <div className="h-3 rounded mb-1 bg-gray-200 w-1/2"></div>
      <div className="h-4 rounded bg-gray-200 w-full"></div>
      <div className="h-4 rounded mt-1 bg-gray-200 w-4/5"></div>
    </div>
    {/* Sent Message Skeleton */}
    <div
      key="sent-skeleton"
      className="max-w-[80%] px-3 py-2 rounded-[15px_15px_0_15px] ml-auto bg-gray-100"
    >
      <div className="h-3 rounded mb-1 bg-gray-200 w-2/3 ml-auto"></div>
      <div className="h-4 rounded bg-gray-200 w-full"></div>
      <div className="h-4 rounded mt-1 bg-gray-200 w-3/4 ml-auto"></div>
    </div>
  </div>
);

const MessagesPanel = ({
  contactsLoading,
  contacts,
  selectedContact,
  currentUser,
  isAuthReady,
  isMobile,
  activeMobileTab,
  setActiveMobileTab,
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
}) => (
  contactsLoading ? (
    <div className="flex flex-1 min-h-full h-full w-full items-center justify-center bg-white">
      <div className="w-full max-w-xl">
        <MessagesSkeleton />
      </div>
    </div>
  ) : (
    <section
      className={`flex flex-col flex-1 bg-white relative w-full min-h-full
        ${isMobile ? (activeMobileTab === 'contacts' ? 'block' : 'hidden') : 'block'}
      `}
    >
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <img src="/wine.png" alt="Cheers" className="w-48 h-48 mb-6" />
          <h4 className="text-2xl font-playfair font-semibold text-[#332B42] mb-2">Cheers to your next chapter!</h4>
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
          isMobile={isMobile}
          setActiveMobileTab={setActiveMobileTab}
          input={input}
          setInput={setInput}
          draftLoading={draftLoading}
          generateDraft={() => selectedContact ? generateDraftMessage(selectedContact, []) : Promise.resolve("")}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          contactsLoading={contactsLoading}
          setIsEditing={setIsEditing}
          onContactSelect={onContactSelect}
          onSetupInbox={() => setShowOnboardingModal(true)}
          userName={userName || ''}
          jiggleEmailField={jiggleEmailField}
          setJiggleEmailField={setJiggleEmailField}
        />
      )}
    </section>
  )
);

export default MessagesPanel; 