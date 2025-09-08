/**
 * RAG Document Processing API Endpoint
 * 
 * This endpoint processes documents through the RAG system for storage
 * in the vector database. It integrates with the existing credit system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { processDocumentWithRAG } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';
import { AIFeature } from '@/types/credits';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id, document_content, source, user_id, document_type } = body;

    // Validate required fields
    if (!document_id || !document_content || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: document_id, document_content, user_id' },
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

    // Process document through RAG system
    const result = await processDocumentWithRAG({
      document_id,
      document_content,
      source: source || 'unknown',
      user_id,
      document_type: document_type || 'user_document'
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Document processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('RAG document processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Wrap with credit validation middleware
export const POSTWithCredits = withCreditValidation(
  POST,
  AIFeature.RAG_DOCUMENT_PROCESSING,
  'RAG Document Processing'
);
