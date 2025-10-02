import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 Webhook received:', JSON.stringify(body, null, 2));
    
    // Log the event type
    if (body.type) {
      console.log(`📋 Event type: ${body.type}`);
    }
    
    // Log the data
    if (body.data?.object) {
      console.log('📦 Event data:', JSON.stringify(body.data.object, null, 2));
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return NextResponse.json({ error: 'Webhook test failed' }, { status: 500 });
  }
}
