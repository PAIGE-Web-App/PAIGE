import React, { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, X } from 'lucide-react';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

interface AdminTableHeaderProps {
  sortConfig: SortConfig;
  filterConfig: FilterConfig;
  onSort: (key: string) => void;
  onFilter: (key: string, value: string) => void;
  onClearFilters: () => void;
}

const AdminTableHeader: React.FC<AdminTableHeaderProps> = ({
  sortConfig,
  filterConfig,
  onSort,
  onFilter,
  onClearFilters
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleSort = useCallback((key: string) => {
    onSort(key);
  }, [onSort]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    onFilter(key, value);
  }, [onFilter]);

  const toggleFilter = useCallback((key: string) => {
    setActiveFilter(activeFilter === key ? null : key);
  }, [activeFilter]);

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <div className="w-4 h-4 text-[#AB9C95]" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-[#A85C36]" />
    ) : (
      <ChevronDown className="w-4 h-4 text-[#A85C36]" />
    );
  };

  const hasActiveFilters = Object.values(filterConfig).some(value => value.trim() !== '');

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 p-3 bg-[#FAF9F8] font-medium text-sm text-[#332B42]">
        {/* User Info */}
        <div className="col-span-3 flex items-center justify-between">
          <button
            onClick={() => handleSort('displayName')}
            className="flex items-center gap-1 hover:text-[#A85C36] transition-colors"
            title="Sort by user info"
          >
            <span>User Info</span>
            {getSortIcon('displayName')}
          </button>
          <button
            onClick={() => toggleFilter('userInfo')}
            className={`p-1 rounded transition-colors ${
              activeFilter === 'userInfo' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'hover:bg-[#EBE3DD] text-[#AB9C95]'
            }`}
            title="Filter users"
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Role */}
        <div className="col-span-2 flex items-center justify-between">
          <button
            onClick={() => handleSort('role')}
            className="flex items-center gap-1 hover:text-[#A85C36] transition-colors"
            title="Sort by role"
          >
            <span>Role</span>
            {getSortIcon('role')}
          </button>
          <button
            onClick={() => toggleFilter('role')}
            className={`p-1 rounded transition-colors ${
              activeFilter === 'role' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'hover:bg-[#EBE3DD] text-[#AB9C95]'
            }`}
            title="Filter by role"
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Status */}
        <div className="col-span-1 flex items-center justify-between">
          <button
            onClick={() => handleSort('isActive')}
            className="flex items-center gap-1 hover:text-[#A85C36] transition-colors"
            title="Sort by status"
          >
            <span>Status</span>
            {getSortIcon('isActive')}
          </button>
          <button
            onClick={() => toggleFilter('status')}
            className={`p-1 rounded transition-colors ${
              activeFilter === 'status' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'hover:bg-[#EBE3DD] text-[#AB9C95]'
            }`}
            title="Filter by status"
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Daily Credits */}
        <div className="col-span-2 flex items-center justify-between">
          <button
            onClick={() => handleSort('dailyCredits')}
            className="flex items-center gap-1 hover:text-[#A85C36] transition-colors"
            title="Sort by daily credits"
          >
            <span>Daily Credits</span>
            {getSortIcon('dailyCredits')}
          </button>
          <button
            onClick={() => toggleFilter('dailyCredits')}
            className={`p-1 rounded transition-colors ${
              activeFilter === 'dailyCredits' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'hover:bg-[#EBE3DD] text-[#AB9C95]'
            }`}
            title="Filter by daily credits"
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Bonus Credits */}
        <div className="col-span-2 flex items-center justify-between">
          <button
            onClick={() => handleSort('bonusCredits')}
            className="flex items-center gap-1 hover:text-[#A85C36] transition-colors"
            title="Sort by bonus credits"
          >
            <span>Bonus Credits</span>
            {getSortIcon('bonusCredits')}
          </button>
          <button
            onClick={() => toggleFilter('bonusCredits')}
            className={`p-1 rounded transition-colors ${
              activeFilter === 'bonusCredits' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'hover:bg-[#EBE3DD] text-[#AB9C95]'
            }`}
            title="Filter by bonus credits"
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Created Date */}
        <div className="col-span-1 flex items-center justify-between">
          <button
            onClick={() => handleSort('createdAt')}
            className="flex items-center gap-1 hover:text-[#A85C36] transition-colors"
            title="Sort by creation date"
          >
            <span>Created</span>
            {getSortIcon('createdAt')}
          </button>
          <button
            onClick={() => toggleFilter('createdAt')}
            className={`p-1 rounded transition-colors ${
              activeFilter === 'createdAt' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'hover:bg-[#EBE3DD] text-[#AB9C95]'
            }`}
            title="Filter by creation date"
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center justify-center">
          <span>Actions</span>
        </div>
      </div>

      {/* Filter Row */}
      {activeFilter && (
        <div className="bg-[#F8F6F4] border-b border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#332B42]">
              Filter: {activeFilter === 'userInfo' ? 'User Info' : 
                       activeFilter === 'role' ? 'Role' :
                       activeFilter === 'status' ? 'Status' :
                       activeFilter === 'dailyCredits' ? 'Daily Credits' :
                       activeFilter === 'bonusCredits' ? 'Bonus Credits' :
                       activeFilter === 'createdAt' ? 'Created Date' : activeFilter}
            </span>
            <button
              onClick={() => setActiveFilter(null)}
              className="p-1 hover:bg-[#EBE3DD] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#AB9C95]" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {activeFilter === 'userInfo' && (
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#AB9C95]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={filterConfig.userInfo || ''}
                    onChange={(e) => handleFilterChange('userInfo', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}
            
            {activeFilter === 'role' && (
              <div className="flex-1">
                <select
                  value={filterConfig.role || ''}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="planner">Planner</option>
                  <option value="couple">Couple</option>
                </select>
              </div>
            )}
            
            {activeFilter === 'status' && (
              <div className="flex-1">
                <select
                  value={filterConfig.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
            
            {activeFilter === 'dailyCredits' && (
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min credits"
                    value={filterConfig.dailyCreditsMin || ''}
                    onChange={(e) => handleFilterChange('dailyCreditsMin', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max credits"
                    value={filterConfig.dailyCreditsMax || ''}
                    onChange={(e) => handleFilterChange('dailyCreditsMax', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}
            
            {activeFilter === 'bonusCredits' && (
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min credits"
                    value={filterConfig.bonusCreditsMin || ''}
                    onChange={(e) => handleFilterChange('bonusCreditsMin', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max credits"
                    value={filterConfig.bonusCreditsMax || ''}
                    onChange={(e) => handleFilterChange('bonusCreditsMax', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}
            
            {activeFilter === 'createdAt' && (
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filterConfig.createdAtStart || ''}
                    onChange={(e) => handleFilterChange('createdAtStart', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                  />
                  <input
                    type="date"
                    value={filterConfig.createdAtEnd || ''}
                    onChange={(e) => handleFilterChange('createdAtEnd', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A85C36] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="bg-[#F8F6F4] border-b border-gray-200 px-3 py-2">
          <button
            onClick={onClearFilters}
            className="text-xs text-[#A85C36] hover:text-[#8B4513] transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminTableHeader;
