// scripts/migrate_artifacts_to_users.js
// Migration script: Move all user subcollections from artifacts/{appId}/users/{userId}/... to users/{userId}/...
// Usage:
// 1. Set up Firebase Admin SDK with your service account credentials.
// 2. Run: node scripts/migrate_artifacts_to_users.js
// 3. Review logs to verify migration. No data is deleted from the old location.
// 4. After verifying, you can run a cleanup script to delete legacy data.

const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// TODO: Replace with your service account key file path
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();

const SUBCOLLECTIONS = ['contacts', 'todoItems', 'categories'];

async function migrate() {
  const artifactsSnap = await db.collection('artifacts').get();
  if (artifactsSnap.empty) {
    console.log('No artifacts found. Exiting.');
    return;
  }

  for (const appDoc of artifactsSnap.docs) {
    const appId = appDoc.id;
    console.log(`\nProcessing appId: ${appId}`);
    const usersSnap = await db.collection(`artifacts/${appId}/users`).get();
    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      console.log(`  Migrating user: ${userId}`);
      for (const sub of SUBCOLLECTIONS) {
        const subSnap = await db.collection(`artifacts/${appId}/users/${userId}/${sub}`).get();
        if (subSnap.empty) continue;
        for (const docSnap of subSnap.docs) {
          const destRef = db.collection(`users/${userId}/${sub}`).doc(docSnap.id);
          const destDoc = await destRef.get();
          if (destDoc.exists) {
            console.log(`    [SKIP] ${sub}/${docSnap.id} already exists in users/${userId}/${sub}`);
            continue;
          }
          await destRef.set(docSnap.data());
          console.log(`    [MIGRATED] ${sub}/${docSnap.id}`);

          // If migrating contacts, also migrate messages subcollection
          if (sub === 'contacts') {
            const messagesSnap = await db.collection(`artifacts/${appId}/users/${userId}/contacts/${docSnap.id}/messages`).get();
            if (!messagesSnap.empty) {
              for (const msgDoc of messagesSnap.docs) {
                const msgDestRef = db.collection(`users/${userId}/contacts/${docSnap.id}/messages`).doc(msgDoc.id);
                const msgDestDoc = await msgDestRef.get();
                if (msgDestDoc.exists) {
                  console.log(`      [SKIP] messages/${msgDoc.id} already exists for contact ${docSnap.id}`);
                  continue;
                }
                await msgDestRef.set(msgDoc.data());
                console.log(`      [MIGRATED] messages/${msgDoc.id} for contact ${docSnap.id}`);
              }
            }
          }
        }
      }
    }
  }
  console.log('\nMigration complete! Review your data and test your app before deleting legacy collections.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 