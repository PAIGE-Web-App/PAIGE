import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { File } from "lucide-react";

interface Message {
  id: string;
  subject: string;
  body: string;
  timestamp: string;
  from: string;
  to: string;
  source: 'gmail' | 'manual';
  isRead: boolean;
  gmailMessageId?: string;
  threadId?: string;
  userId: string;
  attachments?: { name: string }[];
}

interface MessageListAreaProps {
  messages: Message[];
  loading: boolean;
  isInitialLoad: boolean;
  currentUser: { email?: string | null } | null;
  getRelativeDate: (date: string) => string;
  MessagesSkeleton: React.FC;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
}

const MessageListArea: React.FC<MessageListAreaProps> = ({
  messages,
  loading,
  isInitialLoad,
  currentUser,
  getRelativeDate,
  MessagesSkeleton,
  messagesEndRef,
  handleScroll,
}) => {
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div 
      ref={messagesEndRef}
      className="flex-1 overflow-y-auto p-3 text-sm text-gray-400 relative"
      onScroll={handleScroll}
    >
      {loading && messages.length > 0 ? (
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
      ) : !loading && messages.length === 0 ? (
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
        <div>
          {(() => {
            let lastDate: string | null = null;
            const messageGroups: { date: string; messages: Message[] }[] = [];

            messages.forEach((msg) => {
              const messageDate = getRelativeDate(msg.timestamp);
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
                {group.messages.map((msg, msgIdx) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from === currentUser?.email ? 'justify-end' : 'justify-start'}${msgIdx < group.messages.length - 1 ? ' mb-[12px]' : ''}`}
                  >
                    <div
                      className={`max-w-[80%] break-words whitespace-pre-wrap overflow-wrap break-word rounded-[15px] p-3 ${
                        msg.from === currentUser?.email
                          ? 'bg-white text-gray-800 border border-[#A85733] rounded-[15px_15px_0_15px]'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {msg.source === 'gmail' ? 'Gmail' : 'Manual'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.body}</div>
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.attachments.map((file, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                              <File className="w-3 h-3" />
                              <span>{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      )}
      {loading && !isInitialLoad && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#A85C36]"></div>
        </div>
      )}
    </div>
  );
};

export default MessageListArea; 