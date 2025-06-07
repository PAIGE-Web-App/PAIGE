import React from "react";
import { FileUp, SmilePlus, WandSparkles, MoveRight, X } from "lucide-react";
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
}) => (
  <div className="relative bg-[#F3F2F0] border-t border-[#AB9C95] z-10" style={{ minHeight: "120px", borderTopWidth: "0.5px" }}>
    {/* First row: Via selector and message input */}
    <div className="px-3 pt-3">
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
          className={`btn-secondary flex items-center gap-2 justify-center relative overflow-hidden transition-all duration-200 rounded-[10px] px-8 py-2 font-semibold text-base border border-[#a85c36] ${isGenerating ? 'generating-btn' : ''}`}
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
              Draft AI Message
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

export default MessageDraftArea; 