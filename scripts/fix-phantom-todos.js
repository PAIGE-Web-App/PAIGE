/**
 * One-time script to fix phantom todos created before the field fix
 * These todos are missing: userId, listId, and orderIndex fields
 */

const admin = require('firebase-admin');
const serviceAccount = require('../paige-ai-db-firebase-adminsdk-fbsvc-4bc526de4d.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixPhantomTodos() {
  try {
    console.log('🔍 Scanning for phantom todos...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let totalFixed = 0;
    let totalScanned = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\n📂 Checking user: ${userId}`);
      
      // Get all todos for this user
      const todosRef = db.collection(`users/${userId}/todoItems`);
      const todosSnapshot = await todosRef.get();
      
      console.log(`   Found ${todosSnapshot.size} todos`);
      
      for (const todoDoc of todosSnapshot.docs) {
        totalScanned++;
        const todoData = todoDoc.data();
        
        // Check if this is a phantom todo (missing required fields)
        const isPhantom = !todoData.userId || todoData.listId === undefined || !todoData.orderIndex;
        
        if (isPhantom) {
          console.log(`   ⚠️  Found phantom todo: ${todoDoc.id} - "${todoData.name}"`);
          console.log(`      Missing: ${!todoData.userId ? 'userId ' : ''}${todoData.listId === undefined ? 'listId ' : ''}${!todoData.orderIndex ? 'orderIndex' : ''}`);
          
          // Prepare update data
          const updateData = {};
          
          if (!todoData.userId) {
            updateData.userId = userId;
          }
          
          if (todoData.listId === undefined) {
            updateData.listId = null; // null means "All To-Do Items"
          }
          
          if (!todoData.orderIndex) {
            // Use createdAt timestamp or current time for ordering
            const timestamp = todoData.createdAt?.toMillis?.() || Date.now();
            updateData.orderIndex = timestamp;
          }
          
          // Update the todo
          await todoDoc.ref.update(updateData);
          totalFixed++;
          console.log(`   ✅ Fixed! Added: ${Object.keys(updateData).join(', ')}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Script completed!`);
    console.log(`   Total todos scanned: ${totalScanned}`);
    console.log(`   Phantom todos fixed: ${totalFixed}`);
    console.log('='.repeat(50));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing phantom todos:', error);
    process.exit(1);
  }
}

// Run the script
fixPhantomTodos();

