require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

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

async function debugVendorImages() {
  console.log('🔍 Debugging vendor images...\n');

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs;

    for (const userDoc of users) {
      const userId = userDoc.id;
      const vendorsSnapshot = await db.collection('users').doc(userId).collection('vendors').get();
      
      if (vendorsSnapshot.empty) continue;

      console.log(`👤 User: ${userId}`);
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendor = vendorDoc.data();
        
        // Focus on Adeline and a few others
        if (vendor.name === 'Adeline' || vendor.name === 'Voss Salon' || vendor.name === 'Daniel Motta Photography') {
          console.log(`\n📦 Vendor: ${vendor.name}`);
          console.log(`   ID: ${vendor.id}`);
          console.log(`   Place ID: ${vendor.placeId || 'N/A'}`);
          console.log(`   Current Image: ${vendor.image || 'N/A'}`);
          console.log(`   Images Array: ${vendor.images ? vendor.images.length : 0} images`);
          if (vendor.images && vendor.images.length > 0) {
            vendor.images.forEach((img, i) => {
              console.log(`     [${i}]: ${img}`);
            });
          }
          
          // Test Google Places API if placeId exists
          if (vendor.placeId) {
            try {
              const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${vendor.placeId}&fields=photos&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
              const data = await response.json();
              
              if (data.status === 'OK' && data.result && data.result.photos) {
                console.log(`   ✅ Google Places API: ${data.result.photos.length} photos available`);
                if (data.result.photos.length > 0) {
                  const photoRef = data.result.photos[0].photo_reference;
                  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
                  console.log(`   📸 First photo URL: ${photoUrl}`);
                }
              } else {
                console.log(`   ❌ Google Places API: ${data.status} - ${data.error_message || 'No photos found'}`);
              }
            } catch (error) {
              console.log(`   ❌ Google Places API Error: ${error.message}`);
            }
          }
          
          console.log('   ---');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging vendor images:', error);
  }
}

debugVendorImages().then(() => {
  console.log('\n🎉 Debug completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 