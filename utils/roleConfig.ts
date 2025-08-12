import { UserRoleConfig, UserRole, UserType, UserPermissions } from '@/types/user';

// Default permissions for each role
const createPermissions = (overrides: Partial<UserPermissions> = {}): UserPermissions => ({
  vendors: {
    view: true,
    favorite: true,
    contact: true,
    flag: true,
    compare: false,
    advanced_search: false,
    ...overrides.vendors
  },
  admin: {
    view_flags: false,
    review_flags: false,
    manage_users: false,
    content_moderation: false,
    system_config: false,
    role_management: false,
    ...overrides.admin
  },
  planner: {
    client_management: false,
    vendor_partnerships: false,
    business_tools: false,
    analytics: false,
    ...overrides.planner
  },
  subscription: {
    priority_support: false,
    custom_integrations: false,
    white_label: false,
    api_access: false,
    ...overrides.subscription
  }
});

// Role configurations
export const ROLE_CONFIGS: Record<UserRole, UserRoleConfig> = {
  couple: {
    id: 'couple',
    name: 'Couple',
    description: 'Getting married - basic vendor access',
    userType: 'couple',
    permissions: createPermissions({
      vendors: {
        view: true,
        favorite: true,
        contact: true,
        flag: true,
        compare: false,
        advanced_search: false
      }
    }),
    features: ['vendor_browsing', 'favorites', 'basic_contact'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  planner: {
    id: 'planner',
    name: 'Wedding Planner',
    description: 'Professional wedding planner with business tools',
    userType: 'planner',
    permissions: createPermissions({
      vendors: {
        view: true,
        favorite: true,
        contact: true,
        flag: true,
        compare: true,
        advanced_search: true
      },
      planner: {
        client_management: true,
        vendor_partnerships: true,
        business_tools: true,
        analytics: true
      }
    }),
    maxUsers: 50, // Can manage up to 50 clients
    features: ['vendor_browsing', 'favorites', 'contact', 'client_management', 'business_tools'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  moderator: {
    id: 'moderator',
    name: 'Moderator',
    description: 'Basic admin - can review flags and moderate content',
    userType: 'couple', // Still a couple, but with admin powers
    permissions: createPermissions({
      vendors: {
        view: true,
        favorite: true,
        contact: true,
        flag: true,
        compare: true,
        advanced_search: true
      },
      admin: {
        view_flags: true,
        review_flags: true,
        manage_users: false,
        content_moderation: true,
        system_config: false,
        role_management: false
      }
    }),
    features: ['vendor_browsing', 'favorites', 'contact', 'flag_review', 'content_moderation'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  admin: {
    id: 'admin',
    name: 'Admin',
    description: 'Full admin - can manage users and system settings',
    userType: 'couple', // Still a couple, but with full admin powers
    permissions: createPermissions({
      vendors: {
        view: true,
        favorite: true,
        contact: true,
        flag: true,
        compare: true,
        advanced_search: true
      },
      admin: {
        view_flags: true,
        review_flags: true,
        manage_users: true,
        content_moderation: true,
        system_config: true,
        role_management: false
      }
    }),
    features: ['vendor_browsing', 'favorites', 'contact', 'flag_review', 'user_management', 'system_config'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'System administrator - full access to everything',
    userType: 'couple', // Still a couple, but with system admin powers
    permissions: createPermissions({
      vendors: {
        view: true,
        favorite: true,
        contact: true,
        flag: true,
        compare: true,
        advanced_search: true
      },
      admin: {
        view_flags: true,
        review_flags: true,
        manage_users: true,
        content_moderation: true,
        system_config: true,
        role_management: true
      }
    }),
    features: ['vendor_browsing', 'favorites', 'contact', 'flag_review', 'user_management', 'system_config', 'role_management'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Subscription tier configurations
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    features: ['basic_vendor_access', 'favorites', 'contact'],
    limits: {
      maxFavorites: 10,
      maxContacts: 5,
      maxVendors: 20
    }
  },
  premium: {
    name: 'Premium',
    features: ['advanced_vendor_access', 'unlimited_favorites', 'unlimited_contacts', 'vendor_comparison', 'priority_support'],
    limits: {
      maxFavorites: -1, // unlimited
      maxContacts: -1,  // unlimited
      maxVendors: -1    // unlimited
    }
  },
  enterprise: {
    name: 'Enterprise',
    features: ['all_premium_features', 'custom_integrations', 'white_label', 'api_access', 'dedicated_support'],
    limits: {
      maxFavorites: -1,
      maxContacts: -1,
      maxVendors: -1
    }
  }
};

// Helper functions
export function getRoleConfig(role: UserRole): UserRoleConfig {
  return ROLE_CONFIGS[role];
}

export function hasPermission(userRole: UserRole, permission: string): boolean {
  const config = getRoleConfig(userRole);
  if (!config) return false;
  
  // Parse permission string like "admin:view_flags"
  const [category, action] = permission.split(':');
  
  if (category === 'vendors') {
    return config.permissions.vendors[action as keyof typeof config.permissions.vendors] || false;
  }
  
  if (category === 'admin') {
    return config.permissions.admin[action as keyof typeof config.permissions.admin] || false;
  }
  
  if (category === 'planner') {
    return config.permissions.planner[action as keyof typeof config.permissions.planner] || false;
  }
  
  if (category === 'subscription') {
    return config.permissions.subscription[action as keyof typeof config.permissions.subscription] || false;
  }
  
  return false;
}

export function canAccessAdmin(userRole: UserRole): boolean {
  return ['moderator', 'admin', 'super_admin'].includes(userRole);
}

export function canManageUsers(userRole: UserRole): boolean {
  return ['admin', 'super_admin'].includes(userRole);
}

export function canManageRoles(userRole: UserRole): boolean {
  return userRole === 'super_admin';
}
