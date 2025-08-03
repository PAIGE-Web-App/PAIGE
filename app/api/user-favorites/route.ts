import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

// GET - Retrieve user's favorites
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const userFavoritesRef = adminDb.collection('users').doc(userId).collection('favorites');
    const favoritesSnapshot = await userFavoritesRef.get();
    
    const favorites = favoritesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Retrieved ${favorites.length} favorites for user ${userId}`);
    
    return NextResponse.json({ favorites });

  } catch (error) {
    console.error('Error retrieving user favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add or remove a favorite
export async function POST(req: NextRequest) {
  try {
    const { userId, placeId, vendorData, isFavorite } = await req.json();

    if (!userId || !placeId) {
      return NextResponse.json({ error: 'User ID and place ID are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const userFavoritesRef = adminDb.collection('users').doc(userId).collection('favorites').doc(placeId);

    if (isFavorite) {
      // Add to favorites
      await userFavoritesRef.set({
        placeId,
        addedAt: new Date().toISOString(),
        ...vendorData
      });
      console.log(`Added ${placeId} to favorites for user ${userId}`);
    } else {
      // Remove from favorites
      await userFavoritesRef.delete();
      console.log(`Removed ${placeId} from favorites for user ${userId}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: isFavorite ? 'Added to favorites' : 'Removed from favorites'
    });

  } catch (error) {
    console.error('Error updating user favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Sync all favorites from localStorage to Firestore
export async function PUT(req: NextRequest) {
  try {
    const { userId, favorites } = await req.json();

    if (!userId || !Array.isArray(favorites)) {
      return NextResponse.json({ error: 'User ID and favorites array are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const userFavoritesRef = adminDb.collection('users').doc(userId).collection('favorites');
    
    // Get current favorites from Firestore
    const currentFavoritesSnapshot = await userFavoritesRef.get();
    const currentFavorites = new Set(currentFavoritesSnapshot.docs.map(doc => doc.id));
    
    // Get new favorites from request
    const newFavorites = new Set(favorites);
    
    // Find favorites to add
    const toAdd = Array.from(newFavorites).filter(id => !currentFavorites.has(id));
    
    // Find favorites to remove
    const toRemove = Array.from(currentFavorites).filter(id => !newFavorites.has(id));
    
    // Add new favorites
    const addPromises = toAdd.map(placeId => 
      userFavoritesRef.doc(placeId).set({
        placeId,
        addedAt: new Date().toISOString()
      })
    );
    
    // Remove old favorites
    const removePromises = toRemove.map(placeId => 
      userFavoritesRef.doc(placeId).delete()
    );
    
    await Promise.all([...addPromises, ...removePromises]);
    
    console.log(`Synced favorites for user ${userId}: added ${toAdd.length}, removed ${toRemove.length}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Favorites synced successfully',
      added: toAdd.length,
      removed: toRemove.length
    });

  } catch (error) {
    console.error('Error syncing user favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 