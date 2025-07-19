import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const timestamp = formData.get('MessageTimestamp') as string;

    console.log('SMS Webhook received:', {
      from,
      to,
      body: body?.substring(0, 50) + '...',
      messageSid,
      timestamp
    });

    if (!from || !body || !messageSid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the contact by phone number
    const contactsSnapshot = await adminDb
      .collectionGroup('contacts')
      .where('phone', '==', from)
      .limit(1)
      .get();

    if (contactsSnapshot.empty) {
      console.log('No contact found for phone number:', from);
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const contactDoc = contactsSnapshot.docs[0];
    const contactData = contactDoc.data();
    const userId = contactDoc.ref.parent.parent?.id;

    if (!userId) {
      console.error('Could not determine userId from contact');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Store the incoming message
    const messageData = {
      id: messageSid,
      content: body,
      type: 'sms',
      direction: 'inbound',
      timestamp: new Date(parseInt(timestamp) * 1000),
      status: 'received',
      twilioSid: messageSid,
      contactId: contactDoc.id,
      userId: userId,
      from: from,
      to: to
    };

    await adminDb.collection('users').doc(userId)
      .collection('messages')
      .doc(messageSid)
      .set(messageData);

    // Update contact's lastMessage timestamp
    await contactDoc.ref.update({
      lastMessage: new Date(),
      lastMessageType: 'sms'
    });

    console.log('SMS message stored successfully for user:', userId);

    // Return TwiML response (empty for SMS)
    return new NextResponse('', { status: 200 });

  } catch (error) {
    console.error('SMS webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 