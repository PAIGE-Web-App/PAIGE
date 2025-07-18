import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// GET - Retrieve contacts for a user, optionally filtered by placeId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const placeId = searchParams.get('placeId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let queryRef = adminDb.collection(`users/${userId}/contacts`);
    
    // If placeId is provided, filter by it
    if (placeId) {
      queryRef = queryRef.where('placeId', '==', placeId) as any;
    }

    const contactsSnapshot = await queryRef.get();
    const contacts = contactsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ 
      contacts,
      total: contacts.length
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 