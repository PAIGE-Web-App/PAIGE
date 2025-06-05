// components/MessageArea.tsx
"use client"; // Important for client-side functionality

import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, limit, doc, setDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { Mail, Phone, FileUp, SmilePlus, WandSparkles, MoveRight, File, ArrowLeft, X } from "lucide-react";
import CategoryPill from "./CategoryPill";
import { db, getUserCollectionRef } from "../lib/firebase";
import { useCustomToast } from "../hooks/useCustomToast"; // Make sure this path is correct relative to MessageArea.tsx
import { AnimatePresence, motion } from "framer-motion";


// Define interfaces for types needed in this component
interface Message {
  id: string;
  via: string;
  timestamp: string;
  body: string;
  contactId: string;
  createdAt: Date;
  userId: string;
  attachments?: { name: string; }[];
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category: string;
  website?: string;
  avatarColor?: string;
  userId: string;
  orderIndex?: number;
}

interface MessageAreaProps {
  selectedContact: Contact | null;
  currentUser: User | null;
  isAuthReady: boolean;
  contacts: Contact[]; // Needed for placeholder/selection logic
  isMobile: boolean;
  setActiveMobileTab: (tab: 'contacts' | 'messages' | 'todo') => void;
  // Props for message input and AI draft
  input: string;
  setInput: (input: string) => void;
  loading: boolean;
  generateDraft: (contact: Contact) => Promise<string>;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  contactsLoading: boolean; // Indicates if contacts are still being loaded from Firestore
}

const getRelativeDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    if (isToday) {
        return "Today";
    } else if (isYesterday) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "2-digit",
        });
    }
};

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

const EmojiPicker = ({ onEmojiSelect, onClose }: { onEmojiSelect: (emoji: string) => void; onClose: () => void }) => {
  const emojis = ['😀', '😁', '😂', '🤣', '😃', '😅', '😆', '🥹', '😊', '😋', '😎', '😍', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😮', '🤐', '😯', '😴', '😫', '😩', '😤', '😡', '😠', '🤬', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  return (
    <div className="p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 flex flex-wrap gap-1">
      {emojis.map((emoji, index) => (
        <button
          key={index}
          className="p-1 text-lg hover:bg-gray-100 rounded"
          onClick={() => {
            onEmojiSelect(emoji);
            onClose();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const MessageArea: React.FC<MessageAreaProps> = ({
  selectedContact,
  currentUser,
  isAuthReady,
  contacts, // Pass contacts to determine placeholder
  isMobile,
  setActiveMobileTab,
  // Props for message input and AI draft
  input,
  setInput,
  loading,
  generateDraft,
  selectedFiles,
  setSelectedFiles,
  contactsLoading, // Accept the new prop here
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Debugging log: Check contactsLoading and contacts.length right at the start of render
  console.log('MessageArea Render: contactsLoading =', contactsLoading, 'contacts.length =', contacts.length, 'selectedContact =', selectedContact);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();

  // Selected Contact Messages Listener
  useEffect(() => {
    let unsubscribe: () => void;
    if (isAuthReady && selectedContact && currentUser?.uid) {
      setMessagesLoading(true);
      const userId = currentUser.uid;
      const messagesCollectionRef = getUserCollectionRef<Message>("messages", userId);

      const q = query(
        messagesCollectionRef,
        where("contactId", "==", selectedContact.id),
        where("userId", "==", userId),
        orderBy("createdAt", "asc")
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            via: data.via,
            timestamp: data.timestamp,
            body: data.body,
            contactId: data.contactId,
            createdAt: data.createdAt.toDate(),
            userId: data.userId,
            attachments: data.attachments || [],
          };
        });
        console.log(`MessageArea: Fetched ${fetchedMessages.length} messages for contact ${selectedContact.id}:`, fetchedMessages); // Keep this one
            setMessages(fetchedMessages);
            // >>> ADD THIS NEW LINE <<<
            console.log("MessageArea: Messages state *after* setting:", fetchedMessages); // Use fetchedMessages directly
            setMessagesLoading(false);
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, (err) => {
        console.error('Error fetching selected contact messages:', err);
        setMessagesLoading(false);
        showErrorToast(`Failed to load messages for contact: ${(err as Error).message}`);
      });
    } else {
      setMessages([]);
      setMessagesLoading(false);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthReady, selectedContact, currentUser]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);


  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || !selectedContact || !currentUser) return;

    const attachmentsToStore = selectedFiles.map(file => ({ name: file.name }));

    const newMessage: Message = {
      id: uuidv4(),
      via: selectedChannel,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: input.trim(),
      contactId: selectedContact.id,
      createdAt: new Date(),
      userId: currentUser.uid,
      attachments: attachmentsToStore,
    };

    try {
      const messagesCollectionRef = getUserCollectionRef<Message>("messages", currentUser.uid);
      await addDoc(messagesCollectionRef, {
        ...newMessage,
        createdAt: newMessage.createdAt,
      });
      setInput("");
      setSelectedFiles([]);
      showSuccessToast("Message sent successfully.");
    } catch (error: any) {
      showErrorToast(`Failed to send message: ${error.message}`);
      console.error("Error sending message:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);

      const uniqueNewFiles = newFiles.filter(
        (newFile) => !selectedFiles.some((prevFile) => prevFile.name === newFile.name && prevFile.size === newFile.size)
      );

      setSelectedFiles((prevFiles) => [...prevFiles, ...uniqueNewFiles]);

      if (uniqueNewFiles.length > 0) {
        showSuccessToast(`Selected ${uniqueNewFiles.length} file(s).`);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file !== fileToRemove)
    );
    showInfoToast(`Removed file: ${fileToRemove.name}`);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prevInput) => prevInput + emoji);
  };

  return (
    <section
      className={`flex flex-col flex-1 bg-white relative w-full min-h-full
        ${isMobile && setActiveMobileTab !== 'messages' ? 'hidden' : 'block'}
      `}
      style={{ maxHeight: "100%" }}
    >
      {selectedContact ? (
        <>
          {/* Fixed Header */}
          <div
            className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95] flex items-center"
          >
            {isMobile && (
              <button
                onClick={() => {
                  // This part needs to call a prop function to change selectedContact on page.tsx
                  setActiveMobileTab('contacts'); // Go back to contacts tab
                }}
                className="mr-2 p-1 rounded-full hover:bg-[#E0DBD7] text-[#332B42]"
                aria-label="Back to contacts"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[16px] font-medium text-[#332B42] leading-tight font-playfair mr-1">
                    {selectedContact.name}
                  </h4>
                  <CategoryPill category={selectedContact.category} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {selectedContact.email && (
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[100px] md:max-w-none">{selectedContact.email}</span>
                    </a>
                  )}
                  {selectedContact.phone && (
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span className="truncate max-w-[100px] md:max-w-none">{selectedContact.phone}</span>
                    </a>
                  )}
                  {selectedContact.website && (
                    <a
                      href={selectedContact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                    >
                      <span>🌐</span>
                      <span className="truncate max-w-[100px] md:max-w-none">{selectedContact.website}</span>
                    </a>
                  )}
                </div>
              </div>
              {/* NOTE: Edit button here will need to trigger a prop function from page.tsx */}
              <button
                // onClick={() => setIsEditing(true)} // This needs to be passed as a prop
                className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0]"
              >
                Edit
              </button>
            </div>
          </div>
          {/* Scrollable Message Area */}
          <div
            className="flex-1 overflow-y-auto p-3 text-sm text-gray-400 space-y-4 relative"
          >
            {messagesLoading ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="messages-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <MessagesSkeleton />
                </motion.div>
              </AnimatePresence>
            ) : messages.length === 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="no-messages-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="flex flex-col items-center text-center text-[#7A7A7A] px-4">
                    <img
                      src="/Messages.svg"
                      alt="Start conversation"
                      className="w-24 h-24 mb-4 opacity-50"
                    />
                    <p>Send a message to start the conversation!</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="actual-messages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {(() => {
                    let lastDate: string | null = null;
                    const messageGroups: { date: string; messages: Message[] }[] = [];

                    messages.forEach((msg) => {
                      const messageDate = getRelativeDate(msg.createdAt);
                      if (messageDate !== lastDate) {
                        lastDate = messageDate;
                        messageGroups.push({ date: messageDate, messages: [msg] });
                      } else {
                        messageGroups[messageGroups.length - 1].messages.push(msg);
                      }
                    });

                    return messageGroups.map((group, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-center my-4">
                          <div className="w-1/3 border-t border-[#AB9C95]"></div>
                          <span className="mx-2 text-xs text-[#555] font-medium">
                            {group.date}
                          </span>
                          <div className="w-1/3 border-t border-[#AB9C95]"></div>
                        </div>
                        {group.messages.map((msg) => (
                          <div key={msg.id} className="mb-4">
                            <div
                              className={`max-w-[80%] px-3 py-2 text-left text-[#332B42] bg-white border rounded-[15px_15px_0_15px] ${
                                msg.via === "Gmail" || msg.via === "SMS"
                                  ? "ml-auto border-[#A85733]"
                                  : "mr-auto border-[#AB9C95]"
                              }`}
                            >
                              <div className="flex justify-between text-[11px] text-[#999] mb-1">
                                <span>{msg.timestamp}</span>
                                <span className="flex items-center gap-1">
                                  Via <span className="font-medium">{msg.via}</span>
                                </span>
                              </div>
                              <div className="whitespace-pre-wrap text-[13px]">{msg.body}</div>
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 w-[95%]">
                                  {msg.attachments.map((attachment, attIndex) => (
                                    <button
                                      key={attIndex}
                                      onClick={() => showInfoToast(`Simulating download of: ${attachment.name}. Real download requires server-side storage.`)}
                                      className="inline-flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42] hover:bg-[#F8F6F4] cursor-pointer"
                                    >
                                      <File className="w-3 h-3" />
                                      <span>{attachment.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    ));
                  })()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          {/* Fixed Bottom Section - Message Input */}
          <div
            className="relative bg-[#F3F2F0] border-t border-[#AB9C95] z-10 sticky bottom-0"
            style={{ minHeight: "120px", borderTopWidth: "0.5px" }}
          >
            <div className="px-3 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="via" className="text-xs">
                  Via
                </label>
                <select
                  id="via"
                  className="text-xs border px-2 py-1 rounded-[5px]"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                >
                  <option value="Gmail">Gmail</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
              <div className="overflow-y-auto max-h-[35vh] pr-1">
                <textarea
                  ref={textareaRef}
                  rows={3}
                  placeholder={`Hey ${selectedContact?.name}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full text-sm resize-none text-[#332B42] bg-transparent border-none focus:outline-none"
                  style={{ minHeight: "3rem" }}
                />
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="inline-flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                        <File className="w-3 h-3" />
                        <span>{file.name}</span>
                        <button
                          onClick={() => handleRemoveFile(file)}
                          className="ml-1 text-[#A85C36] hover:text-[#784528]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-[#F3F2F0] bg-opacity-80 flex flex-col justify-center items-center text-xs text-[#332B42] z-10 pointer-events-none">
                    <div className="w-4/5 max-w-md">
                      <div className="h-3 bg-[#E0DBD7] rounded mb-2 animate-pulse"></div>
                      <div className="h-3 bg-[#E0DBD7] rounded mb-2 animate-pulse w-4/5"></div>
                      <div className="h-3 bg-[#E0DBD7] rounded mb-2 animate-pulse w-3/4"></div>
                    </div>
                    <p className="mt-3 text-[11px] text-[#555] font-medium">
                      Drafting message
                      <span className="loading-dots"></span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div
              className="flex justify-between items-center px-3 py-3 border-t border-[#AB9C95]"
              style={{ borderTopWidth: "0.5px" }}
            >
              <div className="flex items-center gap-4 relative">
                <button
                  onClick={async () => {
                    if (selectedContact) { // Ensure selectedContact exists before calling generateDraft
                       const generated = await generateDraft(selectedContact);
                       setInput(generated);
                    }
                  }}
                  disabled={loading || !selectedContact} // Disable if no contact selected
                  className="btn-secondary"
                  title="Generate a draft message using AI"
                >
                  {loading ? (
                    "Drafting..."
                  ) : (
                    <>
                      <WandSparkles className="w-4 h-4" />
                      Draft AI Message
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="icon-button"
                  aria-label="Attach File"
                  title="Click to Upload File(s)"
                >
                  <FileUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="icon-button"
                  aria-label="Add Emoji"
                  title="Add an emoji to your message"
                >
                  <SmilePlus className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      ref={emojiPickerRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-full left-0 mb-2 w-64"
                    >
                      <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={handleSend}
                disabled={(!input.trim() && selectedFiles.length === 0) || !selectedContact} // Also disable if no contact
                className="btn-primary flex items-center gap-1"
                title="Send Message"
              >
                Send <MoveRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : ( // This block runs when selectedContact is null
    // Check if contacts are still loading from Firebase
    (contactsLoading) ? (
        // If contacts are still loading, show a skeleton for the entire message area
        <AnimatePresence mode="wait">
          <motion.div
            key="initial-messages-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col justify-between bg-white"
          >
            {/* Placeholder for header */}
            <div className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95] flex items-center h-[50px] min-h-[50px]"></div>
            {/* Main content area skeleton */}
            <div className="flex-1 overflow-y-auto p-3 text-sm text-gray-400 space-y-4 relative">
                <MessagesSkeleton />
            </div>
            {/* Placeholder for input area */}
            <div className="relative bg-[#F3F2F0] border-t border-[#AB9C95] z-10 sticky bottom-0 min-h-[120px]"></div>
          </motion.div>
        </AnimatePresence>
    ) : ( // If contactsLoading is false (meaning contacts have finished loading)
        contacts.length === 0 ? (
            // If contacts have finished loading and there are 0 contacts, show "Cheers"
            <AnimatePresence mode="wait">
              <motion.div
                key="cheers-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white min-h-full"
              >
                <img
                  src="/wine.png"
                  alt="Champagne Cheers"
                  className="mb-4 w-48 h-48"
                />
                <h2 className="text-xl font-semibold text-[#332B42] font-playfair mb-2">
                  Cheers to your next chapter.
                </h2>
                <p className="text-sm text-[#364257] mb-4 text-center max-w-xs">
                  Get ready to manage your wedding in one spot.
                </p>
                {/* This button will need to trigger a prop function on page.tsx */}
                <button
                  // onClick={() => setShowOnboardingModal(true)} // This needs to be passed as a prop
                  className="btn-primary"
                >
                  Set up your unified inbox
                </button>
              </motion.div>
            </AnimatePresence>
        ) : (
            // If contacts have finished loading and there are contacts but none are selected, show "Select a contact" message
            <AnimatePresence mode="wait">
              <motion.div
                key="select-contact-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white min-h-full"
              >
                <MessageSquare className="w-16 h-16 text-[#7A7A7A] opacity-50 mb-4" />
                <p className="text-lg text-[#7A7A7A] font-medium">Select a contact to view messages</p>
              </motion.div>
            </AnimatePresence>
        )
    )
)}
    </section>
  );
};

export default MessageArea;