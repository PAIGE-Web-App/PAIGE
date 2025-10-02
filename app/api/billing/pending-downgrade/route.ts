import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user document
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const pendingDowngrade = userData?.billing?.pendingDowngrade || null;

    return NextResponse.json({ pendingDowngrade });

  } catch (error) {
    console.error('Error getting pending downgrade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { targetPlan, targetPlanName, effectiveDate } = await request.json();

    if (!targetPlan || !targetPlanName || !effectiveDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update user document with pending downgrade
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      'billing.pendingDowngrade': {
        targetPlan,
        targetPlanName,
        effectiveDate,
        createdAt: new Date()
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving pending downgrade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Remove pending downgrade from user document
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      'billing.pendingDowngrade': FieldValue.delete()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error clearing pending downgrade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
