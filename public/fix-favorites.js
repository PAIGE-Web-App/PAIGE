// Favorites Fix Script - Load and run this to fix sync issues
// Copy and paste this entire script into your browser console

(function() {
  console.log('🔧 Loading Favorites Fix Script...');
  
  const fixFavoritesSync = async () => {
    console.log('🔧 Starting Favorites Sync Fix...');
    
    try {
      // Check if user is logged in
      const auth = window.firebase?.auth?.();
      if (!auth) {
        console.error('❌ Firebase auth not available. Please make sure you\'re on the app page.');
        return;
      }
      
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ No user logged in. Please log in first.');
        return;
      }
      
      console.log('👤 User:', user.uid);
      
      // Get localStorage favorites
      const localFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      console.log('📋 LocalStorage favorites:', localFavorites.length, localFavorites);
      
      // Get Firestore favorites
      const firestoreResponse = await fetch(`/api/user-favorites?userId=${user.uid}`);
      const firestoreData = await firestoreResponse.json();
      const firestoreFavorites = firestoreData.favorites?.map(fav => fav.placeId || fav.id) || [];
      console.log('🔥 Firestore favorites:', firestoreFavorites.length, firestoreFavorites);
      
      // Get recently viewed vendors
      const recentlyViewed = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
      console.log('👀 Recently viewed vendors:', recentlyViewed.length);
      
      // Identify issues
      const issues = [];
      
      // Check for duplicate IDs in localStorage
      const duplicateLocalIds = localFavorites.filter((id, index) => localFavorites.indexOf(id) !== index);
      if (duplicateLocalIds.length > 0) {
        issues.push(`Duplicate IDs in localStorage: ${duplicateLocalIds.join(', ')}`);
      }
      
      // Check for sync discrepancies
      const localSet = new Set(localFavorites);
      const firestoreSet = new Set(firestoreFavorites);
      const onlyInLocal = localFavorites.filter(id => !firestoreSet.has(id));
      const onlyInFirestore = firestoreFavorites.filter(id => !localSet.has(id));
      
      if (onlyInLocal.length > 0) {
        issues.push(`Favorites only in localStorage: ${onlyInLocal.join(', ')}`);
      }
      
      if (onlyInFirestore.length > 0) {
        issues.push(`Favorites only in Firestore: ${onlyInFirestore.join(', ')}`);
      }
      
      // Report issues
      if (issues.length > 0) {
        console.warn('⚠️ Issues found:');
        issues.forEach(issue => console.warn('  -', issue));
      } else {
        console.log('✅ No issues found!');
      }
      
      // Clean up and sync
      console.log('🧹 Starting cleanup and sync...');
      
      // Remove duplicates from localStorage
      const uniqueLocalFavorites = [...new Set(localFavorites)];
      if (uniqueLocalFavorites.length !== localFavorites.length) {
        console.log(`Removed ${localFavorites.length - uniqueLocalFavorites.length} duplicate IDs from localStorage`);
        localStorage.setItem('vendorFavorites', JSON.stringify(uniqueLocalFavorites));
      }
      
      // Merge favorites (prefer Firestore, then localStorage)
      const mergedFavorites = [...new Set([...firestoreFavorites, ...uniqueLocalFavorites])];
      console.log('🔗 Merged favorites:', mergedFavorites.length, mergedFavorites);
      
      // Sync to Firestore
      console.log('📤 Syncing to Firestore...');
      const syncResponse = await fetch('/api/user-favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          favorites: mergedFavorites
        })
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('✅ Sync successful:', syncData);
      } else {
        console.error('❌ Sync failed:', await syncResponse.text());
        return;
      }
      
      // Update localStorage with final state
      localStorage.setItem('vendorFavorites', JSON.stringify(mergedFavorites));
      
      // Notify components
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites: mergedFavorites }
      }));
      
      // Final verification
      console.log('🔍 Final verification...');
      const finalLocal = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      const finalFirestoreResponse = await fetch(`/api/user-favorites?userId=${user.uid}`);
      const finalFirestoreData = await finalFirestoreResponse.json();
      const finalFirestore = finalFirestoreData.favorites?.map(fav => fav.placeId || fav.id) || [];
      
      console.log('📋 Final localStorage:', finalLocal.length, finalLocal);
      console.log('🔥 Final Firestore:', finalFirestore.length, finalFirestore);
      
      const isSynced = finalLocal.length === finalFirestore.length && 
                      finalLocal.every(id => finalFirestore.includes(id));
      
      if (isSynced) {
        console.log('✅ Favorites are now perfectly synced!');
        console.log('🔄 Please refresh the page to see the updated favorites.');
        
        // Show success message
        if (window.toast) {
          window.toast.success('Favorites synced successfully! Please refresh the page.');
        }
      } else {
        console.warn('⚠️ Sync verification failed. Please try again.');
      }
      
      return {
        issues,
        originalLocal: localFavorites,
        originalFirestore: firestoreFavorites,
        finalLocal,
        finalFirestore,
        isSynced
      };
      
    } catch (error) {
      console.error('❌ Error during favorites sync fix:', error);
      return { error: error.message };
    }
  };
  
  const debugFavoritesData = () => {
    console.log('🔍 Debugging Favorites Data...');
    
    const auth = window.firebase?.auth?.();
    if (!auth) {
      console.error('❌ Firebase auth not available');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    const localFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    const recentlyViewed = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
    
    console.log('👤 User ID:', user.uid);
    console.log('📋 LocalStorage favorites:', localFavorites);
    console.log('👀 Recently viewed vendors:', recentlyViewed.length);
    
    // Check for vendors that are favorited but not in recently viewed
    const missingVendors = localFavorites.filter(favId => 
      !recentlyViewed.some(vendor => vendor.id === favId || vendor.placeId === favId)
    );
    
    if (missingVendors.length > 0) {
      console.warn('⚠️ Favorited vendors not in recently viewed:', missingVendors);
    }
    
    return { localFavorites, recentlyViewed, missingVendors };
  };
  
  const clearAllFavorites = async () => {
    console.log('🗑️ Clearing all favorites...');
    
    const auth = window.firebase?.auth?.();
    if (!auth) {
      console.error('❌ Firebase auth not available');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    // Clear localStorage
    localStorage.removeItem('vendorFavorites');
    
    // Clear Firestore
    const response = await fetch('/api/user-favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        favorites: []
      })
    });
    
    if (response.ok) {
      console.log('✅ All favorites cleared');
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites: [] }
      }));
      
      if (window.toast) {
        window.toast.success('All favorites cleared!');
      }
    } else {
      console.error('❌ Failed to clear favorites');
    }
  };
  
  // Export functions for use in console
  window.fixFavoritesSync = fixFavoritesSync;
  window.debugFavoritesData = debugFavoritesData;
  window.clearAllFavorites = clearAllFavorites;
  
  console.log('✅ Favorites fix utilities loaded!');
  console.log('Available functions:');
  console.log('  - fixFavoritesSync() - Fix sync issues and clean up duplicates');
  console.log('  - debugFavoritesData() - Debug current favorites data');
  console.log('  - clearAllFavorites() - Clear all favorites (use with caution)');
  console.log('');
  console.log('🚀 To fix your favorites, run: fixFavoritesSync()');
})(); 