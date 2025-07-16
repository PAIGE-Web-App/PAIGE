import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface UpgradePlanModalProps {
  maxLists: number;
  onClose: () => void;
}

const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({ maxLists, onClose }) => {
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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative flex flex-col items-center" // Added flex, flex-col, items-center
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4 text-center">Upgrade Your Plan</h5>

          {/* Updated: Upgrade Graphic to use Upgrade.jpg and modified styling */}
          <img
            src="/Upgrade.jpg" // Changed to the specified image path
            alt="Upgrade Graphic"
            className="my-4 w-[120px]" // Removed rounded-full and shadow-md, added w-[120px]
          />

          <p className="text-sm text-gray-600 mb-6 text-center"> {/* Adjusted margin-bottom and added text-center */}
            You have reached the maximum of {maxLists} lists allowed on your current plan.
            Upgrade your account to create more lists and unlock additional features!
          </p>

          <div className="flex justify-center w-full"> {/* Centered buttons */}
            {/* Removed the "Close" button */}
            <button
              onClick={() => {
                // Handle upgrade logic here, e.g., redirect to pricing page
                console.log("Upgrade Now clicked!");
                onClose(); // Close modal after action
              }}
              className="btn-primary px-4 py-2 text-sm" // Removed ml-2 as it's the only button
            >
              Upgrade Now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradePlanModal;
