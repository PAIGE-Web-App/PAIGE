import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { listName, userId } = await req.json();

    if (!listName || !userId) {
      return NextResponse.json({ 
        error: 'List name and user ID are required' 
      }, { status: 400 });
    }

    // Check if list name already exists for this user
    const listsRef = adminDb.collection(`users/${userId}/todoLists`);
    const querySnapshot = await listsRef
      .where('name', '==', listName.trim())
      .limit(1)
      .get();

    const exists = !querySnapshot.empty;
    
    return NextResponse.json({ 
      exists,
      message: exists ? 'A list with this name already exists' : 'List name is available'
    });
  } catch (error) {
    console.error('Error checking list name existence:', error);
    return NextResponse.json({ 
      error: 'Failed to check list name existence' 
    }, { status: 500 });
  }
}
