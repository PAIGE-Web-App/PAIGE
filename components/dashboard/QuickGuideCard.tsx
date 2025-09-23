'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';

interface QuickGuideCardProps {
  card: {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    icon: React.ReactNode;
    link: string;
    actionText: string;
    whyImportant: {
      title: string;
      content: string;
    };
  };
  onWhyImportantClick: (cardId: string) => void;
}

export default function QuickGuideCard({ card, onWhyImportantClick }: QuickGuideCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(card.link);
  };

  return (
    <div
      className={`group bg-white border rounded-lg p-4 cursor-pointer hover:shadow-lg hover:shadow-gray-300/50 transition-all duration-200 hover:-translate-y-1 relative flex flex-col h-full ${
        card.completed
          ? 'border-green-200 bg-green-50/30'
          : 'border-gray-200 hover:border-[#A85C36]'
      }`}
      onClick={handleCardClick}
    >
      {/* Checkmark in top right */}
      {card.completed && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
      )}

      {/* Icon centered above title */}
      <div className="flex justify-center mb-3">
        <div className={`p-3 rounded-lg ${
          card.completed
            ? 'bg-green-100 text-green-600'
            : 'bg-[#F3F2F0] text-[#5A4A42]'
        }`}>
          {card.icon}
        </div>
      </div>

      {/* Content */}
      <div className="text-center flex flex-col flex-1">
        <h6 className={`text-sm mb-2 font-work ${
          card.completed ? 'text-green-800' : 'text-[#332B42]'
        }`}>
          {card.title}
        </h6>

        <p className="text-sm text-[#5A4A42] mb-4 font-work leading-relaxed flex-1">
          {card.description}
        </p>

        {/* Why is this important link */}
        <div className="flex justify-center mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWhyImportantClick(card.id);
            }}
            className="text-xs text-gray-500 hover:text-[#A85C36] underline transition-colors"
          >
            Why is this important?
          </button>
        </div>

        {/* Bottom-aligned call to action */}
        <div className="flex justify-center mt-auto">
          <div className="flex items-center gap-1 text-[#A85C36] text-xs font-medium group-hover:gap-2 transition-all">
            <span>{card.actionText}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
