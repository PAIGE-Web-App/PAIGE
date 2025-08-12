'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminNavigation, AdminBadge } from '@/components/AdminNavigation';
import { getUserWithRole } from '@/utils/userRoleMigration';

export default function TestRolesPage() {
  const { user, userRole, userType, permissions, subscription, isAdmin } = useAuth();
  const permissionsHook = usePermissions();

  const handleMigrateUser = async () => {
    if (!user) return;
    
    try {
      await getUserWithRole(user.uid);
      alert('User migration completed! Refresh the page to see changes.');
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed. Check console for details.');
    }
  };

  if (!user) {
    return (
      <div className="app-content-container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Role System Test</h1>
        <p>Please log in to test the role system.</p>
      </div>
    );
  }

  return (
    <div className="app-content-container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Role System Test Page</h1>
      
      {/* Admin Navigation */}
      <AdminNavigation />
      
      {/* User Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">User Information</h2>
          <AdminBadge />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Role:</strong> {userRole}</p>
            <p><strong>User Type:</strong> {userType}</p>
            <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
          </div>
          
          <div>
            <p><strong>Subscription:</strong> {subscription?.tier || 'None'}</p>
            <p><strong>Status:</strong> {subscription?.status || 'None'}</p>
            <p><strong>Permissions:</strong> {permissions ? 'Loaded' : 'None'}</p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleMigrateUser}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Migrate User to Role System
          </button>
          
          <button
            onClick={() => {
              if (user) {
                // Force refresh the role data
                window.location.reload();
              }
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            🔄 Force Refresh Role Data
          </button>
        </div>
      </div>
      
      {/* Permissions Hook Test */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Permissions Hook Test</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Vendor Permissions</h3>
            <p>View: {permissionsHook.canViewVendors ? '✅' : '❌'}</p>
            <p>Favorite: {permissionsHook.canFavoriteVendors ? '✅' : '❌'}</p>
            <p>Contact: {permissionsHook.canContactVendors ? '✅' : '❌'}</p>
            <p>Flag: {permissionsHook.canFlagVendors ? '✅' : '❌'}</p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Admin Permissions</h3>
            <p>View Flags: {permissionsHook.canViewFlags ? '✅' : '❌'}</p>
            <p>Review Flags: {permissionsHook.canReviewFlags ? '✅' : '❌'}</p>
            <p>Manage Users: {permissionsHook.canManageUsersPermission ? '✅' : '❌'}</p>
            <p>System Config: {permissionsHook.canConfigureSystem ? '✅' : '❌'}</p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Access Control</h3>
            <p>Admin Panel: {permissionsHook.canAccessAdminPanel ? '✅' : '❌'}</p>
            <p>Flag Review: {permissionsHook.canAccessFlagReview ? '✅' : '❌'}</p>
            <p>User Management: {permissionsHook.canAccessUserManagement ? '✅' : '❌'}</p>
            <p>Role Management: {permissionsHook.canAccessRoleManagement ? '✅' : '❌'}</p>
          </div>
        </div>
      </div>
      
      {/* Raw Data */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Raw Data</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify({
            userRole,
            userType,
            permissions,
            subscription,
            isAdmin
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
