/**
 * Vendor Categories Edge Config Service
 * Safely migrates vendor categories to Edge Config with fallback
 */

import { getEdgeConfig, putEdgeConfig, isEdgeConfigAvailable } from './edgeConfig';
import { VENDOR_CATEGORIES } from '../constants/vendorCategories';
import { 
  Building2, 
  Camera, 
  Flower, 
  Utensils, 
  Music, 
  Cake, 
  Gem, 
  Scissors, 
  Sparkles, 
  Mic
} from 'lucide-react';

// Icon mapping for Edge Config data
const ICON_MAP = {
  'Building2': Building2,
  'Camera': Camera,
  'Flower': Flower,
  'Utensils': Utensils,
  'Music': Music,
  'Cake': Cake,
  'Gem': Gem,
  'Scissors': Scissors,
  'Sparkles': Sparkles,
  'Mic': Mic
};

// Default fallback categories (your existing data)
const FALLBACK_CATEGORIES = VENDOR_CATEGORIES;

/**
 * Get vendor categories from Edge Config with fallback
 */
export async function getVendorCategories() {
  try {
    const categories = await getEdgeConfig('vendorCategories', FALLBACK_CATEGORIES);
    
    // Validate the data structure
    if (Array.isArray(categories) && categories.length > 0) {
      // If categories don't have icons, they're from Edge Config - add icons
      if (categories[0] && !categories[0].icon) {
        return categories.map(category => ({
          ...category,
          icon: ICON_MAP[category.value as keyof typeof ICON_MAP] || Building2
        }));
      }
      return categories;
    }
    
    console.warn('Invalid vendor categories from Edge Config, using fallback');
    return FALLBACK_CATEGORIES;
  } catch (error) {
    console.error('Error getting vendor categories from Edge Config:', error);
    return FALLBACK_CATEGORIES;
  }
}

/**
 * Initialize vendor categories in Edge Config (run once)
 */
export async function initializeVendorCategories() {
  if (!isEdgeConfigAvailable()) {
    console.log('Edge Config not available, skipping vendor categories initialization');
    return false;
  }

  try {
    const success = await putEdgeConfig('vendorCategories', FALLBACK_CATEGORIES);
    if (success) {
      console.log('✅ Vendor categories initialized in Edge Config');
    } else {
      console.log('❌ Failed to initialize vendor categories in Edge Config');
    }
    return success;
  } catch (error) {
    console.error('Error initializing vendor categories in Edge Config:', error);
    return false;
  }
}

/**
 * Update vendor categories in Edge Config
 */
export async function updateVendorCategories(newCategories: typeof FALLBACK_CATEGORIES) {
  if (!isEdgeConfigAvailable()) {
    console.log('Edge Config not available, skipping vendor categories update');
    return false;
  }

  try {
    const success = await putEdgeConfig('vendorCategories', newCategories);
    if (success) {
      console.log('✅ Vendor categories updated in Edge Config');
    } else {
      console.log('❌ Failed to update vendor categories in Edge Config');
    }
    return success;
  } catch (error) {
    console.error('Error updating vendor categories in Edge Config:', error);
    return false;
  }
}
