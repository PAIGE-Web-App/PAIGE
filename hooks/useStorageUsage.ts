import { useMemo } from 'react';
import { useFiles } from './useFiles';
import { useAuth } from './useAuth';

// Storage limits by plan
export const STORAGE_LIMITS = {
  FREE: {
    storageGB: 1, // 1GB
    maxFiles: 50,
    maxFolders: 5,
    maxFileSizeMB: 25,
    planName: 'Starter'
  },
  PREMIUM: {
    storageGB: 10, // 10GB  
    maxFiles: 500,
    maxFolders: 25,
    maxFileSizeMB: 100,
    planName: 'Premium'
  },
  ENTERPRISE: {
    storageGB: 100, // 100GB
    maxFiles: 5000,
    maxFolders: 100,
    maxFileSizeMB: 500,
    planName: 'Enterprise'
  }
} as const;

// Temporary function to get user plan (you'll implement this based on your subscription system)
const getUserPlan = (user: any): 'FREE' | 'PREMIUM' | 'ENTERPRISE' => {
  // For now, default to FREE plan
  // TODO: Implement based on your subscription/user plan system
  return 'FREE';
};

export function useStorageUsage() {
  const { files } = useFiles();
  const { user } = useAuth();
  
  const storageStats = useMemo(() => {
    const totalBytes = files.reduce((sum, file) => sum + file.fileSize, 0);
    const totalFiles = files.length;
    
    // Get user's plan (you'll need to implement this)
    const userPlan = getUserPlan(user);
    const planLimits = STORAGE_LIMITS[userPlan];
    
    const totalStorageBytes = planLimits.storageGB * 1024 * 1024 * 1024; // Convert GB to bytes
    const progressPercentage = Math.min((totalBytes / totalStorageBytes) * 100, 100);
    
    return {
      usedStorage: totalBytes,
      totalStorage: totalStorageBytes,
      usedFiles: totalFiles,
      maxFiles: planLimits.maxFiles,
      plan: userPlan,
      planName: planLimits.planName,
      storageAmount: `${planLimits.storageGB}GB`,
      limits: planLimits,
      progressPercentage,
      isNearLimit: progressPercentage > 80,
      isOverLimit: progressPercentage > 100,
      remainingStorage: Math.max(0, totalStorageBytes - totalBytes),
      remainingFiles: Math.max(0, planLimits.maxFiles - totalFiles)
    };
  }, [files, user]);
  
  return storageStats;
} 