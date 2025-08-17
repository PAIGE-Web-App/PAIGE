import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Bell, MessageSquare } from 'lucide-react';

interface UpgradePlanModalProps {
  maxLists?: number;
  reason?: 'lists' | 'mentions' | 'collaboration';
  onClose: () => void;
}

const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({ 
  maxLists, 
  reason = 'lists',
  onClose 
}) => {
  const getModalContent = () => {
    switch (reason) {
      case 'mentions':
        return {
          title: 'Unlock Partner Collaboration',
          description: 'Upgrade to invite your partner and wedding planner to collaborate on vendor decisions with @mention notifications.',
          icon: <Users className="w-8 h-8 text-[#A85C36]" />,
          features: [
            'Invite partner to your wedding portal',
            'Send @mention notifications via email',
            'Collaborate on vendor decisions',
            'Share comments and notes',
            'Real-time team notifications',
            'Advanced collaboration features'
          ]
        };
      case 'collaboration':
        return {
          title: 'Enable Team Collaboration',
          description: 'Upgrade to enable full collaboration with your partner and wedding planner.',
          icon: <MessageSquare className="w-8 h-8 text-[#A85C36]" />,
          features: [
            'Real-time collaboration features',
            'Shared vendor management',
            'Team notifications',
            'Unlimited team members',
            'Advanced team permissions',
            'Collaborative planning tools'
          ]
        };
      default:
        return {
          title: 'Upgrade Your Plan',
          description: `You've reached the limit of ${maxLists} mood boards on your current plan. Upgrade to unlock unlimited boards, more storage, advanced AI features, and premium collaboration tools!`,
          icon: null,
          features: [
            'Unlimited to-do lists & planning lists',
            'More mood boards & inspiration storage',
            'Increased file storage & upload limits',
            'Advanced AI functionality & credits',
            'Priority support & premium templates',
            'Pinterest integration & collaboration tools'
          ]
        };
    }
  };

  const content = getModalContent();

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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row with title and close button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <h5 className="h5 text-center flex-1">{content.title}</h5>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full flex-1 flex justify-end"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-left">{content.description}</p>
          </div>

          {/* Icon (only if exists) */}
          {content.icon && (
            <div className="flex justify-center mb-4">
              {content.icon}
            </div>
          )}

          <img
            src="/Upgrade.jpg"
            alt="Upgrade Graphic"
            className="mx-auto mb-6 w-[120px]"
          />

          <div className="mb-6">
            <h6 className="font-medium text-[#332B42] mb-3">What you'll get:</h6>
            <ul className="space-y-2">
              {content.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
        
                onClose();
              }}
              className="btn-primary px-6 py-2 text-sm"
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
