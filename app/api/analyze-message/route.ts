import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Build the analysis prompt
    let prompt = `You are an AI assistant that analyzes wedding planning messages to detect actionable items and prepare them for integration with an existing AI to-do generation system.

Message to analyze: "${messageContent}"

Context:
- Vendor Category: ${vendorCategory || 'Unknown'}
- Vendor Name: ${vendorName || 'Unknown'}
- Wedding Date: ${weddingContext?.weddingDate || 'Not specified'}
- Wedding Location: ${weddingContext?.weddingLocation || 'Not specified'}
- Guest Count: ${weddingContext?.guestCount || 'Not specified'}
- Budget: ${weddingContext?.maxBudget || 'Not specified'}
- Vibe: ${weddingContext?.vibe || 'Not specified'}

Please analyze this message and return a JSON response with the following structure:
{
  "actionableItems": [
    {
      "title": "Brief description of the action item",
      "description": "More detailed description",
      "priority": "high|medium|low",
      "category": "vendor|payment|timeline|logistics|other",
      "dueDate": "YYYY-MM-DD or null",
      "estimatedTime": "X hours or null",
      "dependencies": ["list of other action items this depends on"],
      "notes": "Additional context or notes"
    }
  ],
  "sentiment": "positive|neutral|negative",
  "urgency": "high|medium|low",
  "requiresResponse": true|false,
  "suggestedResponse": "Suggested response text or null",
  "keyPoints": ["list of key points from the message"],
  "nextSteps": ["suggested next steps"]
}

Focus on extracting concrete, actionable items that can be turned into to-do items. Be specific about deadlines, requirements, and dependencies.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert wedding planning assistant. Analyze messages to extract actionable items and provide structured JSON responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const analysisText = completion.choices[0].message.content;
    
    // Try to parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisText?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback analysis
      analysis = {
        actionableItems: [],
        sentiment: 'neutral',
        urgency: 'low',
        requiresResponse: false,
        suggestedResponse: null,
        keyPoints: [messageContent.substring(0, 100) + '...'],
        nextSteps: ['Review message manually']
      };
    }

    // Get credit information from request headers (set by credit middleware)
    const creditsRequired = req.headers.get('x-credits-required');
    const creditsRemaining = req.headers.get('x-credits-remaining');
    const userId = req.headers.get('x-user-id');

    const response = NextResponse.json({
      success: true,
      analysis,
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