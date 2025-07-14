// scripts/cleanup_legacy_collections.js
// Cleanup script: Delete legacy top-level collections (artifacts, contacts, categories, messages, todoItems)
// Usage:
// 1. Set up Firebase Admin SDK with your service account credentials.
// 2. Run: node scripts/cleanup_legacy_collections.js
// 3. Review logs to verify deletion.
// WARNING: This will permanently delete all documents in the specified collections!

const admin = require('firebase-admin');
const readline = require('readline');

// TODO: Replace with your service account key file path
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const COLLECTIONS = ['artifacts', 'contacts', 'categories', 'messages', 'todoItems'];

async function deleteCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) {
    console.log(`[SKIP] ${collectionName} is already empty or does not exist.`);
    return;
  }
  for (const doc of snap.docs) {
    await doc.ref.delete();
    console.log(`[DELETED] ${collectionName}/${doc.id}`);
  }
  console.log(`[DONE] Deleted all documents in ${collectionName}`);
}

async function main() {
  console.log('WARNING: This will permanently delete all documents in the following collections:');
  console.log(COLLECTIONS.join(', '));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Are you sure you want to proceed? (yes/no): ', async (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted. No data was deleted.');
      process.exit(0);
    }
    for (const col of COLLECTIONS) {
      await deleteCollection(col);
    }
    console.log('Cleanup complete!');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
}); 