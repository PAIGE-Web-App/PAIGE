const admin = require('firebase-admin');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = getFirestore();

async function fixMissingTimestamps() {
  const usersSnap = await db.collection('artifacts/default-app-id/users').get();
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const contactsSnap = await db.collection(`artifacts/default-app-id/users/${userId}/contacts`).get();
    for (const contactDoc of contactsSnap.docs) {
      const contactId = contactDoc.id;
      const messagesRef = db.collection(`artifacts/default-app-id/users/${userId}/contacts/${contactId}/messages`);
      const messagesSnap = await messagesRef.get();
      for (const msgDoc of messagesSnap.docs) {
        const data = msgDoc.data();
        if (!data.timestamp) {
          console.log(`Fixing missing timestamp for message ${msgDoc.id} (user: ${userId}, contact: ${contactId})`);
          await msgDoc.ref.update({ timestamp: Timestamp.now() });
        }
      }
    }
  }
  console.log('Done fixing missing timestamps.');
}

fixMissingTimestamps().catch(console.error); 