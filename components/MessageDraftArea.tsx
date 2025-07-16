import React, { useState, useRef, useLayoutEffect } from "react";
import { FileUp, SmilePlus, WandSparkles, MoveRight, X, Reply } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface MessageDraftAreaProps {
  selectedChannel: string;
  setSelectedChannel: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  input: string;
  animatedDraft: string;
  isAnimating: boolean;
  isGenerating: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  selectedContact: any;
  selectedFiles: File[];
  handleRemoveFile: (index: number) => void;
  handleGenerateDraft: () => void;
  draftLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  EmojiPicker: React.FC<{ onEmojiSelect: (emoji: string) => void; onClose: () => void }>;
  handleEmojiSelect: (emoji: string) => void;
  isAnimatingOrGenerating: boolean;
  handleSendMessage: () => void;
  onContactSelect?: (contact: any) => void;
  replyingToMessage?: any; // Message | null
  clearReply?: () => void;
  subject: string;
  setSubject: (subject: string) => void;
}

const MessageDraftArea: React.FC<MessageDraftAreaProps> = ({
  selectedChannel,
  setSelectedChannel,
  textareaRef,
  input,
  animatedDraft,
  isAnimating,
  isGenerating,
  handleInputChange,
  handleKeyDown,
  selectedContact,
  selectedFiles,
  handleRemoveFile,
  handleGenerateDraft,
  draftLoading,
  fileInputRef,
  handleFileChange,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  EmojiPicker,
  handleEmojiSelect,
  isAnimatingOrGenerating,
  handleSendMessage,
  replyingToMessage,
  clearReply,
  subject,
  setSubject,
}) => {
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const subjectMeasureRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (subjectInputRef.current && subjectMeasureRef.current) {
      const minWidth = 120;
      const measured = subjectMeasureRef.current.offsetWidth;
      subjectInputRef.current.style.width = Math.max(minWidth, measured + 8) + "px";
    }
  }, [subject]);

  return (
    <div className="relative bg-[#F3F2F0] border-t border-[#AB9C95] z-10" style={{ minHeight: "120px", borderTopWidth: "0.5px" }}>
      {/* Reply preview bar - positioned at very top */}
      {replyingToMessage && (
        <div className="flex items-center bg-[#E0DBD7] border-l-4 border-[#A85C36] px-3 py-2 mb-2 rounded-[10px] mx-3 mt-3">
          <Reply className="w-4 h-4 text-[#A85C36] mr-2" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-[#332B42] truncate max-w-[200px]">
              {`You're replying to ${replyingToMessage.source === 'gmail' ? 'this email' : 'this message'}`}
            </span>
            {replyingToMessage.subject && (
              <span className="text-xs text-gray-700 truncate max-w-[200px]">
                <span className="font-semibold">Subject:</span> {replyingToMessage.subject}
              </span>
            )}
          </div>
          <button className="ml-auto text-[#A85C36] hover:text-[#784528]" onClick={clearReply} title="Cancel reply"><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="px-3 pt-3">
        {/* Via selector at the top */}
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="via" className="text-xs">
            Via
          </label>
          <select
            id="via"
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
            className="text-xs border px-2 py-1 rounded-[5px]"
          >
            <option value="Gmail">Gmail</option>
            {/* Add more options if needed */}
          </select>
        </div>
        {/* Subject input for Gmail */}
        {selectedChannel === "Gmail" && !replyingToMessage && (
          <div className="mb-4 relative">
            <input
              ref={subjectInputRef}
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Enter email subject"
              className="border-0 border-b border-[#AB9C95] px-0 py-2 text-sm bg-transparent text-[#332B42] focus:outline-none focus:ring-0 focus:border-[#A85C36]"
              style={{ borderRadius: 0, minWidth: 120, width: 120, display: 'inline-block', transition: 'width 0.2s' }}
            />
            {/* Hidden span for measuring text width */}
            <span
              ref={subjectMeasureRef}
              className="invisible absolute left-0 top-0 whitespace-pre text-sm font-normal"
              style={{ padding: 0, margin: 0 }}
            >
              {subject || 'Enter email subject'}
            </span>
          </div>
        )}
        {/* Message textarea */}
        <div className="overflow-y-auto max-h-[35vh] pr-1">
          <textarea
            ref={textareaRef}
            value={isAnimating ? animatedDraft : input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isGenerating ? "Generating draft..." : `Hey ${selectedContact?.name}...`}
            className="w-full text-sm resize-none text-[#332B42] bg-transparent border-none focus:outline-none"
            rows={1}
            style={{ minHeight: "3rem", maxHeight: "260px", overflowY: "auto" }}
          />
          {isGenerating && !isAnimating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div className="w-2 h-2 bg-[#A85C36] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#A85C36] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#A85C36] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="inline-flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                  <FileUp className="w-3 h-3" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="ml-1 text-[#A85C36] hover:text-[#784528]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Second row: All action buttons in one row, px-3, left/right aligned */}
      <div className="flex items-center justify-between py-3 px-3 border-t border-[#AB9C95] w-full" style={{ borderTopWidth: "0.5px" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerateDraft}
            disabled={draftLoading || isAnimatingOrGenerating}
            className={`btn-gradient-purple-large flex items-center gap-2 justify-center relative overflow-hidden transition-all duration-200 ${isGenerating ? 'generating-btn' : ''}`}
            style={isGenerating ? { pointerEvents: 'none', opacity: 1, color: '#fff' } : {}}
          >
            {isGenerating ? (
              <>
                <span className="spinner mr-2" />
                <span>GENERATING...</span>
              </>
            ) : (
              <>
                <WandSparkles className="w-4 h-4" />
                {replyingToMessage ? 'Draft AI Response' : 'Draft AI Message'}
              </>
            )}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="icon-button"
            aria-label="Attach File"
            title="Click to Upload File(s)"
            disabled={isAnimatingOrGenerating}
          >
            <FileUp className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="icon-button"
            aria-label="Add Emoji"
            title="Add an emoji to your message"
            disabled={isAnimatingOrGenerating}
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
          onClick={handleSendMessage}
          disabled={isAnimatingOrGenerating}
          className="btn-primary flex items-center gap-1"
          title="Send Message"
        >
          Send <MoveRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MessageDraftArea; 