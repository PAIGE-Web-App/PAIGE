import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to trigger the Gmail auth banner
 * This helps verify that the custom event system is working
 */

export async function POST(req: NextRequest) {
  try {
    // This simulates what would happen when a Gmail API call fails with auth error
    console.log('Test: Triggering Gmail auth banner via custom event');
    
    // In a real scenario, this would be called from the error handler
    // For testing, we'll just return success and let the frontend know to trigger the event
    
    return NextResponse.json({ 
      success: true,
      message: 'Gmail auth banner should be triggered',
      triggerBanner: true
    });
    
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      success: false,
      message: error.message
    }, { status: 500 });
  }
}
