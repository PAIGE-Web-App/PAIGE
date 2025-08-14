import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Edit3 } from 'lucide-react';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageIndex: number, fileName: string, description: string) => void;
  imageIndex: number;
  currentFileName: string;
  currentDescription?: string;
  imageUrl: string;
}

export default function ImageEditModal({
  isOpen,
  onClose,
  onSave,
  imageIndex,
  currentFileName,
  currentDescription = '',
  imageUrl
}: ImageEditModalProps) {
  const [fileName, setFileName] = useState(currentFileName);
  const [description, setDescription] = useState(currentDescription);

  useEffect(() => {
    if (isOpen) {
      setFileName(currentFileName);
      setDescription(currentDescription);
    }
  }, [isOpen, currentFileName, currentDescription]);

  const handleSave = () => {
    if (fileName.trim()) {
      onSave(imageIndex, fileName.trim(), description.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  };

  if (!isOpen) return null;

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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[5px] shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#A85C36]" />
              <h3 className="text-lg font-semibold text-[#332B42]">Edit Image</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Image Preview */}
            <div className="text-center">
              <img
                src={imageUrl}
                alt={fileName}
                className="w-32 h-32 object-cover rounded-[5px] border border-gray-200 mx-auto"
              />
            </div>

            {/* File Name Input */}
            <div>
              <label htmlFor="fileName" className="block text-sm font-medium text-[#332B42] mb-2">
                File Name
              </label>
              <input
                id="fileName"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent"
                placeholder="Enter file name"
                autoFocus
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-[#332B42] mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent resize-none"
                placeholder="Add a description for this image..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!fileName.trim()}
              className="px-4 py-2 bg-[#A85C36] text-white rounded-[5px] hover:bg-[#A85C36]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
