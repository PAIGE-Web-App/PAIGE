const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateToNewStructure() {
  console.log('Starting migration to new Firestore structure...');
  
  try {
    // Get all users from the old structure
    const oldUsersSnapshot = await db.collection('artifacts/default-app-id/users').get();
    
    if (oldUsersSnapshot.empty) {
      console.log('No users found in old structure. Migration complete.');
      return;
    }
    
    console.log(`Found ${oldUsersSnapshot.size} users to migrate.`);
    
    for (const userDoc of oldUsersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`Migrating user: ${userId}`);
      
      // Create user document in new structure
      await db.collection('users').doc(userId).set(userData);
      
      // Migrate contacts
      const contactsSnapshot = await db.collection(`artifacts/default-app-id/users/${userId}/contacts`).get();
      
      if (!contactsSnapshot.empty) {
        console.log(`  Migrating ${contactsSnapshot.size} contacts for user ${userId}`);
        
        for (const contactDoc of contactsSnapshot.docs) {
          const contactData = contactDoc.data();
          
          // Migrate contact
          await db.collection(`users/${userId}/contacts`).doc(contactDoc.id).set(contactData);
          
          // Migrate messages for this contact
          const messagesSnapshot = await db.collection(`artifacts/default-app-id/users/${userId}/contacts/${contactDoc.id}/messages`).get();
          
          if (!messagesSnapshot.empty) {
            console.log(`    Migrating ${messagesSnapshot.size} messages for contact ${contactDoc.id}`);
            
            for (const messageDoc of messagesSnapshot.docs) {
              const messageData = messageDoc.data();
              await db.collection(`users/${userId}/contacts/${contactDoc.id}/messages`).doc(messageDoc.id).set(messageData);
            }
          }
        }
      }
      
      // Migrate todo items
      const todoItemsSnapshot = await db.collection(`artifacts/default-app-id/users/${userId}/todoItems`).get();
      
      if (!todoItemsSnapshot.empty) {
        console.log(`  Migrating ${todoItemsSnapshot.size} todo items for user ${userId}`);
        
        for (const todoDoc of todoItemsSnapshot.docs) {
          const todoData = todoDoc.data();
          await db.collection(`users/${userId}/todoItems`).doc(todoDoc.id).set(todoData);
        }
      }
      
      console.log(`Completed migration for user: ${userId}`);
    }
    
    console.log('Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the application with the new structure');
    console.log('2. If everything works correctly, you can delete the old data structure');
    console.log('3. Run this script again to clean up old data: node scripts/cleanup-old-structure.js');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateToNewStructure()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  }); 