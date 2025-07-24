import React from 'react';

const NotificationsTabSkeleton: React.FC = () => (
  <div className="space-y-6 pb-8 animate-pulse">
    {/* External Notifications Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="h-6 bg-gray-300 rounded w-40 mb-6" />
      <div className="h-4 bg-gray-200 rounded w-full mb-6" />
      
      {/* Contact Information Section */}
      <div className="mb-6">
        <div className="h-4 bg-gray-300 rounded w-32 mb-3" />
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-48" />
            <div className="h-10 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-64" />
          </div>
        </div>
      </div>
      
      {/* Notification Preferences Section */}
      <div className="mb-6">
        <div className="h-4 bg-gray-300 rounded w-48 mb-3" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border rounded-[5px] gap-4">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-32 flex-1" />
              <div className="h-7 bg-gray-200 rounded w-16" />
              <div className="h-7 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Info Box */}
      <div className="p-4 bg-[#F8F6F4] rounded-md">
        <div className="h-4 bg-gray-300 rounded w-48 mb-2" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    </div>

    {/* In-App Notifications Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="h-6 bg-gray-300 rounded w-36 mb-6" />
      <div className="h-4 bg-gray-200 rounded w-full mb-6" />
      
      {/* Notification Legend */}
      <div className="mb-6 p-4 bg-[#F8F6F4] rounded-md">
        <div className="h-4 bg-gray-300 rounded w-32 mb-3" />
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-36" />
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center p-4 border rounded-[5px] gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded-full" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-[#F8F6F4] rounded-md">
        <div className="h-4 bg-gray-300 rounded w-44 mb-2" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default NotificationsTabSkeleton; 