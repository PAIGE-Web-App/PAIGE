import React from 'react';

const FilesSidebarSkeleton: React.FC = () => (
  <div className="w-80 bg-white border-r border-[#E0DBD7] flex flex-col animate-pulse">
    {/* Header */}
    <div className="p-4 border-b border-[#E0DBD7]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-300 rounded w-24" />
        <div className="h-7 bg-gray-200 rounded w-20" />
      </div>
    </div>

    {/* Folders List */}
    <div className="flex-1 p-4 space-y-2">
      {/* All Files skeleton */}
      <div className="flex items-center px-3 py-2 rounded-[5px] border border-[#E0DBD7]">
        <div className="w-4 h-4 bg-gray-300 rounded mr-2" />
        <div className="h-4 bg-gray-300 rounded w-16 flex-1" />
        <div className="w-6 h-5 bg-gray-200 rounded-full ml-2" />
      </div>

      {/* Folder skeletons */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center px-3 py-2 rounded-[5px]">
          <div className="w-4 h-4 bg-gray-300 rounded mr-2" />
          <div className="h-4 bg-gray-300 rounded w-32 flex-1" />
          <div className="w-6 h-5 bg-gray-200 rounded-full ml-2" />
        </div>
      ))}

      {/* Subfolder skeletons with indentation */}
      {[...Array(2)].map((_, i) => (
        <div key={`sub-${i}`} className="flex items-center px-3 py-2 ml-4 rounded-[5px]">
          <div className="w-4 h-4 bg-gray-300 rounded mr-2" />
          <div className="h-4 bg-gray-300 rounded w-24 flex-1" />
          <div className="w-6 h-5 bg-gray-200 rounded-full ml-2" />
        </div>
      ))}
    </div>

    {/* Storage Usage Footer */}
    <div className="p-4 border-t border-[#E0DBD7] bg-[#F8F6F4] flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 bg-gray-200 rounded w-20" />
        <div className="h-3 bg-gray-200 rounded w-12" />
      </div>
      <div className="w-full bg-[#E0DBD7] rounded-full h-1 mb-1">
        <div className="h-1 bg-gray-300 rounded-full w-1/3" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-8" />
      </div>
    </div>
  </div>
);

export default FilesSidebarSkeleton; 