import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🚀 Minimal gmail-reply API called');
  try {
    const body = await req.json();
    console.log('📧 Minimal request:', { body: Object.keys(body) });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Minimal route working',
      receivedKeys: Object.keys(body)
    });
  } catch (error: any) {
    console.error('❌ Minimal route error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
