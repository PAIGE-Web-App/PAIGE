import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * API endpoint to purge all Gmail-imported messages for a user
 * This is critical for Google OAuth verification - users must be able to delete imported data
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    console.log(`[GMAIL PURGE] Starting Gmail data purge for user: ${userId}`);

    // Get all contacts for the user
    const contactsSnapshot = await adminDb
      .collection(`users/${userId}/contacts`)
      .get();

    if (contactsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No contacts found',
        deletedCount: 0,
        affectedContacts: 0,
      });
    }

    let totalDeleted = 0;
    let affectedContacts = 0;

    // Process each contact in batches to avoid memory issues
    for (const contactDoc of contactsSnapshot.docs) {
      const contactId = contactDoc.id;

      // Query Gmail messages only (source === 'gmail')
      // This preserves manually created messages
      const gmailMessagesSnapshot = await adminDb
        .collection(`users/${userId}/contacts/${contactId}/messages`)
        .where('source', '==', 'gmail')
        .get();

      if (!gmailMessagesSnapshot.empty) {
        affectedContacts++;
        
        // Delete in batches of 500 (Firestore limit)
        const batchSize = 500;
        const batches = [];
        let currentBatch = adminDb.batch();
        let operationCount = 0;

        gmailMessagesSnapshot.docs.forEach((doc) => {
          currentBatch.delete(doc.ref);
          operationCount++;
          totalDeleted++;

          // When batch reaches 500, start a new one
          if (operationCount === batchSize) {
            batches.push(currentBatch);
            currentBatch = adminDb.batch();
            operationCount = 0;
          }
        });

        // Add the last batch if it has operations
        if (operationCount > 0) {
          batches.push(currentBatch);
        }

        // Execute all batches
        await Promise.all(batches.map((batch) => batch.commit()));

        console.log(
          `[GMAIL PURGE] Deleted ${gmailMessagesSnapshot.size} messages for contact ${contactId}`
        );
      }
    }

    // Clear Gmail import flags from user document
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      gmailImportCompleted: false,
      gmailLastImportDate: null,
    });

    console.log(
      `[GMAIL PURGE] Complete. Deleted ${totalDeleted} messages from ${affectedContacts} contacts`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} imported Gmail messages from ${affectedContacts} contacts`,
      deletedCount: totalDeleted,
      affectedContacts: affectedContacts,
    });
  } catch (error: any) {
    console.error('[GMAIL PURGE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to purge Gmail data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to get stats about imported Gmail data
 * Shows how many messages are stored without actually fetching them all
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get all contacts for the user
    const contactsSnapshot = await adminDb
      .collection(`users/${userId}/contacts`)
      .get();

    if (contactsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        totalMessages: 0,
        contactsWithGmailData: 0,
      });
    }

    let totalMessages = 0;
    let contactsWithGmailData = 0;

    // Count Gmail messages for each contact
    for (const contactDoc of contactsSnapshot.docs) {
      const contactId = contactDoc.id;

      // Use count() aggregation for efficient counting (no data transfer)
      const gmailMessagesQuery = adminDb
        .collection(`users/${userId}/contacts/${contactId}/messages`)
        .where('source', '==', 'gmail');

      const snapshot = await gmailMessagesQuery.count().get();
      const count = snapshot.data().count;

      if (count > 0) {
        totalMessages += count;
        contactsWithGmailData++;
      }
    }

    return NextResponse.json({
      success: true,
      totalMessages,
      contactsWithGmailData,
    });
  } catch (error: any) {
    console.error('[GMAIL STATS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get Gmail data stats',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

