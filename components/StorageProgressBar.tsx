import React from 'react';
import { formatFileSize } from '@/utils/fileUtils';

interface StorageProgressBarProps {
  usedStorage: number; // in bytes
  totalStorage: number; // in bytes
  plan: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  showUpgradeModal?: () => void;
}

const StorageProgressBar: React.FC<StorageProgressBarProps> = ({
  usedStorage,
  totalStorage,
  plan,
  showUpgradeModal
}) => {
  const progressPercentage = Math.min((usedStorage / totalStorage) * 100, 100);
  const isNearLimit = progressPercentage > 80;
  const isOverLimit = progressPercentage > 100;

  return (
    <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[#AB9C95]">Storage Usage</h3>
        <span className="text-xs text-[#AB9C95] px-2 py-1 bg-[#F8F6F4] rounded-[3px]">
          {plan} Plan
        </span>
      </div>
      
      <div className="w-full bg-[#F3F2F0] rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-[#A85C36]'
          }`}
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#AB9C95]">
          {formatFileSize(usedStorage)} / {formatFileSize(totalStorage)}
        </span>
        <span className={`font-medium ${
          isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {progressPercentage.toFixed(1)}% used
        </span>
      </div>
      
      {isNearLimit && showUpgradeModal && (
        <button 
          onClick={showUpgradeModal}
          className="mt-2 text-xs text-[#A85C36] hover:underline font-medium"
        >
          Upgrade to get more storage →
        </button>
      )}
      
      {isOverLimit && (
        <div className="mt-2 text-xs text-red-600 font-medium">
          Storage limit exceeded. Please upgrade your plan.
        </div>
      )}
    </div>
  );
};

export default StorageProgressBar; 