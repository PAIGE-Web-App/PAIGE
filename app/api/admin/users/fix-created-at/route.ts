import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, adminAuth } from '@/lib/firebaseAdmin';

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

    console.log('🔧 Starting corrupted createdAt fix via API...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} users to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ email: string; error: string }> = [];
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const email = data.email || 'no-email';
      
      // Check if createdAt is an empty object
      if (data.createdAt && typeof data.createdAt === 'object' && Object.keys(data.createdAt).length === 0) {
        console.log(`🔍 Found corrupted createdAt for: ${email}`);
        
        try {
          // Set createdAt to current timestamp
          await doc.ref.update({
            createdAt: new Date()
          });
          
          console.log(`✅ Fixed createdAt for: ${email}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error fixing ${email}:`, error.message);
          errors.push({ email, error: error.message });
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log('📈 Fix completed via API!');
    
    return NextResponse.json({
      success: true,
      message: `Successfully fixed corrupted createdAt for ${fixedCount} users`,
      summary: {
        fixed: fixedCount,
        skipped: skippedCount,
        errors: errors.length
      }
    });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
