import React from 'react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import { Shield, Users, Flag, Settings, Crown } from 'lucide-react';

export function AdminNavigation() {
  const { 
    isAdmin, 
    canAccessFlagReview, 
    canAccessUserManagement, 
    canAccessRoleManagement,
    userRole 
  } = usePermissions();

  // Don't render if user is not admin
  if (!isAdmin) {
    return null;
  }

  const adminLinks = [
    {
      href: '/vendors/admin-curation',
      label: 'Flag Review',
      icon: Flag,
      show: canAccessFlagReview,
      description: 'Review flagged vendors and content'
    },
    {
      href: '/admin/users',
      label: 'User Management',
      icon: Users,
      show: canAccessUserManagement,
      description: 'Manage user accounts and roles'
    },
    {
      href: '/admin/roles',
      label: 'Role Management',
      icon: Crown,
      show: canAccessRoleManagement,
      description: 'Manage user roles and permissions'
    },
    {
      href: '/admin/settings',
      label: 'System Settings',
      icon: Settings,
      show: true, // Always show for admins
      description: 'Configure system settings'
    }
  ];

  const visibleLinks = adminLinks.filter(link => link.show);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-blue-900">
          Admin Panel - {userRole.charAt(0).toUpperCase() + userRole.slice(1).replace('_', ' ')}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {visibleLinks.map((link) => {
          const IconComponent = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white p-3 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                <span className="font-medium text-blue-900 group-hover:text-blue-700">
                  {link.label}
                </span>
              </div>
              <p className="text-xs text-blue-700 group-hover:text-blue-800">
                {link.description}
              </p>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-blue-600">
        You have administrative access to manage this platform.
      </div>
    </div>
  );
}

// Simple admin badge for showing admin status
export function AdminBadge() {
  const { isAdmin, userRole } = usePermissions();
  
  if (!isAdmin) return null;
  
  const roleColors = {
    moderator: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    admin: 'bg-blue-100 text-blue-800 border-blue-200',
    super_admin: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  
  const colorClass = roleColors[userRole] || roleColors.moderator;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      <Shield className="w-3 h-3" />
      {userRole.charAt(0).toUpperCase() + userRole.slice(1).replace('_', ' ')}
    </div>
  );
}
