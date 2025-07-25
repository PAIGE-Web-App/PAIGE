import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { File, Reply, Trash2, ExternalLink, MessageSquareText } from "lucide-react";
import DOMPurify from "dompurify";
import { Message } from "../types/message";

// Development-only logging
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

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
  onDelete?: (msg: Message) => void;
  replyingToMessage: Message | null;
  // New props for vendor contact information
  selectedContact?: any;
  vendorDetails?: any;
  vendorContactLoading?: boolean;
  hasContactInfo?: boolean | null;
  setIsEditing?: (isEditing: boolean) => void;
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
  onDelete,
  replyingToMessage,
  selectedContact,
  vendorDetails,
  vendorContactLoading,
  hasContactInfo,
  setIsEditing,
}) => {
  // Debug logging
  devLog('🔍 MessageListArea props:', {
    selectedContactName: selectedContact?.name,
    selectedContactPlaceId: selectedContact?.placeId,
    vendorContactLoading,
    hasContactInfo,
    messagesLength: messages.length,
    loading
  });

  // Helper function to strip quoted text and signatures
  const stripQuotedText = (text: string): string => {
    // Split text into lines
    const lines = text.split('\n');
    const cleanLines: string[] = [];
    let inQuotedSection = false;
    let consecutiveQuotedLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for quoted line patterns (lines starting with >)
      const isQuotedLine = line.startsWith('>') || /^\s*>\s/.test(line);
      
      // Check for email reply headers
      const isReplyHeader = /On.*wrote:/i.test(line) || 
                           /From:.*/i.test(line) ||
                           /Sent:.*/i.test(line) ||
                           /To:.*/i.test(line) ||
                           /Subject:.*/i.test(line) ||
                           /Date:.*/i.test(line);
      
      // If we hit a reply header, stop processing
      if (isReplyHeader) {
        break;
      }
      
      // If we find a quoted line, start tracking quoted section
      if (isQuotedLine) {
        if (!inQuotedSection) {
          inQuotedSection = true;
          consecutiveQuotedLines = 0;
        }
        consecutiveQuotedLines++;
        
        // If we have more than 2 consecutive quoted lines, we're in a quoted section
        if (consecutiveQuotedLines > 2) {
          continue; // Skip this line
        }
      } else {
        // Reset quoted section tracking
        inQuotedSection = false;
        consecutiveQuotedLines = 0;
      }
      
      // Only add non-quoted lines or the first few quoted lines (which might be context)
      if (!inQuotedSection || consecutiveQuotedLines <= 2) {
        cleanLines.push(line);
      }
    }
    
    return cleanLines.join('\n').trim();
  };

  // Helper function to clean up excessive whitespace in HTML
  const cleanHtmlContent = (html: string): string => {
    return html
      // Remove excessive line breaks and whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ consecutive newlines with 2
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n\s*\n/g, '\n') // Replace double newlines with single
      // Clean up excessive <br> tags
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br /><br />') // Replace 3+ consecutive <br> tags with 2
      .replace(/\s*<br\s*\/?>\s*<br\s*\/?>\s*/gi, '<br /><br />') // Clean up spacing around <br> tags
      // Remove excessive whitespace
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .trim();
  };

  // Helper function to clean up plain text content
  const cleanPlainTextContent = (text: string): string => {
    return text
      // Remove excessive line breaks and whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ consecutive newlines with 2
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n\s*\n/g, '\n') // Replace double newlines with single
      // Remove excessive whitespace at the beginning of lines
      .replace(/^\s+/gm, '') // Remove leading whitespace from each line
      .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
      // Remove excessive spaces
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .trim();
  };

  // Helper function to clean up URLs by removing tracking parameters
  const cleanUrlParams = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // Remove common tracking parameters
      const trackingParams = [
        'elqTrackId', 'elq', 'elqaid', 'elqat', 'elqCampaignId',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
        'utm_term', 'gclid', 'fbclid', 'msclkid'
      ];
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
      '&ndash;': '–',
      '&mdash;': '—',
      '&hellip;': '…',
      '&bull;': '•',
      '&rsquo;': "'",
      '&lsquo;': "'",
      '&rdquo;': '"',
      '&ldquo;': '"',
    };
    
    return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  };

  // Helper function to remove CSS from text
  const removeCssFromText = (text: string): string => {
    return text
      // Remove @import statements
      .replace(/@import[^;]+;/g, '')
      // Remove CSS rules
      .replace(/\{[^}]*\}/g, '')
      // Remove CSS selectors
      .replace(/[a-zA-Z][a-zA-Z0-9_-]*\s*\{/g, '')
      // Remove CSS comments
      .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')
      // Remove media queries
      .replace(/@media[^{]*\{[^}]*\}/g, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Performance-optimized email formatter with memoization
  const formatImportedEmail = (() => {
    // Cache for processed emails to avoid re-processing identical content
    const emailCache = new Map<string, string>();
    const MAX_CACHE_SIZE = 100; // Prevent memory leaks
    
    // Pre-compiled regex patterns for better performance
    const patterns = {
      url: /(https?:\/\/[^\s]+)/g,
      keyValue: /^([^:]+):\s*(.+)$/,
      allCaps: /^[A-Z][A-Z\s]+$/,
      linkedinEngagement: /LIKE PRAISE EMPATHY \d+,\s*\d+ Comments/,
      footer: /©|All rights reserved|This email was sent|You are receiving this|Unsubscribe|Privacy Policy|Contact Us/
    };
    
    // Quick footer detection using regex
    const isFooterLine = (line: string): boolean => {
      return patterns.footer.test(line);
    };
    
    // Fast URL processing with minimal string operations
    const processUrls = (text: string): string => {
      return text.replace(patterns.url, (url) => {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${domain}</a>`;
        } catch {
          return url;
        }
      });
    };
    
    return (text: string): string => {
      // Check cache first
      if (emailCache.has(text)) {
        return emailCache.get(text)!;
      }
      
      // Early exit for very short content
      if (text.length < 50) {
        const result = `<div class="email-content">${processUrls(text)}</div>`;
        emailCache.set(text, result);
        return result;
      }
      
      // Quick content type detection to avoid unnecessary processing
      const hasComplexFormatting = text.includes('@import') || 
                                  text.includes('font-family:') || 
                                  text.includes('LIKE PRAISE EMPATHY') ||
                                  text.includes('Showing Confirmed') ||
                                  text.includes('Confirmation Number');
      
      // For simple content, do minimal processing
      if (!hasComplexFormatting) {
        const result = `<div class="email-content">${processUrls(text)}</div>`;
        emailCache.set(text, result);
        return result;
      }
      
      // Full processing only for complex emails
      let cleanedText = text;
      
      // Only do heavy processing if needed
      if (text.includes('@import') || text.includes('font-family:')) {
        cleanedText = removeCssFromText(text);
        cleanedText = decodeHtmlEntities(cleanedText);
      }
      
      cleanedText = cleanPlainTextContent(cleanedText);
      
      // Remove angle brackets around URLs
      cleanedText = cleanedText.replace(/<([^>]+)>/g, (match, url) => {
        return url.startsWith('http') ? url : match;
      });
      
      const lines = cleanedText.split('\n');
      const formattedLines: string[] = [];
      let inFooter = false;
      let processedLines = 0;
      const MAX_LINES = 100; // Safety limit
      
      for (let i = 0; i < lines.length && processedLines < MAX_LINES; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        processedLines++;
        
        // Quick footer detection
        if (isFooterLine(line)) {
          inFooter = true;
          continue;
        }
        
        if (inFooter) continue;
        
        let formattedLine = line;
        
        // Fast pattern matching with early exits
        if (line.includes(' liked this')) {
          formattedLine = `👍 ${line}`;
        } else if (line.includes(' shared a post:')) {
          const parts = line.split(' shared a post:');
          if (parts.length === 2) {
            formattedLine = `<strong>${parts[0]}</strong> shared a post: ${parts[1]}`;
          }
        } else if (patterns.linkedinEngagement.test(line)) {
          // Keep as is
        } else if (line.includes('Read more:') || line.includes('See more on LinkedIn:')) {
          const urlMatch = line.match(patterns.url);
          if (urlMatch) {
            const displayText = line.replace(urlMatch[1], '').replace(/Read more:|See more on LinkedIn:/, '').trim();
            formattedLine = `${displayText} <a href="${urlMatch[1]}" target="_blank" rel="noopener noreferrer">→</a>`;
          }
        } else if (line.includes('Showing Confirmed') || line.includes('Confirmed')) {
          formattedLine = `✅ ${line}`;
        } else if (line.includes('Avenue') || line.includes('Street') || line.includes('Road') || line.includes('Drive') || line.includes('Lane')) {
          formattedLine = `📍 ${line}`;
        } else if (line.includes('PM') || line.includes('AM') || line.includes('CDT') || line.includes('CST')) {
          formattedLine = `🕒 ${line}`;
        } else if (line.includes('Agent') || line.includes('Realty') || line.includes('LLC')) {
          formattedLine = `👤 ${line}`;
        } else if (line.includes('View Listing') || line.includes('Directions')) {
          formattedLine = `🔗 ${line}`;
        } else if (line.includes('Buyer/Broker')) {
          formattedLine = `👥 ${line}`;
        } else if (patterns.allCaps.test(line)) {
          formattedLine = `<strong>${line}</strong>`;
        } else {
          // Key-value pairs
          const keyValueMatch = line.match(patterns.keyValue);
          if (keyValueMatch) {
            const key = keyValueMatch[1].trim();
            const value = keyValueMatch[2].trim();
            const urlMatch = value.match(patterns.url);
            
            if (urlMatch) {
              try {
                const urlObj = new URL(urlMatch[1]);
                const displayText = value.replace(urlMatch[1], '');
                formattedLine = `<strong>${key}:</strong> ${displayText} <a href="${urlMatch[1]}" target="_blank" rel="noopener noreferrer">${urlObj.hostname}</a>`;
              } catch {
                formattedLine = `<strong>${key}:</strong> ${value}`;
              }
            } else {
              formattedLine = `<strong>${key}:</strong> ${value}`;
            }
          }
        }
        
        // Process URLs efficiently
        formattedLine = processUrls(formattedLine);
        formattedLines.push(`<div class="email-content">${formattedLine}</div>`);
      }
      
      const result = formattedLines.join('\n');
      
      // Cache the result
      if (emailCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry
        const firstKey = emailCache.keys().next().value;
        emailCache.delete(firstKey);
      }
      emailCache.set(text, result);
      
      return result;
    };
  })();

  // Helper function to safely render HTML content
  const renderMessageContent = (message: Message) => {
    const content = (message.body && message.body.trim()) 
      ? stripQuotedText(message.body)
      : (message.fullBody && message.fullBody.trim()) 
        ? stripQuotedText(message.fullBody)
        : '';

    if (!content) {
      return <span className="italic text-gray-400">(No message content)</span>;
    }

    // Apply universal formatting to all Gmail imported emails for better readability
    // This handles LinkedIn, real estate, utility, and other formatted emails
    if (message.source === 'gmail') {
      // Performance optimization: Only format if content is substantial
      if (content.length > 20) {
        try {
          // Format the email using the universal formatter
          const formattedContent = formatImportedEmail(content);
          
          // Sanitize the formatted content
          const sanitizedHtml = DOMPurify.sanitize(formattedContent, {
            ALLOWED_TAGS: ['div', 'strong', 'a', 'br'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
            ALLOW_DATA_ATTR: false,
          });
          
          return (
            <div 
              className="formatted-email"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              style={{
                fontSize: 'inherit',
                lineHeight: 'inherit',
                color: 'inherit',
              }}
            />
          );
        } catch (error) {
          console.error('Error rendering formatted email:', error);
          // Fallback to cleaned plain text
          const cleanedText = cleanPlainTextContent(content);
          return <div className="whitespace-pre-wrap">{cleanedText}</div>;
        }
      } else {
        // For very short content, just clean and display
        const cleanedText = cleanPlainTextContent(content);
        return <div className="whitespace-pre-wrap">{cleanedText}</div>;
      }
    }

    // Enhanced HTML detection for manual messages (Gmail messages are handled above)
    const isHtmlContent = message.source === 'manual' && (
      content.includes('<html') || 
      content.includes('<!DOCTYPE') || 
      content.includes('<div') || 
      content.includes('<p>') ||
      content.includes('<a href') ||
      content.includes('<br') ||
      content.includes('<strong') ||
      content.includes('<em') ||
      content.includes('<ul') ||
      content.includes('<ol') ||
      content.includes('<li') ||
      content.includes('<h1') ||
      content.includes('<h2') ||
      content.includes('<h3') ||
      content.includes('<h4') ||
      content.includes('<h5') ||
      content.includes('<h6') ||
      content.includes('<blockquote') ||
      content.includes('<pre') ||
      content.includes('<code')
    );

    if (isHtmlContent) {
      try {
        // Clean up the HTML content first
        const cleanedContent = cleanHtmlContent(content);
        
        // Sanitize the HTML content
        const sanitizedHtml = DOMPurify.sanitize(cleanedContent, {
          ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
          ALLOW_DATA_ATTR: false,
        });
        
        return (
          <div 
            className="prose prose-sm max-w-none prose-compact"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            style={{
              fontSize: 'inherit',
              lineHeight: 'inherit',
              color: 'inherit',
            }}
          />
        );
      } catch (error) {
        console.error('Error rendering HTML content:', error);
        // Fallback to cleaned plain text if HTML rendering fails
        const cleanedText = cleanPlainTextContent(content);
        return <div className="whitespace-pre-wrap">{cleanedText}</div>;
      }
    }

    // For non-Gmail messages or non-HTML content, clean and render as plain text
    const cleanedText = cleanPlainTextContent(content);
    return <div className="whitespace-pre-wrap">{cleanedText}</div>;
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

  // Helper to open Gmail message
  const openInGmail = (message: Message) => {
    if (message.gmailMessageId) {
      const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${message.gmailMessageId}`;
      window.open(gmailUrl, '_blank');
    }
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
              {(() => {
                console.log('🔍 Empty state condition check:', {
                  vendorContactLoading,
                  selectedContactPlaceId: selectedContact?.placeId,
                  hasContactInfo,
                  shouldShowNoContactInfo: selectedContact?.placeId && hasContactInfo === false
                });
                
                if (vendorContactLoading) {
                  return (
                    <>
                      <div className="w-24 h-24 mb-4 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36]"></div>
                      </div>
                      <p>Checking contact information...</p>
                    </>
                  );
                } else if (selectedContact?.placeId && hasContactInfo === false) {
                  return (
                    <>
                      <img
                        src="/Messages.svg"
                        alt="No contact information"
                        className="w-24 h-24 mb-4 opacity-50"
                      />
                      <h3 className="text-lg font-medium text-[#332B42] mb-2">
                        No Contact Information Available
                      </h3>
                      <p className="text-sm mb-4 max-w-md">
                        We couldn't find an email address or phone number for {selectedContact.name}. 
                        This vendor may not have provided contact information publicly.
                      </p>
                      <div className="space-y-3 w-full max-w-sm">
                        {vendorDetails?.website && !vendorDetails.website.includes('maps.google.com') && (
                          <a
                            href={vendorDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-[#A85C36] text-white px-4 py-2 rounded-lg hover:bg-[#784528] transition-colors text-sm"
                          >
                            🌐 Visit Website
                          </a>
                        )}
                        {vendorDetails?.formatted_phone_number && (
                          <a
                            href={`tel:${vendorDetails.formatted_phone_number}`}
                            className="block w-full bg-[#A85C36] text-white px-4 py-2 rounded-lg hover:bg-[#784528] transition-colors text-sm"
                          >
                            📞 Call {vendorDetails.formatted_phone_number}
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setIsEditing?.(true);
                          }}
                          className="block w-full bg-gray-100 text-[#332B42] px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm border border-gray-300"
                        >
                          ✏️ Add Contact Information
                        </button>
                      </div>
                    </>
                  );
                } else {
                  return (
                    <>
                      <img
                        src="/Messages.svg"
                        alt="Start conversation"
                        className="w-24 h-24 mb-4 opacity-50"
                      />
                      <p>Send a message to start the conversation!</p>
                    </>
                  );
                }
              })()}
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
                <AnimatePresence mode="popLayout">
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
                      <motion.div
                        key={msg.id}
                        className={`flex ${alignmentClass}${msgIdx < group.messages.length - 1 ? ' mb-[12px]' : ''} group`}
                        initial={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: isSent ? 50 : -50, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
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
                                {`${msg.direction === 'sent' ? 'You' : 'They'} replied to ${parentMsg.source === 'gmail' ? 'this email' : 'this message'}`}
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
                            <span className="flex items-center gap-1">
                              {msg.source === 'gmail' ? (
                                <>
                                  <img src="/Gmail_icon_(2020).svg" alt="Gmail" className="w-3 h-3" />
                                  Gmail
                                </>
                              ) : msg.source === 'inapp' ? (
                                <>
                                  <MessageSquareText className="w-3 h-3 text-blue-500" />
                                  In-App Message
                                </>
                              ) : (
                                'Manual'
                              )} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex items-center gap-1">
                              {msg.source === 'gmail' && msg.gmailMessageId && (
                                <button
                                  className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-150"
                                  onClick={() => openInGmail(msg)}
                                  title="Open in Gmail"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-150"
                                  onClick={() => onDelete(msg)}
                                  title="Delete this message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                className="text-xs text-[#A85C36] hover:underline ml-2 flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150"
                                onClick={() => onReply(msg)}
                                title="Reply to this message"
                              >
                                <Reply className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {msg.source === 'gmail' && msg.subject && (
                            <div className="text-xs font-semibold text-gray-700 mb-1">{msg.subject}</div>
                          )}
                          <div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            {renderMessageContent(msg)}
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
                          <div 
                            className={`${isSent ? 'self-end' : 'self-start'} mt-2 text-xs cursor-pointer text-[#A85C36] underline hover:text-[#784528]`}
                            onClick={() => {
                              // Scroll to the first reply and trigger bounce animation
                              if (replies.length > 0 && messageRefs.current[replies[0].id]) {
                                const firstReplyEl = messageRefs.current[replies[0].id];
                                if (firstReplyEl) {
                                  firstReplyEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  triggerBounce(replies[0].id);
                                  
                                  // If multiple replies, also bounce the last one to show the full thread
                                  if (replies.length > 1 && messageRefs.current[replies[replies.length - 1].id]) {
                                    setTimeout(() => {
                                      const lastReplyEl = messageRefs.current[replies[replies.length - 1].id];
                                      if (lastReplyEl) {
                                        lastReplyEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        triggerBounce(replies[replies.length - 1].id);
                                      }
                                    }, 300);
                                  }
                                }
                              }
                            }}
                            title={`Click to view ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                          > 
                            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
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