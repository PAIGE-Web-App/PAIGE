import { useMemo } from 'react';
import { useFiles } from './useFiles';
import { useAuth } from './useAuth';

// Storage limits by plan
export const STORAGE_LIMITS = {
  FREE: {
    storageMB: 15, // 15MB
    maxFiles: 25,
    maxFolders: 3,
    maxFileSizeMB: 10,
    planName: 'Starter'
  },
  PREMIUM: {
    storageMB: 100, // 100MB  
    maxFiles: 100,
    maxFolders: 15,
    maxFileSizeMB: 25,
    planName: 'Premium'
  },
  ENTERPRISE: {
    storageMB: 1000, // 1GB
    maxFiles: 500,
    maxFolders: 50,
    maxFileSizeMB: 100,
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
    
    const totalStorageBytes = planLimits.storageMB * 1024 * 1024; // Convert MB to bytes
    const progressPercentage = Math.min((totalBytes / totalStorageBytes) * 100, 100);
    
    return {
      usedStorage: totalBytes,
      totalStorage: totalStorageBytes,
      usedFiles: totalFiles,
      maxFiles: planLimits.maxFiles,
      plan: userPlan,
      planName: planLimits.planName,
      storageAmount: `${planLimits.storageMB}MB`,
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