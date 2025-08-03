// Test script to run favorites fix and check current state
const testFavoritesFix = async () => {
  console.log('🧪 Testing Favorites Fix...');
  
  try {
    // First, let's check the current state
    console.log('📊 Current State Check:');
    
    // Check localStorage
    const localFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    console.log('📋 LocalStorage favorites:', localFavorites.length, localFavorites);
    
    // Check recently viewed vendors
    const recentlyViewed = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
    console.log('👀 Recently viewed vendors:', recentlyViewed.length);
    
    // Check for vendors with "Favorited by X user" tags
    const favoritedVendors = recentlyViewed.filter(vendor => 
      localFavorites.includes(vendor.id) || localFavorites.includes(vendor.placeId)
    );
    console.log('❤️ Vendors that should be in favorites:', favoritedVendors.length);
    favoritedVendors.forEach(vendor => {
      console.log(`  - ${vendor.name} (${vendor.id || vendor.placeId})`);
    });
    
    // Check for duplicates
    const duplicateIds = localFavorites.filter((id, index) => localFavorites.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.warn('⚠️ Duplicate IDs found:', duplicateIds);
    }
    
    // Check for vendors with same placeId but different IDs
    const placeIdMap = new Map();
    recentlyViewed.forEach(vendor => {
      if (vendor.placeId) {
        if (!placeIdMap.has(vendor.placeId)) {
          placeIdMap.set(vendor.placeId, []);
        }
        placeIdMap.get(vendor.placeId).push(vendor);
      }
    });
    
    const duplicatePlaceIds = Array.from(placeIdMap.entries())
      .filter(([placeId, vendors]) => vendors.length > 1);
    
    if (duplicatePlaceIds.length > 0) {
      console.warn('⚠️ Vendors with duplicate placeIds:', duplicatePlaceIds);
    }
    
    console.log('\n🔧 Running Fix Script...');
    
    // Load and run the fix script
    const scriptResponse = await fetch('/fix-favorites.js');
    const scriptContent = await scriptResponse.text();
    
    // Execute the script
    eval(scriptContent);
    
    // Run the fix
    const result = await window.fixFavoritesSync();
    
    console.log('\n📈 Fix Results:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error running test:', error);
    return { error: error.message };
  }
};

// Run the test
testFavoritesFix(); 