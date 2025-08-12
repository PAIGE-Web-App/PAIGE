import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ROLE_CONFIGS } from '@/utils/roleConfig';
import { UserRole, UserType } from '@/types/user';

// Default role for existing users (backward compatibility)
const DEFAULT_ROLE: UserRole = 'couple';
const DEFAULT_USER_TYPE: UserType = 'couple';

// Default subscription for existing users
const DEFAULT_SUBSCRIPTION = {
  tier: 'free' as const,
  status: 'active' as const,
  startDate: new Date(),
  features: ['basic_vendor_access', 'favorites', 'contact'],
  metadata: {}
};

// Migrate existing user to include role system
export async function migrateUserToRoleSystem(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`User ${userId} doesn't exist, creating new user with role system`);
      await createNewUserWithRoleSystem(userId);
      return;
    }
    
    const userData = userSnap.data();
    
    // Check if user already has role system
    if (userData.role && userData.userType && userData.permissions) {
      console.log(`User ${userId} already has role system, skipping migration`);
      return;
    }
    
    console.log(`Migrating user ${userId} to role system`);
    
    // Get role config for default role
    const roleConfig = ROLE_CONFIGS[DEFAULT_ROLE];
    
    // Prepare migration data
    const migrationData = {
      role: DEFAULT_ROLE,
      userType: DEFAULT_USER_TYPE,
      subscription: DEFAULT_SUBSCRIPTION,
      permissions: roleConfig.permissions,
      isActive: true,
      lastActive: new Date(),
      emailVerified: userData.emailVerified || false,
      metadata: {
        weddingDate: userData.weddingDate || null,
        location: userData.location || null,
        businessName: null,
        businessType: null,
        phone: null,
        website: null
      }
    };
    
    // Update user document with role system
    await updateDoc(userRef, migrationData);
    
    console.log(`Successfully migrated user ${userId} to role system`);
    
  } catch (error) {
    console.error(`Failed to migrate user ${userId}:`, error);
    throw error;
  }
}

// Create new user with role system
export async function createNewUserWithRoleSystem(userId: string, userData: any = {}): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const roleConfig = ROLE_CONFIGS[DEFAULT_ROLE];
    
    const newUserData = {
      email: userData.email,
      onboarded: userData.onboarded || false,
      createdAt: userData.createdAt || new Date(),
      
      // Role system fields
      role: DEFAULT_ROLE,
      userType: DEFAULT_USER_TYPE,
      subscription: DEFAULT_SUBSCRIPTION,
      permissions: roleConfig.permissions,
      isActive: true,
      lastActive: new Date(),
      emailVerified: userData.emailVerified || false,
      
      // Metadata
      metadata: {
        weddingDate: userData.weddingDate || null,
        location: userData.location || null,
        businessName: null,
        businessType: null,
        phone: null,
        website: null
      },
      
      // Preserve existing fields
      ...userData
    };
    
    await setDoc(userRef, newUserData);
    console.log(`Created new user ${userId} with role system`);
    
  } catch (error) {
    console.error(`Failed to create user ${userId}:`, error);
    throw error;
  }
}

// Update user role (admin function)
export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const roleConfig = ROLE_CONFIGS[newRole];
    
    if (!roleConfig) {
      throw new Error(`Invalid role: ${newRole}`);
    }
    
    const updateData = {
      role: newRole,
      permissions: roleConfig.permissions,
      updatedAt: new Date()
    };
    
    await updateDoc(userRef, updateData);
    console.log(`Updated user ${userId} role to ${newRole}`);
    
  } catch (error) {
    console.error(`Failed to update user ${userId} role:`, error);
    throw error;
  }
}

// Get user with role information
export async function getUserWithRole(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    const userData = userSnap.data();
    
    // If user doesn't have role system, migrate them
    if (!userData.role || !userData.permissions) {
      await migrateUserToRoleSystem(userId);
      // Fetch again after migration
      const updatedSnap = await getDoc(userRef);
      return updatedSnap.exists() ? updatedSnap.data() : null;
    }
    
    return userData;
    
  } catch (error) {
    console.error(`Failed to get user ${userId} with role:`, error);
    return null;
  }
}

// Batch migrate multiple users (for admin use)
export async function batchMigrateUsers(userIds: string[]): Promise<{ success: string[], failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];
  
  for (const userId of userIds) {
    try {
      await migrateUserToRoleSystem(userId);
      success.push(userId);
    } catch (error) {
      console.error(`Failed to migrate user ${userId}:`, error);
      failed.push(userId);
    }
  }
  
  return { success, failed };
}

// Check if user needs migration
export function needsRoleMigration(userData: any): boolean {
  return !userData.role || !userData.userType || !userData.permissions;
}
