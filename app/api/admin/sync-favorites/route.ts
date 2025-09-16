import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

// POST - Sync all users' favorites data
export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    console.log('🔄 Starting bulk favorites sync for all users...');

    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{ id: string; email?: string; [key: string]: any }>;

    console.log(`📊 Found ${users.length} users to process`);

    let processedUsers = 0;
    let syncedFavorites = 0;
    let errors = 0;
    const results: Array<{
      userId: string;
      email: string;
      favoritesCount: number;
      status: string;
      error?: string;
    }> = [];

    // Process each user
    for (const user of users) {
      try {
        // Get user's favorites from Firestore
        const favoritesSnapshot = await adminDb
          .collection('users')
          .doc(user.id)
          .collection('favorites')
          .get();
        
        const firestoreFavorites = favoritesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Convert to the new simplified format
        const simplifiedFavorites = firestoreFavorites.map((fav: any) => ({
          placeId: fav.placeId || fav.id,
          name: fav.name || 'Unknown Vendor',
          address: fav.address || '',
          category: fav.category || 'Vendor',
          rating: fav.rating || 0,
          reviewCount: fav.reviewCount || fav.user_ratings_total || 0,
          image: fav.image || ''
        }));

        // Update the user's favorites collection with simplified data
        const batch = adminDb.batch();
        
        // Clear existing favorites
        const existingFavorites = await adminDb
          .collection('users')
          .doc(user.id)
          .collection('favorites')
          .get();
        
        existingFavorites.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Add simplified favorites
        simplifiedFavorites.forEach(fav => {
          const favRef = adminDb
            .collection('users')
            .doc(user.id)
            .collection('favorites')
            .doc(fav.placeId);
          
          batch.set(favRef, {
            ...fav,
            addedAt: new Date().toISOString()
          });
        });

        await batch.commit();

        syncedFavorites += simplifiedFavorites.length;
        processedUsers++;
        
        results.push({
          userId: user.id,
          email: user.email || 'No email',
          favoritesCount: simplifiedFavorites.length,
          status: 'success'
        });

        console.log(`✅ Synced ${simplifiedFavorites.length} favorites for user ${user.email || user.id}`);

      } catch (error) {
        console.error(`❌ Error syncing favorites for user ${user.email || user.id}:`, error);
        errors++;
        
        results.push({
          userId: user.id,
          email: user.email || 'No email',
          favoritesCount: 0,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`🎉 Bulk sync completed: ${processedUsers} users processed, ${syncedFavorites} favorites synced, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: 'Bulk favorites sync completed',
      stats: {
        totalUsers: users.length,
        processedUsers,
        syncedFavorites,
        errors
      },
      results
    });

  } catch (error) {
    console.error('Error in bulk favorites sync:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
