import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check current Gmail auth state
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false,
        message: 'No userId provided' 
      }, { status: 400 });
    }

    // This endpoint just returns the current state
    // The actual check would be done by the GmailAuthContext
    return NextResponse.json({ 
      success: true,
      message: 'Check browser console for GmailAuthContext state',
      userId,
      timestamp: new Date().toISOString(),
      instructions: [
        '1. Open browser console',
        '2. Look for GmailAuthContext logs',
        '3. Check if needsReauth is true',
        '4. Try triggering custom event manually'
      ]
    });
    
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      success: false,
      message: error.message
    }, { status: 500 });
  }
}
