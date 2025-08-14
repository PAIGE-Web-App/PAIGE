import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { MoodBoard } from '../types/inspiration';

// Storage limits by plan (matching your PLAN_LIMITS from types/inspiration.ts)
export const MOOD_BOARD_STORAGE_LIMITS = {
  free: {
    storageMB: 25, // 25MB
    maxBoards: 2,
    maxImagesPerBoard: 10,
    planName: 'Free'
  },
  premium: {
    storageMB: 250, // 250MB
    maxBoards: 5,
    maxImagesPerBoard: 25,
    planName: 'Premium'
  },
  pro: {
    storageMB: 1000, // 1GB
    maxBoards: 999, // Unlimited
    maxImagesPerBoard: 100,
    planName: 'Pro'
  }
} as const;

// Temporary function to get user plan (you'll implement this based on your subscription system)
const getUserPlan = (user: any): 'free' | 'premium' | 'pro' => {
  // For now, default to free plan
  // TODO: Implement based on your subscription/user plan system
  return 'free';
};

export function useMoodBoardStorage(moodBoards: MoodBoard[], userPlan?: 'free' | 'premium' | 'pro') {
  const { user } = useAuth();
  
  const storageStats = useMemo(() => {
    // Calculate total storage used by all mood board images
    let totalBytes = 0;
    let totalImages = 0;
    
    // For now, we'll estimate image sizes since we don't store file sizes
    // In the future, you could store actual file sizes when uploading
    moodBoards.forEach(board => {
      board.images.forEach(() => {
        // Estimate average image size: 2MB per image
        // This is a reasonable estimate for wedding inspiration images
        totalBytes += 2 * 1024 * 1024; // 2MB in bytes
        totalImages += 1;
      });
    });
    
    // Get user's plan - use passed plan or default to free
    const plan = userPlan || getUserPlan(user);
    const planLimits = MOOD_BOARD_STORAGE_LIMITS[plan];
    
    const totalStorageBytes = planLimits.storageMB * 1024 * 1024; // Convert MB to bytes
    const progressPercentage = Math.min((totalBytes / totalStorageBytes) * 100, 100);
    
    return {
      usedStorage: totalBytes,
      totalStorage: totalStorageBytes,
      totalImages: totalImages,
      maxImages: planLimits.maxImagesPerBoard * moodBoards.length, // Total across all boards
      plan: plan,
      planName: planLimits.planName,
      storageAmount: `${planLimits.storageMB}MB`,
      limits: planLimits,
      progressPercentage,
      isNearLimit: progressPercentage > 80,
      isOverLimit: progressPercentage > 100,
      remainingStorage: Math.max(0, totalStorageBytes - totalBytes),
      remainingImages: Math.max(0, (planLimits.maxImagesPerBoard * planLimits.maxBoards) - totalImages)
    };
  }, [moodBoards, user, userPlan]);
  
  return storageStats;
}
