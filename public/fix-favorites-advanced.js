// Advanced Favorites Fix Script
// This script specifically fixes the discrepancy between community favorites and personal favorites
// Copy and paste this entire script into your browser console

(function() {
  console.log('🔧 Loading Advanced Favorites Fix Script...');
  
  const fixFavoritesDiscrepancy = async () => {
    console.log('🔧 Starting Advanced Favorites Fix...');
    
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
      
      // Step 1: Get current personal favorites
      const personalResponse = await fetch(`/api/user-favorites?userId=${user.uid}`);
      const personalData = await personalResponse.json();
      const personalFavorites = personalData.favorites?.map(fav => fav.placeId || fav.id) || [];
      console.log('📋 Personal favorites (Firestore):', personalFavorites.length, personalFavorites);
      
      // Step 2: Get localStorage favorites
      const localFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      console.log('📋 LocalStorage favorites:', localFavorites.length, localFavorites);
      
      // Step 3: Get recently viewed vendors
      const recentlyViewed = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
      console.log('👀 Recently viewed vendors:', recentlyViewed.length);
      
      // Step 4: Find vendors that show "Favorited by X user" but aren't in personal favorites
      const vendorsWithCommunityFavorites = recentlyViewed.filter(vendor => {
        // Check if this vendor has community favorites data
        return vendor.communityData && vendor.communityData.totalFavorites > 0;
      });
      
      console.log('❤️ Vendors with community favorites:', vendorsWithCommunityFavorites.length);
      vendorsWithCommunityFavorites.forEach(vendor => {
        console.log(`  - ${vendor.name} (${vendor.id || vendor.placeId}) - Favorited by ${vendor.communityData?.totalFavorites || 0} users`);
      });
      
      // Step 5: Find vendors that should be in personal favorites but aren't
      const missingFromPersonal = vendorsWithCommunityFavorites.filter(vendor => {
        const vendorId = vendor.id || vendor.placeId;
        return !personalFavorites.includes(vendorId);
      });
      
      console.log('❌ Vendors missing from personal favorites:', missingFromPersonal.length);
      missingFromPersonal.forEach(vendor => {
        console.log(`  - ${vendor.name} (${vendor.id || vendor.placeId})`);
      });
      
      // Step 6: Find vendors in personal favorites that shouldn't be there
      const extraInPersonal = personalFavorites.filter(favId => {
        return !recentlyViewed.some(vendor => 
          (vendor.id === favId || vendor.placeId === favId) && 
          vendor.communityData && vendor.communityData.totalFavorites > 0
        );
      });
      
      console.log('⚠️ Vendors in personal favorites but not in community:', extraInPersonal.length);
      extraInPersonal.forEach(favId => {
        console.log(`  - ${favId}`);
      });
      
      // Step 7: Create the correct personal favorites list
      const correctPersonalFavorites = vendorsWithCommunityFavorites.map(vendor => vendor.id || vendor.placeId);
      console.log('✅ Correct personal favorites:', correctPersonalFavorites.length, correctPersonalFavorites);
      
      // Step 8: Sync the correct favorites to Firestore
      console.log('📤 Syncing correct favorites to Firestore...');
      const syncResponse = await fetch('/api/user-favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          favorites: correctPersonalFavorites
        })
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('✅ Sync successful:', syncData);
      } else {
        console.error('❌ Sync failed:', await syncResponse.text());
        return;
      }
      
      // Step 9: Update localStorage
      localStorage.setItem('vendorFavorites', JSON.stringify(correctPersonalFavorites));
      
      // Step 10: Notify components
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites: correctPersonalFavorites }
      }));
      
      // Step 11: Final verification
      console.log('🔍 Final verification...');
      const finalPersonalResponse = await fetch(`/api/user-favorites?userId=${user.uid}`);
      const finalPersonalData = await finalPersonalResponse.json();
      const finalPersonalFavorites = finalPersonalData.favorites?.map(fav => fav.placeId || fav.id) || [];
      
      console.log('📋 Final personal favorites:', finalPersonalFavorites.length, finalPersonalFavorites);
      console.log('📋 Final localStorage:', JSON.parse(localStorage.getItem('vendorFavorites') || '[]'));
      
      const isCorrect = finalPersonalFavorites.length === correctPersonalFavorites.length &&
                       finalPersonalFavorites.every(id => correctPersonalFavorites.includes(id));
      
      if (isCorrect) {
        console.log('✅ Personal favorites now match community favorites!');
        console.log('🔄 Please refresh the page to see the updated favorites count.');
        
        if (window.toast) {
          window.toast.success('Favorites discrepancy fixed! Please refresh the page.');
        }
      } else {
        console.warn('⚠️ Fix verification failed. Please try again.');
      }
      
      return {
        originalPersonal: personalFavorites,
        vendorsWithCommunityFavorites: vendorsWithCommunityFavorites.length,
        missingFromPersonal: missingFromPersonal.length,
        correctPersonalFavorites,
        finalPersonalFavorites,
        isCorrect
      };
      
    } catch (error) {
      console.error('❌ Error during advanced favorites fix:', error);
      return { error: error.message };
    }
  };
  
  const syncCommunityToPersonal = async () => {
    console.log('🔄 Syncing community favorites to personal favorites...');
    
    try {
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
      
      // Get recently viewed vendors
      const recentlyViewed = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
      
      // Find all vendors that have community favorites
      const vendorsWithCommunityFavorites = recentlyViewed.filter(vendor => {
        return vendor.communityData && vendor.communityData.totalFavorites > 0;
      });
      
      console.log(`Found ${vendorsWithCommunityFavorites.length} vendors with community favorites`);
      
      // Add each vendor to personal favorites
      const personalFavorites = vendorsWithCommunityFavorites.map(vendor => vendor.id || vendor.placeId);
      
      // Sync to Firestore
      const response = await fetch('/api/user-favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          favorites: personalFavorites
        })
      });
      
      if (response.ok) {
        console.log('✅ Successfully synced community favorites to personal favorites');
        
        // Update localStorage
        localStorage.setItem('vendorFavorites', JSON.stringify(personalFavorites));
        
        // Notify components
        window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
          detail: { favorites: personalFavorites }
        }));
        
        if (window.toast) {
          window.toast.success('Community favorites synced to personal favorites!');
        }
      } else {
        console.error('❌ Failed to sync favorites');
      }
      
    } catch (error) {
      console.error('❌ Error syncing community to personal:', error);
    }
  };
  
  // Export functions for use in console
  window.fixFavoritesDiscrepancy = fixFavoritesDiscrepancy;
  window.syncCommunityToPersonal = syncCommunityToPersonal;
  
  console.log('✅ Advanced favorites fix utilities loaded!');
  console.log('Available functions:');
  console.log('  - fixFavoritesDiscrepancy() - Fix discrepancy between community and personal favorites');
  console.log('  - syncCommunityToPersonal() - Sync all community favorites to personal favorites');
  console.log('');
  console.log('🚀 To fix the discrepancy, run: fixFavoritesDiscrepancy()');
})(); 