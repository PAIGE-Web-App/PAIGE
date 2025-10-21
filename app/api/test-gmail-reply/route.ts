import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🧪 Test gmail-reply route called');
  try {
    const body = await req.json();
    console.log('📧 Test request body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test route working',
      receivedBody: body 
    });
  } catch (error: any) {
    console.error('❌ Test route error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
