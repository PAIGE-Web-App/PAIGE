import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    console.log('[google-calendar/webhook] Route hit');
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[google-calendar/webhook] adminDb is undefined');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const body = await req.json();
    console.log('[google-calendar/webhook] Webhook payload:', body);

    // Handle webhook verification
    if (body.type === 'webhook_verification') {
      console.log('[google-calendar/webhook] Webhook verification received');
      return NextResponse.json({ success: true, message: 'Webhook verified' });
    }

    // Handle calendar events
    if (body.type === 'calendar_events') {
      const { userId, calendarId, events } = body;
      
      if (!userId || !calendarId || !events) {
        console.log('[google-calendar/webhook] Missing required webhook data');
        return NextResponse.json({ success: false, message: 'Missing required webhook data.' }, { status: 400 });
      }

      console.log('[google-calendar/webhook] Processing calendar events for user:', userId, 'events:', events.length);

      // Process each event
      for (const event of events) {
        try {
          // Skip events that don't have Paige metadata
          const paigeTodoId = event.extendedProperties?.private?.paigeTodoId;
          if (!paigeTodoId) {
            console.log('[google-calendar/webhook] Skipping non-Paige event:', event.id);
            continue;
          }

          const start = event.start?.dateTime || event.start?.date;
          const end = event.end?.dateTime || event.end?.date;
          
          if (!start) {
            console.log('[google-calendar/webhook] Skipping event without start time:', event.id);
            continue;
          }

          const todoData = {
            name: event.summary || 'Untitled Task',
            note: event.description || '',
            deadline: admin.firestore.Timestamp.fromDate(new Date(start)),
            endDate: end ? admin.firestore.Timestamp.fromDate(new Date(end)) : null,
            category: event.extendedProperties?.private?.paigeCategory || 'Uncategorized',
            isCompleted: event.extendedProperties?.private?.paigeCompleted === 'true',
            listId: event.extendedProperties?.private?.paigeListId || 'all',
            userId: userId,
            updatedAt: admin.firestore.Timestamp.now(),
          };

          // Get the user's todo items collection
          const todoItemsRef = adminDb.collection(`users/${userId}/todoItems`);
          
          // Check if todo item already exists
          const existingTodoDocRef = todoItemsRef.doc(paigeTodoId);
          const existingTodoDoc = await existingTodoDocRef.get();
          
          if (existingTodoDoc.exists) {
            // Update existing todo
            await existingTodoDocRef.update(todoData);
            console.log('[google-calendar/webhook] Updated todo from webhook:', paigeTodoId);
          } else {
            // Create new todo with the paigeTodoId as the document ID
            await existingTodoDocRef.set({
              ...todoData,
              createdAt: admin.firestore.Timestamp.now(),
              orderIndex: Date.now(), // Simple ordering
            });
            console.log('[google-calendar/webhook] Created todo from webhook:', paigeTodoId);
          }

        } catch (error) {
          console.error('[google-calendar/webhook] Error processing event:', event.id, error);
        }
      }

      // Update last webhook sync timestamp
      const userDocRef = adminDb.collection('users').doc(userId);
      await userDocRef.set({
        googleCalendar: {
          lastWebhookSyncAt: admin.firestore.Timestamp.now(),
          lastWebhookEventCount: events.length,
        },
      }, { merge: true });

      console.log('[google-calendar/webhook] Webhook processing completed');
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });

  } catch (error: any) {
    console.error('[google-calendar/webhook] ERROR:', error);
    return NextResponse.json({ success: false, message: 'An error occurred while processing webhook.' }, { status: 500 });
  }
}

// Handle GET requests for webhook verification
export async function GET(req: Request) {
  try {
    console.log('[google-calendar/webhook] GET request for verification');
    const { searchParams } = new URL(req.url);
    const challenge = searchParams.get('challenge');
    
    if (challenge) {
      console.log('[google-calendar/webhook] Returning challenge response:', challenge);
      return new NextResponse(challenge, { status: 200 });
    }
    
    return NextResponse.json({ success: true, message: 'Webhook endpoint is active' });
  } catch (error) {
    console.error('[google-calendar/webhook] GET ERROR:', error);
    return NextResponse.json({ success: false, message: 'Error processing GET request' }, { status: 500 });
  }
} 