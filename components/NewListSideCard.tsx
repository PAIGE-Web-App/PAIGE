import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import NewListOnboardingModal from './NewListOnboardingModal';

interface NewListSideCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; tasks?: { name: string; note?: string; category?: string; deadline?: Date; endDate?: Date; }[] }) => void;
  initialName?: string;
  allCategories: string[];
  handleBuildWithAI: (template: string) => void;
  isGenerating: boolean;
}

const NewListSideCard: React.FC<NewListSideCardProps> = ({ isOpen, onClose, onSubmit, initialName = '', allCategories, handleBuildWithAI, isGenerating }) => {
  const handleListSubmit = (data: any) => {
    onSubmit(data);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-50 bg-white border-b border-[#E0DBD7] flex justify-between items-center mb-0 w-full p-4">
              <h2 className="text-h5 font-medium font-playfair text-[#332B42]">New List</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NewListOnboardingModal
                isOpen={true}
                onClose={() => {}}
                onSubmit={handleListSubmit}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NewListSideCard; 