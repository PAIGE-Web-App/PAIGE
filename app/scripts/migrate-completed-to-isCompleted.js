// scripts/migrate-completed-to-isCompleted.js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function migrateCompletedField() {
  const usersSnapshot = await db.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const todoItemsRef = db.collection(`users/${userId}/todoItems`);
    const todoItemsSnapshot = await todoItemsRef.get();

    for (const todoDoc of todoItemsSnapshot.docs) {
      const data = todoDoc.data();
      if (data.completed !== undefined) {
        await todoDoc.ref.update({
          isCompleted: data.completed,
        });
        // Optionally, remove the old field:
        await todoDoc.ref.update({
          completed: Firestore.FieldValue.delete(),
        });
        console.log(`Migrated task ${todoDoc.id} for user ${userId}`);
      }
    }
  }
  console.log('Migration complete!');
}

migrateCompletedField().catch(console.error);