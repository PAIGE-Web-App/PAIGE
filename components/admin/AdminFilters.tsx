import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { UserRole } from '@/types/user';
import { ROLE_CONFIGS } from '@/utils/roleConfig';

interface AdminFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  roleFilter: UserRole | 'all';
  onRoleFilterChange: (role: UserRole | 'all') => void;
  sortBy: 'email' | 'role' | 'createdAt' | 'lastActive';
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: 'email' | 'role' | 'createdAt' | 'lastActive', order: 'asc' | 'desc') => void;
  loading: boolean;
}

// Skeleton component for filters
const FiltersSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded-lg w-40"></div>
      </div>
    </div>
  </div>
);

export default function AdminFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  loading
}: AdminFiltersProps) {
  if (loading) {
    return <FiltersSkeleton />;
  }

  return (
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as UserRole | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
              onSortChange(field as any, order as any);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
  );
}
