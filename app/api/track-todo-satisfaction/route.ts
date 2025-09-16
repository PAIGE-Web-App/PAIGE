/**
 * Todo Satisfaction Tracking API
 * 
 * This endpoint allows users to rate the quality of generated todos
 * for continuous improvement of the smart prompt optimization system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { smartPromptOptimizer } from '@/lib/smartPromptOptimizer';

interface SatisfactionRequest {
  userId: string;
  todoListId?: string;
  satisfaction: number; // 1-5 scale
  categories: string[];
  feedback?: string;
  promptType: string;
  awardCredits?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: SatisfactionRequest = await request.json();
    const { userId, satisfaction, categories, feedback, promptType, awardCredits } = body;

    // Validate input
    if (!userId || !satisfaction || satisfaction < 1 || satisfaction > 5) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Track the satisfaction rating
    await smartPromptOptimizer.trackPromptEffectiveness(
      userId,
      promptType,
      ['user_feedback'],
      categories,
      satisfaction
    );

    // Award bonus credits if requested
    let creditsAwarded = 0;
    if (awardCredits) {
      creditsAwarded = feedback && feedback.trim().length > 0 ? 3 : 1;
      
      // Award credits to user
      try {
        const { creditServiceAdmin } = await import('@/lib/creditServiceAdmin');
        await creditServiceAdmin.addCredits(userId, creditsAwarded, 'bonus');
        console.log(`Awarded ${creditsAwarded} bonus credits to user ${userId} for feedback`);
      } catch (creditError) {
        console.error('Error awarding bonus credits:', creditError);
        // Don't fail the request if credit awarding fails
      }
    }

    // Log feedback if provided
    if (feedback) {
      console.log(`User feedback for ${userId}: ${feedback} (Rating: ${satisfaction}/5)`);
    }

    return NextResponse.json({
      success: true,
      message: 'Satisfaction rating recorded',
      creditsAwarded,
      optimizationStats: smartPromptOptimizer.getOptimizationStats()
    });

  } catch (error) {
    console.error('Error tracking satisfaction:', error);
    return NextResponse.json(
      { error: 'Failed to track satisfaction' },
      { status: 500 }
    );
  }
}
