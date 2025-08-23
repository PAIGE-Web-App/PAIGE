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
import { UserRole, UserType, AdminUser } from '@/types/user';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import AdminFilters from '@/components/admin/AdminFilters';
import AdminUserTable from '@/components/admin/AdminUserTable';
import AdminPagination from '@/components/admin/AdminPagination';

import Banner from '@/components/Banner';
import ChangeUserRoleModal from '@/components/admin/ChangeUserRoleModal';

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

  // Corrupted credits state
  const [corruptedUsers, setCorruptedUsers] = useState<AdminUser[]>([]);
  const [bulkRepairing, setBulkRepairing] = useState(false);
  
  // Delete user state
  const [deletingUser, setDeletingUser] = useState(false);

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
        search: searchTerm,
        _t: Date.now().toString() // Cache buster
      });
      
      const response = await fetch(`/api/admin/users?${params}`, {
        cache: 'no-store', // Force fresh data
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Convert date strings back to Date objects and preserve all fields
        const usersWithDates = data.users.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          lastActive: new Date(user.lastActive),
          // Ensure credits field is preserved exactly as returned by API
          credits: user.credits || null
        }));
        
        // Check for corrupted credits data
        const corruptedUsersFound = usersWithDates.filter(u => 
          u.credits && (
            isNaN(u.credits.dailyCredits) || 
            isNaN(u.credits.bonusCredits) || 
            isNaN(u.credits.totalCreditsUsed) ||
            u.credits.dailyCredits === null ||
            u.credits.bonusCredits === null ||
            u.credits.totalCreditsUsed === null
          )
        );
        
        // Store corrupted users in state for banner display
        setCorruptedUsers(corruptedUsersFound);
        
        if (corruptedUsersFound.length > 0) {
          console.error('🚨 CORRUPTED CREDITS DETECTED:', corruptedUsersFound.map(u => ({
            email: u.email,
            dailyCredits: u.credits?.dailyCredits,
            bonusCredits: u.credits?.bonusCredits,
            totalCreditsUsed: u.credits?.totalCreditsUsed
          })));
        }
        
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

  // Bulk repair corrupted credits
  const handleBulkRepairCredits = async () => {
    if (!corruptedUsers.length) return;
    
    setBulkRepairing(true);
    try {
      const results = await Promise.allSettled(
        corruptedUsers.map(async (targetUser) => {
          const response = await fetch(`/api/admin/users/${targetUser.uid}/credits`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user?.getIdToken()}`
            },
            body: JSON.stringify({
              action: 'repair'
            })
          });
          
          if (response.ok) {
            return { success: true, userId: targetUser.uid };
          } else {
            const errorData = await response.json();
            return { success: false, userId: targetUser.uid, error: errorData.error };
          }
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      if (successful > 0) {
        showSuccessToast(`Successfully repaired ${successful} user${successful > 1 ? 's' : ''}`);
        // Refresh the user list to show updated credits
        fetchUsers(currentPage);
      }
      
      if (failed > 0) {
        showErrorToast(`Failed to repair ${failed} user${failed > 1 ? 's' : ''}`);
      }
      
      // Clear corrupted users list
      setCorruptedUsers([]);
      
    } catch (error) {
      console.error('Bulk repair error:', error);
      showErrorToast('Failed to perform bulk repair');
    } finally {
      setBulkRepairing(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userToDelete: AdminUser) => {
    if (!confirm(`Are you sure you want to delete ${userToDelete.email}? This action cannot be undone.`)) {
      return;
    }
    
    setDeletingUser(true);
    
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      showSuccessToast(`User ${userToDelete.email} deleted successfully`);
      
      // Remove user from local state and refresh
      setUsers(prevUsers => prevUsers.filter(u => u.uid !== userToDelete.uid));
      setTotalUsers(prev => prev - 1);
      
      // Refresh the current page if it's empty
      if (users.length === 1 && currentPage > 1) {
        fetchUsers(currentPage - 1);
      }
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showErrorToast(`Failed to delete user: ${error.message}`);
    } finally {
      setDeletingUser(false);
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






  // Show loading while role is being determined
  if (!userRole || userRole === 'couple') {
    return (
      <div className="app-content-container mx-auto p-6">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
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
            onRefreshUsers={() => fetchUsers(1)}
            user={user}
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

          {/* Corrupted Credits Banner */}
          {corruptedUsers.length > 0 && (
            <Banner
              type="error"
              message={
                <div className="flex items-center justify-between w-full">
                  <span>
                    🚨 <strong>{corruptedUsers.length}</strong> user{corruptedUsers.length > 1 ? 's have' : ' has'} corrupted credits that need repair
                  </span>
                  <button
                    onClick={handleBulkRepairCredits}
                    disabled={bulkRepairing}
                    className="btn-primary ml-4"
                  >
                    {bulkRepairing ? 'Repairing...' : `Bulk Repair ${corruptedUsers.length} User${corruptedUsers.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              }
              expandableContent={
                <div className="space-y-2">
                  <div className="text-xs font-medium opacity-75 mb-2">
                    Affected Users:
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {corruptedUsers.map((user, index) => (
                      <div key={user.uid} className="flex items-center justify-between text-xs py-1 px-2 bg-white bg-opacity-20 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{user.email}</span>
                          <span className="text-white opacity-90">({user.role || 'couple'})</span>
                        </div>
                        <div className="text-xs text-white opacity-90">
                          Credits: {user.credits?.currentCredits ?? 'null'}/{user.credits?.totalCreditsUsed ?? 'null'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
          )}

          {/* Users Table */}
          <AdminUserTable
            users={sortedUsers}
            loading={loading}
            loadingMore={loadingMore}
            onEditUser={(user) => {
              setSelectedUser(user);
              setShowRoleModal(true);
            }}
            onDeleteUser={handleDeleteUser}
            onRefreshUsers={() => fetchUsers(1)}
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

      {/* Change User Role Modal */}
      {showRoleModal && selectedUser && (
                  <ChangeUserRoleModal
          user={selectedUser}
          onClose={() => setShowRoleModal(false)}
          onUpdateRole={handleRoleUpdate}
          updatingRole={updatingRole}
        />
      )}
    </div>
  );
}
