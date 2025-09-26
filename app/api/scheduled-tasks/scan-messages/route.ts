/**
 * Scheduled Message Scanning Task
 * 
 * Runs periodically to scan new messages for todo updates and suggestions
 * Can be triggered by cron jobs, webhooks, or manual requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting scheduled message scanning task');
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Get all users who have Gmail connected
    const usersSnapshot = await adminDb
      .collection('users')
      .where('gmailConnected', '==', true)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No users with Gmail connected',
        usersProcessed: 0,
        totalTodosSuggested: 0,
        totalTodosUpdated: 0
      });
    }

    const results = [];
    let totalTodosSuggested = 0;
    let totalTodosUpdated = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        console.log(`Processing user ${userId} for message scanning`);

        // Call the scan messages API for this user
        const scanResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scan-messages-for-todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            scanType: 'new_messages',
            maxMessages: 10, // Limit for scheduled scans
            enableRAG: true
          }),
        });

        if (scanResponse.ok) {
          const scanResult = await scanResponse.json();
          results.push({
            userId,
            success: true,
            ...scanResult
          });
          totalTodosSuggested += scanResult.todosSuggested || 0;
          totalTodosUpdated += scanResult.todosUpdated || 0;
        } else {
          console.error(`Scan failed for user ${userId}:`, await scanResponse.text());
          results.push({
            userId,
            success: false,
            error: 'Scan API failed'
          });
        }

      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    // Log summary
    const successfulScans = results.filter(r => r.success).length;
    console.log(`Scheduled message scanning completed: ${successfulScans}/${results.length} users processed`);

    return NextResponse.json({
      success: true,
      message: 'Scheduled message scanning completed',
      usersProcessed: results.length,
      successfulScans,
      totalTodosSuggested,
      totalTodosUpdated,
      results
    });

  } catch (error) {
    console.error('Scheduled message scanning error:', error);
    return NextResponse.json(
      { 
        error: 'Scheduled message scanning failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual triggering
export async function GET(request: NextRequest) {
  return POST(request);
}
