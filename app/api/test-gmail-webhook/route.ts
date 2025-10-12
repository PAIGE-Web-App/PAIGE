import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
    }

    console.log('TEST: Checking Gmail watch status for user:', userId);

    // Get user's Gmail watch status
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const gmailWatch = userData?.gmailWatch;
    const googleTokens = userData?.googleTokens;

    console.log('TEST: User Gmail watch status:', {
      isActive: gmailWatch?.isActive,
      historyId: gmailWatch?.historyId,
      lastProcessedAt: gmailWatch?.lastProcessedAt,
      hasTokens: !!googleTokens?.accessToken,
      tokenExpiry: googleTokens?.expiryDate ? new Date(googleTokens.expiryDate).toISOString() : null,
      scope: googleTokens?.scope
    });

    // Check if user has contacts
    const contactsSnapshot = await adminDb.collection(`users/${userId}/contacts`).limit(5).get();
    console.log('TEST: User has', contactsSnapshot.size, 'contacts');

    // Check recent messages for each contact
    const contactMessages = [];
    for (const contactDoc of contactsSnapshot.docs) {
      const contactId = contactDoc.id;
      const contactData = contactDoc.data();
      
      const messagesSnapshot = await adminDb.collection(`users/${userId}/contacts/${contactId}/messages`)
        .orderBy('timestamp', 'desc')
        .limit(3)
        .get();
      
      contactMessages.push({
        contactId,
        contactName: contactData.name,
        contactEmail: contactData.email,
        recentMessages: messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          subject: doc.data().subject,
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString(),
          direction: doc.data().direction,
          source: doc.data().source
        }))
      });
    }

    return NextResponse.json({
      success: true,
      gmailWatch: {
        isActive: gmailWatch?.isActive,
        historyId: gmailWatch?.historyId,
        lastProcessedAt: gmailWatch?.lastProcessedAt,
        expiration: gmailWatch?.expiration
      },
      googleTokens: {
        hasAccessToken: !!googleTokens?.accessToken,
        hasRefreshToken: !!googleTokens?.refreshToken,
        expiryDate: googleTokens?.expiryDate ? new Date(googleTokens.expiryDate).toISOString() : null,
        scope: googleTokens?.scope
      },
      contacts: {
        count: contactsSnapshot.size,
        messages: contactMessages
      }
    });

  } catch (error: any) {
    console.error('TEST: Error checking Gmail webhook status:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
