import type { NextApiRequest, NextApiResponse } from 'next';
import { refreshGoogleAccessToken } from '@/lib/googleTokenRefresh';
import { adminDb } from '@/lib/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }

    console.log('🔄 Refreshing token for user:', userId);

    // Get user's current tokens
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const currentTokens = userData?.googleTokens;

    if (!currentTokens?.refreshToken) {
      console.error('❌ No refresh token found for user:', userId);
      return res.status(400).json({ 
        success: false, 
        error: 'No refresh token available' 
      });
    }

    // Refresh the token (this also updates Firestore)
    const newTokens = await refreshGoogleAccessToken(userId, currentTokens);

    if (!newTokens) {
      console.error('❌ Token refresh failed for user:', userId);
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh token'
      });
    }

    console.log('✅ Token refreshed successfully for user:', userId);

    return res.status(200).json({
      success: true,
      accessToken: newTokens.accessToken,
      email: newTokens.email
    });

  } catch (error: any) {
    console.error('❌ Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh token'
    });
  }
}
