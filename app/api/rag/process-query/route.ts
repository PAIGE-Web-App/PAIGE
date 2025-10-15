/**
 * RAG Query Processing API Endpoint
 * 
 * This endpoint processes queries through the RAG system to provide
 * context-aware responses. It integrates with the existing credit system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCreditValidation } from '@/lib/creditMiddleware';
// import { processQueryWithRAG } from '@/lib/ragService';
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

    // Process query through RAG system via n8n webhook
    let result: { 
      success: boolean; 
      error?: string; 
      context?: string; 
      sources?: any[]; 
      confidence?: number; 
    } = { success: false, error: 'RAG processing failed' };
    
    try {
      const n8nWebhookUrl = process.env.RAG_N8N_WEBHOOK_URL;
      if (!n8nWebhookUrl) {
        return NextResponse.json(
          { error: 'RAG_N8N_WEBHOOK_URL not configured' },
          { status: 500 }
        );
      }

      // Call n8n webhook for query processing
      const response = await fetch(`${n8nWebhookUrl}/process-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RAG_N8N_API_KEY || ''}`
        },
        body: JSON.stringify({
          query: query,
          user_id: user_id,
          user_document: user_document,
          context: context,
          contextType: body.contextType || 'message_analysis'
        })
      });

      if (response.ok) {
        const data = await response.json();
        result = {
          success: true,
          context: data.context || data.answer || '',
          sources: data.sources || [],
          confidence: data.confidence || 0.8
        };
      } else {
        result = {
          success: false,
          error: `N8N webhook failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('RAG query processing error:', error);
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Query processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: result.success,
      context: result.context || '',
      sources: result.sources || [],
      confidence: result.confidence || 0.8
    });

  } catch (error) {
    console.error('RAG query processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Note: Credit validation will be added in a future update
// For now, RAG features are free during testing
