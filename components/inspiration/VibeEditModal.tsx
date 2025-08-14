import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus } from 'lucide-react';
import VibePill from '../VibePill';

interface VibeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingVibes: string[];
  setEditingVibes: (vibes: string[]) => void;
  boardName: string;
  saving: boolean;
  showVibeInput: boolean;
  setShowVibeInput: (show: boolean) => void;
  newVibe: string;
  setNewVibe: (vibe: string) => void;
  onAddVibe: () => void;
  onRemoveVibe: (index: number) => void;
}

// Popular vibe options
const vibeOptions = [
  'Romantic & Intimate',
  'Modern & Minimalist',
  'Rustic & Natural',
  'Elegant & Sophisticated',
  'Boho & Free-spirited',
  'Vintage & Classic',
  'Coastal & Beachy',
  'Garden & Outdoor',
  'Industrial & Urban',
  'Fairytale & Magical',
  'Tropical & Exotic',
  'Mountain & Adventure'
];

export default function VibeEditModal({
  isOpen,
  onClose,
  onSave,
  editingVibes,
  setEditingVibes,
  boardName,
  saving,
  showVibeInput,
  setShowVibeInput,
  newVibe,
  setNewVibe,
  onAddVibe,
  onRemoveVibe
}: VibeEditModalProps) {
  const handleVibeToggle = (vibe: string) => {
    if (editingVibes.includes(vibe)) {
      setEditingVibes(editingVibes.filter(v => v !== vibe));
    } else {
      setEditingVibes([...editingVibes, vibe]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E0D6D0]">
              <div>
                <h3 className="text-xl font-playfair font-semibold text-[#332B42]">
                  Edit {boardName} Vibes
                </h3>
                <p className="text-sm text-[#364257] mt-1">
                  Select vibes that resonate with your wedding vision
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-2 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Selected Vibes */}
              {editingVibes.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-[#332B42] mb-3">Selected Vibes:</h4>
                  <div className="flex flex-wrap gap-2">
                    {editingVibes.map((vibe, index) => (
                      <VibePill
                        key={index}
                        vibe={vibe}
                        index={index}
                        isEditing={true}
                        onRemove={() => onRemoveVibe(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Vibes */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-[#332B42] mb-3">Popular Vibes:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {vibeOptions.map((vibe) => (
                    <button
                      key={vibe}
                      onClick={() => handleVibeToggle(vibe)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        editingVibes.includes(vibe)
                          ? 'bg-[#A85C36] text-white border-[#A85C36]'
                          : 'bg-white text-[#332B42] border-[#AB9C95] hover:border-[#A85C36] hover:bg-[#F3F2F0]'
                      }`}
                    >
                      {vibe}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Vibe Input */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-md font-medium text-[#332B42]">Custom Vibe:</h4>
                  {!showVibeInput && (
                    <button
                      onClick={() => setShowVibeInput(true)}
                      className="flex items-center gap-1 text-[#A85C36] hover:text-[#A85C36]/80 text-sm"
                    >
                      <Plus size={16} />
                      Add Custom
                    </button>
                  )}
                </div>
                
                {showVibeInput && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newVibe}
                      onChange={(e) => setNewVibe(e.target.value)}
                      placeholder="Enter a custom vibe..."
                      className="flex-1 px-3 py-2 border border-[#AB9C95] rounded-[5px] focus:outline-none focus:border-[#A85C36]"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          onAddVibe();
                        }
                      }}
                    />
                    <button
                      onClick={onAddVibe}
                      disabled={!newVibe.trim()}
                      className="px-4 py-2 bg-[#A85C36] text-white rounded-[5px] font-medium hover:bg-[#A85C36]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowVibeInput(false);
                        setNewVibe('');
                      }}
                      className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-[5px] font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-[#E0D6D0]">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-[5px] font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="btn-primary px-6 py-2 font-medium flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
