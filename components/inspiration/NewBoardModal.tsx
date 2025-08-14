import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { BOARD_TEMPLATES, BoardTemplate } from '../../types/inspiration';

interface NewBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, type: 'custom' | 'wedding-day' | 'reception' | 'engagement') => void;
  newBoardName: string;
  setNewBoardName: (name: string) => void;
  newBoardType: 'custom' | 'wedding-day' | 'reception' | 'engagement';
  setNewBoardType: (type: 'custom' | 'wedding-day' | 'reception' | 'engagement') => void;
  isEditing?: boolean;
  editingBoard?: any;
}

export default function NewBoardModal({
  isOpen,
  onClose,
  onCreate,
  newBoardName,
  setNewBoardName,
  newBoardType,
  setNewBoardType,
  isEditing = false,
  editingBoard
}: NewBoardModalProps) {
  const handleCreate = () => {
    if (newBoardType === 'custom' && !newBoardName.trim()) {
      return; // Validation should be handled by parent
    }
    const name = newBoardType === 'custom' ? newBoardName : BOARD_TEMPLATES.find(t => t.type === newBoardType)?.name || '';
    onCreate(name, newBoardType);
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
            className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>

            <div className="text-left mb-6">
              <h5 className="h5 mb-2">{isEditing ? 'Edit Mood Board' : 'Create New Mood Board'}</h5>
              <p className="text-sm text-gray-600">
                {isEditing 
                  ? 'Update your mood board details below.'
                  : 'Choose a template to get started with your new mood board.'
                }
              </p>
            </div>

            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Choose a template:</h6>
              <div className="grid grid-cols-2 gap-3">
                {BOARD_TEMPLATES.map((template) => (
                  <button
                    key={template.type}
                    onClick={() => setNewBoardType(template.type)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      newBoardType === template.type
                        ? 'border-[#A85C36] bg-[#A85C36] text-white'
                        : 'border-[#AB9C95] bg-white text-[#332B42] hover:border-[#A85C36]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs opacity-75">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {newBoardType === 'custom' && (
              <div className="mb-6">
                <h6 className="font-medium text-[#332B42] mb-3">Board Name</h6>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Enter board name..."
                  className="w-full px-3 py-2 border border-[#AB9C95] rounded-[5px] focus:outline-none focus:border-[#A85C36]"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-[5px] text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary px-6 py-2 text-sm"
              >
                {isEditing ? 'Update Board' : 'Create Board'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
