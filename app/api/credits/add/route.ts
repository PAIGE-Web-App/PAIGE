import { NextRequest, NextResponse } from 'next/server';
import { creditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, type, description, metadata } = await request.json();

    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'User ID and amount required' },
        { status: 400 }
      );
    }

    const success = await creditService.addCredits(
      userId, 
      amount, 
      type || 'purchased', 
      description, 
      metadata
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add credits' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json(
      { error: 'Failed to add credits' },
      { status: 500 }
    );
  }
}
