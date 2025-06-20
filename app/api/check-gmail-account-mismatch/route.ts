import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        message: 'Server configuration error' 
      }, { status: 500 });
    }

    const { userId, contactId, currentGmailAccount } = await req.json();
    
    if (!userId || !contactId || !currentGmailAccount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Get the user's current Gmail tokens to verify the account
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDoc.data();
    const storedGmailAccount = userData?.googleTokens?.email;
    
    if (!storedGmailAccount) {
      return NextResponse.json({ 
        success: false, 
        message: 'No Gmail account connected' 
      }, { status: 401 });
    }

    // Check if the current Gmail account matches the stored one
    if (storedGmailAccount !== currentGmailAccount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Gmail account mismatch',
        storedAccount: storedGmailAccount,
        currentAccount: currentGmailAccount
      }, { status: 409 });
    }

    // Check if this contact has messages from a different Gmail account
    const messagesCollectionPath = `artifacts/default-app-id/users/${userId}/contacts/${contactId}/messages`;
    const existingGmailMessagesQuery = await adminDb.collection(messagesCollectionPath)
      .where('source', '==', 'gmail')
      .limit(1)
      .get();

    let existingGmailAccount: string | null = null;
    if (!existingGmailMessagesQuery.empty) {
      const firstMessage = existingGmailMessagesQuery.docs[0].data();
      existingGmailAccount = firstMessage.gmailAccount || null;
    }

    const hasAccountMismatch = existingGmailAccount && existingGmailAccount !== currentGmailAccount;

    return NextResponse.json({
      success: true,
      hasAccountMismatch,
      existingGmailAccount,
      currentGmailAccount,
      message: hasAccountMismatch 
        ? `This contact has messages from a different Gmail account (${existingGmailAccount}). Importing will replace those messages.`
        : 'No account mismatch detected'
    });

  } catch (error) {
    console.error('Error checking Gmail account mismatch:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred while checking Gmail account mismatch' 
    }, { status: 500 });
  }
} 