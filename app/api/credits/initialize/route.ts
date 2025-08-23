import { NextRequest, NextResponse } from 'next/server';
import { creditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const { userId, userType, subscriptionTier } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const credits = await creditService.initializeUserCredits(
      userId, 
      userType || 'couple', 
      subscriptionTier || 'free'
    );

    return NextResponse.json({ credits });
  } catch (error) {
    console.error('Error initializing user credits:', error);
    return NextResponse.json(
      { error: 'Failed to initialize user credits' },
      { status: 500 }
    );
  }
}
