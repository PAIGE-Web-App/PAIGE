const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupOldStructure() {
  console.log('Starting cleanup of old Firestore structure...');
  
  try {
    // Get all users from the old structure
    const oldUsersSnapshot = await db.collection('artifacts/default-app-id/users').get();
    
    if (oldUsersSnapshot.empty) {
      console.log('No users found in old structure. Cleanup complete.');
      return;
    }
    
    console.log(`Found ${oldUsersSnapshot.size} users to clean up.`);
    
    for (const userDoc of oldUsersSnapshot.docs) {
      const userId = userDoc.id;
      
      console.log(`Cleaning up user: ${userId}`);
      
      // Delete contacts and their messages
      const contactsSnapshot = await db.collection(`artifacts/default-app-id/users/${userId}/contacts`).get();
      
      if (!contactsSnapshot.empty) {
        console.log(`  Deleting ${contactsSnapshot.size} contacts for user ${userId}`);
        
        for (const contactDoc of contactsSnapshot.docs) {
          // Delete messages for this contact
          const messagesSnapshot = await db.collection(`artifacts/default-app-id/users/${userId}/contacts/${contactDoc.id}/messages`).get();
          
          if (!messagesSnapshot.empty) {
            console.log(`    Deleting ${messagesSnapshot.size} messages for contact ${contactDoc.id}`);
            
            const batch = db.batch();
            messagesSnapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
          }
          
          // Delete the contact
          await contactDoc.ref.delete();
        }
      }
      
      // Delete todo items
      const todoItemsSnapshot = await db.collection(`artifacts/default-app-id/users/${userId}/todoItems`).get();
      
      if (!todoItemsSnapshot.empty) {
        console.log(`  Deleting ${todoItemsSnapshot.size} todo items for user ${userId}`);
        
        const batch = db.batch();
        todoItemsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      
      // Delete the user document
      await userDoc.ref.delete();
      
      console.log(`Completed cleanup for user: ${userId}`);
    }
    
    console.log('Cleanup completed successfully!');
    console.log('Old Firestore structure has been removed.');
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

// Run the cleanup
cleanupOldStructure()
  .then(() => {
    console.log('Cleanup script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup script failed:', error);
    process.exit(1);
  }); 