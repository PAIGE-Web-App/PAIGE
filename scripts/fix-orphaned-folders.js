const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixOrphanedFolders(userId) {
  try {
    console.log(`Fixing orphaned folders for user: ${userId}`);
    
    // Get all folders
    const foldersQuery = query(collection(db, 'users', userId, 'fileCategories'));
    const foldersSnapshot = await getDocs(foldersQuery);
    const allFolders = foldersSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    console.log(`Found ${allFolders.length} total folders`);
    
    // Create a set of all folder IDs for quick lookup
    const allFolderIds = new Set(allFolders.map(f => f.id));
    
    // Find orphaned folders (have parentId but parent doesn't exist)
    const orphanedFolders = allFolders.filter(folder => 
      folder.parentId && !allFolderIds.has(folder.parentId)
    );
    
    console.log(`Found ${orphanedFolders.length} orphaned folders:`, orphanedFolders.map(f => f.name));
    
    if (orphanedFolders.length === 0) {
      console.log('No orphaned folders found!');
      return;
    }
    
    // Convert orphaned folders to top-level folders by removing parentId
    const updatePromises = orphanedFolders.map(folder => {
      console.log(`Converting "${folder.name}" (${folder.id}) to top-level folder`);
      const folderRef = doc(db, 'users', userId, 'fileCategories', folder.id);
      return updateDoc(folderRef, { 
        parentId: null,
        updatedAt: new Date()
      });
    });
    
    await Promise.all(updatePromises);
    console.log(`Successfully converted ${orphanedFolders.length} orphaned folders to top-level folders`);
    
  } catch (error) {
    console.error('Error fixing orphaned folders:', error);
  }
}

// Usage: Replace 'USER_ID_HERE' with the actual user ID
// fixOrphanedFolders('USER_ID_HERE');

// Run the script for the current user
const userId = 'saFckG3oMpV6ZSVjJYdNNiM9qT62'; // From the console logs
fixOrphanedFolders(userId);

module.exports = { fixOrphanedFolders }; 