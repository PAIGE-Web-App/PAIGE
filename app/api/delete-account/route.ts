import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId, reason } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify the user exists
    try {
      await getAuth().getUser(userId);
    } catch (error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete all user data from Firestore
    const batch = adminDb.batch();

    // Delete user's contacts
    const contactsSnapshot = await adminDb.collection(`users/${userId}/contacts`).get();
    contactsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's vendors
    const vendorsSnapshot = await adminDb.collection(`users/${userId}/vendors`).get();
    vendorsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's messages (nested under contacts)
    const contactsForMessages = await adminDb.collection(`users/${userId}/contacts`).get();
    for (const contactDoc of contactsForMessages.docs) {
      const messagesSnapshot = await adminDb.collection(`users/${userId}/contacts/${contactDoc.id}/messages`).get();
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }

    // Delete user's todo lists
    const todoListsSnapshot = await adminDb.collection(`users/${userId}/todoLists`).get();
    todoListsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's todo items
    const todoItemsSnapshot = await adminDb.collection(`users/${userId}/todoItems`).get();
    todoItemsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's categories
    const categoriesSnapshot = await adminDb.collection(`users/${userId}/categories`).get();
    categoriesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's Gmail import history
    const gmailHistorySnapshot = await adminDb.collection(`users/${userId}/gmailHistory`).get();
    gmailHistorySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's notifications
    const notificationsSnapshot = await adminDb.collection(`users/${userId}/notifications`).get();
    notificationsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's settings
    const settingsSnapshot = await adminDb.collection(`users/${userId}/settings`).get();
    settingsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the main user document
    const userRef = adminDb.collection('users').doc(userId);
    batch.delete(userRef);

    // Log the deletion reason for analytics
    if (reason) {
      const deletionLogRef = adminDb.collection('accountDeletions').doc();
      batch.set(deletionLogRef, {
        userId,
        reason,
        deletedAt: new Date().toISOString(),
        userEmail: (await getAuth().getUser(userId)).email
      });
    }

    // Execute the batch deletion
    await batch.commit();

    // Delete the Firebase Auth user
    try {
      await getAuth().deleteUser(userId);
    } catch (error) {
      console.error('Error deleting Firebase Auth user:', error);
      // Continue even if Auth deletion fails, as the data is already deleted
    }

    console.log(`✅ Successfully deleted account for user: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account' 
    }, { status: 500 });
  }
} 