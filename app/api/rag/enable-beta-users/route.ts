import { NextRequest, NextResponse } from 'next/server';
import { enableRAGForUsers, getRAGConfigForLogging } from '@/lib/ragFeatureFlag';

export async function POST(request: NextRequest) {
  try {
    const { emails } = await request.json();
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected emails array.' },
        { status: 400 }
      );
    }

    // Enable RAG for the specified beta users
    enableRAGForUsers(emails);
    const config = getRAGConfigForLogging();
    
    return NextResponse.json({
      success: true,
      message: `Enabled RAG for ${emails.length} beta users`,
      betaUsers: emails,
      config
    });
  } catch (error) {
    console.error('Error enabling beta users:', error);
    return NextResponse.json(
      { error: 'Failed to enable beta users' },
      { status: 500 }
    );
  }
}
