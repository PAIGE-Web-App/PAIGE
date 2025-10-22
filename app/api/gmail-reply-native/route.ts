import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Native Gmail API approach');
    
    const { userId, to, subject, body } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // Get user's Gmail tokens from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDoc.data();
    const { accessToken, refreshToken, expiryDate } = userData?.googleTokens || {};

    if (!accessToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Gmail access token not found' 
      }, { status: 401 });
    }

    // Check if token needs refresh
    if (expiryDate && expiryDate < Date.now()) {
      if (refreshToken) {
        // Refresh the token using native fetch
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
          })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          // Update tokens in Firestore
          await adminDb.collection('users').doc(userId).update({
            'googleTokens.accessToken': refreshData.access_token,
            'googleTokens.expiryDate': Date.now() + (refreshData.expires_in * 1000)
          });
        }
      }
    }

    // Build MIME email
    const rawEmail = `To: ${to}
From: ${userData?.googleTokens?.email || userData?.googleEmail}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

${body}

---
Sent via Paige - Your Wedding Planning Assistant
View full conversation at https://weddingpaige.com/messages`;

    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email using native Gmail API
    const gmailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      return NextResponse.json({ 
        success: false, 
        message: `Gmail API error: ${errorData.error?.message || 'Unknown error'}` 
      }, { status: gmailResponse.status });
    }

    const result = await gmailResponse.json();

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: result.id
    });

  } catch (error: any) {
    console.error('❌ Native Gmail error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
