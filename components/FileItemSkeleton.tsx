import React from 'react';

const FileItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 border border-[#E0DBD7] rounded-[5px] bg-white animate-pulse">
    {/* File Icon */}
    <div className="w-5 h-5 bg-gray-300 rounded flex-shrink-0" />
    
    {/* File Info */}
    <div className="flex-1 min-w-0">
      <div className="h-4 bg-gray-300 rounded w-32 mb-1" />
      <div className="h-3 bg-gray-200 rounded w-24" />
    </div>
    
    {/* Action Buttons */}
    <div className="flex gap-2">
      <div className="w-6 h-6 bg-gray-200 rounded" />
      <div className="w-6 h-6 bg-gray-200 rounded" />
    </div>
  </div>
);

export default FileItemSkeleton; 