import React, { useState, useRef } from 'react';
import { Star, Crown, RefreshCw, ChevronDown } from 'lucide-react';
import { UserRole } from '@/types/user';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

interface AdminHeaderProps {
  title: string;
  description: string;
  currentUserRole: UserRole;
  loading: boolean;
  onRefreshUsers?: () => void;
  onSyncCredits?: () => void;
  syncingCredits?: boolean;
  user?: any; // Firebase User object
}

// Skeleton component for header
const HeaderSkeleton = () => (
  <div className="flex items-center justify-between mb-8 animate-pulse">
    <div>
      <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-96"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-32"></div>
  </div>
);

export default function AdminHeader({ 
  title, 
  description, 
  currentUserRole, 
  loading,
  onRefreshUsers,
  onSyncCredits,
  syncingCredits = false,
  user
}: AdminHeaderProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [syncing, setSyncing] = useState(false);
  const [fixingDates, setFixingDates] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return <HeaderSkeleton />;
  }

  const getRoleColor = (role: UserRole) => {
    const colors = {
      couple: 'bg-gray-50 text-gray-700 border-gray-200',
      planner: 'bg-green-50 text-green-700 border-green-200',
      moderator: 'bg-purple-50 text-purple-700 border-purple-200',
      admin: 'bg-blue-50 text-blue-700 border-blue-200',
      super_admin: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    };
    return colors[role] || colors.couple;
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'couple': return <div className="w-4 h-4 bg-blue-500 rounded-full"></div>;
      case 'planner': return <div className="w-4 h-4 bg-green-500 rounded-full"></div>;
      case 'moderator': return <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>;
      case 'admin': return <div className="w-4 h-4 bg-purple-500 rounded-full"></div>;
      case 'super_admin': return <Crown className="w-4 h-4 text-yellow-600" />;
      default: return <div className="w-4 h-4 bg-blue-500 rounded-full"></div>;
    }
  };

  const handleSyncRelationships = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      if (!authUser) {
        throw new Error('No authenticated user');
      }
      
      console.log('🔍 Starting sync process for user:', authUser.email);
      
      const token = await authUser.getIdToken();
      if (!token) {
        throw new Error('No authentication token');
      }
      
      console.log('🔑 Got auth token, calling API...');

      console.log('📡 Making API call to fix relationships...');
      
      const response = await fetch('/api/admin/users/fix-relationships', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API response status:', response.status);
      
      const data = await response.json();
      console.log('📡 API response data:', data);
      
      if (response.ok) {
        showSuccessToast(data.message);
        // Refresh users after successful sync
        if (onRefreshUsers) {
          onRefreshUsers();
        }
      } else {
        throw new Error(data.error || 'Failed to sync relationships');
      }
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to sync relationships');
    } finally {
      setSyncing(false);
    }
  };

  const handleFixCreatedAt = async () => {
    if (fixingDates) return;
    
    setFixingDates(true);
    try {
      if (!authUser) {
        throw new Error('No authenticated user');
      }
      
      const token = await authUser.getIdToken();
      if (!token) {
        throw new Error('No authentication token');
      }
      
      const response = await fetch('/api/admin/users/fix-created-at', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(data.message);
        // Refresh users after successful fix
        if (onRefreshUsers) {
          onRefreshUsers();
        }
      } else {
        throw new Error(data.error || 'Failed to fix created dates');
      }
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to fix created dates');
    } finally {
      setFixingDates(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="h5 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Super Admin Only Actions Dropdown */}
        {currentUserRole === 'super_admin' && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="btn-primaryinverse flex items-center gap-2 px-4 py-2 text-sm"
            >
              Actions
              <ChevronDown className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showActionsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 min-w-[280px]"
                >
                  <button
                    onClick={() => {
                      handleSyncRelationships();
                      setShowActionsDropdown(false);
                    }}
                    disabled={syncing}
                    className="w-full flex flex-col items-start gap-1 px-4 py-3 text-sm text-[#332B42] hover:bg-[#F3F2F0] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      <span className="font-medium">{syncing ? 'Syncing...' : 'Sync Data to Fix Issues'}</span>
                    </div>
                    <span className="text-xs text-gray-500 ml-6">
                      Fix partner relationships, planner assignments, and wedding dates
                    </span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleFixCreatedAt();
                      setShowActionsDropdown(false);
                    }}
                    disabled={fixingDates}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <RefreshCw className={`w-4 h-4 ${fixingDates ? 'animate-spin' : ''}`} />
                    {fixingDates ? 'Fixing...' : 'Fix Created Dates'}
                  </button>
                  
                  <button
                    onClick={() => {
                      onSyncCredits?.();
                      setShowActionsDropdown(false);
                    }}
                    disabled={syncingCredits}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingCredits ? 'animate-spin' : ''}`} />
                    {syncingCredits ? 'Syncing Credits...' : 'Sync Daily Credits'}
                  </button>
                  
                  <button
                    onClick={() => {
                      window.open('/api/scheduled-tasks/credit-refresh-monitor', '_blank');
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] whitespace-nowrap"
                  >
                    <RefreshCw className="w-4 h-4" />
                    View Credit Refresh Monitor
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(currentUserRole)}`}>
          {getRoleIcon(currentUserRole)}
          {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1).replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
