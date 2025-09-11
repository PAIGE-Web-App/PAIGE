import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ListFilter, X } from 'lucide-react';
import CategoryPill from './CategoryPill';
import SelectField from './SelectField';
import { Contact } from '../types/contact';
import { highlightText } from '@/utils/searchHighlight';
import { useContactMessageData } from '../hooks/useContactMessageData';

// Utility function to format message time
const formatMessageTime = (timestamp: Date | string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    // Today - show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInDays < 7) {
    // This week - show day
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    // More than a week - show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

// Utility function to format message snippet
const formatMessageSnippet = (message: any, currentUserId: string): string => {
  if (!message) return 'No messages yet';
  
  const isFromUser = message.from === currentUserId || message.senderId === currentUserId;
  const prefix = isFromUser ? 'You: ' : '';
  const content = message.body || message.content || message.text || '';
  
  // Truncate to 50 characters
  const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
  
  return prefix + truncated;
};

// Skeleton component for contacts list
const ContactsSkeleton = () => (
  <div className="space-y-2 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-3 mb-3 rounded-[5px] border border-[#AB9C95] bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 min-w-[32px] min-h-[32px] rounded-full bg-gray-300"></div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ContactsList = ({
  contacts,
  contactsLoading,
  selectedContact,
  setSelectedContact,
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  filterPopoverRef,
  allCategories,
  selectedCategoryFilter,
  handleCategoryChange,
  handleClearCategoryFilter,
  handleClearSortOption,
  sortOption,
  setSortOption,
  displayContacts,
  deletingContactId,
  setIsAdding,
  unreadCounts = {}, // New prop for unread message counts per contact
  mobileViewMode = 'contacts',
  onMobileBackToContacts,
  currentUserId, // Add currentUserId prop
}) => {
  // Use the custom hook to get real message data
  const { contactMessageData, loading: messageDataLoading } = useContactMessageData(contacts, currentUserId);

  return (
  <aside className={`contacts-sidebar mobile-${mobileViewMode}-view`}>
    {contactsLoading ? (
      <AnimatePresence mode="wait">
        <motion.div
          key="contacts-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ContactsSkeleton />
        </motion.div>
      </AnimatePresence>
    ) : (
      <>
        <div className="flex items-center gap-4 p-4 border-b border-[#AB9C95] bg-[#F3F2F0] sticky top-0 z-10">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFilters(!showFilters);
              }}
              className="flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1 z-40"
              aria-label="Toggle Filters"
            >
              <ListFilter className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  ref={filterPopoverRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 min-w-[250px] space-y-3"
                >
                  <div>
                    <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Category</span>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.map((category) => (
                        <label key={category} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                          <input
                            type="checkbox"
                            value={category}
                            checked={selectedCategoryFilter.includes(category)}
                            onChange={() => handleCategoryChange(category)}
                            className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                  </div>
                  <SelectField
                    label="Sort by"
                    name="sortOption"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    options={[
                      { value: 'name-asc', label: 'Name (A-Z)' },
                      { value: 'name-desc', label: 'Name (Z-A)' },
                      { value: 'recent-desc', label: 'Most recent conversations' },
                    ]}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AB9C95]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 text-xs text-[#332B42] border-0 border-b border-[#AB9C95] focus:border-[#A85C36] focus:ring-0 py-1 placeholder:text-[#AB9C95] focus:outline-none bg-transparent"
            />
          </div>
          {contacts.length > 0 && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0]"
            >
              + Add Contact
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-0 lg:p-4">
          {(selectedCategoryFilter.length > 0 || sortOption !== 'name-asc') && (
            <div className="flex flex-wrap gap-2 mb-0 lg:mb-4 p-4 lg:p-0">
              {selectedCategoryFilter.map((category) => (
                <span key={category} className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                  Category: {category}
                  <button onClick={() => handleClearCategoryFilter(category)} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {sortOption !== 'name-asc' && (
                <span className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                  Sort: {
                    sortOption === 'name-desc' ? 'Name (Z-A)' :
                    sortOption === 'recent-desc' ? 'Most recent' : ''
                  }
                  <button onClick={handleClearSortOption} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
          {displayContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <h6 className="mb-2">Set up your unified inbox</h6>
              <div className="text-sm text-gray-500">Add your first contact to get started!</div>
            </div>
          ) : (
            <div className="space-y-2">
            {displayContacts.map((contact, index) => {
              const name = contact.name;
              const matchIndex = name.toLowerCase().indexOf(
                searchQuery.toLowerCase()
              );
              const before = name.slice(0, matchIndex);
              const match = name.slice(matchIndex, matchIndex + searchQuery.length);
              const after = name.slice(matchIndex + searchQuery.length);
              
              // Get real message data for this contact
              const messageData = contactMessageData.get(contact.id) || {
                unreadCount: 0
              };
              return (
                <div
                  key={contact.id}
                  className={`p-0 lg:p-3 mb-3 rounded-[5px] border cursor-pointer transition-all duration-300 ease-in-out ${deletingContactId === contact.id
                    ? "opacity-0"
                    : "opacity-100"
                    } ${selectedContact?.id === contact.id
                      ? "lg:bg-[#EBE3DD] lg:border-[#A85C36] hover:bg-[#F8F6F4] border-transparent hover:border-[#AB9C95]"
                      : "hover:bg-[#F8F6F4] border-transparent hover:border-[#AB9C95]"
                    }`}
                  onClick={() => {
                    setSelectedContact(contact);
                  }}
                >
                  <div className="flex items-center gap-3 p-3 lg:p-1">
                    <div className="relative">
                      <div
                        className="h-8 w-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-white text-[14px] font-normal font-work-sans"
                        style={{ backgroundColor: contact.avatarColor || "#364257" }}
                      >
                        {contact.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      {/* Unread message indicator */}
                      {unreadCounts[contact.id] > 0 && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-[#332B42] truncate">
                          {highlightText(name, searchQuery)}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Show timestamp on both mobile and desktop */}
                          {messageData.lastMessageTime && (
                            <span className="text-xs text-[#AB9C95]">
                              {formatMessageTime(messageData.lastMessageTime)}
                            </span>
                          )}
                          {/* Unread count badge */}
                          {(unreadCounts[contact.id] > 0 || messageData.unreadCount > 0) && (
                            <span className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full min-w-[20px] text-center">
                              {(unreadCounts[contact.id] || messageData.unreadCount) > 9 ? '9+' : (unreadCounts[contact.id] || messageData.unreadCount)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Show message snippet on both mobile and desktop */}
                      {messageData.lastMessageSnippet && (
                        <div className="text-xs text-[#332B42] truncate mt-1">
                          {messageData.lastMessageSnippet}
                        </div>
                      )}
                      {/* Show category pill on both mobile and desktop */}
                      <div className="mt-2">
                        <CategoryPill category={contact.category} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </>
    )}
  </aside>
  );
};

export default ContactsList; 