require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

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

async function verifyRole() {
  const userId = 'saFckG3oMpV6ZSVjJYdNNiM9qT62';
  
  try {
    console.log(`🔍 Verifying role for user ${userId}...`);
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ User not found!');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 Current user data in Firestore:');
    console.log('   Email:', userData.email);
    console.log('   Role:', userData.role || 'NOT SET');
    console.log('   User Type:', userData.userType || 'NOT SET');
    console.log('   Permissions:', userData.permissions ? 'SET' : 'NOT SET');
    console.log('   Updated At:', userData.updatedAt || 'NOT SET');
    
    if (userData.role === 'super_admin') {
      console.log('✅ Role is correctly set to super_admin in Firestore!');
    } else {
      console.log('❌ Role is NOT set to super_admin in Firestore');
      console.log('   Current role:', userData.role);
    }
    
  } catch (error) {
    console.error('❌ Error verifying user role:', error);
  }
}

// Run the verification
verifyRole()
  .then(() => {
    console.log('🎉 Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
