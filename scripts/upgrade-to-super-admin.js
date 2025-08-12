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

async function upgradeToSuperAdmin() {
  const userId = 'saFckG3oMpV6ZSVjJYdNNiM9qT62';
  
  try {
    console.log(`🔄 Upgrading user ${userId} to Super Admin...`);
    
    // Get the user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ User not found!');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 Current user data:', {
      email: userData.email,
      currentRole: userData.role || 'none',
      userName: userData.userName
    });
    
    // Update to super admin role
    const updateData = {
      role: 'super_admin',
      permissions: {
        vendors: {
          view: true,
          favorite: true,
          contact: true,
          flag: true,
          compare: true,
          advanced_search: true
        },
        admin: {
          view_flags: true,
          review_flags: true,
          manage_users: true,
          content_moderation: true,
          system_config: true,
          role_management: true
        },
        planner: {
          client_management: true,
          vendor_partnerships: true,
          business_tools: true,
          analytics: true
        },
        subscription: {
          priority_support: true,
          custom_integrations: true,
          white_label: true,
          api_access: true
        }
      },
      updatedAt: new Date()
    };
    
    await userRef.update(updateData);
    
    console.log('✅ Successfully upgraded to Super Admin!');
    console.log('🎯 New permissions:');
    console.log('   - Full vendor access');
    console.log('   - All admin capabilities');
    console.log('   - Role management');
    console.log('   - System configuration');
    
    // Verify the update
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    console.log('🔍 Verification - New role:', updatedData.role);
    
  } catch (error) {
    console.error('❌ Error upgrading user:', error);
  }
}

// Run the upgrade
upgradeToSuperAdmin()
  .then(() => {
    console.log('🎉 Upgrade process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Upgrade failed:', error);
    process.exit(1);
  });
