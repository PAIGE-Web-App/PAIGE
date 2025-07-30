require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const https = require('https');

// Check for required environment variables
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  console.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is not set');
  process.exit(1);
}

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function makeHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function fetchGooglePlaceDetails(placeId) {
  try {
    console.log(`    🔍 Fetching Google Place details for ${placeId}...`);
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,name,rating,user_ratings_total,formatted_address,types&key=${GOOGLE_MAPS_API_KEY}`;
    const data = await makeHttpsRequest(url);
    
    if (data.status === 'OK' && data.result) {
      const result = data.result;
      
      // Get the best image
      let imageUrl = null;
      if (result.photos && result.photos.length > 0) {
        const photoRef = result.photos[0].photo_reference;
        imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;
      }
      
      return {
        image: imageUrl,
        name: result.name,
        rating: result.rating,
        reviewCount: result.user_ratings_total,
        address: result.formatted_address,
        types: result.types
      };
    }
    return null;
  } catch (error) {
    console.error(`    ❌ Error fetching Google Place details for ${placeId}:`, error);
    return null;
  }
}

async function refreshVendorImages() {
  try {
    console.log('🚀 Starting comprehensive vendor image refresh...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} users`);
    
    let totalVendorsProcessed = 0;
    let totalVendorsUpdated = 0;
    let totalLocalStorageEntries = 0;
    let totalLocalStorageUpdated = 0;
    
    // Track all unique placeIds for localStorage cleanup
    const allPlaceIds = new Set();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\n👤 Processing user: ${userId}`);
      
      // Get all vendors for this user
      const vendorsSnapshot = await db.collection(`users/${userId}/vendors`).get();
      console.log(`  📦 Found ${vendorsSnapshot.size} vendors for user ${userId}`);
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        totalVendorsProcessed++;
        
        // Track placeId for localStorage cleanup
        if (vendorData.placeId) {
          allPlaceIds.add(vendorData.placeId);
        }
        
        // Check if vendor needs image update
        const needsImageUpdate = !vendorData.image || 
                                vendorData.image === '/Venue.png' || 
                                vendorData.image === 'Venue.png' ||
                                vendorData.image === '' ||
                                vendorData.image.includes('Venue.png');
        
        if (needsImageUpdate && vendorData.placeId) {
          console.log(`    🔄 Processing vendor: ${vendorData.name} (${vendorData.placeId})`);
          
          // Fetch fresh data from Google Places
          const googleData = await fetchGooglePlaceDetails(vendorData.placeId);
          
          if (googleData && googleData.image) {
            // Update vendor with fresh data
            const updateData = {
              image: googleData.image,
              lastImageUpdate: new Date().toISOString()
            };
            
            // Also update other fields if they're missing or stale
            if (!vendorData.name || vendorData.name !== googleData.name) {
              updateData.name = googleData.name;
            }
            if (!vendorData.rating && googleData.rating) {
              updateData.rating = googleData.rating;
            }
            if (!vendorData.reviewCount && googleData.reviewCount) {
              updateData.reviewCount = googleData.reviewCount;
            }
            if (!vendorData.address && googleData.address) {
              updateData.address = googleData.address;
            }
            if (!vendorData.types && googleData.types) {
              updateData.types = googleData.types;
            }
            
            await vendorDoc.ref.update(updateData);
            totalVendorsUpdated++;
            console.log(`    ✅ Updated vendor ${vendorData.name} with fresh image and data`);
          } else {
            console.log(`    ⚠️  No image found for vendor ${vendorData.name}`);
          }
          
          // Add a small delay to avoid hitting API rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          console.log(`    ⏭️  Skipping vendor ${vendorData.name} (already has image or no placeId)`);
        }
      }
    }
    
    console.log(`\n🔄 Refreshing localStorage data...`);
    
    // Now refresh localStorage data for recently viewed vendors
    // Note: This would need to be run on the client side, but we can provide instructions
    console.log(`📝 To refresh localStorage data, run this in the browser console:`);
    console.log(`\n// Clear and refresh recently viewed vendors`);
    console.log(`localStorage.removeItem('paige_recently_viewed_vendors');`);
    console.log(`localStorage.removeItem('vendorFavorites');`);
    console.log(`\n// Then refresh the page to rebuild from fresh Firestore data`);
    
    console.log(`\n🎉 Refresh completed!`);
    console.log(`📊 Summary:`);
    console.log(`  • Total vendors processed: ${totalVendorsProcessed}`);
    console.log(`  • Total vendors updated: ${totalVendorsUpdated}`);
    console.log(`  • Unique placeIds found: ${allPlaceIds.size}`);
    console.log(`\n💡 Next steps:`);
    console.log(`  1. Clear your browser's localStorage for this site`);
    console.log(`  2. Refresh the page to see updated images`);
    console.log(`  3. Images should now be consistent across all sections`);
    
  } catch (error) {
    console.error('❌ Error during refresh:', error);
  }
}

// Run the refresh
refreshVendorImages()
  .then(() => {
    console.log('\n✅ Refresh script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Refresh script failed:', error);
    process.exit(1);
  }); 