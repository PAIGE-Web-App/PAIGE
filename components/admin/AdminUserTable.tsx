import React, { useState } from 'react';
import { Edit, Eye, Users, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { AdminUser, UserRole } from '@/types/user';
import { ROLE_CONFIGS } from '@/utils/roleConfig';
import LoadingSpinner from '../LoadingSpinner';
import RelationshipRow from './RelationshipRow';
import RelationshipModal from './RelationshipModal';

interface AdminUserTableProps {
  users: AdminUser[];
  loading: boolean;
  loadingMore: boolean;
  onEditUser: (user: AdminUser) => void;
  onViewUser: (user: AdminUser) => void;
}

// Skeleton component for table rows
const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>
    </td>
  </tr>
);

// Empty state component
const EmptyState = () => (
  <tr>
    <td colSpan={6} className="px-6 py-8 text-center">
      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600">No users found matching your criteria.</p>
    </td>
  </tr>
);

export default function AdminUserTable({ 
  users, 
  loading, 
  loadingMore, 
  onEditUser, 
  onViewUser 
}: AdminUserTableProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [relationshipModal, setRelationshipModal] = useState<{
    isOpen: boolean;
    user: AdminUser | null;
    type: 'partner' | 'planner';
  }>({
    isOpen: false,
    user: null,
    type: 'partner'
  });

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const handleLinkPartner = (userId: string) => {
    const user = users.find(u => u.uid === userId);
    if (user) {
      setRelationshipModal({
        isOpen: true,
        user,
        type: 'partner'
      });
    }
  };

  const handleAssignPlanner = (userId: string) => {
    const user = users.find(u => u.uid === userId);
    if (user) {
      setRelationshipModal({
        isOpen: true,
        user,
        type: 'planner'
      });
    }
  };

  const handleRelationshipSave = async (userId: string, targetUserId: string, action: 'link' | 'unlink') => {
    try {
      const relationshipType = relationshipModal.type;
      
      // Get the current user's ID token for authentication
      const currentUser = await fetch('/api/auth/session').then(res => res.json());
      if (!currentUser?.user?.uid) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/admin/users/relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.user.uid}` // This should be the actual ID token
        },
        body: JSON.stringify({
          userId,
          targetUserId,
          action,
          relationshipType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save relationship');
      }

      // TODO: Refresh user data to show updated relationships
      console.log('Relationship saved successfully');
      
    } catch (error) {
      console.error('Failed to save relationship:', error);
      // TODO: Show error toast to user
    }
  };

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
      case 'couple': return <Users className="w-4 h-4" />;
      case 'planner': return <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>;
      case 'moderator': return <div className="w-4 h-4 bg-yellow-600 rounded-full"></div>;
      case 'admin': return <div className="w-4 h-4 bg-purple-600 rounded-full"></div>;
      case 'super_admin': return <Star className="w-4 h-4 text-red-600" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRowSkeleton key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Last Active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <EmptyState />
            ) : (
              users.map((user) => (
                <React.Fragment key={user.uid}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative w-10 h-10 mr-3">
                          {user.profileImageUrl ? (
                            <>
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {(user.displayName || user.userName || user.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <img 
                                src={user.profileImageUrl} 
                                alt={user.displayName || user.userName || 'User'}
                                className="w-10 h-10 rounded-full object-cover absolute inset-0"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback to initials if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </>
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {(user.displayName || user.userName || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || user.userName || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastActive.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleUserExpansion(user.uid)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title={expandedUsers.has(user.uid) ? "Hide Details" : "Show Details"}
                        >
                          {expandedUsers.has(user.uid) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => onEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Change Role"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onViewUser(user)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Relationship Row */}
                  <RelationshipRow
                    user={user}
                    isExpanded={expandedUsers.has(user.uid)}
                    onToggle={() => toggleUserExpansion(user.uid)}
                    onLinkPartner={handleLinkPartner}
                    onAssignPlanner={handleAssignPlanner}
                  />
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
          <LoadingSpinner size="sm" text="Loading more users..." />
        </div>
      )}

      {/* Relationship Modal */}
      <RelationshipModal
        isOpen={relationshipModal.isOpen}
        onClose={() => setRelationshipModal({ isOpen: false, user: null, type: 'partner' })}
        user={relationshipModal.user}
        type={relationshipModal.type}
        onSave={handleRelationshipSave}
      />
    </div>
  );
}
