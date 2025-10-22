import { NextRequest, NextResponse } from 'next/server';

// Render service URL
const RENDER_SERVICE_URL = 'https://google-api-microservice.onrender.com';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Gmail-reply proxy API called');
    
    const requestBody = await req.json();
    console.log('📧 Proxying Gmail reply request to Render service:', { 
      to: requestBody.to, 
      subject: requestBody.subject, 
      userId: requestBody.userId 
    });

    // Proxy the request to Render service
    const renderResponse = await fetch(`${RENDER_SERVICE_URL}/gmail-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const renderData = await renderResponse.json();
    
    if (!renderResponse.ok) {
      console.error('❌ Render service error:', renderData);
      return NextResponse.json({
        success: false,
        message: renderData.message || 'Gmail service error',
        errorType: renderData.errorType || 'service_error'
      }, { status: renderResponse.status });
    }

    console.log('✅ Gmail reply successful via Render service');
    return NextResponse.json(renderData);
    
  } catch (error: any) {
    console.error('❌ Gmail reply proxy error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail reply.'
    }, { status: 500 });
  }
}
