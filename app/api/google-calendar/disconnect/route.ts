import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    const adminDb = getAdminDb();
    const { userId, disconnectType = 'calendar' } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId.' }, { status: 400 });
    }
    
    const userDocRef = adminDb.collection('users').doc(userId);
    
    if (disconnectType === 'calendar') {
      // Only disconnect calendar, keep Gmail tokens
      await userDocRef.update({ googleCalendar: admin.firestore.FieldValue.delete() });
      return NextResponse.json({ success: true, message: 'Google Calendar disconnected successfully.' });
    } else if (disconnectType === 'gmail') {
      // Only disconnect Gmail, keep calendar
      await userDocRef.update({ 
        googleTokens: admin.firestore.FieldValue.delete(),
        gmailImportCompleted: admin.firestore.FieldValue.delete()
      });
      return NextResponse.json({ success: true, message: 'Gmail integration disconnected successfully.' });
    } else if (disconnectType === 'all') {
      // Disconnect everything
      await userDocRef.update({ 
        googleTokens: admin.firestore.FieldValue.delete(),
        googleCalendar: admin.firestore.FieldValue.delete(),
        gmailImportCompleted: admin.firestore.FieldValue.delete()
      });
      return NextResponse.json({ success: true, message: 'All Google integrations disconnected successfully.' });
    }
    
    return NextResponse.json({ success: false, message: 'Invalid disconnect type.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Failed to disconnect Google integration.' }, { status: 500 });
  }
} 