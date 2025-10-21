import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Gmail-reply-minimal API called');
    
    const { userId, to, subject, body } = await req.json();
    
    console.log('📧 Gmail-reply-minimal request:', { userId, to, subject });
    
    // For now, just return success without actually sending
    return NextResponse.json({
      success: true,
      message: 'Gmail reply processed (minimal version)',
      data: { userId, to, subject }
    });
    
  } catch (error: any) {
    console.error('❌ Gmail reply minimal error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}