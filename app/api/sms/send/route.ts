import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const { userId, contactId, message, vendorPhone } = await request.json();

    if (!userId || !contactId || !message || !vendorPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get contact details
    const contactRef = adminDb.collection('users').doc(userId).collection('contacts').doc(contactId);
    const contactDoc = await contactRef.get();
    
    if (!contactDoc.exists) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const contactData = contactDoc.data();

    // Send SMS via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: vendorPhone
    });

    // Store the message in Firestore
    const messageData = {
      id: twilioMessage.sid,
      content: message,
      type: 'sms',
      direction: 'outbound',
      timestamp: new Date(),
      status: twilioMessage.status,
      twilioSid: twilioMessage.sid,
      contactId: contactId,
      userId: userId
    };

    await adminDb.collection('users').doc(userId)
      .collection('messages')
      .doc(twilioMessage.sid)
      .set(messageData);

    // Update contact's lastMessage timestamp
    await contactRef.update({
      lastMessage: new Date(),
      lastMessageType: 'sms'
    });

    return NextResponse.json({
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
} 