import React from 'react';

const FilesTopBarSkeleton: React.FC = () => (
  <div className="bg-white border-b border-[#E0DBD7] p-6 flex-shrink-0 animate-pulse">
    <div className="flex items-center gap-4">
      {/* Left Side - Folder Name and Controls */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Folder Name */}
        <div className="h-6 bg-gray-300 rounded w-48" />
        
        {/* Folder Controls */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="w-px h-4 bg-[#E0DBD7]" />
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 flex justify-center">
        <div className="w-8 h-8 bg-gray-200 rounded" />
      </div>

      {/* Right Side - View Toggle and Add File */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* View Mode Toggle */}
        <div className="flex bg-[#F8F6F4] rounded-[5px] p-1">
          <div className="w-8 h-8 bg-gray-300 rounded-[3px]" />
          <div className="w-8 h-8 bg-gray-200 rounded-[3px]" />
        </div>

        {/* Add File Button */}
        <div className="h-8 bg-gray-300 rounded w-20" />
      </div>
    </div>
  </div>
);

export default FilesTopBarSkeleton; 