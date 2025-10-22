import { NextRequest, NextResponse } from 'next/server';
import { performTodoAnalysis } from '@/utils/todoAnalysisService';

/**
 * Analyze messages for todo suggestions
 * Uses the same analysis system as the server-side Gmail import
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, contactEmail } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Analyzing messages for todos - User: ${userId}, Contact: ${contactEmail}`);

    // Create contact data for analysis
    const contacts = contactEmail ? [{
      id: contactEmail,
      name: contactEmail,
      email: contactEmail
    }] : [];

    // Run the analysis using the working system
    const analysisResult = await performTodoAnalysis(
      userId,
      contacts,
      true // Store suggestions
    );

    console.log('✅ Message analysis completed:', {
      messagesAnalyzed: analysisResult.messagesAnalyzed,
      newTodosSuggested: analysisResult.newTodosSuggested,
      totalSuggestions: analysisResult.totalSuggestions
    });

    return NextResponse.json({
      success: true,
      analysisResult
    });

  } catch (error: any) {
    console.error('❌ Message analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Message analysis failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
