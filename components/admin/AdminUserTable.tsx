import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useCustomToast } from '@/hooks/useCustomToast';
import UserTableRow from './UserTableRow';
import AdminTableHeader from './AdminTableHeader';

interface AdminUserTableProps {
  users: any[];
  loading: boolean;
  loadingMore: boolean;
  onEditUser: (user: any) => void;
  onDeleteUser: (user: any) => void;
  onRefreshUsers: () => void;
}

export default function AdminUserTable({ 
  users, 
  loading, 
  loadingMore, 
  onEditUser, 
  onDeleteUser,
  onRefreshUsers
}: AdminUserTableProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [editingBonusCredits, setEditingBonusCredits] = useState<{ userId: string; value: string } | null>(null);
  const [updatingCredits, setUpdatingCredits] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Sorting and filtering state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });
  const [filterConfig, setFilterConfig] = useState<{ [key: string]: string }>({});
  
  // Infinite scroll state
  const [displayedUsers, setDisplayedUsers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const USERS_PER_PAGE = 20;



  const toggleRowExpansion = (userId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Sorting and filtering functions
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      const newConfig: { key: string; direction: 'asc' | 'desc' } = {
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      };
      return newConfig;
    });
  }, []);

  const handleFilter = useCallback((key: string, value: string) => {
    setFilterConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterConfig({});
  }, []);

  // Handle bonus credit editing start
  const handleBonusCreditEditStart = (user: any) => {
    const bonusCredits = user.credits?.bonusCredits || 0;
    setEditingBonusCredits({ userId: user.uid, value: bonusCredits.toString() });
  };

  // Handle bonus credit editing save
  const handleBonusCreditEditSave = async (user: any, value: string) => {
    const newBonusCredits = parseInt(value);
    if (isNaN(newBonusCredits) || newBonusCredits < 0) {
      showErrorToast('Please enter a valid number of bonus credits');
      return;
    }

    const currentBonusCredits = user.credits?.bonusCredits || 0;
    const difference = newBonusCredits - currentBonusCredits;

    if (difference === 0) {
      setEditingBonusCredits(null);
      return;
    }

    setUpdatingCredits(prev => new Set(prev).add(user.uid));

    try {
      const response = await fetch(`/api/admin/users/${user.uid}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await (window as any).firebase?.auth()?.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          action: 'set',
          amount: newBonusCredits
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bonus credits');
      }

      // Update the parent component's state
      const userIndex = users.findIndex(u => u.uid === user.uid);
      if (userIndex !== -1) {
        users[userIndex] = {
          ...users[userIndex],
          credits: {
            ...users[userIndex].credits,
            bonusCredits: newBonusCredits,
            updatedAt: new Date()
          }
        };
        
        // Force a re-render by calling the refresh function
        if (onRefreshUsers) {
          onRefreshUsers();
        }
      }

      showSuccessToast(`Bonus credits updated to ${newBonusCredits}`);
      setEditingBonusCredits(null);
    } catch (error: any) {
      console.error('Failed to update bonus credits:', error);
      showErrorToast(`Failed to update bonus credits: ${error.message}`);
    } finally {
      setUpdatingCredits(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.uid);
        return newSet;
      });
    }
  };

  // Handle bonus credit editing cancel
  const handleBonusCreditEditCancel = () => {
    setEditingBonusCredits(null);
  };

  // Handle credit repair
  const handleRepairCredits = async (user: any) => {
    if (!confirm(`Repair corrupted credits for ${user.email}? This will reset them to default values.`)) {
      return;
    }

    setUpdatingCredits(prev => new Set(prev).add(user.uid));
    
    try {
      const response = await fetch(`/api/admin/users/${user.uid}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await (window as any).firebase?.auth()?.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          action: 'repair'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to repair credits');
      }

      showSuccessToast(`Credits repaired for ${user.email}`);
      
      // Refresh the user list to show the repaired credits
      onRefreshUsers();
    } catch (error: any) {
      console.error('Failed to repair credits:', error);
      showErrorToast(`Failed to repair credits: ${error.message}`);
    } finally {
      setUpdatingCredits(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.uid);
        return newSet;
      });
    }
  };

  // Handle reset daily credits
  const handleResetDailyCredits = async (user: any) => {
    if (!confirm(`Reset daily credits for ${user.email} to tier default?`)) {
      return;
    }

    setUpdatingCredits(prev => new Set(prev).add(user.uid));
    
    try {
      const response = await fetch(`/api/admin/users/${user.uid}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await (window as any).firebase?.auth()?.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          action: 'reset_daily',
          reason: 'Admin reset of daily credits to tier default'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset daily credits');
      }

      showSuccessToast(`Daily credits reset to tier default for ${user.email}`);
      
      // Refresh the user list to show the updated credits
      onRefreshUsers();
    } catch (error: any) {
      console.error('Failed to reset daily credits:', error);
      showErrorToast(`Failed to reset daily credits: ${error.message}`);
    } finally {
      setUpdatingCredits(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.uid);
        return newSet;
      });
    }
  };



  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filteredUsers = users || [];
    
    // Ensure we have users to work with
    if (!filteredUsers.length) {
      return [];
    }

    // Apply filters
    if (filterConfig.userInfo) {
      const searchTerm = filterConfig.userInfo.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        (user.displayName || '').toLowerCase().includes(searchTerm) ||
        (user.email || '').toLowerCase().includes(searchTerm)
      );
    }

    if (filterConfig.role) {
      filteredUsers = filteredUsers.filter(user => user.role === filterConfig.role);
    }

    if (filterConfig.status) {
      if (filterConfig.status === 'active') {
        filteredUsers = filteredUsers.filter(user => user.isActive !== false);
      } else if (filterConfig.status === 'inactive') {
        filteredUsers = filteredUsers.filter(user => user.isActive === false);
      }
    }

    if (filterConfig.dailyCreditsMin || filterConfig.dailyCreditsMax) {
      filteredUsers = filteredUsers.filter(user => {
        const dailyCredits = user.credits?.dailyCredits || 0;
        if (filterConfig.dailyCreditsMin && dailyCredits < parseInt(filterConfig.dailyCreditsMin)) return false;
        if (filterConfig.dailyCreditsMax && dailyCredits > parseInt(filterConfig.dailyCreditsMax)) return false;
        return true;
      });
    }

    if (filterConfig.bonusCreditsMin || filterConfig.bonusCreditsMax) {
      filteredUsers = filteredUsers.filter(user => {
        const bonusCredits = user.credits?.bonusCredits || 0;
        if (filterConfig.bonusCreditsMin && bonusCredits < parseInt(filterConfig.bonusCreditsMin)) return false;
        if (filterConfig.bonusCreditsMax && bonusCredits > parseInt(filterConfig.bonusCreditsMax)) return false;
        return true;
      });
    }

    if (filterConfig.createdAtStart || filterConfig.createdAtEnd) {
      filteredUsers = filteredUsers.filter(user => {
        const createdAt = new Date(user.createdAt);
        if (filterConfig.createdAtStart && createdAt < new Date(filterConfig.createdAtStart)) return false;
        if (filterConfig.createdAtEnd && createdAt > new Date(filterConfig.createdAtEnd)) return false;
        return true;
      });
    }

    // Sort users
    filteredUsers.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle nested properties
      if (sortConfig.key === 'displayName') {
        // Ensure we get strings, not objects
        aValue = String(a.displayName || a.email || '');
        bValue = String(b.displayName || b.email || '');
        // Use localeCompare for proper string sorting
        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else if (sortConfig.key === 'dailyCredits') {
        aValue = a.credits?.dailyCredits || 0;
        bValue = b.credits?.dailyCredits || 0;
      } else if (sortConfig.key === 'bonusCredits') {
        aValue = a.credits?.bonusCredits || 0;
        bValue = b.credits?.bonusCredits || 0;
      } else if (sortConfig.key === 'isActive') {
        aValue = a.isActive !== false ? 1 : 0;
        bValue = b.isActive !== false ? 1 : 0;
      } else if (sortConfig.key === 'createdAt') {
        // Handle Firestore Timestamps and various date formats
        const getDateValue = (date: any) => {
          if (!date) return 0;
          if (date._seconds) {
            return date._seconds * 1000; // Firestore Timestamp
          }
          if (date.toDate) {
            return date.toDate().getTime(); // Firestore Timestamp with toDate method
          }
          const d = new Date(date);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        aValue = getDateValue(a.createdAt);
        bValue = getDateValue(b.createdAt);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredUsers;
  }, [users, filterConfig, sortConfig]);

  // Update displayed users when filters/sorting change
  useEffect(() => {
    const newDisplayedUsers = filteredAndSortedUsers.slice(0, USERS_PER_PAGE);
    setDisplayedUsers(newDisplayedUsers);
    setCurrentPage(1);
    setHasMore(filteredAndSortedUsers.length > USERS_PER_PAGE);
  }, [filteredAndSortedUsers, USERS_PER_PAGE, sortConfig.key, sortConfig.direction]);

  // Load more users function
  const loadMoreUsers = useCallback(() => {
    if (!hasMore || loading) return;
    
    const nextPage = currentPage + 1;
    const startIndex = (nextPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    
    const newUsers = filteredAndSortedUsers.slice(startIndex, endIndex);
    setDisplayedUsers(prev => [...prev, ...newUsers]);
    setCurrentPage(nextPage);
    setHasMore(endIndex < filteredAndSortedUsers.length);
  }, [hasMore, loading, currentPage, filteredAndSortedUsers]);

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreUsers();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMoreUsers, hasMore, loading]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[#E0DBD7] overflow-hidden">
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="bg-[#F8F6F4] border-b border-[#E0DBD7] p-3">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-[#AB9C95]">
              <div className="col-span-3">User</div>
              <div className="col-span-1">Role</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Daily Credits</div>
              <div className="col-span-2">Bonus Credits</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          {/* Loading Rows */}
          <div className="divide-y divide-[#E0DBD7]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 p-3 animate-pulse">
                <div className="col-span-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E0DBD7] overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Table Header - Sticky within scrollable container */}
        <AdminTableHeader
          sortConfig={sortConfig}
          filterConfig={filterConfig}
          onSort={handleSort}
          onFilter={handleFilter}
          onClearFilters={handleClearFilters}
        />
        
        {/* Table Body */}
        <div className="divide-y divide-[#E0DBD7]" key={`table-body-${filteredAndSortedUsers.length}-${sortConfig.key}-${sortConfig.direction}`}>
          {displayedUsers.length === 0 ? (
            <div className="p-8 text-center text-[#AB9C95]">
              <p className="text-sm mb-2">No users found matching your filters.</p>
            </div>
          ) : (
            displayedUsers.map((user, index) => (
              <UserTableRow
                key={user.uid}
                user={user}
                index={index}
                editingBonusCredits={editingBonusCredits}
                updatingCredits={updatingCredits}
                expandedRows={expandedRows}
                onToggleRowExpansion={toggleRowExpansion}
                onBonusCreditEditStart={handleBonusCreditEditStart}
                onBonusCreditEditSave={handleBonusCreditEditSave}
                onBonusCreditEditCancel={handleBonusCreditEditCancel}
                onResetDailyCredits={handleResetDailyCredits}
                onEditUser={onEditUser}
                onDeleteUser={onDeleteUser}
                onLinkPartner={(userId) => {
                  // TODO: Implement partner linking
                  console.log('Link partner for user:', userId);
                }}
                onAssignPlanner={(userId) => {
                  // TODO: Implement planner assignment
                  console.log('Assign planner for user:', userId);
                }}
              />
            ))
          )}
        </div>

        {/* Infinite Scroll Observer Target */}
        <div ref={observerTarget} className="h-4" />
        
        {/* Loading More Indicator */}
        {hasMore && (
          <div className="p-4 text-center text-[#AB9C95]">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#AB9C95] border-t-transparent rounded-full animate-spin"></div>
              Loading more users...
            </div>
          </div>
        )}
        
        {/* End of Results */}
        {!hasMore && displayedUsers.length > 0 && (
          <div className="p-4 text-center text-[#AB9C95] border-t border-gray-200">
            <p className="text-sm">All {filteredAndSortedUsers.length} users loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
