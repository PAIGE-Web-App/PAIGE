import React, { memo } from 'react';
import { Edit2, UserPlus, Trash2, Crown, Shield, Users, ChevronDown, ChevronRight } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import EditableField from '@/components/common/EditableField';
import RelationshipRow from './RelationshipRow';
import { getSubscriptionCredits } from '@/types/credits';

interface UserTableRowProps {
  user: any;
  index: number;
  editingBonusCredits: { userId: string; value: string } | null;
  updatingCredits: Set<string>;
  expandedRows: Set<string>;
  onToggleRowExpansion: (userId: string) => void;
  onBonusCreditEditStart: (user: any) => void;
  onBonusCreditEditSave: (user: any, value: string) => void;
  onBonusCreditEditCancel: () => void;
  onResetDailyCredits: (user: any) => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (user: any) => void;
  onLinkPartner: (userId: string) => void;
  onAssignPlanner: (userId: string) => void;
}

// Helper function to get daily credits for a user type
const getDailyCreditsForUser = (user: any) => {
  const userType = user.role === 'super_admin' ? 'couple' : (user.role || 'couple');
  const subscriptionTier = 'free'; // Assuming free tier for now
  const subscriptionCredits = getSubscriptionCredits(userType, subscriptionTier);
  return subscriptionCredits.monthlyCredits;
};

// Helper functions for role display
const getRoleIcon = (role: string) => {
  switch (role) {
    case 'super_admin':
      return <Crown className="w-3 h-3 text-yellow-600" />;
    case 'admin':
      return <Shield className="w-3 h-3 text-blue-600" />;
    case 'moderator':
      return <Shield className="w-3 h-3 text-purple-600" />;
    case 'planner':
      return <Users className="w-3 h-3 text-green-600" />;
    case 'couple':
    default:
      return <Users className="w-3 h-3 text-gray-600" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'admin':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'moderator':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'planner':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'couple':
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// Format date helper
const formatDate = (date: Date | string | null) => {
  if (date === null || date === undefined) {
    return 'Not set';
  }
  
  try {
    let d: Date;
    
    // Handle Firestore Timestamps
    if (date && typeof date === 'object' && (date as any)._seconds) {
      d = new Date((date as any)._seconds * 1000);
    } else if (date && typeof date === 'object' && (date as any).toDate) {
      d = (date as any).toDate();
    } else {
      d = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    // Reject epoch dates (Unix timestamp 0) - these appear as Dec 31 1969 in some timezones
    if (d.getTime() === 0 || d.getTime() < 86400000) { // Less than 1 day from epoch
      return 'Not set';
    }
    
    // Accept any reasonable date (not too far in the future)
    const now = new Date();
    const maxDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year in future
    if (d > maxDate) {
      return 'Invalid date';
    }
    
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return 'Not set';
  }
};

const UserTableRow = memo(({
  user,
  index,
  editingBonusCredits,
  updatingCredits,
  expandedRows,
  onToggleRowExpansion,
  onBonusCreditEditStart,
  onBonusCreditEditSave,
  onBonusCreditEditCancel,
  onResetDailyCredits,
  onEditUser,
  onDeleteUser,
  onLinkPartner,
  onAssignPlanner
}: UserTableRowProps) => {
  const isExpanded = expandedRows.has(user.uid);
  const isEditingBonusCredits = editingBonusCredits && editingBonusCredits.userId === user.uid;
  const isUpdatingCredits = updatingCredits.has(user.uid);

  return (
    <>
      <div
        className={`flex p-3 hover:bg-[#F8F6F4] transition-colors group min-w-[1200px] w-full gap-6 ${
          index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
        }`}
      >
        {/* User Info */}
        <div className="w-[300px] flex items-center gap-3">
          <button
            onClick={() => onToggleRowExpansion(user.uid)}
            className="p-1 hover:bg-[#EBE3DD] rounded transition-colors"
            title="Toggle relationships"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#AB9C95]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#AB9C95]" />
            )}
          </button>
          <UserAvatar
            userId={user.uid}
            userName={user.displayName || user.email}
            profileImageUrl={user.profileImageUrl}
            size="md"
            showTooltip={true}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[#332B42] truncate">
              {user.displayName || 'No Name'}
            </div>
            <div className="text-xs text-[#AB9C95] truncate">
              {user.email}
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="w-[100px] flex items-center">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getRoleColor(user.role || 'couple')}`}>
            {getRoleIcon(user.role || 'couple')}
            <span className="capitalize">
              {(user.role || 'couple').replace('_', ' ')}
            </span>
          </span>
        </div>

        {/* Status */}
        <div className="w-[100px] flex items-center">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            user.isActive !== false 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {user.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Last Active */}
        <div className="w-[120px] flex items-center">
          <span className="text-sm text-[#AB9C95] whitespace-nowrap">
            {formatDate(user.lastActive)}
          </span>
        </div>

        {/* Daily Credits (Read-only) */}
        <div className="w-[150px] flex items-center gap-2">
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-medium text-[#332B42]">
              {user.credits?.dailyCredits ?? getDailyCreditsForUser(user)}
            </span>
            <span className="text-xs text-[#AB9C95]">
              (tier default)
            </span>
          </div>
          
          {/* Reset Daily Credits Button - only show if credits are corrupted */}
          {user.credits?.dailyCredits && user.credits.dailyCredits > (getDailyCreditsForUser(user) + 50) && (
            <button
              onClick={() => onResetDailyCredits(user)}
              disabled={isUpdatingCredits}
              className="text-xs text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset daily credits to tier default"
            >
              Reset
            </button>
          )}
        </div>

        {/* Bonus Credits (Editable) */}
        <div className="w-[150px] flex items-center gap-2">
          {isEditingBonusCredits ? (
            <EditableField
              value={editingBonusCredits.value}
              isEditing={true}
              onStartEdit={() => onBonusCreditEditStart(user)}
              onSave={(value) => onBonusCreditEditSave(user, value)}
              onCancel={onBonusCreditEditCancel}
              type="number"
              placeholder="0"
              className="text-sm font-medium text-[#332B42]"
              showEditIcon={false}
            />
          ) : (
            <div
              onClick={() => onBonusCreditEditStart(user)}
              className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors text-sm font-medium text-[#332B42]"
              title="Click to edit bonus credits"
            >
              <span className="flex-1">
                {isUpdatingCredits ? (
                  <span className="text-[#AB9C95]">Updating...</span>
                ) : (
                  user.credits?.bonusCredits || 0
                )}
              </span>
              <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Created Date */}
        <div className="w-[120px] flex items-center">
          <span className="text-sm text-[#AB9C95] whitespace-nowrap">
            {formatDate(user.createdAt)}
          </span>
        </div>

        {/* Actions */}
        <div className={`w-[100px] flex items-center justify-center gap-1 sticky right-0 z-20 ${
          index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditUser(user);
            }}
            className="p-2 transition-colors group/edit bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent border-none outline-none shadow-none"
            style={{ backgroundColor: 'transparent' }}
            title="Change User Role"
          >
            <UserPlus className="w-4 h-4 text-[#AB9C95] group-hover/edit:text-[#A85C36] transition-colors" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteUser(user);
            }}
            className="p-2 transition-colors group/delete bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent border-none outline-none shadow-none"
            style={{ backgroundColor: 'transparent' }}
            title="Delete User"
          >
            <Trash2 className="w-4 h-4 text-[#AB9C95] group-hover/delete:text-[#A85C36] transition-colors" />
          </button>
        </div>
      </div>

      {/* Relationship Row */}
      <RelationshipRow
        user={user}
        isExpanded={isExpanded}
        onToggle={() => onToggleRowExpansion(user.uid)}
        onLinkPartner={onLinkPartner}
        onAssignPlanner={onAssignPlanner}
        loading={false}
      />
    </>
  );
});

UserTableRow.displayName = 'UserTableRow';

export default UserTableRow;
