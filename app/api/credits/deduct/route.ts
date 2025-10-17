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

    // Trigger credit alert check
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/trigger-credit-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Failed to trigger credit alert:', error);
      // Don't block credit deduction if email fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deducting credits:', error);
    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    );
  }
}
