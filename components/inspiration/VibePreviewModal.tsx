import React, { useState, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Mail, Heart, Palette, Camera, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { MoodBoard } from '../../types/inspiration';
import VibePill from '../VibePill';
import { useUserProfileData } from '../../hooks/useUserProfileData';
import { useTodoItems } from '../../hooks/useTodoItems';
import { useFavoritesSimple } from '../../hooks/useFavoritesSimple';
import { useAuth } from '../../contexts/AuthContext';

interface VibePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  moodBoards: MoodBoard[];
  activeMoodBoard: string;
  onUseInDraft: (vibes: string[], boardType: string) => void;
}

const VibePreviewModal = memo(function VibePreviewModal({
  isOpen,
  onClose,
  moodBoards,
  activeMoodBoard,
  onUseInDraft
}: VibePreviewModalProps) {
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [previewMessage, setPreviewMessage] = useState('');
  const [animatedMessage, setAnimatedMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedBoardType, setSelectedBoardType] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>(activeMoodBoard);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Data hooks for AI integration
  const { user } = useAuth();
  const { 
    userName, 
    partnerName, 
    weddingDate, 
    weddingLocation, 
    hasVenue, 
    guestCount, 
    maxBudget, 
    vibe 
  } = useUserProfileData();
  const { todoItems: todos } = useTodoItems(null); // Pass null for selectedList to get all todos
  const { favorites } = useFavoritesSimple();
  
  const activeBoard = useMemo(() => {
    return moodBoards.find(board => board.id === selectedBoardId);
  }, [moodBoards, selectedBoardId]);

  // Truncation logic (same as VibeSection)
  const vibeCount = activeBoard?.vibes?.length || 0;
  const maxVisible = 20;
  const hasMore = vibeCount > maxVisible;
  const visibleVibes = isExpanded ? (activeBoard?.vibes || []) : (activeBoard?.vibes || []).slice(0, maxVisible);
  const remainingCount = vibeCount - maxVisible;

  useEffect(() => {
    if (isOpen && activeBoard) {
      setSelectedVibes(activeBoard.vibes || []);
      setSelectedBoardType(activeBoard.type);
      // Don't auto-generate - let user click the button
      setShowPreview(false);
      setPreviewMessage('');
      setAnimatedMessage('');
    }
  }, [isOpen, activeBoard]);

  useEffect(() => {
    if (isOpen) {
      setSelectedBoardId(activeMoodBoard);
    }
  }, [isOpen, activeMoodBoard]);

  const generatePreviewMessage = async (vibes: string[], boardType: string) => {
    if (vibes.length === 0) return;
    
    setGenerating(true);
    setShowPreview(true);
    
    try {
      // Prepare context data for AI - handle undefined data
      const completedTodos = (todos || []).filter(todo => todo.isCompleted).slice(0, 5);
      const pendingTodos = (todos || []).filter(todo => !todo.isCompleted).slice(0, 5);
      
      // Prepare user profile data for AI personalization
      const userProfileData = {
        userName,
        partnerName,
        weddingDate,
        weddingLocation,
        hasVenue,
        guestCount,
        maxBudget,
        vibe: vibe || []
      };

      console.log('Sending draft request with:', {
        vibes: vibes, // All vibes
        boardType,
        userProfileData,
        userId: user?.uid
      });

      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({
          contact: { name: 'Vendor', category: 'vendor' },
          messages: [],
          userId: user?.uid,
          userData: userProfileData,
          vibeContext: {
            vibes: vibes, // Use all vibes, not just first 4
            boardType,
            weddingLocation,
            completedTodos: completedTodos.map(todo => todo.name),
            pendingTodos: pendingTodos.map(todo => todo.name)
          }
        }),
      });

      const data = await response.json();
      console.log('Draft API response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate draft');
      }
      
      if (data.draft) {
        setPreviewMessage(data.draft);
        
        // Animate the text with fast speed
        setIsAnimating(true);
        let currentText = "";
        const chunkSize = 15; // Process more characters at once for faster animation
        for (let i = 0; i < data.draft.length; i += chunkSize) {
          await new Promise(resolve => setTimeout(resolve, 2)); // Fast animation
          currentText += data.draft.slice(i, i + chunkSize);
          setAnimatedMessage(currentText);
        }
        setIsAnimating(false);
      } else {
        console.error('No draft received from API:', data);
        throw new Error('No draft content received');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      // Fallback to template-based generation
      await generateFallbackMessage(vibes, boardType);
    } finally {
      setGenerating(false);
    }
  };

  const generateFallbackMessage = async (vibes: string[], boardType: string) => {
    const boardTypeLabel = boardType === 'wedding-day' ? 'wedding' : 
                          boardType === 'reception' ? 'reception' : 
                          boardType === 'engagement' ? 'engagement' : 'event';
    
    const vibeText = vibes.slice(0, 4).join(', ');
    
    // Use actual user data for fallback message
    const userNameText = userName || 'We';
    const weddingDateText = weddingDate ? ` on ${weddingDate.toLocaleDateString()}` : '';
    const locationText = weddingLocation ? ` in ${weddingLocation}` : '';
    
    const template = `Hi there! 👋

${userNameText}'re planning our ${boardTypeLabel}${weddingDateText}${locationText} and love your work! We're going for a ${vibeText} vibe and think you'd be perfect for our day.

Could you tell me more about your services and availability? Thanks so much!

Warm regards,${userName ? `\n${userName}` : '\nWe'}`;

    setPreviewMessage(template);
    
    // Animate the fallback message too
    setIsAnimating(true);
    let currentText = "";
    const chunkSize = 15;
    for (let i = 0; i < template.length; i += chunkSize) {
      await new Promise(resolve => setTimeout(resolve, 2));
      currentText += template.slice(i, i + chunkSize);
      setAnimatedMessage(currentText);
    }
    setIsAnimating(false);
  };



  const handleUseInDraft = () => {
    onUseInDraft(selectedVibes, selectedBoardType);
    onClose();
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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 bg-white border-b border-[#AB9C95] px-6 py-4 flex items-center justify-between">
            <h5 className="h5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#805d93]" />
              See It In Action
            </h5>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <div className="px-6 py-2">
            <p className="text-sm text-gray-600 text-left">See how your vibes translate to vendor communication!</p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Board Selection */}
            <div className="mb-6">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#332B42]">Select Mood Board</span>
                <div className="relative">
                  <select
                    value={selectedBoardId}
                    onChange={(e) => {
                      const selectedBoard = moodBoards.find(board => board.id === e.target.value);
                      if (selectedBoard) {
                        setSelectedBoardId(e.target.value);
                        setSelectedVibes(selectedBoard.vibes || []);
                        setSelectedBoardType(selectedBoard.type);
                        // Reset preview state when switching boards
                        setShowPreview(false);
                        setPreviewMessage('');
                        setAnimatedMessage('');
                        setIsExpanded(false);
                      }
                    }}
                    className="w-full border pr-10 pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
                  >
                    {moodBoards.map(board => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                  {/* Custom chevron icon */}
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#332B42]" />
                </div>
              </label>
            </div>

            {/* Vibe Display */}
            <div className="mb-6">
              <span className="text-xs font-medium text-[#332B42] block mb-3">
                Here are the Vibes that will be woven in
              </span>
              <div className="flex flex-wrap gap-2">
                {visibleVibes.map((vibe, index) => (
                  <VibePill
                    key={index}
                    vibe={vibe}
                    index={index}
                  />
                ))}
                
                {hasMore && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#805d93] bg-[#F3F2F0] border border-[#AB9C95] rounded-full hover:bg-[#E0DBD7] transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Show less
                      </>
                    ) : (
                      <>
                        +{remainingCount} more
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Generate Preview Button - moved to fixed footer */}

                        {/* Preview Message */}
            {showPreview && (
              <div className="mb-6">
                <h6 className="mb-3">Preview Message</h6>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {generating ? (
                    <div className="whitespace-pre-wrap text-[#332B42] leading-relaxed font-work-sans">
                      {isAnimating ? animatedMessage : ''}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-[#332B42] leading-relaxed font-work-sans">
                      {previewMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 bg-white border-t border-[#AB9C95] px-6 py-4">
            <div className="flex justify-end gap-3">
              {!showPreview ? (
                <>
                  <button
                    onClick={onClose}
                    className="btn-primaryinverse px-6 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => generatePreviewMessage(activeBoard?.vibes || [], activeBoard?.type || '')}
                    disabled={generating || !activeBoard?.vibes?.length}
                    className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate Preview (1 Credit)
                      </>
                    )}
                  </button>
                </>
              ) : (
                !generating && (
                  <button
                    onClick={onClose}
                    className="btn-primaryinverse px-6 py-2 text-sm"
                  >
                    Close
                  </button>
                )
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default VibePreviewModal;
