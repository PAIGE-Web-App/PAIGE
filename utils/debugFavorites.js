// Debug and cleanup favorites utility
// Run this in the browser console to analyze favorites data

const debugFavorites = () => {
  console.log('🔍 Debugging Favorites Data...');
  
  // Get favorite IDs from localStorage
  const favoriteIds = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
  console.log('📋 Favorite IDs:', favoriteIds);
  
  // Get recently viewed vendors
  const recentlyViewed = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
  console.log('👀 Recently viewed vendors:', recentlyViewed.length);
  
  // Check for duplicates in favorite IDs
  const duplicateIds = favoriteIds.filter((id, index) => favoriteIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    console.warn('⚠️ Duplicate favorite IDs found:', duplicateIds);
  } else {
    console.log('✅ No duplicate favorite IDs');
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
  } else {
    console.log('✅ No duplicate placeIds in recently viewed');
  }
  
  return {
    favoriteIds,
    recentlyViewed,
    duplicateIds,
    duplicatePlaceIds
  };
};

const cleanupFavorites = () => {
  console.log('🧹 Cleaning up favorites...');
  
  // Get current favorites
  const favoriteIds = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
  
  // Remove duplicates
  const uniqueIds = [...new Set(favoriteIds)];
  
  if (uniqueIds.length !== favoriteIds.length) {
    console.log(`Removed ${favoriteIds.length - uniqueIds.length} duplicate favorite IDs`);
    localStorage.setItem('vendorFavorites', JSON.stringify(uniqueIds));
  } else {
    console.log('No duplicates found to clean up');
  }
  
  return uniqueIds;
};

// Export functions for use in console
window.debugFavorites = debugFavorites;
window.cleanupFavorites = cleanupFavorites;

console.log('✅ Debug utilities loaded. Use debugFavorites() or cleanupFavorites() in console.'); 