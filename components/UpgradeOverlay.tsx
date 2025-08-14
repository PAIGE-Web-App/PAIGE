"use client";

import React from 'react';
import { CircleArrowUp } from 'lucide-react';

interface UpgradeOverlayProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onUpgradeClick: () => void;
  className?: string;
}

export default function UpgradeOverlay({
  title = "Upgrade to Unlock",
  description = "Share and plan with your partner, wedding planner, and more! Get @mention notifications and real-time collaboration.",
  buttonText = "Upgrade Now",
  onUpgradeClick,
  className = ""
}: UpgradeOverlayProps) {
  return (
    <div className={`absolute inset-0 bg-white/60 backdrop-blur-sm rounded-lg z-10 flex flex-col items-center justify-center p-6 pointer-events-none ${className}`}>
      <div className="text-center">
        <div className="w-12 h-12 bg-[#805d93] rounded-full flex items-center justify-center mb-4 mx-auto">
          <CircleArrowUp className="w-6 h-6 text-white" />
        </div>
        <h6 className="mb-2">{title}</h6>
        <p className="text-sm text-gray-600 mb-4 max-w-xs">
          {description}
        </p>
        <div className="flex justify-center">
          <button
            onClick={onUpgradeClick}
            className="btn-primary pointer-events-auto"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
} 