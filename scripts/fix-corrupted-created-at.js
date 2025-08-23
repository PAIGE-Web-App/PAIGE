const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixCorruptedCreatedAt() {
  console.log('🔧 Starting corrupted createdAt fix...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} users to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const email = data.email || 'no-email';
      
      // Check if createdAt is an empty object
      if (data.createdAt && typeof data.createdAt === 'object' && Object.keys(data.createdAt).length === 0) {
        console.log(`🔍 Found corrupted createdAt for: ${email}`);
        
        try {
          // Set createdAt to current timestamp
          await doc.ref.update({
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Fixed createdAt for: ${email}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error fixing ${email}:`, error.message);
          errors.push({ email, error: error.message });
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n📈 Fix completed!');
    console.log(`✅ Fixed: ${fixedCount} users`);
    console.log(`⏭️ Skipped: ${skippedCount} users`);
    
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.forEach(({ email, error }) => {
        console.log(`  - ${email}: ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixCorruptedCreatedAt();
