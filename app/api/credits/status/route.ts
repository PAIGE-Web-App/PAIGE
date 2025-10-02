import { NextRequest, NextResponse } from 'next/server';
import { creditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const credits = await creditService.getUserCredits(userId);
    
    if (!credits) {
      return NextResponse.json(
        { error: 'User credits not found' },
        { status: 404 }
      );
    }

    // Debug logging
    console.log('🔍 Credits API returning:', {
      subscriptionTier: credits.subscriptionTier,
      dailyCredits: credits.dailyCredits,
      bonusCredits: credits.bonusCredits,
      userType: credits.userType
    });

    return NextResponse.json({ credits });
  } catch (error) {
    console.error('Error getting user credits:', error);
    return NextResponse.json(
      { error: 'Failed to get user credits' },
      { status: 500 }
    );
  }
}
