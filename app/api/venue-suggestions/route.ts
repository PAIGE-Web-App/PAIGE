import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('venueSuggestions').get();
    const suggestions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const db = getAdminDb();
    const docRef = await db.collection('venueSuggestions').add({
      ...data,
      createdAt: new Date().toISOString(),
      approved: false,
      rejected: false,
    });
    return NextResponse.json({ id: docRef.id, success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, approved, rejected } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = getAdminDb();
    await db.collection('venueSuggestions').doc(id).update({
      approved: !!approved,
      rejected: !!rejected,
      reviewedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 