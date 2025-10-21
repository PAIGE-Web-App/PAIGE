import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Gmail-reply-temp API called');
    
    const body = await req.json();
    console.log('🚀 Request body:', body);
    
    // TODO: Add actual Gmail functionality here
    // For now, just return success to test the route
    
    return NextResponse.json({ 
      success: true, 
      message: 'Gmail reply temp route working',
      receivedData: body
    });
    
  } catch (error: any) {
    console.error('❌ Gmail reply temp error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
