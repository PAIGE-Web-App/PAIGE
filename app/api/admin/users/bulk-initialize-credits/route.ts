import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, adminAuth } from '@/lib/firebaseAdmin';
import { creditServiceAdmin } from '@/lib/creditServiceAdmin';

const db = getAdminDb();
const auth = adminAuth;

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    
    // Check if user has admin privileges
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const userRole = userData?.role || 'couple';
    
    // Check if user has permission to manage users
    const adminRoles = ['admin', 'super_admin'];
    if (!adminRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs;
    
    let initializedCount = 0;
    let alreadyHadCredits = 0;
    let errors = 0;
    
    // Process each user
    for (const userDoc of users) {
      try {
        const userData = userDoc.data();
        
        // Skip if user already has credits
        if (userData.credits) {
          alreadyHadCredits++;
          continue;
        }
        
        // Initialize credits for this user
        const userType = userData.userType || 'couple';
        const subscriptionTier = userData.subscription?.tier || 'free';
        
        console.log(`Initializing credits for user ${userDoc.id}: ${userType}/${subscriptionTier}`);
        
        await creditServiceAdmin.initializeUserCredits(
          userDoc.id,
          userType,
          subscriptionTier
        );
        
        initializedCount++;
        console.log(`Successfully initialized credits for user ${userDoc.id}`);
      } catch (error) {
        console.error(`Failed to initialize credits for user ${userDoc.id}:`, error);
        console.error(`User data:`, userData);
        errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Bulk credit initialization completed`,
      results: {
        totalUsers: users.length,
        initialized: initializedCount,
        alreadyHadCredits,
        errors
      }
    });
    
  } catch (error) {
    console.error('Error in bulk credit initialization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
