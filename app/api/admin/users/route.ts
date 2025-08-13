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
    
    // Check if user has admin privileges by getting their role from Firestore
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

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const roleFilter = searchParams.get('role') || 'all';
    const searchTerm = searchParams.get('search') || '';
    
    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query
    let query: any = db.collection('users');
    
    // Apply role filter if specified
    if (roleFilter !== 'all') {
      query = query.where('role', '==', roleFilter);
    }
    
    // Get total count first
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    // Execute query
    const usersSnapshot = await query.get();
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Safely handle dates - Firestore timestamps or regular dates
      let createdAt = new Date();
      let lastActive = new Date();
      
      try {
        if (data.createdAt) {
          createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        }
        if (data.lastActive) {
          lastActive = data.lastActive.toDate ? data.lastActive.toDate() : new Date(data.lastActive);
        }
      } catch (error) {
        console.log('Date conversion error for user:', doc.id, error);
        // Use current date as fallback
      }
      
      return {
        uid: doc.id,
        email: data.email || 'no-email@example.com',
        displayName: data.displayName || data.userName || null,
        userName: data.userName || null,
        role: data.role || 'couple',
        userType: data.userType || 'couple',
        onboarded: data.onboarded || false,
        createdAt: createdAt,
        lastActive: lastActive,
        isActive: data.isActive !== false, // Default to true if not set
        profileImageUrl: data.profileImageUrl || null,
        metadata: data.metadata || {},
        
        // Relationship fields
        partnerId: data.partnerId || null,
        partnerEmail: data.partnerEmail || null,
        partnerName: data.partnerName || null,
        plannerId: data.plannerId || null,
        plannerEmail: data.plannerEmail || null,
        plannerName: data.plannerName || null,
        weddingDate: data.weddingDate || data.metadata?.weddingDate || null,
        isLinked: !!data.partnerId,
        hasPlanner: !!data.plannerId
      };
    });

    // Filter by search term if provided
    let filteredUsers = users;
    if (searchTerm) {
      filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.userName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Return users with pagination info
    return NextResponse.json({
      users: filteredUsers,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    
    // Only super admins can change roles
    if (userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Only super admins can change user roles' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { targetUserId, newRole } = body;
    
    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['couple', 'planner', 'moderator', 'admin', 'super_admin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent changing your own role to non-admin
    if (targetUserId === userId && !['admin', 'super_admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Cannot demote yourself to non-admin role' }, { status: 400 });
    }

    // Update the user's role
    const targetUserRef = db.collection('users').doc(targetUserId);
    const targetUserDoc = await targetUserRef.get();
    
    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Get role configuration for the new role
    const { ROLE_CONFIGS } = await import('@/utils/roleConfig');
    const roleConfig = ROLE_CONFIGS[newRole as keyof typeof ROLE_CONFIGS];
    
    if (!roleConfig) {
      return NextResponse.json({ error: 'Invalid role configuration' }, { status: 400 });
    }

    // Update the user
    await targetUserRef.update({
      role: newRole,
      permissions: roleConfig.permissions,
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      message: `User role updated to ${newRole}` 
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
