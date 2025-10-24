import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { createCalendar, listCalendars } from '@/lib/googleCalendarHttp';

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

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[google-calendar/create] User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken) {
      console.log('[google-calendar/create] No access token found');
      return NextResponse.json({ success: false, message: 'Google authentication required.' }, { status: 401 });
    }

    // Check if user already has a Paige calendar
    console.log('[google-calendar/create] Checking for existing Paige calendars...');
    const calendars = await listCalendars(accessToken);
    
    const paigeCalendarPattern = /(paige|wedding.*to.*do)/i;
    const existingPaigeCalendar = calendars.find(cal => paigeCalendarPattern.test(cal.summary || ''));

    if (existingPaigeCalendar) {
      console.log('[google-calendar/create] Found existing Paige calendar:', existingPaigeCalendar.id);
      
      // Update Firestore with existing calendar
      await userDocRef.set({
        googleCalendar: {
          calendarId: existingPaigeCalendar.id,
          calendarName: existingPaigeCalendar.summary,
          lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      }, { merge: true });

      return NextResponse.json({
        success: true,
        message: 'Found and linked existing Paige calendar!',
        calendarId: existingPaigeCalendar.id,
        calendarName: existingPaigeCalendar.summary
      });
    }

    // Create new calendar
    console.log('[google-calendar/create] Creating new calendar...');
    const newCalendar = await createCalendar(accessToken, calendarName);

    console.log('[google-calendar/create] Calendar created:', newCalendar.id);

    // Store calendar info in Firestore
    await userDocRef.set({
      googleCalendar: {
        calendarId: newCalendar.id,
        calendarName: newCalendar.summary,
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    }, { merge: true });

    console.log('[google-calendar/create] Calendar linked successfully');

    return NextResponse.json({
      success: true,
      message: 'Google Calendar created and linked successfully!',
      calendarId: newCalendar.id,
      calendarName: newCalendar.summary
    });

  } catch (error: any) {
    console.error('[google-calendar/create] Error:', error);
    
    // Check if it's an auth error
    if (error.message?.includes('401') || error.message?.includes('Invalid Credentials')) {
      return NextResponse.json({
        success: false,
        message: 'Google authentication expired. Please re-authenticate.',
        requiresReauth: true
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to create Google Calendar'
    }, { status: 500 });
  }
}
