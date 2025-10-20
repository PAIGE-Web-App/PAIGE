import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Debug endpoint to check Gmail rate limit status
 * This helps diagnose rate limit issues without making additional API calls
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

    // Get user's Gmail quota data
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const gmailQuotas = userData?.gmailQuotas;
    const googleTokens = userData?.googleTokens;

    // Calculate quota status
    const now = new Date();
    const quotaInfo = {
      user: {
        id: userId,
        email: userData?.email,
        gmailConnected: userData?.gmailConnected
      },
      tokens: {
        hasAccessToken: !!googleTokens?.accessToken,
        hasRefreshToken: !!googleTokens?.refreshToken,
        expiryDate: googleTokens?.expiryDate ? new Date(googleTokens.expiryDate) : null,
        isExpired: googleTokens?.expiryDate ? new Date(googleTokens.expiryDate) < now : null,
        scopes: googleTokens?.scope || 'No scopes found'
      },
      quotas: gmailQuotas ? {
        emailsSentToday: gmailQuotas.emailsSentToday || 0,
        emailsSentResetAt: gmailQuotas.emailsSentResetAt ? new Date(gmailQuotas.emailsSentResetAt.toDate()) : null,
        messagesImportedToday: gmailQuotas.messagesImportedToday || 0,
        messagesImportedResetAt: gmailQuotas.messagesImportedResetAt ? new Date(gmailQuotas.messagesImportedResetAt.toDate()) : null
      } : null,
      gmailWatch: userData?.gmailWatch || null,
      lastGmailActivity: userData?.lastGmailActivity || null
    };

    return NextResponse.json({
      success: true,
      data: quotaInfo,
      timestamp: now.toISOString(),
      recommendations: [
        'Check if Gmail tokens are expired',
        'Verify gmail.readonly and gmail.send scopes are present',
        'Check if daily email quota is exceeded',
        'Look for concurrent Gmail API calls',
        'Verify Gmail Watch API is not making excessive calls'
      ]
    });

  } catch (error: any) {
    console.error('Error in Gmail rate limit debug:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
