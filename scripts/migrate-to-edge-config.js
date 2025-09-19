/**
 * Migration Script: Move data to Edge Config
 * This script safely migrates your existing data to Edge Config
 */

const { initializeVendorCategories } = require('../lib/vendorCategoriesEdge.ts');
const { initializeAppSettings } = require('../lib/appSettingsEdge.ts');

async function migrateToEdgeConfig() {
  console.log('🚀 Starting Edge Config migration...');
  
  try {
    // Check if Edge Config is available
    if (!process.env.EDGE_CONFIG) {
      console.log('❌ EDGE_CONFIG environment variable not set');
      console.log('Please set EDGE_CONFIG in your .env.local file');
      return;
    }

    // Initialize vendor categories
    console.log('📋 Migrating vendor categories...');
    const categoriesSuccess = await initializeVendorCategories();
    if (categoriesSuccess) {
      console.log('✅ Vendor categories migrated successfully');
    } else {
      console.log('❌ Failed to migrate vendor categories');
    }

    // Initialize app settings
    console.log('⚙️ Migrating app settings...');
    const settingsSuccess = await initializeAppSettings();
    if (settingsSuccess) {
      console.log('✅ App settings migrated successfully');
    } else {
      console.log('❌ Failed to migrate app settings');
    }

    if (categoriesSuccess && settingsSuccess) {
      console.log('🎉 Migration completed successfully!');
      console.log('Your app will now use Edge Config with fallbacks');
    } else {
      console.log('⚠️ Migration completed with some failures');
      console.log('Your app will continue to work with fallbacks');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('Your app will continue to work with existing systems');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToEdgeConfig();
}

module.exports = { migrateToEdgeConfig };
