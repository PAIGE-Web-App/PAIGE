/**
 * Gmail Message Scan Webhook
 * 
 * Triggered when new Gmail messages are received
 * Automatically scans for todo updates and suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, messageIds, contactId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`Gmail webhook triggered for user ${userId}, messages: ${messageIds?.length || 'all'}`);

    // Call the scan messages API
    const scanResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scan-messages-for-todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        contactId,
        messageIds,
        scanType: 'new_messages',
        maxMessages: 20,
        enableRAG: true
      }),
    });

    if (!scanResponse.ok) {
      throw new Error(`Scan API failed: ${scanResponse.status}`);
    }

    const scanResult = await scanResponse.json();

    // Log results
    if (scanResult.success) {
      console.log(`Gmail webhook scan completed for user ${userId}:`, {
        messagesScanned: scanResult.messagesScanned,
        todosSuggested: scanResult.todosSuggested,
        todosUpdated: scanResult.todosUpdated
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail webhook processed successfully',
      scanResult
    });

  } catch (error) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Gmail webhook processing failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
