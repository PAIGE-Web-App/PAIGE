import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

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

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('[google-calendar/sync-from-calendar] Missing Google OAuth environment variables');
      return NextResponse.json({ success: false, message: 'Server configuration error: missing Google OAuth credentials.' }, { status: 500 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[google-calendar/sync-from-calendar] User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};
    const { calendarId } = userData?.googleCalendar || {};

    if (!accessToken) {
      console.log('[google-calendar/sync-from-calendar] Missing Google access token for user:', userId);
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
        console.log('[google-calendar/sync-from-calendar] Access token refreshed successfully');
      } catch (refreshError) {
        console.error('[google-calendar/sync-from-calendar] Error refreshing token:', refreshError);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to refresh Google authentication.',
          requiresReauth: true 
        }, { status: 401 });
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get events from the calendar
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30); // Get events from 30 days ago
    
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1); // Get events up to 1 year from now

    const eventsResponse = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = eventsResponse.data.items || [];
    console.log('[google-calendar/sync-from-calendar] Found events:', events.length);

    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Get the user's todo items collection
            const todoItemsRef = adminDb.collection(`users/${userId}/todoItems`);

    for (const event of events) {
      try {
        // Check if this is a Paige-synced event or a manually entered event
        const paigeTodoId = event.extendedProperties?.private?.paigeTodoId;
        
        if (!paigeTodoId) {
          // This is a manually entered event in Google Calendar - create a new todo item
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
            listId: 'all', // Add to "All Items" list
            userId: userId,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
            orderIndex: Date.now(),
          };

          // Create new todo item with a generated ID
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

        // Check if todo item already exists
        const existingTodoDocRef = todoItemsRef.doc(paigeTodoId);
        const existingTodoDoc = await existingTodoDocRef.get();
        
        if (existingTodoDoc.exists) {
          // Update existing todo
          await existingTodoDocRef.update(todoData);
          console.log('[google-calendar/sync-from-calendar] Updated todo:', paigeTodoId);
          updatedCount++;
        } else {
          // Create new todo with the paigeTodoId as the document ID
          await existingTodoDocRef.set({
            ...todoData,
            createdAt: admin.firestore.Timestamp.now(),
            orderIndex: Date.now(), // Simple ordering
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
    
    // Handle specific error types
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