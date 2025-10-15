import { NextRequest, NextResponse } from 'next/server';
import { MessageAnalysisEngine } from '@/utils/messageAnalysisEngine';
import { withCreditValidation } from '@/lib/creditMiddleware';

const messageAnalysisEngine = new MessageAnalysisEngine();

interface MessageAnalysisRequest {
  messageContent: string;
  vendorCategory?: string;
  vendorName?: string;
  existingTodos?: any[];
  weddingContext?: {
    weddingDate?: string;
    weddingLocation?: string;
    guestCount?: number;
    maxBudget?: number;
    vibe?: string;
  };
  ragContext?: string; // RAG-enhanced context for better analysis
  userId: string; // Required for credit validation
}

async function handleMessageAnalysis(req: NextRequest): Promise<NextResponse> {
  try {
    const { 
      messageContent, 
      vendorCategory, 
      vendorName, 
      existingTodos, 
      weddingContext,
      ragContext,
      userId: requestUserId 
    }: MessageAnalysisRequest = await req.json();

    if (!messageContent) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Use MessageAnalysisEngine for analysis
    const analysisResult = await messageAnalysisEngine.analyzeMessage({
      messageContent,
      vendorName: vendorName || 'Unknown',
      vendorCategory: vendorCategory || 'unknown',
      contactId: 'api-request',
      userId: requestUserId,
      existingTodos: existingTodos || [],
      weddingContext: weddingContext ? {
        weddingDate: weddingContext.weddingDate ? new Date(weddingContext.weddingDate) : undefined,
        weddingLocation: weddingContext.weddingLocation,
        guestCount: weddingContext.guestCount,
        maxBudget: weddingContext.maxBudget,
        vibe: weddingContext.vibe ? [weddingContext.vibe] : undefined
      } : undefined,
      ragContext
    });

    // Get credit information from request headers (set by credit middleware)
    const creditsRequired = req.headers.get('x-credits-required');
    const creditsRemaining = req.headers.get('x-credits-remaining');
    const userId = req.headers.get('x-user-id');

    const response = NextResponse.json({
      success: true,
      analysis: analysisResult,
      credits: {
        required: creditsRequired ? parseInt(creditsRequired) : 0,
        remaining: creditsRemaining ? parseInt(creditsRemaining) : 0,
        userId: userId || undefined
      }
    });

    // Add credit information to response headers for frontend
    if (creditsRequired) response.headers.set('x-credits-required', creditsRequired);
    if (creditsRemaining) response.headers.set('x-credits-remaining', creditsRemaining);
    if (userId) response.headers.set('x-user-id', userId);

    return response;

  } catch (error) {
    console.error('Message analysis error:', error);
    
    // Return a fallback response
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      analysis: {
        actionableItems: [],
        sentiment: 'neutral',
        urgency: 'low',
        requiresResponse: false,
        suggestedResponse: null,
        keyPoints: ['Analysis failed'],
        nextSteps: ['Please try again']
      }
    });
  }
}

// Export the POST function wrapped with credit validation
export const POST = withCreditValidation(handleMessageAnalysis, {
  feature: 'message_analysis',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for message analysis. Please upgrade your plan to continue using AI features.'
});