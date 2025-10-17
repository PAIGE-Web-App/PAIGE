import { NextRequest, NextResponse } from 'next/server';
import { sendVendorNotification } from '@/lib/emailIntegrations';

export async function POST(request: NextRequest) {
  try {
    const { messageId, messageType, userId, vendorId } = await request.json();

    if (!messageId || !messageType || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, messageType, userId' },
        { status: 400 }
      );
    }

    if (!['new-message', 'quote-received', 'booking-confirmed', 'payment-reminder'].includes(messageType)) {
      return NextResponse.json(
        { error: 'Invalid messageType. Must be: new-message, quote-received, booking-confirmed, or payment-reminder' },
        { status: 400 }
      );
    }

    console.log('🏢 Triggering vendor notification:', { messageId, messageType, userId, vendorId });

    await sendVendorNotification(messageId, messageType, userId, vendorId);

    return NextResponse.json({ 
      success: true, 
      message: 'Vendor notification triggered successfully' 
    });
  } catch (error) {
    console.error('❌ Error triggering vendor notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
