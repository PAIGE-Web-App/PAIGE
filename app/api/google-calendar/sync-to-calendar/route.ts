import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

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

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('[google-calendar/sync-to-calendar] Missing Google OAuth environment variables');
      return NextResponse.json({ success: false, message: 'Server configuration error: missing Google OAuth credentials.' }, { status: 500 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[google-calendar/sync-to-calendar] User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};
    const { calendarId } = userData?.googleCalendar || {};

    if (!accessToken) {
      console.log('[google-calendar/sync-to-calendar] Missing Google access token for user:', userId);
      return NextResponse.json({ success: false, message: 'Google authentication required.' }, { status: 401 });
    }

    if (!calendarId) {
      console.log('[google-calendar/sync-to-calendar] No Google Calendar linked for user:', userId);
      return NextResponse.json({ success: false, message: 'No Google Calendar linked. Please create a calendar first.' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    // Check if token needs refresh
    const tokenExpiry = oauth2Client.credentials.expiry_date;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await userDocRef.set({
          googleTokens: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || refreshToken,
            expiryDate: credentials.expiry_date,
          },
        }, { merge: true });
        console.log('[google-calendar/sync-to-calendar] Access token refreshed successfully');
      } catch (refreshError) {
        console.error('[google-calendar/sync-to-calendar] Error refreshing token:', refreshError);
        return NextResponse.json({ success: false, message: 'Failed to refresh Google authentication.' }, { status: 401 });
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Clear existing events for this list (optional - you might want to keep them)
    // For now, we'll just add/update events
    
    let syncedCount = 0;
    let errorCount = 0;

    for (const todoItem of todoItems) {
      try {
        if (!todoItem.deadline) {
          console.log('[google-calendar/sync-to-calendar] Skipping todo without deadline:', todoItem.id);
          continue;
        }

        const startDate = new Date(todoItem.deadline);
        const endDate = todoItem.endDate ? new Date(todoItem.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

        const event = {
          summary: todoItem.name,
          description: `${todoItem.note || ''}${todoItem.note ? '\n' : ''}List: ${todoItem.listName || 'All Items'}${todoItem.category ? ` | Category: ${todoItem.category}` : ''}`,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: 'UTC',
          },
          colorId: '1', // Blue color
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
        const existingEvents = await calendar.events.list({
          calendarId: calendarId,
          privateExtendedProperty: [`paigeTodoId=${todoItem.id}`],
        });

        if (existingEvents.data.items && existingEvents.data.items.length > 0) {
          // Update existing event
          const existingEvent = existingEvents.data.items[0];
          await calendar.events.update({
            calendarId: calendarId,
            eventId: existingEvent.id!,
            requestBody: event,
          });
          console.log('[google-calendar/sync-to-calendar] Updated event for todo:', todoItem.id);
        } else {
          // Create new event
          await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event,
          });
          console.log('[google-calendar/sync-to-calendar] Created event for todo:', todoItem.id);
        }

        syncedCount++;
      } catch (error) {
        console.error('[google-calendar/sync-to-calendar] Error syncing todo:', todoItem.id, error);
        errorCount++;
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
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json({ success: false, message: 'Google authentication expired. Please re-authenticate.' }, { status: 401 });
      }
      if (error.message.includes('quota')) {
        return NextResponse.json({ success: false, message: 'Google API quota exceeded.' }, { status: 429 });
      }
    }

    return NextResponse.json({ success: false, message: 'An error occurred while syncing to Google Calendar.' }, { status: 500 });
  }
} 