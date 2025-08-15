import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Copy, Mail, Heart, Palette, Camera, Star } from 'lucide-react';
import { MoodBoard } from '../../types/inspiration';

interface VibePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  moodBoards: MoodBoard[];
  activeMoodBoard: string;
  onUseInDraft: (vibes: string[], boardType: string) => void;
}

export default function VibePreviewModal({
  isOpen,
  onClose,
  moodBoards,
  activeMoodBoard,
  onUseInDraft
}: VibePreviewModalProps) {
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [previewMessage, setPreviewMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedBoardType, setSelectedBoardType] = useState<string>('');

  const activeBoard = moodBoards.find(board => board.id === activeMoodBoard);

  useEffect(() => {
    if (isOpen && activeBoard) {
      setSelectedVibes(activeBoard.vibes || []);
      setSelectedBoardType(activeBoard.type);
      generatePreviewMessage(activeBoard.vibes || [], activeBoard.type);
    }
  }, [isOpen, activeBoard]);

  const generatePreviewMessage = async (vibes: string[], boardType: string) => {
    if (vibes.length === 0) return;
    
    setGenerating(true);
    try {
      const response = await fetch('/api/generate-vibe-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibes,
          boardType,
          context: 'vendor-communication'
        }),
      });

      const data = await response.json();
      if (data.message) {
        setPreviewMessage(data.message);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      // Fallback to template-based generation
      generateFallbackMessage(vibes, boardType);
    } finally {
      setGenerating(false);
    }
  };

  const generateFallbackMessage = (vibes: string[], boardType: string) => {
    const boardTypeLabel = boardType === 'wedding-day' ? 'wedding' : 
                          boardType === 'reception' ? 'reception' : 
                          boardType === 'engagement' ? 'engagement' : 'event';
    
    const vibeText = vibes.join(', ');
    
    const template = `Hi there! 👋

I'm planning my ${boardTypeLabel} and absolutely love your work! I'm going for a ${vibeText} vibe, and I think you'd be perfect for bringing this vision to life.

Could you tell me more about your services and availability? I'd love to chat about how we can work together to create something truly special.

Thanks so much!
[Your name]`;

    setPreviewMessage(template);
  };

  const handleVibeToggle = (vibe: string) => {
    setSelectedVibes(prev => 
      prev.includes(vibe) 
        ? prev.filter(v => v !== vibe)
        : [...prev, vibe]
    );
  };

  const handleUseInDraft = () => {
    onUseInDraft(selectedVibes, selectedBoardType);
    onClose();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewMessage);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen || !activeBoard) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[5px] shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#A85C36] rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#332B42]">See it in Action</h3>
                <p className="text-sm text-gray-600">How your vibes translate to vendor communication</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Board Selection */}
            <div className="mb-6">
              <h4 className="font-medium text-[#332B42] mb-3">Mood Board: {activeBoard.name}</h4>
              <div className="flex flex-wrap gap-2">
                {moodBoards.map(board => (
                  <button
                    key={board.id}
                    onClick={() => {
                      setSelectedVibes(board.vibes || []);
                      setSelectedBoardType(board.type);
                      generatePreviewMessage(board.vibes || [], board.type);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      board.id === activeMoodBoard
                        ? 'bg-[#A85C36] text-white'
                        : 'bg-gray-100 text-[#332B42] hover:bg-gray-200'
                    }`}
                  >
                    {board.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe Selection */}
            <div className="mb-6">
              <h4 className="font-medium text-[#332B42] mb-3">Select Vibes to Include</h4>
              <div className="flex flex-wrap gap-2">
                {(activeBoard.vibes || []).map((vibe, index) => (
                  <button
                    key={index}
                    onClick={() => handleVibeToggle(vibe)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                      selectedVibes.includes(vibe)
                        ? 'bg-[#A85C36] text-white border-2 border-[#A85C36]'
                        : 'bg-white text-[#332B42] border-2 border-[#AB9C95] hover:border-[#A85C36]'
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Message */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-[#332B42]">Preview Message</h4>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A85C36] hover:bg-[#A85C36]/10 rounded-lg transition-colors"
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {generating ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Generating your personalized message...</span>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-[#332B42] leading-relaxed">
                    {previewMessage || 'Select vibes to generate a preview message...'}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">💡 Tip:</span> This message will be available in your Draft Message area
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-[5px] text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleUseInDraft}
                  disabled={selectedVibes.length === 0}
                  className="px-6 py-2 bg-[#A85C36] text-white rounded-[5px] text-sm font-medium hover:bg-[#A85C36]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Mail size={16} />
                  Use in Draft Message
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
