import { NextRequest, NextResponse } from 'next/server';
import { creditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const { userId, feature } = await request.json();

    if (!userId || !feature) {
      return NextResponse.json(
        { error: 'User ID and feature required' },
        { status: 400 }
      );
    }

    const hasAccess = await creditService.hasFeatureAccess(userId, feature);

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Error checking feature access:', error);
    return NextResponse.json(
      { error: 'Failed to check feature access' },
      { status: 500 }
    );
  }
}
