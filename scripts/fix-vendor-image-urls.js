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

async function fixVendorImageUrls() {
  console.log('🔧 Fixing malformed vendor image URLs...\n');

  let totalFixed = 0;
  let totalProcessed = 0;

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs;

    for (const userDoc of users) {
      const userId = userDoc.id;
      const vendorsSnapshot = await db.collection('users').doc(userId).collection('vendors').get();
      
      if (vendorsSnapshot.empty) continue;

      console.log(`👤 Processing user: ${userId}`);
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendor = vendorDoc.data();
        totalProcessed++;
        
        // Process all vendors to ensure they have correct image URLs
        if (vendor.placeId) {
          console.log(`🔧 Fixing/refreshing URL for: ${vendor.name}`);
          
          // Use Google Places API to get fresh image URLs
          if (vendor.placeId) {
            try {
              const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${vendor.placeId}&fields=photos&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
              const data = await response.json();
              
              if (data.status === 'OK' && data.result && data.result.photos && data.result.photos.length > 0) {
                const photoRef = data.result.photos[0].photo_reference;
                const fixedUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
                
                // Update the vendor in Firestore
                await db.collection('users').doc(userId).collection('vendors').doc(vendorDoc.id).update({
                  image: fixedUrl,
                  images: data.result.photos.map(photo => 
                    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                  )
                });
                
                console.log(`   ✅ Fixed: ${vendor.name}`);
                console.log(`   📸 New URL: ${fixedUrl}`);
                totalFixed++;
              } else {
                console.log(`   ❌ No photos available for: ${vendor.name}`);
              }
            } catch (error) {
              console.log(`   ❌ Error fetching photos for ${vendor.name}: ${error.message}`);
            }
          } else {
            console.log(`   ❌ No placeId for: ${vendor.name}`);
          }
        }
      }
    }

    console.log(`\n🎉 Fix completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • Total vendors processed: ${totalProcessed}`);
    console.log(`   • Total vendors fixed: ${totalFixed}`);

  } catch (error) {
    console.error('❌ Error fixing vendor image URLs:', error);
  }
}

fixVendorImageUrls().then(() => {
  console.log('\n✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 