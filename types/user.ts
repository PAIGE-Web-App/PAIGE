// User Role System Types
export type UserRole = 
  | 'couple'           // Getting married
  | 'planner'          // Wedding planner
  | 'moderator'        // Basic admin
  | 'admin'            // Full admin
  | 'super_admin';     // System admin

export type SubscriptionTier = 
  | 'free'             // Basic features
  | 'premium'          // Enhanced features
  | 'enterprise';      // Full features

export type UserType = 
  | 'couple'           // Individual couple
  | 'planner';         // Business/planner

export interface UserPermissions {
  // Vendor permissions
  vendors: {
    view: boolean;
    favorite: boolean;
    contact: boolean;
    flag: boolean;
    compare: boolean;
    advanced_search: boolean;
  };
  
  // Admin permissions
  admin: {
    view_flags: boolean;
    review_flags: boolean;
    manage_users: boolean;
    content_moderation: boolean;
    system_config: boolean;
    role_management: boolean;
  };
  
  // Planner permissions
  planner: {
    client_management: boolean;
    vendor_partnerships: boolean;
    business_tools: boolean;
    analytics: boolean;
  };
  
  // Subscription features
  subscription: {
    priority_support: boolean;
    custom_integrations: boolean;
    white_label: boolean;
    api_access: boolean;
  };
}

export interface UserRoleConfig {
  id: string;
  name: string;
  description: string;
  userType: UserType;
  permissions: UserPermissions;
  maxUsers?: number; // For planner accounts
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscription {
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  features: string[];
  metadata?: Record<string, any>;
}

// Extended user interface that integrates with your existing structure
export interface ExtendedUser {
  uid: string;
  email: string;
  displayName?: string;
  userName?: string;
  profileImageUrl?: string;
  profileImageLQIP?: string;
  onboarded: boolean;
  createdAt: Date;
  
  // New role system fields
  role: UserRole;
  userType: UserType;
  subscription: UserSubscription;
  permissions: UserPermissions;
  
  // Metadata
  metadata: {
    weddingDate?: string;
    location?: string;
    businessName?: string;
    businessType?: string;
    phone?: string;
    website?: string;
  };
  
  // Status
  isActive: boolean;
  lastActive: Date;
  emailVerified: boolean;
}

// Admin-specific user interface for the admin panel
export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  userName?: string;
  role: UserRole;
  userType: UserType;
  onboarded: boolean;
  createdAt: Date;
  lastActive: Date;
  isActive: boolean;
  profileImageUrl?: string;
  metadata?: Record<string, any>;
}
