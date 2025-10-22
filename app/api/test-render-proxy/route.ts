import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing Render proxy');
    
    // Test direct call to Render service
    const renderResponse = await fetch('https://google-api-microservice.onrender.com/health', {
      method: 'GET',
    });

    const renderData = await renderResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Render service accessible',
      renderStatus: renderResponse.status,
      renderData
    });
    
  } catch (error: any) {
    console.error('❌ Render proxy test error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Render proxy test failed'
    }, { status: 500 });
  }
}
