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
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -50, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="text-left mb-6">
                        <h5 className="h5 mb-2">Edit Image</h5>
                        <p className="text-sm text-gray-600">
                          Update your image details below.
                        </p>
                      </div>
                      
                      {/* Close Button */}
                      <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                        title="Close"
                      >
                        <X size={20} />
                      </button>

                                {/* Content */}
                      <div className="space-y-4">
                        {/* Image Preview */}
                        <div className="text-center">
                          <img
                            src={imageUrl}
                            alt={fileName}
                            className="w-32 h-32 object-cover rounded-[5px] border border-[#AB9C95] mx-auto"
                          />
                        </div>

                        {/* File Name Input */}
                        <div>
                          <h6 className="font-medium text-[#332B42] mb-3">File Name</h6>
                          <input
                            id="fileName"
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-2 border border-[#AB9C95] rounded-[5px] focus:outline-none focus:border-[#A85C36]"
                            placeholder="Enter file name"
                            autoFocus
                          />
                        </div>

                        {/* Description Input */}
                        <div>
                          <h6 className="font-medium text-[#332B42] mb-3">Description</h6>
                          <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={3}
                            className="w-full px-3 py-2 border border-[#AB9C95] rounded-[5px] focus:outline-none focus:border-[#A85C36] resize-none"
                            placeholder="Add a description for this image..."
                          />
                        </div>
                      </div>

                                {/* Footer */}
                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          onClick={onClose}
                          className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-[5px] text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={!fileName.trim()}
                          className="btn-primary px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save Changes
                        </button>
                      </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
