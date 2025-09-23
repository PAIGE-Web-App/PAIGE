/**
 * App Settings Edge Config Service
 * Safely manages app settings in Edge Config with fallback
 */

import { getEdgeConfig, putEdgeConfig, isEdgeConfigAvailable } from './edgeConfig';

// Default app settings
const DEFAULT_APP_SETTINGS = {
  // Feature flags
  features: {
    enableVibeGeneration: true,
    enableSeatingCharts: true,
    enableBudgetGeneration: true,
    enableGmailIntegration: true,
    enablePinterestIntegration: true,
    enableGoogleCalendar: true,
    enableRAG: true,
    enableFileAnalysis: true,
  },
  
  // App configuration
  config: {
    maxVendorsPerPage: 20,
    maxSeatingChartGuests: 500,
    maxBudgetAmount: 1000000,
    sessionTimeoutMinutes: 480, // 8 hours
    idleWarningMinutes: 10, // 10 minutes before logout
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  
  // UI settings
  ui: {
    defaultTheme: 'light',
    enableAnimations: true,
    enableSoundEffects: false,
    showTutorials: true,
  },
  
  // API settings
  api: {
    rateLimitPerMinute: 60,
    maxRetries: 3,
    timeoutMs: 30000,
  }
};

/**
 * Get app settings from Edge Config with fallback
 */
export async function getAppSettings() {
  try {
    const settings = await getEdgeConfig('appSettings', DEFAULT_APP_SETTINGS);
    
    // Validate the data structure
    if (settings && typeof settings === 'object') {
      return settings;
    }
    
    console.warn('Invalid app settings from Edge Config, using fallback');
    return DEFAULT_APP_SETTINGS;
  } catch (error) {
    console.error('Error getting app settings from Edge Config:', error);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * Get specific feature flag
 */
export async function getFeatureFlag(feature: string, defaultValue: boolean = false): Promise<boolean> {
  try {
    const settings = await getAppSettings();
    return settings.features[feature as keyof typeof settings.features] ?? defaultValue;
  } catch (error) {
    console.error(`Error getting feature flag ${feature}:`, error);
    return defaultValue;
  }
}

/**
 * Get specific config value
 */
export async function getConfigValue<T = any>(key: string, defaultValue: T): Promise<T> {
  try {
    const settings = await getAppSettings();
    const keys = key.split('.');
    let value: any = settings;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    console.error(`Error getting config value ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Initialize app settings in Edge Config (run once)
 */
export async function initializeAppSettings() {
  if (!isEdgeConfigAvailable()) {
    console.log('Edge Config not available, skipping app settings initialization');
    return false;
  }

  try {
    const success = await putEdgeConfig('appSettings', DEFAULT_APP_SETTINGS);
    if (success) {
      console.log('✅ App settings initialized in Edge Config');
    } else {
      console.log('❌ Failed to initialize app settings in Edge Config');
    }
    return success;
  } catch (error) {
    console.error('Error initializing app settings in Edge Config:', error);
    return false;
  }
}

/**
 * Update app settings in Edge Config
 */
export async function updateAppSettings(newSettings: typeof DEFAULT_APP_SETTINGS) {
  if (!isEdgeConfigAvailable()) {
    console.log('Edge Config not available, skipping app settings update');
    return false;
  }

  try {
    const success = await putEdgeConfig('appSettings', newSettings);
    if (success) {
      console.log('✅ App settings updated in Edge Config');
    } else {
      console.log('❌ Failed to update app settings in Edge Config');
    }
    return success;
  } catch (error) {
    console.error('Error updating app settings in Edge Config:', error);
    return false;
  }
}
