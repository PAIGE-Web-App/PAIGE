// scripts/cleanup-categories.js
// This script cleans up Firestore document IDs that were incorrectly saved as category names

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc, updateDoc } = require('firebase/firestore');

// Your Firebase config - you'll need to add this
const firebaseConfig = {
  // Add your Firebase config here
  // apiKey: "your-api-key",
  // authDomain: "your-project.firebaseapp.com",
  // projectId: "your-project-id",
  // storageBucket: "your-project.appspot.com",
  // messagingSenderId: "123456789",
  // appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to identify Firestore document IDs
const isFirestoreDocumentId = (category) => {
  return typeof category === 'string' && /^[a-zA-Z0-9_-]{15,}$/.test(category);
};

// Function to clean up categories collection
async function cleanupCategoriesCollection() {
  console.log('Starting categories cleanup...');
  
  try {
    // Get all users (you might need to adjust this based on your user structure)
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalDeleted = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Processing user: ${userId}`);
      
      // Get categories for this user
      const categoriesRef = collection(db, 'users', userId, 'categories');
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      for (const categoryDoc of categoriesSnapshot.docs) {
        const categoryData = categoryDoc.data();
        const categoryName = categoryData.name;
        
        if (isFirestoreDocumentId(categoryName)) {
          console.log(`  Deleting invalid category: ${categoryName}`);
          await deleteDoc(categoryDoc.ref);
          totalDeleted++;
        }
      }
    }
    
    console.log(`Categories cleanup completed. Deleted ${totalDeleted} invalid categories.`);
  } catch (error) {
    console.error('Error during categories cleanup:', error);
  }
}

// Function to clean up contacts with invalid categories
async function cleanupContactsWithInvalidCategories() {
  console.log('Starting contacts cleanup...');
  
  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalUpdated = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Processing contacts for user: ${userId}`);
      
      // Get contacts for this user
      const contactsRef = collection(db, 'users', userId, 'contacts');
      const contactsSnapshot = await getDocs(contactsRef);
      
      for (const contactDoc of contactsSnapshot.docs) {
        const contactData = contactDoc.data();
        const category = contactData.category;
        
        if (isFirestoreDocumentId(category)) {
          console.log(`  Updating contact ${contactData.name} with invalid category: ${category}`);
          
          // Update the contact to remove the invalid category
          const contactRef = doc(db, 'users', userId, 'contacts', contactDoc.id);
          await updateDoc(contactRef, {
            category: null // or set to a default category like 'Other'
          });
          totalUpdated++;
        }
      }
    }
    
    console.log(`Contacts cleanup completed. Updated ${totalUpdated} contacts.`);
  } catch (error) {
    console.error('Error during contacts cleanup:', error);
  }
}

// Function to clean up todo items with invalid categories
async function cleanupTodoItemsWithInvalidCategories() {
  console.log('Starting todo items cleanup...');
  
  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalUpdated = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Processing todo items for user: ${userId}`);
      
      // Get todo items for this user
      const todoItemsRef = collection(db, 'users', userId, 'todoItems');
      const todoItemsSnapshot = await getDocs(todoItemsRef);
      
      for (const todoDoc of todoItemsSnapshot.docs) {
        const todoData = todoDoc.data();
        const category = todoData.category;
        
        if (isFirestoreDocumentId(category)) {
          console.log(`  Updating todo item "${todoData.name}" with invalid category: ${category}`);
          
          // Update the todo item to remove the invalid category
          const todoRef = doc(db, 'users', userId, 'todoItems', todoDoc.id);
          await updateDoc(todoRef, {
            category: null // or set to a default category like 'Other'
          });
          totalUpdated++;
        }
      }
    }
    
    console.log(`Todo items cleanup completed. Updated ${totalUpdated} todo items.`);
  } catch (error) {
    console.error('Error during todo items cleanup:', error);
  }
}

// Main cleanup function
async function runCleanup() {
  console.log('Starting database cleanup for invalid categories...');
  
  try {
    await cleanupCategoriesCollection();
    await cleanupContactsWithInvalidCategories();
    await cleanupTodoItemsWithInvalidCategories();
    
    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Export functions for use in other scripts
module.exports = {
  cleanupCategoriesCollection,
  cleanupContactsWithInvalidCategories,
  cleanupTodoItemsWithInvalidCategories,
  runCleanup,
  isFirestoreDocumentId
};

// If this script is run directly
if (require.main === module) {
  runCleanup()
    .then(() => {
      console.log('Cleanup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
} 