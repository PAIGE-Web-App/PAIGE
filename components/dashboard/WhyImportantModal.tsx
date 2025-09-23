'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface WhyImportantModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    id: string;
    title: string;
    actionText: string;
    link: string;
    whyImportant: {
      title: string;
      content: string;
    };
  } | null;
}

export default function WhyImportantModal({ isOpen, onClose, card }: WhyImportantModalProps) {
  const router = useRouter();

  if (!isOpen || !card) return null;

  const handleActionClick = () => {
    onClose();
    router.push(card.link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative">
        {/* Header row with title and close button */}
        <div className="flex items-start justify-between mb-4">
          <h5 className="h5 text-left flex-1 pr-4">
            {card.whyImportant.title}
          </h5>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full flex-shrink-0"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 text-left font-work">
            {card.whyImportant.content}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleActionClick}
            className="btn-primary"
          >
            {card.actionText}
          </button>
        </div>
      </div>
    </div>
  );
}
