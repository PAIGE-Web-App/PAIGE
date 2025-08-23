import { NextRequest, NextResponse } from 'next/server';
import { creditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const { userId, limitCount } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const history = await creditService.getCreditHistory(
      userId, 
      limitCount || 50
    );

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error getting credit history:', error);
    return NextResponse.json(
      { error: 'Failed to get credit history' },
      { status: 500 }
    );
  }
}
