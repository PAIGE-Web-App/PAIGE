/**
 * Safe Edge Config Hook
 * Provides React hook for Edge Config with fallbacks
 */

import { useState, useEffect, useCallback } from 'react';
import { getVendorCategories } from '@/lib/vendorCategoriesEdge';
import { getAppSettings, getFeatureFlag, getConfigValue } from '@/lib/appSettingsEdge';
import { isEdgeConfigAvailable } from '@/lib/edgeConfig';

export function useEdgeConfig() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = () => {
      try {
        const available = isEdgeConfigAvailable();
        setIsAvailable(available);
        setError(null);
      } catch (err) {
        console.error('Error checking Edge Config availability:', err);
        setError('Edge Config not available');
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, []);

  // Get vendor categories with fallback
  const getCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const categories = await getVendorCategories();
      return categories;
    } catch (err) {
      console.error('Error getting vendor categories:', err);
      setError('Failed to load vendor categories');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get app settings with fallback
  const getSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const settings = await getAppSettings();
      return settings;
    } catch (err) {
      console.error('Error getting app settings:', err);
      setError('Failed to load app settings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get feature flag with fallback
  const getFeature = useCallback(async (feature: string, defaultValue: boolean = false) => {
    try {
      const value = await getFeatureFlag(feature, defaultValue);
      return value;
    } catch (err) {
      console.error(`Error getting feature flag ${feature}:`, err);
      return defaultValue;
    }
  }, []);

  // Get config value with fallback
  const getConfig = useCallback(async <T = any>(key: string, defaultValue: T) => {
    try {
      const value = await getConfigValue(key, defaultValue);
      return value;
    } catch (err) {
      console.error(`Error getting config value ${key}:`, err);
      return defaultValue;
    }
  }, []);

  return {
    isAvailable,
    isLoading,
    error,
    getCategories,
    getSettings,
    getFeature,
    getConfig,
  };
}
