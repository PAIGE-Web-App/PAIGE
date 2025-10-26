/**
 * Server-side API route for contextual AI insights
 * Uses existing OPENAI_API_KEY from .env.local
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextualAgent } from '@/lib/agents/contextualAgent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context } = body;

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    // Generate insights using server-side OpenAI API key
    const insights = await contextualAgent.generateContextualInsights(context);

    // Ensure all insights have required fields with fallbacks
    const processedInsights = insights.insights.map((insight: any) => ({
      ...insight,
      priority: insight.priority || 'medium',
      context: insight.context || context.page || 'todo',
    }));

    return NextResponse.json({
      success: true,
      insights: processedInsights,
      summary: insights.summary,
      confidence: insights.confidence,
    });

  } catch (error: any) {
    console.error('Contextual insights API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate contextual insights',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
