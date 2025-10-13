import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Debug endpoint to check Gmail Watch API activity and recent notifications
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId parameter required' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    // Check recent Gmail push notifications
    const notificationsSnapshot = await adminDb
      .collection('gmail_notifications')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentNotifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }));

    // Check recent todo suggestions (which might indicate Gmail Watch activity)
    const todosSnapshot = await adminDb
      .collection('todo_suggestions')
      .where('userId', '==', userId)
      .where('source', '==', 'gmail')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentTodoSuggestions = todosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    }));

    // Check recent messages (might indicate Gmail import activity)
    const messagesSnapshot = await adminDb
      .collection('messages')
      .where('userId', '==', userId)
      .where('source', '==', 'gmail')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentMessages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        recentNotifications: recentNotifications,
        recentTodoSuggestions: recentTodoSuggestions,
        recentMessages: recentMessages,
        summary: {
          notificationCount: recentNotifications.length,
          todoSuggestionCount: recentTodoSuggestions.length,
          messageCount: recentMessages.length,
          lastNotification: recentNotifications[0]?.timestamp || null,
          lastTodoSuggestion: recentTodoSuggestions[0]?.createdAt || null,
          lastMessage: recentMessages[0]?.createdAt || null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error checking Gmail Watch activity:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
