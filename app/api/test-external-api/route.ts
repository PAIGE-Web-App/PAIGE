import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing external API call');
    
    // Test call to a different external API (not Gmail)
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
    });

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'External API call successful',
      status: response.status,
      data
    });
    
  } catch (error: any) {
    console.error('❌ External API test error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'External API test failed'
    }, { status: 500 });
  }
}
