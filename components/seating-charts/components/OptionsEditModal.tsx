import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface OptionsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  initialOptions: string[];
  onSave: (options: string[]) => void;
  rows?: number;
}

export const OptionsEditModal: React.FC<OptionsEditModalProps> = ({
  isOpen,
  onClose,
  title,
  placeholder,
  initialOptions,
  onSave,
  rows = 6
}) => {
  const [options, setOptions] = useState<string[]>(initialOptions);

  useEffect(() => {
    if (isOpen) {
      setOptions(initialOptions);
    }
  }, [isOpen, initialOptions]);

  const handleSave = () => {
    const filteredOptions = options.filter(opt => opt.trim());
    if (filteredOptions.length > 0) {
      onSave(filteredOptions);
      onClose();
    } else {
      alert('Please enter at least one option');
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
            className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row with title and close button */}
            <div className="flex items-center justify-between mb-4">
              <h5 className="h5 text-[#332B42]">{title}</h5>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[#AB9C95]">Enter options, one per line:</p>
              
              <textarea
                value={options.join('\n')}
                onChange={(e) => setOptions(e.target.value.split('\n'))}
                placeholder={placeholder}
                rows={rows}
                className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
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
      )}
    </AnimatePresence>
  );
};
