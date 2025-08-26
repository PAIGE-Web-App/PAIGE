import { mapGoogleTypesToCategory, getCategorySlug, getCategoryLabel, getCategoryFromSlug } from './vendorUtils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface BreadcrumbConfig {
  category?: string;
  location?: string;
  vendorName?: string;
  vendorTypes?: string[];
  vendorAddress?: string;
  userWeddingLocation?: string;
}

// Cache for breadcrumb calculations
const breadcrumbCache = new Map<string, BreadcrumbItem[]>();
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Generate cache key for breadcrumb
const getBreadcrumbCacheKey = (config: BreadcrumbConfig): string => {
  return `${config.category || ''}-${config.location || ''}-${config.vendorName || ''}-${config.userWeddingLocation || ''}`;
};

// Extract location from address or use fallback
export const extractLocationFromAddress = (
  address?: string, 
  userWeddingLocation?: string
): string => {
  // Always prioritize user's wedding location over vendor address
  if (userWeddingLocation) return userWeddingLocation;
  
  if (!address) return 'Dallas, TX';
  
  // Try to extract city and state from address
  const addressParts = address.split(',').map(part => part.trim());
  if (addressParts.length >= 2) {
    const city = addressParts[addressParts.length - 2];
    const state = addressParts[addressParts.length - 1].split(' ')[0]; // Get state before ZIP
    return `${city}, ${state}`;
  }
  
  return 'Dallas, TX';
};

// Generate vendor detail page breadcrumbs
export const generateVendorDetailBreadcrumbs = (config?: BreadcrumbConfig): BreadcrumbItem[] => {
  // Simple, generic breadcrumb that always works
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Vendor Hub', href: '/vendors' },
    { label: 'Search Vendors', href: '/vendors/catalog' }
  ];
  
  return breadcrumbs;
};

// Generate catalog page breadcrumbs
export const generateCatalogBreadcrumbs = (config: BreadcrumbConfig): BreadcrumbItem[] => {
  const { category, location } = config;
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Vendor Hub', href: '/vendors' }
  ];
  
  if (category && location) {
    // Convert category slug to display category if needed
    const displayCategory = getCategoryFromSlug(category);
    const categoryLabel = getCategoryLabel(displayCategory);
    breadcrumbs.push({
      label: `${categoryLabel} in ${location}`,
      isCurrent: true
    });
  } else if (category) {
    // Convert category slug to display category if needed
    const displayCategory = getCategoryFromSlug(category);
    const categoryLabel = getCategoryLabel(displayCategory);
    breadcrumbs.push({
      label: categoryLabel,
      isCurrent: true
    });
  }
  
  return breadcrumbs;
};

// Generate vendor hub breadcrumbs
export const generateVendorHubBreadcrumbs = (): BreadcrumbItem[] => {
  return [
    { label: 'Vendor Hub', isCurrent: true }
  ];
};

// Generate seating charts breadcrumbs
export const generateSeatingChartsBreadcrumbs = (): BreadcrumbItem[] => {
  return [
    { label: 'Seating Charts', isCurrent: true }
  ];
};

// Clear breadcrumb cache
export const clearBreadcrumbCache = (): void => {
  breadcrumbCache.clear();
};

// Preload breadcrumb data for better performance
export const preloadBreadcrumbData = (config: BreadcrumbConfig): void => {
  const cacheKey = getBreadcrumbCacheKey(config);
  if (!breadcrumbCache.has(cacheKey)) {
    generateVendorDetailBreadcrumbs(config);
  }
}; 