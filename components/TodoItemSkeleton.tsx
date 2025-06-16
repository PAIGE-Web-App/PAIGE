import React from 'react';

const TodoItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 mb-2 rounded-[5px] border border-[#AB9C95] bg-gray-100 animate-pulse">
    {/* Checkbox skeleton */}
    <div className="h-5 w-5 rounded-full bg-gray-300 flex-shrink-0" />
    {/* Main content skeleton */}
    <div className="flex-1">
      <div className="h-4 bg-gray-300 rounded w-2/3 mb-1" />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
    </div>
    {/* Optional right-side icon skeleton */}
    <div className="h-4 w-4 rounded bg-gray-200 ml-2" />
  </div>
);

export default TodoItemSkeleton; 