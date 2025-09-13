"use client";

import React, { useState } from 'react';
import { ChevronDown, RefreshCw, Users, Database } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface AdminFavoritesDropdownProps {
  isVisible: boolean;
}

const AdminFavoritesDropdown: React.FC<AdminFavoritesDropdownProps> = ({ isVisible }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccessToast, showErrorToast } = useCustomToast();

  if (!isVisible) return null;

  const handleSyncAllFavorites = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sync-favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast(
          `Sync completed! ${data.stats.processedUsers} users processed, ${data.stats.syncedFavorites} favorites synced`
        );
        console.log('Sync results:', data);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing favorites:', error);
      showErrorToast('Failed to sync favorites. Check console for details.');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primaryinverse flex items-center gap-2"
        disabled={isLoading}
      >
        <Database className="w-4 h-4" />
        Admin
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <button
                onClick={handleSyncAllFavorites}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Sync All Favorites</div>
                  <div className="text-xs text-gray-500">
                    Update all users' favorites to new format
                  </div>
                </div>
              </button>
              
              <div className="border-t border-gray-100 my-1" />
              
              <div className="px-3 py-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>Super Admin Only</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminFavoritesDropdown;
