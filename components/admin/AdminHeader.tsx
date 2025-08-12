import React from 'react';
import { UserRole } from '@/types/user';

interface AdminHeaderProps {
  title: string;
  description: string;
  currentUserRole: UserRole;
  loading: boolean;
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
  loading 
}: AdminHeaderProps) {
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
      case 'super_admin': return <div className="w-4 h-4 bg-red-500 rounded-full"></div>;
      default: return <div className="w-4 h-4 bg-blue-500 rounded-full"></div>;
    }
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(currentUserRole)}`}>
          {getRoleIcon(currentUserRole)}
          {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1).replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
