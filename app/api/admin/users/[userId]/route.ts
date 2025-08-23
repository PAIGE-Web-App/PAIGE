import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, adminAuth } from '@/lib/firebaseAdmin';

const db = getAdminDb();
const auth = adminAuth;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const adminUserId = decodedToken.uid;
    
    // Check if user has admin privileges
    const adminUserRef = db.collection('users').doc(adminUserId);
    const adminUserDoc = await adminUserRef.get();
    
    if (!adminUserDoc.exists) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }
    
    const adminUserData = adminUserDoc.data();
    const adminUserRole = adminUserData?.role || 'couple';
    
    // Check if user has permission to delete users
    const adminRoles = ['admin', 'super_admin'];
    if (!adminRoles.includes(adminUserRole)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const { userId: targetUserId } = await params;

    // Prevent admin from deleting themselves
    if (targetUserId === adminUserId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Get the target user to check their role
    const targetUserRef = db.collection('users').doc(targetUserId);
    const targetUserDoc = await targetUserRef.get();
    
    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetUserData = targetUserDoc.data();
    const targetUserRole = targetUserData?.role || 'couple';

    // Prevent deletion of super_admin users unless the admin is also super_admin
    if (targetUserRole === 'super_admin' && adminUserRole !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can delete super admin accounts' }, { status: 403 });
    }

    // Delete the user from Firebase Auth
    try {
      await auth.deleteUser(targetUserId);
    } catch (error: any) {
      console.error('Error deleting user from Firebase Auth:', error);
      // Continue with Firestore deletion even if Auth deletion fails
    }

    // Delete the user document from Firestore
    await targetUserRef.delete();

    // Delete related data (credits, etc.)
    try {
      const creditsRef = db.collection('users').doc(targetUserId).collection('credits');
      const creditsSnapshot = await creditsRef.get();
      const batch = db.batch();
      
      creditsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting user credits:', error);
      // Continue even if credits deletion fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ 
      error: 'Failed to delete user', 
      details: error.message 
    }, { status: 500 });
  }
}
