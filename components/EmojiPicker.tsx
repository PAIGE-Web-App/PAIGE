import React from 'react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const emojis = [
    '😀', '😁', '😂', '🤣', '😃', '😅', '😆', '🥹', '😊', '😋', '😎', '😍', '😘', '😗', '😙', '😚', 
    '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😮', '🤐', '😯', '😴', '😫', '😩', 
    '😤', '😡', '😠', '🤬', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', 
    '😻', '😼', '😽', '🙀', '😿', '😾'
  ];

  return (
    <div className="p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 flex flex-wrap gap-1 max-w-64">
      {emojis.map((emoji, index) => (
        <button
          key={index}
          onClick={() => {
            onEmojiSelect(emoji);
            onClose();
          }}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-lg"
          aria-label={`Select emoji ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;
