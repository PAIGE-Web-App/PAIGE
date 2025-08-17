import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

const db = getAdminDb();

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await (await import('@/lib/firebaseAdmin')).adminAuth.verifyIdToken(token);
    
    // Check if user has admin privileges
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!['admin', 'super_admin', 'moderator'].includes(userData?.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { userId, targetUserId, action, relationshipType } = await request.json();

    if (!userId || !targetUserId || !action || !relationshipType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['link', 'unlink'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!['partner', 'planner'].includes(relationshipType)) {
      return NextResponse.json({ error: 'Invalid relationship type' }, { status: 400 });
    }

    // Get both users
    const [userDoc1, userDoc2] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('users').doc(targetUserId).get()
    ]);

    if (!userDoc1.exists || !userDoc2.exists) {
      return NextResponse.json({ error: 'One or both users not found' }, { status: 404 });
    }

    const user1 = userDoc1.data();
    const user2 = userDoc2.data();

    if (!user1 || !user2) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 });
    }

    // Validate relationship types
    if (relationshipType === 'partner') {
      if (user1.role !== 'couple' || user2.role !== 'couple') {
        return NextResponse.json({ error: 'Partners must both be couples' }, { status: 400 });
      }
    } else if (relationshipType === 'planner') {
      if (user1.role !== 'couple' || user2.role !== 'planner') {
        return NextResponse.json({ error: 'Planner relationship must be between couple and planner' }, { status: 400 });
      }
    }

    const batch = db.batch();

    if (action === 'link') {
      if (relationshipType === 'partner') {
        // Link partners bidirectionally
        batch.update(db.collection('users').doc(userId), {
          partnerId: targetUserId,
          partnerEmail: user2.email,
          partnerName: user2.displayName || user2.userName,
          isLinked: true
        });
        batch.update(db.collection('users').doc(targetUserId), {
          partnerId: userId,
          partnerEmail: user1.email,
          partnerName: user1.displayName || user1.userName,
          isLinked: true
        });
      } else if (relationshipType === 'planner') {
        // Link couple to planner
        batch.update(db.collection('users').doc(userId), {
          plannerId: targetUserId,
          plannerEmail: user2.email,
          plannerName: user2.displayName || user2.userName,
          hasPlanner: true
        });
      }
    } else if (action === 'unlink') {
      if (relationshipType === 'partner') {
        // Unlink partners bidirectionally
        batch.update(db.collection('users').doc(userId), {
          partnerId: null,
          partnerEmail: null,
          partnerName: null,
          isLinked: false
        });
        batch.update(db.collection('users').doc(targetUserId), {
          partnerId: null,
          partnerEmail: null,
          partnerName: null,
          isLinked: false
        });
      } else if (relationshipType === 'planner') {
        // Unlink couple from planner
        batch.update(db.collection('users').doc(userId), {
          plannerId: null,
          plannerEmail: null,
          plannerName: null,
          hasPlanner: false
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `${relationshipType} ${action}ed successfully` 
    });

  } catch (error) {
    console.error('Relationship management error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
