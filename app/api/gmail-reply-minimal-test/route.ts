import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🧪 Minimal Gmail reply test called');
  try {
    const body = await req.json();
    console.log('📧 Minimal request body:', body);
    
    // Test basic functionality without imports
    return NextResponse.json({ 
      success: true, 
      message: 'Minimal Gmail reply test working',
      receivedBody: body 
    });
  } catch (error: any) {
    console.error('❌ Minimal test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
