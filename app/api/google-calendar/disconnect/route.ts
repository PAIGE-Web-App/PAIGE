import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    const adminDb = getAdminDb();
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId.' }, { status: 400 });
    }
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.update({ googleCalendar: admin.firestore.FieldValue.delete() });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Failed to disconnect Google Calendar.' }, { status: 500 });
  }
} 