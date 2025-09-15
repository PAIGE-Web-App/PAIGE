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

// POST - Create a new contact
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      phone, 
      website, 
      category, 
      address, 
      placeId, 
      userId, 
      avatarColor, 
      orderIndex, 
      isVendorContact 
    } = body;

    if (!name || !email || !userId) {
      return NextResponse.json({ 
        error: 'Name, email, and userId are required' 
      }, { status: 400 });
    }

    // Create contact document with all fields
    const contactData = {
      name,
      email,
      phone: phone || '',
      website: website || '',
      category: category || 'Vendor',
      address: address || '',
      placeId: placeId || '',
      userId, // Add userId to the document
      avatarColor: avatarColor || '#364257',
      orderIndex: orderIndex || -new Date().getTime(),
      isVendorContact: isVendorContact || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection(`users/${userId}/contacts`).add(contactData);

    return NextResponse.json({ 
      success: true,
      contactId: docRef.id,
      contact: {
        id: docRef.id,
        ...contactData
      }
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 