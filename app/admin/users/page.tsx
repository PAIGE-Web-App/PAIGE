'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Shield, 
  Crown, 
  UserCheck, 
  UserX, 
  Search, 
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { getUserWithRole, updateUserRole } from '@/utils/userRoleMigration';
import { ROLE_CONFIGS } from '@/utils/roleConfig';
import { UserRole, UserType } from '@/types/user';

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  userName?: string;
  role: UserRole;
  userType: UserType;
  onboarded: boolean;
  createdAt: Date;
  lastActive: Date;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const { user, userRole: currentUserRole } = useAuth();
  const { canAccessUserManagement, userRole } = usePermissions();
  const router = useRouter();
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [sortBy, setSortBy] = useState<'email' | 'role' | 'createdAt' | 'lastActive'>('email');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Check if user has access to this page
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Wait for role to load before checking access
    if (userRole && userRole !== 'couple' && !canAccessUserManagement) {
      showErrorToast('Access denied. You need admin privileges to view this page.');
      router.push('/');
      return;
    }
  }, [user, userRole, canAccessUserManagement, router, showErrorToast]);

  // Fetch all users from the admin API
  useEffect(() => {
    if (!canAccessUserManagement || !user) return;
    
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Convert date strings back to Date objects
          const usersWithDates = data.users.map((user: any) => ({
            ...user,
            createdAt: new Date(user.createdAt),
            lastActive: new Date(user.lastActive)
          }));
          setUsers(usersWithDates);
        } else {
          const errorData = await response.json();
          showErrorToast(`Failed to fetch users: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        showErrorToast('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [canAccessUserManagement, user?.uid]); // Only depend on user.uid, not the entire user object

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === 'createdAt' || sortBy === 'lastActive') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleRoleUpdate = async (newRole: UserRole) => {
    if (!selectedUser) return;
    
    setUpdatingRole(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          targetUserId: selectedUser.uid,
          newRole: newRole
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setUsers(prev => prev.map(u => 
          u.uid === selectedUser.uid ? { ...u, role: newRole } : u
        ));
        
        showSuccessToast(data.message || `Updated ${selectedUser.email} to ${newRole} role`);
        setShowRoleModal(false);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        showErrorToast(`Failed to update role: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      showErrorToast('Failed to update user role');
    } finally {
      setUpdatingRole(false);
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
      case 'couple': return <UserCheck className="w-4 h-4" />;
      case 'planner': return <Crown className="w-4 h-4" />;
      case 'moderator': return <Shield className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'super_admin': return <Crown className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
    }
  };

  // Show loading while role is being determined
  if (!userRole || userRole === 'couple') {
    return (
      <div className="app-content-container mx-auto p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading role information...</p>
        </div>
      </div>
    );
  }

  if (!canAccessUserManagement) {
    return (
      <div className="app-content-container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="app-content-container mx-auto py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(currentUserRole)}`}>
                {getRoleIcon(currentUserRole)}
                {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1).replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  {Object.keys(ROLE_CONFIGS).map(role => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as any);
                    setSortOrder(order as any);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="email-asc">Email (A-Z)</option>
                  <option value="email-desc">Email (Z-A)</option>
                  <option value="role-asc">Role (A-Z)</option>
                  <option value="role-desc">Role (Z-A)</option>
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="lastActive-desc">Recently Active</option>
                  <option value="lastActive-asc">Least Active</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedUsers.map((user) => (
                      <tr key={user.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName || user.userName || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
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
                              onClick={() => {
                                setSelectedUser(user);
                                setShowRoleModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Change Role"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && filteredAndSortedUsers.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No users found matching your criteria.</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {users.filter(u => u.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Admin Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {users.filter(u => ['moderator', 'admin', 'super_admin'].includes(u.role)).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Crown className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Planners</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {users.filter(u => u.role === 'planner').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Update Modal */}
      <AnimatePresence>
        {showRoleModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
            onClick={() => setShowRoleModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Change User Role
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Changing role for: <strong>{selectedUser.email}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Current role: <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(selectedUser.role)}`}>
                    {getRoleIcon(selectedUser.role)}
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1).replace('_', ' ')}
                  </span>
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {Object.keys(ROLE_CONFIGS).map(role => (
                  <label key={role} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      defaultChecked={role === selectedUser.role}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role as UserRole)}
                      <span className="font-medium">
                        {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 ml-auto">
                      {ROLE_CONFIGS[role as UserRole].description}
                    </p>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const selectedRoleElement = document.querySelector('input[name="role"]:checked') as HTMLInputElement;
                    if (selectedRoleElement?.value) {
                      handleRoleUpdate(selectedRoleElement.value as UserRole);
                    }
                  }}
                  disabled={updatingRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updatingRole ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
