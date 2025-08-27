import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface MealOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOptions: string[];
  onSave: (newOptions: string[]) => void;
}

export default function MealOptionsModal({ isOpen, onClose, currentOptions, onSave }: MealOptionsModalProps) {
  const [editingOptions, setEditingOptions] = useState<string[]>(currentOptions);

  const handleSave = () => {
    const filteredOptions = editingOptions.filter(option => option.trim());
    onSave(filteredOptions);
    onClose();
  };

  const handleClose = () => {
    setEditingOptions(currentOptions);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-[5px] p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h5 className="h5 text-[#332B42]">Edit Meal Options</h5>
          <button
            onClick={handleClose}
            className="text-[#AB9C95] hover:text-[#332B42] transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-sm text-[#AB9C95]">Enter meal options, one per line:</p>
          
          <textarea
            value={editingOptions.join('\n')}
            onChange={(e) => setEditingOptions(e.target.value.split('\n'))}
            rows={6}
            className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none"
            placeholder="Beef&#10;Chicken&#10;Fish&#10;Vegetarian&#10;Vegan&#10;Gluten-Free"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="btn-primaryinverse"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            Save Options
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
