"use client";

import React, { useState } from 'react';
import { ChevronDown, Shield, Users, Flag, Settings, Crown } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';

interface AdminActionsDropdownProps {
  isVisible: boolean;
}

const AdminActionsDropdown: React.FC<AdminActionsDropdownProps> = ({ isVisible }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    isAdmin, 
    canAccessFlagReview, 
    canAccessUserManagement, 
    canAccessRoleManagement,
    userRole 
  } = usePermissions();

  if (!isVisible || !isAdmin) return null;

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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primaryinverse flex items-center gap-2"
      >
        <Shield className="w-4 h-4" />
        Admin Actions
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  <span>{userRole.charAt(0).toUpperCase() + userRole.slice(1).replace('_', ' ')} Access</span>
                </div>
              </div>
              
              {visibleLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <IconComponent className="w-4 h-4 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">{link.label}</div>
                      <div className="text-xs text-gray-500">
                        {link.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminActionsDropdown;
