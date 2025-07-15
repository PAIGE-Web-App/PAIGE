import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { vendorId, userId, reason, customReason } = await req.json();
    if (!vendorId) {
      return NextResponse.json({ error: 'Missing vendorId' }, { status: 400 });
    }
    const db = getAdminDb();
    await db.collection('flaggedVendors').doc(vendorId).set({
      vendorId,
      flaggedAt: new Date().toISOString(),
      userId: userId || null,
      reason: reason || 'Not specified',
      customReason: customReason || null,
    }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('flaggedVendors').get();
    const flagged = snap.docs.map(doc => doc.data());
    return NextResponse.json({ flagged });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { vendorId } = await req.json();
    if (!vendorId) {
      return NextResponse.json({ error: 'Missing vendorId' }, { status: 400 });
    }
    const db = getAdminDb();
    await db.collection('flaggedVendors').doc(vendorId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 