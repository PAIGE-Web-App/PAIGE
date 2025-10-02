import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('=== WEBHOOK DEBUG ===');
    console.log('Headers:', headers);
    console.log('Body:', body);
    console.log('Timestamp:', new Date().toISOString());
    console.log('========================');
    
    return NextResponse.json({ 
      received: true, 
      timestamp: new Date().toISOString(),
      headers: Object.keys(headers),
      bodyLength: body.length
    });
  } catch (error) {
    console.error('Webhook debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
