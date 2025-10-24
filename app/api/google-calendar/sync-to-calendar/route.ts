import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { createEvent, updateEvent, listEvents } from '@/lib/googleCalendarHttp';

export async function POST(req: Request) {
  try {
    console.log('[google-calendar/sync-to-calendar] Route hit');
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[google-calendar/sync-to-calendar] adminDb is undefined');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const { userId, todoItems } = await req.json();
    console.log('[google-calendar/sync-to-calendar] Payload:', { userId, todoItemsCount: todoItems?.length });
    
    if (!userId || !todoItems || !Array.isArray(todoItems)) {
      console.log('[google-calendar/sync-to-calendar] Missing required parameters');
      return NextResponse.json({ success: false, message: 'Missing userId or todoItems.' }, { status: 400 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[google-calendar/sync-to-calendar] User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken } = userData?.googleTokens || {};
    const { calendarId } = userData?.googleCalendar || {};

    if (!accessToken) {
      console.log('[google-calendar/sync-to-calendar] Missing Google access token for user:', userId);
      return NextResponse.json({ 
        success: false, 
        message: 'Google authentication required.',
        requiresReauth: true 
      }, { status: 401 });
    }

    if (!calendarId) {
      console.log('[google-calendar/sync-to-calendar] No Google Calendar linked for user:', userId);
      return NextResponse.json({ success: false, message: 'No Google Calendar linked. Please create a calendar first.' }, { status: 400 });
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const todoItem of todoItems) {
      try {
        if (!todoItem.deadline) {
          console.log('[google-calendar/sync-to-calendar] Skipping todo without deadline:', todoItem.id);
          continue;
        }

        const startDate = new Date(todoItem.deadline);
        const endDate = todoItem.endDate ? new Date(todoItem.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

        const event = {
          summary: todoItem.name,
          description: `${todoItem.note || ''}${todoItem.note ? '\n' : ''}List: ${todoItem.listName || 'All Items'}${todoItem.category ? ` | Category: ${todoItem.category}` : ''}`,
          start: {
            dateTime: startDate.toISOString(),
          },
          end: {
            dateTime: endDate.toISOString(),
          },
          extendedProperties: {
            private: {
              paigeTodoId: todoItem.id,
              paigeListId: 'all',
              paigeCategory: todoItem.category || 'Uncategorized',
              paigeCompleted: todoItem.isCompleted ? 'true' : 'false',
            },
          },
        };

        // Check if event already exists
        const existingEvents = await listEvents(accessToken, calendarId, {
          privateExtendedProperty: `paigeTodoId=${todoItem.id}`
        });

        if (existingEvents.length > 0) {
          // Update existing event
          const existingEvent = existingEvents[0];
          await updateEvent(accessToken, calendarId, existingEvent.id!, event);
          console.log('[google-calendar/sync-to-calendar] Updated event for todo:', todoItem.id);
        } else {
          // Create new event
          await createEvent(accessToken, calendarId, event);
          console.log('[google-calendar/sync-to-calendar] Created event for todo:', todoItem.id);
        }

        syncedCount++;
      } catch (error: any) {
        console.error('[google-calendar/sync-to-calendar] Error syncing todo:', todoItem.id, error);
        errorCount++;
        
        // Check if this is an authentication error
        if (error.message?.includes('401') || error.message?.includes('Invalid Credentials')) {
          console.log('[google-calendar/sync-to-calendar] Authentication error detected, stopping sync');
          return NextResponse.json({ 
            success: false, 
            message: 'Google authentication expired. Please re-authenticate.',
            requiresReauth: true 
          }, { status: 401 });
        }
      }
    }

    // Update last sync timestamp
    await userDocRef.set({
      googleCalendar: {
        lastSyncAt: admin.firestore.Timestamp.now(),
        lastSyncCount: syncedCount,
        lastSyncErrors: errorCount,
      },
    }, { merge: true });

    console.log('[google-calendar/sync-to-calendar] Sync completed:', { syncedCount, errorCount });

    return NextResponse.json({ 
      success: true, 
      syncedCount,
      errorCount,
      message: `Successfully synced ${syncedCount} items to Google Calendar.${errorCount > 0 ? ` ${errorCount} items failed.` : ''}` 
    });

  } catch (error: any) {
    console.error('[google-calendar/sync-to-calendar] ERROR:', error);
    
    // Handle specific error types
    if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid Credentials') || error.message?.includes('401')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Google authentication expired. Please re-authenticate.',
        requiresReauth: true 
      }, { status: 401 });
    }
    if (error.message?.includes('quota')) {
      return NextResponse.json({ success: false, message: 'Google API quota exceeded.' }, { status: 429 });
    }

    return NextResponse.json({ success: false, message: 'An error occurred while syncing to Google Calendar.' }, { status: 500 });
  }
}
