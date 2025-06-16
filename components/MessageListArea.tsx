import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { File, Reply } from "lucide-react";

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
  direction: 'sent' | 'received';
  parentMessageId?: string;
  fullBody?: string;
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
  onReply: (msg: Message) => void;
  replyingToMessage: Message | null;
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
  onReply,
  replyingToMessage,
}) => {
  // Helper function to strip quoted text and signatures
  const stripQuotedText = (text: string): string => {
    // Remove everything after "On ... wrote:" or "From: ..."
    const onWroteMatch = text.match(/On.*wrote:/i);
    const fromMatch = text.match(/From:.*/i);
    
    if (onWroteMatch) {
      return text.substring(0, onWroteMatch.index).trim();
    }
    if (fromMatch) {
      return text.substring(0, fromMatch.index).trim();
    }
    return text;
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  // Map of messageId to ref for scrolling
  const messageRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  const [bouncingId, setBouncingId] = useState<string | null>(null);

  // Helper to trigger bounce
  const triggerBounce = (id: string) => {
    setBouncingId(id);
    setTimeout(() => setBouncingId(null), 700);
  };

  return (
    <div 
      ref={messagesEndRef}
      className="flex-1 w-full overflow-y-auto p-3 text-sm text-gray-400 relative"
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
                {group.messages.map((msg, msgIdx) => {
                  // Find parent message if this is a reply
                  let parentMsg: Message | undefined = undefined;
                  if (msg.parentMessageId) {
                    parentMsg = messages.find(m => m.id === msg.parentMessageId);
                  }
                  // Find replies to this message
                  const replies = messages.filter(m => m.parentMessageId === msg.id);
                  // Determine alignment
                  const isSent = msg.direction === 'sent';
                  const alignmentClass = isSent ? 'justify-end' : 'justify-start';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${alignmentClass}${msgIdx < group.messages.length - 1 ? ' mb-[12px]' : ''} group`}
                    >
                      <div className="flex flex-col items-end w-full max-w-[90%]">
                        {/* Faded parent message bubble above reply */}
                        {parentMsg && (
                          <div
                            className={`mb-1 px-3 py-2 rounded-[15px] border border-gray-500/30 bg-gray-100/50 text-gray-600 text-sm max-w-full w-fit ${isSent ? 'self-end' : 'self-start'} cursor-pointer hover:bg-gray-200/60 transition`}
                            style={{ opacity: 0.95, zIndex: 1 }}
                            onClick={() => {
                              if (parentMsg.id && messageRefs.current[parentMsg.id]) {
                                const el = messageRefs.current[parentMsg.id];
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  triggerBounce(parentMsg.id);
                                }
                              }
                            }}
                            title="Jump to referenced message"
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <Reply className="w-3 h-3" />
                              <span className="text-xs">
                                {`You replied to ${parentMsg.source === 'gmail' ? 'this email' : 'this message'}`}
                              </span>
                            </div>
                            {parentMsg.subject && (
                              <div className="truncate max-w-[200px] text-xs">
                                <span className="font-semibold">Subject:</span> {parentMsg.subject}
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          ref={el => { messageRefs.current[msg.id] = el; }}
                          className={`relative break-words whitespace-pre-wrap rounded-[15px] p-3 ${
                            isSent
                              ? 'bg-white text-gray-800 border border-[#A85733] rounded-[15px_15px_0_15px] self-end'
                              : 'bg-gray-100 text-gray-800 self-start border border-gray-300 border-[0.5px] rounded-[15px_15px_15px_0]'
                          } ${replyingToMessage?.id === msg.id ? 'ring-2 ring-[#A85C36]' : ''} ${
                            msg.parentMessageId ? '-mt-3 z-10' : 'mb-2'
                          } ${bouncingId === msg.id ? 'animate-bounce-once' : ''}`}
                          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                            <span>{msg.source === 'gmail' ? 'Gmail' : 'Manual'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <button
                              className="text-xs text-[#A85C36] hover:underline ml-2 flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150"
                              onClick={() => onReply(msg)}
                              title="Reply to this message"
                            >
                              <Reply className="w-4 h-4" />
                            </button>
                          </div>
                          {msg.source === 'gmail' && msg.subject && (
                            <div className="text-xs font-semibold text-gray-700 mb-1">{msg.subject}</div>
                          )}
                          <div className="whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            {(msg.body && msg.body.trim()) ? stripQuotedText(msg.body)
                              : (msg.fullBody && msg.fullBody.trim()) ? stripQuotedText(msg.fullBody)
                              : <span className="italic text-gray-400">(No message content)</span>}
                          </div>
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
                        {/* Replies count link */}
                        {replies.length > 0 && (
                          <div className={`${isSent ? 'self-end' : 'self-start'} mt-2 text-xs cursor-pointer text-[#A85C36] underline hover:text-[#784528]`}> 
                            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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