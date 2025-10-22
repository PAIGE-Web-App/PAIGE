import { NextRequest, NextResponse } from 'next/server';

// Render service URL
const RENDER_SERVICE_URL = 'https://google-api-microservice.onrender.com';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Gmail-reply proxy API called');
    const requestBody = await req.json();

    const response = await fetch(`${RENDER_SERVICE_URL}/gmail-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ Gmail reply proxy error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail reply proxy.'
    }, { status: 500 });
  }
}