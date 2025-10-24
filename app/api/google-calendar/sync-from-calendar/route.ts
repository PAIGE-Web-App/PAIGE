import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { listEvents } from '@/lib/googleCalendarHttp';

export async function POST(req: Request) {
  try {
    console.log('[google-calendar/sync-from-calendar] Route hit');
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[google-calendar/sync-from-calendar] adminDb is undefined');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const { userId } = await req.json();
    console.log('[google-calendar/sync-from-calendar] Payload:', { userId });
    
    if (!userId) {
      console.log('[google-calendar/sync-from-calendar] Missing userId');
      return NextResponse.json({ success: false, message: 'Missing userId.' }, { status: 400 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[google-calendar/sync-from-calendar] User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken } = userData?.googleTokens || {};
    const { calendarId } = userData?.googleCalendar || {};

    if (!accessToken) {
      console.log('[google-calendar/sync-from-calendar] Missing Google access token');
      return NextResponse.json({ 
        success: false, 
        message: 'Google authentication required.',
        requiresReauth: true 
      }, { status: 401 });
    }

    if (!calendarId) {
      console.log('[google-calendar/sync-from-calendar] No Google Calendar linked for user:', userId);
      return NextResponse.json({ success: false, message: 'No Google Calendar linked. Please create a calendar first.' }, { status: 400 });
    }

    // Fetch events from the next 2 years
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 2);

    console.log('[google-calendar/sync-from-calendar] Fetching events from calendar:', calendarId);
    
    const events = await listEvents(accessToken, calendarId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 250
    });

    console.log('[google-calendar/sync-from-calendar] Found events:', events.length);

    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    const todoItemsRef = adminDb.collection(`users/${userId}/todoItems`);

    for (const event of events) {
      try {
        const paigeTodoId = event.extendedProperties?.private?.paigeTodoId;
        
        if (!paigeTodoId) {
          // Manually entered event in Google Calendar - create new todo
          console.log('[google-calendar/sync-from-calendar] Processing manually entered event:', event.id);
          
          const start = event.start?.dateTime || event.start?.date;
          const end = event.end?.dateTime || event.end?.date;
          
          if (!start) {
            console.log('[google-calendar/sync-from-calendar] Skipping event without start time:', event.id);
            continue;
          }

          const todoData = {
            name: event.summary || 'Untitled Task',
            note: event.description || '',
            deadline: admin.firestore.Timestamp.fromDate(new Date(start)),
            endDate: end ? admin.firestore.Timestamp.fromDate(new Date(end)) : null,
            category: 'Uncategorized',
            isCompleted: false,
            listId: 'all',
            userId: userId,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
            orderIndex: Date.now(),
          };

          const newTodoRef = todoItemsRef.doc();
          await newTodoRef.set(todoData);
          
          console.log('[google-calendar/sync-from-calendar] Created todo from manually entered event:', newTodoRef.id);
          importedCount++;
          continue;
        }

        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        
        if (!start) {
          console.log('[google-calendar/sync-from-calendar] Skipping event without start time:', event.id);
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

        const existingTodoDocRef = todoItemsRef.doc(paigeTodoId);
        const existingTodoDoc = await existingTodoDocRef.get();
        
        if (existingTodoDoc.exists) {
          await existingTodoDocRef.update(todoData);
          console.log('[google-calendar/sync-from-calendar] Updated todo:', paigeTodoId);
          updatedCount++;
        } else {
          await existingTodoDocRef.set({
            ...todoData,
            createdAt: admin.firestore.Timestamp.now(),
            orderIndex: Date.now(),
          });
          console.log('[google-calendar/sync-from-calendar] Created todo:', paigeTodoId);
          importedCount++;
        }

      } catch (error) {
        console.error('[google-calendar/sync-from-calendar] Error processing event:', event.id, error);
        errorCount++;
      }
    }

    // Update last sync timestamp
    await userDocRef.set({
      googleCalendar: {
        lastSyncFromAt: admin.firestore.Timestamp.now(),
        lastSyncFromCount: importedCount + updatedCount,
        lastSyncFromErrors: errorCount,
      },
    }, { merge: true });

    console.log('[google-calendar/sync-from-calendar] Sync completed:', { importedCount, updatedCount, errorCount });

    return NextResponse.json({ 
      success: true, 
      importedCount,
      updatedCount,
      errorCount,
      message: `Successfully imported ${importedCount} new items and updated ${updatedCount} existing items from Google Calendar.${errorCount > 0 ? ` ${errorCount} items failed.` : ''}` 
    });

  } catch (error: any) {
    console.error('[google-calendar/sync-from-calendar] ERROR:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json({ 
          success: false, 
          message: 'Google authentication expired. Please re-authenticate.',
          requiresReauth: true 
        }, { status: 401 });
      }
      if (error.message.includes('quota')) {
        return NextResponse.json({ success: false, message: 'Google API quota exceeded.' }, { status: 429 });
      }
    }

    return NextResponse.json({ success: false, message: 'An error occurred while syncing from Google Calendar.' }, { status: 500 });
  }
}
