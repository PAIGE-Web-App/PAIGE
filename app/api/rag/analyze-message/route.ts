/**
 * RAG Message Analysis API Endpoint
 * 
 * This endpoint processes messages through the dedicated message analysis workflow
 * for todo detection and suggestions. It integrates with the existing credit system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';
import { AIFeature } from '@/types/credits';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message_content, 
      subject = '',
      vendor_category = 'Unknown',
      vendor_name = 'Unknown',
      existing_todos = [],
      wedding_context = {},
      user_id,
      message_id = null
    } = body;

    // Validate required fields
    if (!message_content || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: message_content, user_id' },
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

    // Call the dedicated message analysis workflow
    const result = await processMessageWithRAG({
      message_content,
      subject,
      vendor_category,
      vendor_name,
      existing_todos,
      wedding_context,
      user_id,
      message_id
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Message analysis failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('RAG message analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processMessageWithRAG(messageData: {
  message_content: string;
  subject: string;
  vendor_category: string;
  vendor_name: string;
  existing_todos: any[];
  wedding_context: any;
  user_id: string;
  message_id: string | null;
}) {
  try {
    // Get the n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_MESSAGE_ANALYSIS_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      throw new Error('N8N message analysis webhook URL not configured');
    }

    // Call the n8n workflow
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error(`N8N workflow failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Validate the response structure
    if (!result.success) {
      throw new Error(result.error || 'N8N workflow returned error');
    }

    return {
      success: true,
      analysis: result.analysis,
      metadata: result.metadata
    };

  } catch (error) {
    console.error('RAG message analysis processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
