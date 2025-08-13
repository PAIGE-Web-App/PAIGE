import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
  );
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const auth = admin.auth();
const db = admin.firestore();

export async function GET(request: NextRequest) {
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

    // Get user statistics efficiently
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => doc.data());
    
    // Debug logging to understand the data
    console.log('Users data sample:', users.slice(0, 3).map(u => ({ email: u.email, role: u.role })));
    console.log('Role distribution:', users.reduce((acc, u) => {
      const role = u.role || 'couple';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {}));
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive !== false).length,
      admin: users.filter(u => ['moderator', 'admin', 'super_admin'].includes(u.role || 'couple')).length,
      planners: users.filter(u => u.role === 'planner').length,
      couples: users.filter(u => u.role === 'couple').length,
      moderators: users.filter(u => u.role === 'moderator').length,
      admins: users.filter(u => u.role === 'admin').length,
      superAdmins: users.filter(u => u.role === 'super_admin').length
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
