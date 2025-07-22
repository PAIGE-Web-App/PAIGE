const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Check for required environment variables
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
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

// Simplified category mapping function (copied from utils/vendorUtils.ts)
function mapGoogleTypesToCategory(types, venueName) {
  if (!types || types.length === 0) return 'Venue';
  
  // First, try to determine category from the vendor name
  if (venueName) {
    const lowerName = venueName.toLowerCase();
    
    // Check for specific vendor types in the name
    if (lowerName.includes('officiant') || lowerName.includes('minister') || lowerName.includes('pastor') || lowerName.includes('priest')) {
      return 'Officiant';
    }
    if (lowerName.includes('church') || lowerName.includes('chapel') || lowerName.includes('cathedral')) {
      return 'Church';
    }
    if (lowerName.includes('photographer') || lowerName.includes('photo')) {
      return 'Photographer';
    }
    if (lowerName.includes('florist') || lowerName.includes('flower')) {
      return 'Florist';
    }
    if (lowerName.includes('caterer') || lowerName.includes('catering')) {
      return 'Caterer';
    }
    if (lowerName.includes('dj') || lowerName.includes('disc jockey')) {
      return 'DJ';
    }
    if (lowerName.includes('band') || lowerName.includes('musician')) {
      return 'Band';
    }
    if (lowerName.includes('planner') || lowerName.includes('coordinator')) {
      return 'Wedding Planner';
    }
    if (lowerName.includes('salon') || lowerName.includes('hair') || lowerName.includes('beauty')) {
      return 'Beauty Salon';
    }
    if (lowerName.includes('dress') || lowerName.includes('bridal') || lowerName.includes('gown')) {
      return 'Dress Shop';
    }
    if (lowerName.includes('jewelry') || lowerName.includes('jeweler')) {
      return 'Jeweler';
    }
    if (lowerName.includes('bakery') || lowerName.includes('cake')) {
      return 'Baker';
    }
    if (lowerName.includes('rental') || lowerName.includes('rent')) {
      return 'Event Rental';
    }
    if (lowerName.includes('car') || lowerName.includes('transport')) {
      return 'Car Rental';
    }
    if (lowerName.includes('travel') || lowerName.includes('agency')) {
      return 'Travel Agency';
    }
    if (lowerName.includes('spa')) {
      return 'Spa';
    }
    if (lowerName.includes('makeup') || lowerName.includes('artist')) {
      return 'Makeup Artist';
    }
    if (lowerName.includes('stationery') || lowerName.includes('invitation')) {
      return 'Stationery';
    }
    if (lowerName.includes('favor')) {
      return 'Wedding Favor';
    }
    if (lowerName.includes('suit') || lowerName.includes('tux')) {
      return 'Suit & Tux Rental';
    }
  }
  
  // If name doesn't help, try Google Places types
  const typeMap = {
    'restaurant': 'Reception Venue',
    'bakery': 'Baker',
    'jewelry_store': 'Jeweler',
    'hair_care': 'Hair Stylist',
    'clothing_store': 'Dress Shop',
    'beauty_salon': 'Beauty Salon',
    'spa': 'Spa',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'car_rental': 'Car Rental',
    'travel_agency': 'Travel Agency',
    'wedding_planner': 'Wedding Planner',
    'officiant': 'Officiant',
    'suit_rental': 'Suit & Tux Rental',
    'makeup_artist': 'Makeup Artist',
    'stationery': 'Stationery',
    'rentals': 'Event Rental',
    'favors': 'Wedding Favor',
    'band': 'Band',
    'dj': 'DJ',
    'church': 'Church',
    'place_of_worship': 'Church',
    'lodging': 'Venue',
    'tourist_attraction': 'Venue',
    'amusement_park': 'Venue',
    'aquarium': 'Venue',
    'art_gallery': 'Venue',
    'museum': 'Venue',
    'park': 'Venue',
    'zoo': 'Venue',
    'bar': 'Venue',
    'night_club': 'Night Club',
    'casino': 'Venue',
    'movie_theater': 'Venue',
    'stadium': 'Venue',
    'convention_center': 'Venue',
    'conference_center': 'Venue',
    'banquet_hall': 'Venue',
    'event_venue': 'Venue',
    'wedding_venue': 'Venue',
    'reception_venue': 'Reception Venue'
  };
  
  // Try to match specific types
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }
  
  // Default to Venue for anything else
  return 'Venue';
}

async function updateVendorCategories() {
  try {
    console.log('Starting vendor category update...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let totalVendorsUpdated = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Processing user: ${userId}`);
      
      // Get all vendors for this user
      const vendorsSnapshot = await db.collection('users').doc(userId).collection('vendors').get();
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        const vendorName = vendorData.name;
        const currentCategory = vendorData.category;
        const types = vendorData.types || [];
        
        // Get new category using the updated mapping
        const newCategory = mapGoogleTypesToCategory(types, vendorName);
        
        // Only update if category has changed
        if (newCategory !== currentCategory) {
          console.log(`Updating vendor "${vendorName}": ${currentCategory} → ${newCategory}`);
          
          await vendorDoc.ref.update({
            category: newCategory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          totalVendorsUpdated++;
        } else {
          console.log(`Vendor "${vendorName}" already has correct category: ${currentCategory}`);
        }
      }
    }
    
    console.log(`✅ Update complete! Updated ${totalVendorsUpdated} vendors.`);
    
  } catch (error) {
    console.error('Error updating vendor categories:', error);
  } finally {
    process.exit(0);
  }
}

// Run the update
updateVendorCategories(); 