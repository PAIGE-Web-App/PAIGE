import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing Gmail API access');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // Test if we can even make a request to Gmail API
    const testResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer fake-token-for-testing'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Gmail API test completed',
      gmailResponseStatus: testResponse.status,
      userId 
    });

  } catch (error: any) {
    console.error('❌ Gmail test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
