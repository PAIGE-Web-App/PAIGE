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

    const validation = await creditService.validateCredits(userId, feature);

    return NextResponse.json({ validation });
  } catch (error) {
    console.error('Error validating credits:', error);
    return NextResponse.json(
      { error: 'Failed to validate credits' },
      { status: 500 }
    );
  }
}
