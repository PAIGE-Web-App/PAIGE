import React from 'react';
import { Users, UserCheck, Shield, Crown, Star } from 'lucide-react';
import { UserRole } from '@/types/user';

interface AdminStatsCardsProps {
  stats: {
    total: number;
    active: number;
    admin: number;
    planners: number;
    couples: number;
    moderators: number;
    admins: number;
    superAdmins: number;
  };
  roleFilter: UserRole | 'all';
  onFilterChange: (role: UserRole | 'all') => void;
  loading: boolean;
}

// Skeleton component for stats cards
const StatsCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
    <div className="flex items-center">
      <div className="p-2 bg-gray-200 rounded-lg w-10 h-10"></div>
      <div className="ml-4 flex-1">
        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-12"></div>
      </div>
    </div>
  </div>
);

export default function AdminStatsCards({ 
  stats, 
  roleFilter, 
  onFilterChange, 
  loading 
}: AdminStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatsCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <button
        onClick={() => onFilterChange('all')}
        className={`bg-white rounded-lg shadow-sm border p-4 transition-all duration-200 hover:shadow-md ${
          roleFilter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Users</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </button>
      
      <button
        onClick={() => onFilterChange('couple')}
        className={`bg-white rounded-lg shadow-sm border p-4 transition-all duration-200 hover:shadow-md ${
          roleFilter === 'couple' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Couples</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.couples || 0}</p>
          </div>
        </div>
      </button>
      
      <button
        onClick={() => onFilterChange('admin')}
        className={`bg-white rounded-lg shadow-sm border p-4 transition-all duration-200 hover:shadow-md ${
          roleFilter === 'admin' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Admin Users</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.admin}</p>
          </div>
        </div>
      </button>
      
      <button
        onClick={() => onFilterChange('planner')}
        className={`bg-white rounded-lg shadow-sm border p-4 transition-all duration-200 hover:shadow-md ${
          roleFilter === 'planner' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Crown className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Planners</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.planners}</p>
          </div>
        </div>
      </button>
    </div>
  );
}
