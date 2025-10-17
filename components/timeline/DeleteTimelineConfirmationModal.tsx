import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { WeddingTimeline } from '@/types/timeline';

interface DeleteTimelineConfirmationModalProps {
  timeline: WeddingTimeline;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteTimelineConfirmationModal: React.FC<DeleteTimelineConfirmationModalProps> = ({ 
  timeline, 
  onConfirm, 
  onClose 
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose} // Close modal when clicking outside
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[10px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4">Confirm Timeline Deletion</h5>

          <p className="text-sm text-[#364257] mb-4">
            Are you sure you want to delete the timeline for "
            <span className="font-semibold">
              {timeline.weddingDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>"?
          </p>
          <p className="text-sm text-[#E5484D] font-medium mb-6">
            Removing this timeline will permanently delete all events and sync data associated with it.
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-primaryinverse"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
            >
              Delete Timeline
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeleteTimelineConfirmationModal;
