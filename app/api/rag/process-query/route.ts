/**
 * RAG Query Processing API Endpoint
 * 
 * This endpoint processes queries through the RAG system to provide
 * context-aware responses. It integrates with the existing credit system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { processQueryWithRAG } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';
import { AIFeature } from '@/types/credits';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, user_id, user_document, context } = body;

    // Validate required fields
    if (!query || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: query, user_id' },
        { status: 400 }
      );
    }

    // Check if RAG is enabled for this user
    if (!shouldUseRAG(user_id, user_id)) {
      return NextResponse.json(
        { error: 'RAG not enabled for this user' },
        { status: 403 }
      );
    }

    // Process query through RAG system
    const result = await processQueryWithRAG({
      query,
      user_id,
      user_document,
      context
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Query processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('RAG query processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Wrap with credit validation middleware
export const POSTWithCredits = withCreditValidation(
  POST,
  AIFeature.RAG_QUERY_PROCESSING,
  'RAG Query Processing'
);
