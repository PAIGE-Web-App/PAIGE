import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export async function POST(req: Request) {
  try {
    console.log('[google-calendar/create] Route hit');
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[google-calendar/create] adminDb is undefined');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const { userId, calendarName } = await req.json();
    console.log('[google-calendar/create] Payload:', { userId, calendarName });
    
    if (!userId || !calendarName) {
      console.log('[google-calendar/create] Missing userId or calendarName');
      return NextResponse.json({ success: false, message: 'Missing userId or calendarName.' }, { status: 400 });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('[google-calendar/create] Missing Google OAuth environment variables');
      return NextResponse.json({ success: false, message: 'Server configuration error: missing Google OAuth credentials.' }, { status: 500 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[google-calendar/create] User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken) {
      console.log('[google-calendar/create] Missing Google access token for user:', userId);
      return NextResponse.json({ success: false, message: 'Google authentication required.' }, { status: 401 });
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
        console.log('[google-calendar/create] Access token refreshed successfully');
      } catch (refreshError) {
        console.error('[google-calendar/create] Error refreshing token:', refreshError);
        return NextResponse.json({ success: false, message: 'Failed to refresh Google authentication.' }, { status: 401 });
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // First, check if user already has a Paige calendar
    console.log('[google-calendar/create] Checking for existing Paige calendars...');
    const calendarListResponse = await calendar.calendarList.list();
    const existingCalendars = calendarListResponse.data.items || [];
    
    // Look for existing Paige calendars (by name pattern)
    const paigeCalendarPattern = /(paige|wedding.*to.*do)/i;
    const existingPaigeCalendar = existingCalendars.find(cal => 
      cal.summary && paigeCalendarPattern.test(cal.summary) && 
      cal.accessRole === 'owner'
    );
    
    let calendarId: string;
    let isReusingExisting = false;
    
    if (existingPaigeCalendar) {
      console.log('[google-calendar/create] Found existing Paige calendar:', existingPaigeCalendar.id);
      calendarId = existingPaigeCalendar.id!;
      isReusingExisting = true;
      
      // Update the existing calendar name if it's different
      if (existingPaigeCalendar.summary !== calendarName) {
        try {
          await calendar.calendars.update({
            calendarId: calendarId,
            requestBody: {
              summary: calendarName,
              description: 'Wedding to-do items synced from Paige',
            },
          });
          console.log('[google-calendar/create] Updated existing calendar name');
        } catch (updateError) {
          console.warn('[google-calendar/create] Failed to update calendar name:', updateError);
        }
      }
    } else {
      // Create a new calendar
      const calendarResource = {
        summary: calendarName,
        description: 'Wedding to-do items synced from Paige',
        timeZone: 'UTC',
        colorId: '1', // Blue color
      };

      console.log('[google-calendar/create] Creating new calendar:', calendarResource);
      
      const calendarResponse = await calendar.calendars.insert({
        requestBody: calendarResource,
      });

      calendarId = calendarResponse.data.id!;
      console.log('[google-calendar/create] New calendar created with ID:', calendarId);
    }

    // Set up webhook for real-time sync
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google-calendar/webhook`;
    
    try {
      // Create a webhook channel for the calendar
      const webhookResponse = await calendar.events.watch({
        calendarId: calendarId!,
        requestBody: {
          id: `paige-calendar-${userId}`,
          type: 'web_hook',
          address: webhookUrl,
          token: userId, // Use userId as token for verification
        },
      });

      console.log('[google-calendar/create] Webhook created:', webhookResponse.data);
    } catch (webhookError) {
      console.warn('[google-calendar/create] Failed to create webhook (this is normal for local development):', webhookError);
      // Don't fail the entire request if webhook creation fails
    }

    // Store calendar ID and webhook info in Firestore
    await userDocRef.set({
      googleCalendar: {
        calendarId: calendarId,
        calendarName: calendarName,
        webhookUrl: webhookUrl,
        webhookId: `paige-calendar-${userId}`,
        createdAt: admin.firestore.Timestamp.now(),
        lastSyncAt: admin.firestore.Timestamp.now(),
      },
    }, { merge: true });

    console.log('[google-calendar/create] Calendar info stored in Firestore');

    return NextResponse.json({ 
      success: true, 
      calendarId,
      calendarName,
      isReusingExisting,
      message: isReusingExisting 
        ? 'Existing Google Calendar found and linked successfully.' 
        : 'Google Calendar created and linked successfully.' 
    });

  } catch (error: any) {
    console.error('[google-calendar/create] ERROR:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json({ success: false, message: 'Google authentication expired. Please re-authenticate.' }, { status: 401 });
      }
      if (error.message.includes('quota')) {
        return NextResponse.json({ success: false, message: 'Google API quota exceeded.' }, { status: 429 });
      }
    }

    return NextResponse.json({ success: false, message: 'An error occurred while creating Google Calendar.' }, { status: 500 });
  }
} 