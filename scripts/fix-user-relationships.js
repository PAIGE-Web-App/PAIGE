const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://your-project.firebaseio.com'
  });
}

const db = admin.firestore();

async function fixUserRelationships() {
  console.log('🔧 Starting user relationship data fix...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Found ${users.length} users to process`);
    
    let updatedCount = 0;
    let errors = [];
    
    for (const user of users) {
      try {
        const updates = {};
        let hasUpdates = false;
        
        // Fix wedding date - check multiple possible locations
        if (!user.weddingDate && user.metadata?.weddingDate) {
          updates.weddingDate = user.metadata.weddingDate;
          hasUpdates = true;
          console.log(`📅 Fixed wedding date for ${user.email}: ${user.metadata.weddingDate}`);
        }
        
        // Fix partner relationships - check if user has partnerId but missing other fields
        if (user.partnerId && (!user.partnerEmail || !user.partnerName || !user.isLinked)) {
          const partnerDoc = await db.collection('users').doc(user.partnerId).get();
          if (partnerDoc.exists) {
            const partnerData = partnerDoc.data();
            updates.partnerEmail = partnerData.email;
            updates.partnerName = partnerData.displayName || partnerData.userName;
            updates.isLinked = true;
            hasUpdates = true;
            console.log(`💕 Fixed partner data for ${user.email}: ${partnerData.email}`);
          }
        }
        
        // Fix planner relationships - check if user has plannerId but missing other fields
        if (user.plannerId && (!user.plannerEmail || !user.plannerName || !user.hasPlanner)) {
          const plannerDoc = await db.collection('users').doc(user.plannerId).get();
          if (plannerDoc.exists) {
            const plannerData = plannerDoc.data();
            updates.plannerEmail = plannerData.email;
            updates.plannerName = plannerData.displayName || plannerData.userName;
            updates.hasPlanner = true;
            hasUpdates = true;
            console.log(`👨‍💼 Fixed planner data for ${user.email}: ${plannerData.email}`);
          }
        }
        
        // Fix isLinked and hasPlanner flags if they're missing
        if (user.partnerId && !user.isLinked) {
          updates.isLinked = true;
          hasUpdates = true;
        }
        
        if (user.plannerId && !user.hasPlanner) {
          updates.hasPlanner = true;
          hasUpdates = true;
        }
        
        // Update user if there are changes
        if (hasUpdates) {
          await db.collection('users').doc(user.id).update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error.message);
        errors.push({ userId: user.id, email: user.email, error: error.message });
      }
    }
    
    console.log(`\n✅ Relationship data fix completed!`);
    console.log(`📈 Updated ${updatedCount} users`);
    
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} errors encountered:`);
      errors.forEach(error => {
        console.log(`  - ${error.email}: ${error.error}`);
      });
    }
    
    // Generate summary report
    const summary = {
      totalUsers: users.length,
      updatedUsers: updatedCount,
      errors: errors.length,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n📋 Summary:', JSON.stringify(summary, null, 2));
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the fix
fixUserRelationships()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
