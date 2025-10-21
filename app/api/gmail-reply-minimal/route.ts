import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Minimal Gmail Reply Route called');
    
    const body = await req.json();
    console.log('🧪 Request body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Minimal Gmail Reply Route working',
      receivedData: body
    });
    
  } catch (error: any) {
    console.error('🧪 Minimal Gmail Reply Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}