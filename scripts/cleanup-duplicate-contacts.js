// Cleanup script for duplicate contacts
// Run this in the browser console on the messages page

async function cleanupDuplicateContacts() {
  const { collection, query, getDocs, deleteDoc, doc } = await import('firebase/firestore');
  const { db } = await import('../lib/firebase');
  
  // Get current user ID (you'll need to replace this with your actual user ID)
  const userId = 'saFckG3oMpV6ZSVjJYdNNiM9qT62'; // Replace with actual user ID
  
  try {
    console.log('🔍 Fetching all contacts...');
    const contactsRef = collection(db, 'users', userId, 'contacts');
    const snapshot = await getDocs(contactsRef);
    
    console.log(`📊 Found ${snapshot.size} total contacts`);
    
    // Group contacts by name and email
    const contactGroups = {};
    const duplicates = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.name}-${data.email || 'no-email'}`;
      
      if (!contactGroups[key]) {
        contactGroups[key] = [];
      }
      contactGroups[key].push({ id: doc.id, data, doc });
    });
    
    // Find duplicates
    Object.entries(contactGroups).forEach(([key, contacts]) => {
      if (contacts.length > 1) {
        console.log(`🔄 Found ${contacts.length} duplicates for: ${key}`);
        duplicates.push(...contacts);
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    console.log(`🗑️ Found ${duplicates.length} duplicate contacts to remove`);
    
    // Keep the first contact, delete the rest
    const toDelete = duplicates.slice(1); // Keep first, delete rest
    
    console.log(`⚠️ About to delete ${toDelete.length} duplicate contacts:`);
    toDelete.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.data.name} (${contact.id})`);
    });
    
    // Ask for confirmation
    const confirmed = confirm(`Delete ${toDelete.length} duplicate contacts?`);
    if (!confirmed) {
      console.log('❌ Cleanup cancelled');
      return;
    }
    
    // Delete duplicates
    for (const contact of toDelete) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'contacts', contact.id));
        console.log(`✅ Deleted: ${contact.data.name} (${contact.id})`);
      } catch (error) {
        console.error(`❌ Failed to delete ${contact.id}:`, error);
      }
    }
    
    console.log('🎉 Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicateContacts();
