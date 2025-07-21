import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const userId = searchParams.get('userId');

  console.log('check-vendor-exists API called with:', { placeId, userId });

  if (!placeId || !userId) {
    console.log('Missing placeId or userId');
    return NextResponse.json({ error: 'Missing placeId or userId' }, { status: 400 });
  }

  try {
    // Check if vendor exists in user's vendors collection using admin SDK
    const vendorsRef = adminDb.collection(`users/${userId}/vendors`);
    const querySnapshot = await vendorsRef.where('placeId', '==', placeId).get();

    const exists = !querySnapshot.empty;
    const vendorId = querySnapshot.empty ? null : querySnapshot.docs[0].id;
    
    console.log('Vendor existence check result:', { exists, vendorId, placeId, userId });

    return NextResponse.json({ 
      exists,
      vendorId
    });
  } catch (error) {
    console.error('Error checking vendor existence:', error);
    return NextResponse.json({ error: 'Failed to check vendor existence' }, { status: 500 });
  }
} 