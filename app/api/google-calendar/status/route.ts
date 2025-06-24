import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    console.log('[google-calendar/status] Route hit');
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[google-calendar/status] adminDb is undefined');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const { userId } = await req.json();
    console.log('[google-calendar/status] Payload:', { userId });
    
    if (!userId) {
      console.log('[google-calendar/status] Missing userId');
      return NextResponse.json({ success: false, message: 'Missing userId.' }, { status: 400 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[google-calendar/status] User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const googleCalendar = userData?.googleCalendar;

    if (!googleCalendar) {
      console.log('[google-calendar/status] No Google Calendar linked for user:', userId);
      return NextResponse.json({ 
        isLinked: false,
        message: 'No Google Calendar linked'
      });
    }

    console.log('[google-calendar/status] Calendar status found:', googleCalendar);

    return NextResponse.json({
      isLinked: true,
      calendarId: googleCalendar.calendarId,
      calendarName: googleCalendar.calendarName,
      lastSyncAt: googleCalendar.lastSyncAt?.toDate?.()?.toISOString() || googleCalendar.lastSyncAt,
      lastSyncCount: googleCalendar.lastSyncCount,
      lastSyncErrors: googleCalendar.lastSyncErrors,
      lastSyncFromAt: googleCalendar.lastSyncFromAt?.toDate?.()?.toISOString() || googleCalendar.lastSyncFromAt,
      lastSyncFromCount: googleCalendar.lastSyncFromCount,
      lastSyncFromErrors: googleCalendar.lastSyncFromErrors,
      lastWebhookSyncAt: googleCalendar.lastWebhookSyncAt?.toDate?.()?.toISOString() || googleCalendar.lastWebhookSyncAt,
      lastWebhookEventCount: googleCalendar.lastWebhookEventCount,
    });

  } catch (error: any) {
    console.error('[google-calendar/status] ERROR:', error);
    return NextResponse.json({ success: false, message: 'An error occurred while checking calendar status.' }, { status: 500 });
  }
} 