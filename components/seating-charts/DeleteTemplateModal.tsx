import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { SavedTemplate } from '@/lib/templateService';

interface DeleteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  template: SavedTemplate | null;
}

export default function DeleteTemplateModal({ isOpen, onClose, onConfirm, template }: DeleteTemplateModalProps) {
  if (!template) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-md w-full mx-2 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-red-600 bg-opacity-10 rounded-full p-2">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h5 className="h5 text-left text-lg md:text-xl">Delete Template</h5>
              </div>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                <p className="text-[#332B42] text-sm leading-relaxed">
                  Are you sure you want to delete <strong>"{template.name}"</strong>? This action cannot be undone.
                </p>
                
                <div className="bg-gray-50 rounded-[5px] p-3 border border-gray-200">
                  <div className="text-xs font-medium text-[#332B42] mb-2">Template Details:</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>• {template.tables.filter(t => !t.isVenueItem).length} tables</div>
                    <div>• {template.tables.filter(t => t.isVenueItem).length} venue items</div>
                    <div>• {template.tables.reduce((sum, t) => sum + t.capacity, 0)} total seats</div>
                    <div>• Created: {template.createdAt.toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primaryinverse"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 text-white flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Template
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
