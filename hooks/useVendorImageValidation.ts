import { useState, useEffect, useCallback } from 'react';
import { validateVendorImage, validateVendorImages, getImageCacheStats } from '@/utils/vendorImageCache';

interface UseVendorImageValidationOptions {
  autoValidate?: boolean;
  batchSize?: number;
  onValidationComplete?: (results: Map<string, any>) => void;
}

/**
 * Lightweight hook for vendor image validation
 * Prevents image discrepancies without heavy API calls
 */
export function useVendorImageValidation(options: UseVendorImageValidationOptions = {}) {
  const { autoValidate = true, batchSize = 5, onValidationComplete } = options;
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, any>>(new Map());
  const [cacheStats, setCacheStats] = useState(getImageCacheStats());

  // Validate a single vendor
  const validateSingleVendor = useCallback(async (vendor: any) => {
    try {
      const result = await validateVendorImage(vendor);
      setValidationResults(prev => new Map(prev).set(vendor.placeId || vendor.id, result));
      return result;
    } catch (error) {
      console.error('Error validating vendor image:', error);
      return { isValid: false, needsRefresh: false };
    }
  }, []);

  // Validate multiple vendors efficiently
  const validateVendors = useCallback(async (vendors: any[]) => {
    if (vendors.length === 0) return new Map();

    setIsValidating(true);
    try {
      const results = await validateVendorImages(vendors);
      setValidationResults(results);
      
      if (onValidationComplete) {
        onValidationComplete(results);
      }
      
      // Update cache stats
      setCacheStats(getImageCacheStats());
      
      return results;
    } catch (error) {
      console.error('Error validating vendor images:', error);
      return new Map();
    } finally {
      setIsValidating(false);
    }
  }, [onValidationComplete]);

  // Auto-validate vendors when they change
  useEffect(() => {
    if (!autoValidate) return;
    
    // This will be called by components that pass vendors
    // Components can call validateVendors directly when needed
  }, [autoValidate, validateVendors]);

  return {
    validateSingleVendor,
    validateVendors,
    isValidating,
    validationResults,
    cacheStats,
    refreshCacheStats: () => setCacheStats(getImageCacheStats())
  };
}

/**
 * Hook for validating vendors in My Vendors and My Favorites sections
 * Only validates when vendors are loaded or when explicitly requested
 */
export function useVendorSectionImageValidation() {
  const [vendorsToValidate, setVendorsToValidate] = useState<any[]>([]);
  const [hasValidated, setHasValidated] = useState(false);

  const { validateVendors, isValidating, validationResults } = useVendorImageValidation({
    autoValidate: false,
    onValidationComplete: (results) => {
      setHasValidated(true);
      
      // Update vendors with new images if needed
      const vendorsWithUpdates = vendorsToValidate.map(vendor => {
        const placeId = vendor.placeId || vendor.id;
        const result = results.get(placeId);
        
        if (result?.needsRefresh && result?.newUrl) {
          return {
            ...vendor,
            image: result.newUrl,
            images: [result.newUrl, ...(vendor.images || []).filter(img => img !== result.newUrl)]
          };
        }
        
        return vendor;
      });
      
      // Trigger re-render with updated vendors
      if (vendorsWithUpdates.some(v => v.image !== vendorsToValidate.find(orig => orig.id === v.id)?.image)) {
        // This would typically update the parent component's state
        // The parent component should handle this via a callback
      }
    }
  });

  const queueVendorsForValidation = useCallback((vendors: any[]) => {
    setVendorsToValidate(vendors);
    setHasValidated(false);
  }, []);

  const runValidation = useCallback(async () => {
    if (vendorsToValidate.length > 0 && !hasValidated) {
      await validateVendors(vendorsToValidate);
    }
  }, [vendorsToValidate, hasValidated, validateVendors]);

  return {
    queueVendorsForValidation,
    runValidation,
    isValidating,
    validationResults,
    hasValidated
  };
} 