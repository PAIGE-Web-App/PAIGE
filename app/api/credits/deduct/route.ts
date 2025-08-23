import { NextRequest, NextResponse } from 'next/server';
import { creditService } from '@/lib/creditService';
import { creditEventEmitter } from '@/utils/creditEventEmitter';

export async function POST(request: NextRequest) {
  try {
    const { userId, feature, metadata } = await request.json();

    if (!userId || !feature) {
      return NextResponse.json(
        { error: 'User ID and feature required' },
        { status: 400 }
      );
    }

    const success = await creditService.deductCredits(
      userId, 
      feature, 
      metadata
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      );
    }

    // Emit credit update event to notify clients
    creditEventEmitter.emit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deducting credits:', error);
    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    );
  }
}
