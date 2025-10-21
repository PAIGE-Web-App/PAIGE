import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🚀 Gmail-reply API called (TEMPORARY VERSION)');
  try {
    const body = await req.json();
    console.log('🚀 Request body:', body);
    
    // TEMPORARY: Just return success to test the route
    return NextResponse.json({ 
      success: true, 
      message: 'Gmail reply route is working (temporary version)',
      receivedData: body
    });
    
  } catch (error: any) {
    console.error('❌ Gmail reply error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}