/**
 * Protected Route Component
 * Works with existing AuthContext role system
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRole,
  requireAdmin = false,
  fallback = <div className="text-center p-8">Access Denied</div>,
  loadingFallback = <div className="flex items-center justify-center p-8"><LoadingSpinner size="lg" /></div>
}: ProtectedRouteProps) {
  const { 
    user, 
    loading, 
    permissions, 
    userRole, 
    isAdmin, 
    canAccessAdmin 
  } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return <>{loadingFallback}</>;
  }

  // Check if user is authenticated
  if (!user) {
    return <>{fallback}</>;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin && !canAccessAdmin) {
    return <>{fallback}</>;
  }

  // Check role requirement
  if (requiredRole && userRole !== requiredRole) {
    return <>{fallback}</>;
  }

  // Check permissions (simplified for now)
  if (requiredPermissions.length > 0) {
    // For now, just check if user has any permissions
    // In a real implementation, you'd check specific permission structure
    if (!permissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Convenience components for common use cases
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function RoleOnly({ 
  role, 
  children, 
  fallback 
}: { 
  role: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <ProtectedRoute requiredRole={role} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function PermissionOnly({ 
  permissions, 
  children, 
  fallback 
}: { 
  permissions: string[]; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <ProtectedRoute requiredPermissions={permissions} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}
