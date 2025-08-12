import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, canAccessAdmin, canManageUsers, canManageRoles } from '@/utils/roleConfig';
import { UserRole } from '@/types/user';

export function usePermissions() {
  const { user, userRole } = useAuth();
  
  // Use the role from AuthContext (which gets it from Firestore)
  const currentUserRole: UserRole = useMemo(() => {
    if (!user) return 'couple';
    return userRole || 'couple';
  }, [user, userRole]);
  
  // Permission checking functions
  const checkPermission = (permission: string): boolean => {
    return hasPermission(currentUserRole, permission);
  };
  
  // Vendor permissions
  const canViewVendors = checkPermission('vendors:view');
  const canFavoriteVendors = checkPermission('vendors:favorite');
  const canContactVendors = checkPermission('vendors:contact');
  const canFlagVendors = checkPermission('vendors:flag');
  const canCompareVendors = checkPermission('vendors:compare');
  const canAdvancedSearch = checkPermission('vendors:advanced_search');
  
  // Admin permissions
  const canViewFlags = checkPermission('admin:view_flags');
  const canReviewFlags = checkPermission('admin:review_flags');
  const canManageUsersPermission = checkPermission('admin:manage_users');
  const canModerateContent = checkPermission('admin:content_moderation');
  const canConfigureSystem = checkPermission('admin:system_config');
  const canManageRolesPermission = checkPermission('admin:role_management');
  
  // Planner permissions
  const canManageClients = checkPermission('planner:client_management');
  const canAccessPartnerships = checkPermission('planner:vendor_partnerships');
  const canUseBusinessTools = checkPermission('planner:business_tools');
  const canViewAnalytics = checkPermission('planner:analytics');
  
  // Subscription features
  const hasPrioritySupport = checkPermission('subscription:priority_support');
  const hasCustomIntegrations = checkPermission('subscription:custom_integrations');
  const hasWhiteLabel = checkPermission('subscription:white_label');
  const hasApiAccess = checkPermission('subscription:api_access');
  
  // Role-based access control
  const isAdmin = canAccessAdmin(currentUserRole);
  const isUserManager = canManageUsers(currentUserRole);
  const isRoleManager = canManageRoles(currentUserRole);
  
  // Convenience methods
  const canAccessAdminPanel = isAdmin;
  const canAccessFlagReview = canViewFlags && canReviewFlags;
  const canAccessUserManagement = isUserManager;
  const canAccessRoleManagement = isRoleManager;
  
  return {
    // User role
    userRole: currentUserRole,
    
    // Permission checking
    checkPermission,
    
    // Vendor permissions
    canViewVendors,
    canFavoriteVendors,
    canContactVendors,
    canFlagVendors,
    canCompareVendors,
    canAdvancedSearch,
    
    // Admin permissions
    canViewFlags,
    canReviewFlags,
    canManageUsersPermission,
    canModerateContent,
    canConfigureSystem,
    canManageRolesPermission,
    
    // Planner permissions
    canManageClients,
    canAccessPartnerships,
    canUseBusinessTools,
    canViewAnalytics,
    
    // Subscription features
    hasPrioritySupport,
    hasCustomIntegrations,
    hasWhiteLabel,
    hasApiAccess,
    
    // Role-based access
    isAdmin,
    isUserManager,
    isRoleManager,
    
    // Convenience methods
    canAccessAdminPanel,
    canAccessFlagReview,
    canAccessUserManagement,
    canAccessRoleManagement,
  };
}

// Higher-order component for protecting routes/components
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionProtectedComponent(props: P) {
    const { checkPermission } = usePermissions();
    
    if (!checkPermission(requiredPermission)) {
      return FallbackComponent ? React.createElement(FallbackComponent) : React.createElement('div', null, 'Access Denied');
    }
    
    return React.createElement(Component, props);
  };
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  const permissions = usePermissions();
  
  return {
    // Render admin elements only if user has admin access
    renderIfAdmin: (element: React.ReactNode) => 
      permissions.isAdmin ? element : null,
    
    // Render elements based on specific permissions
    renderIf: (permission: string, element: React.ReactNode) => 
      permissions.checkPermission(permission) ? element : null,
    
    // Render different content based on permissions
    renderWithFallback: <T,>(
      permission: string, 
      adminContent: T, 
      fallbackContent: T
    ): T => 
      permissions.checkPermission(permission) ? adminContent : fallbackContent,
  };
}
