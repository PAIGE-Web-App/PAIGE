import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🚀 Simple gmail-reply API called');
  try {
    const body = await req.json();
    console.log('📧 Simple request body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Simple gmail-reply route working',
      receivedBody: body 
    });
  } catch (error: any) {
    console.error('❌ Simple route error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
