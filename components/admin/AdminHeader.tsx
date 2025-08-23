import React, { useState } from 'react';
import { Star, Crown, RefreshCw } from 'lucide-react';
import { UserRole } from '@/types/user';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/contexts/AuthContext';

interface AdminHeaderProps {
  title: string;
  description: string;
  currentUserRole: UserRole;
  loading: boolean;
  onRefreshUsers?: () => void;
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
  user
}: AdminHeaderProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [syncing, setSyncing] = useState(false);
  const [fixingDates, setFixingDates] = useState(false);
  const { user: authUser } = useAuth();

  if (loading) {
    return <HeaderSkeleton />;
  }

  const getRoleColor = (role: UserRole) => {
    const colors = {
      couple: 'bg-blue-100 text-blue-800 border-blue-200',
      planner: 'bg-green-100 text-green-800 border-green-200',
      moderator: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      super_admin: 'bg-red-100 text-red-800 border-red-200'
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
        <button
          onClick={handleSyncRelationships}
          disabled={syncing}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Data to Fix Issues'}
        </button>
        
        <button
          onClick={handleFixCreatedAt}
          disabled={fixingDates}
          className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${fixingDates ? 'animate-spin' : ''}`} />
          {fixingDates ? 'Fixing...' : 'Fix Created Dates'}
        </button>
        
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(currentUserRole)}`}>
          {getRoleIcon(currentUserRole)}
          {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1).replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
