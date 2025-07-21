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
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_MAPS_API_KEY}`;
    const data = await makeHttpsRequest(url);
    
    if (data.status === 'OK' && data.result && data.result.photos && data.result.photos.length > 0) {
      const photoRef = data.result.photos[0].photo_reference;
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Google Place details for ${placeId}:`, error);
    return null;
  }
}

async function backfillVendorImages() {
  try {
    console.log('Starting vendor image backfill...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);
    
    let totalVendorsProcessed = 0;
    let totalVendorsUpdated = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\nProcessing user: ${userId}`);
      
      // Get all vendors for this user
      const vendorsSnapshot = await db.collection(`users/${userId}/vendors`).get();
      console.log(`  Found ${vendorsSnapshot.size} vendors for user ${userId}`);
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        totalVendorsProcessed++;
        
        // Check if vendor needs image update
        const needsImageUpdate = !vendorData.image || 
                                vendorData.image === '/Venue.png' || 
                                vendorData.image === 'Venue.png' ||
                                vendorData.image === '';
        
        if (needsImageUpdate && vendorData.placeId) {
          console.log(`    Processing vendor: ${vendorData.name} (${vendorData.placeId})`);
          
          // Fetch image from Google Places
          const imageUrl = await fetchGooglePlaceDetails(vendorData.placeId);
          
          if (imageUrl) {
            // Update vendor with new image
            await vendorDoc.ref.update({ image: imageUrl });
            totalVendorsUpdated++;
            console.log(`    ✅ Updated vendor ${vendorData.name} with image`);
          } else {
            console.log(`    ⚠️  No image found for vendor ${vendorData.name}`);
          }
          
          // Add a small delay to avoid hitting API rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.log(`    ⏭️  Skipping vendor ${vendorData.name} (already has image or no placeId)`);
        }
      }
    }
    
    console.log(`\n🎉 Backfill completed!`);
    console.log(`Total vendors processed: ${totalVendorsProcessed}`);
    console.log(`Total vendors updated: ${totalVendorsUpdated}`);
    
  } catch (error) {
    console.error('Error during backfill:', error);
  }
}

// Run the backfill
backfillVendorImages()
  .then(() => {
    console.log('Backfill script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill script failed:', error);
    process.exit(1);
  }); 