import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Ultra-minimal Gmail reply test');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // Just return success without any Gmail operations
    return NextResponse.json({ 
      success: true, 
      message: 'Ultra-minimal Gmail reply route working',
      userId 
    });

  } catch (error: any) {
    console.error('❌ Ultra-minimal Gmail reply error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}