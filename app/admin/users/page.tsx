'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { ROLE_CONFIGS } from '@/utils/roleConfig';
import { UserRole, UserType } from '@/types/user';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import AdminFilters from '@/components/admin/AdminFilters';
import AdminUserTable from '@/components/admin/AdminUserTable';
import AdminPagination from '@/components/admin/AdminPagination';

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
  
  // Pagination and performance
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admin: 0,
    planners: 0,
    couples: 0,
    moderators: 0,
    admins: 0,
    superAdmins: 0
  });

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

  // Fetch users with pagination
  const fetchUsers = async (page: number = 1, append: boolean = false) => {
    if (page === 1) setLoading(true);
    if (page > 1) setLoadingMore(true);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        role: roleFilter,
        search: searchTerm
      });
      
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
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
        
        if (append) {
          setUsers(prev => [...prev, ...usersWithDates]);
        } else {
          setUsers(usersWithDates);
        }
        
        setTotalUsers(data.total);
        setHasMore(data.hasMore);
        setTotalPages(data.totalPages);
        setCurrentPage(page);
      } else {
        const errorData = await response.json();
        showErrorToast(`Failed to fetch users: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showErrorToast('Failed to fetch users');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch user statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!canAccessUserManagement || !user) return;
    
    fetchUsers(1);
    fetchStats();
  }, [canAccessUserManagement, user?.uid]);

  // Refetch when filters change
  useEffect(() => {
    if (!canAccessUserManagement || !user) return;
    
    setCurrentPage(1);
    fetchUsers(1);
  }, [roleFilter, searchTerm]); // Only depend on user.uid, not the entire user object

  // Sort users for display (search and role filtering now handled by API)
  const sortedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'lastActive':
          aValue = a.lastActive.getTime();
          bValue = b.lastActive.getTime();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sorted;
  }, [users, sortBy, sortOrder]);

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

  // Helper functions for the modal
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
      case 'super_admin': return <div className="w-4 h-4 bg-red-500 rounded-full"></div>;
      default: return <div className="w-4 h-4 bg-blue-500 rounded-full"></div>;
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
        <div className="max-w-7xl mx-auto min-w-[1200px]">
          {/* Header */}
          <AdminHeader
            title="User Management"
            description="Manage user accounts, roles, and permissions"
            currentUserRole={currentUserRole}
            loading={loading}
          />

          {/* Stats Cards */}
          <AdminStatsCards
            stats={stats}
            roleFilter={roleFilter}
            onFilterChange={setRoleFilter}
            loading={loading}
          />

          {/* Filters and Search */}
          <AdminFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(field, order) => {
              setSortBy(field);
              setSortOrder(order);
            }}
            loading={loading}
          />

          {/* Users Table */}
          <AdminUserTable
            users={sortedUsers}
            loading={loading}
            loadingMore={loadingMore}
            onEditUser={(user) => {
              setSelectedUser(user);
              setShowRoleModal(true);
            }}
            onViewUser={(user) => {
              // TODO: Implement view user functionality
              console.log('View user:', user);
            }}
          />
          
          {/* Pagination */}
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalUsers={totalUsers}
            hasMore={hasMore}
            onPageChange={fetchUsers}
            onLoadMore={() => fetchUsers(currentPage + 1, true)}
            loadingMore={loadingMore}
            loading={loading}
          />



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
