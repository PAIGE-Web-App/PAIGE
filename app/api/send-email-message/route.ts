import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// Helper to build a MIME email
function buildMimeEmail({ to, from, subject, body, inReplyTo, references }: {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}) {
  const paigeFooter = `

---
Sent via Paige - Your Wedding Planning Assistant
View full conversation at https://weddingpaige.com/messages`;
  
  const bodyWithFooter = body + paigeFooter;
  
  let headers = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (inReplyTo) headers.push(`In-Reply-To: <${inReplyTo}>`);
  if (references) headers.push(`References: <${references}>`);

  return headers.join('\r\n') + '\r\n\r\n' + bodyWithFooter;
}

// Helper to get user Gmail tokens
async function getUserGmailTokens(userId: string) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const userData = userDoc.data();
  const { accessToken, refreshToken, expiryDate, email } = userData?.googleTokens || {};
  if (!accessToken) return null;
  
  return { 
    accessToken, 
    refreshToken,
    expiryDate,
    email: email || userData?.googleEmail,
  };
}

// Helper to refresh Gmail token
async function refreshGmailToken(userId: string, refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Gmail token');
  }

  const data = await response.json();
  
  // Update token in Firestore
  await adminDb.collection('users').doc(userId).update({
    'googleTokens.accessToken': data.access_token,
    'googleTokens.expiryDate': Date.now() + (data.expires_in * 1000)
  });

  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Gmail reply without googleapis library');
    
    const { body, to, subject, threadId, messageId, userId } = await req.json();
    
    console.log('📧 Gmail-reply request:', { to, subject, userId });

    if (!userId) {
      console.error('❌ Gmail-reply: userId is missing');
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    // Get user's Gmail tokens
    const tokens = await getUserGmailTokens(userId);

    if (!tokens?.accessToken) {
      console.error('❌ Gmail-reply: No Gmail access token found for user:', userId);
      return NextResponse.json({ 
        success: false, 
        message: 'Gmail access token not found. Please re-authorize Gmail access.' 
      }, { status: 401 });
    }

    let accessToken = tokens.accessToken;

    // Check if token needs refreshing
    if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
      if (tokens.refreshToken) {
        try {
          accessToken = await refreshGmailToken(userId, tokens.refreshToken);
          console.log('✅ Gmail access token refreshed successfully.');
        } catch (refreshError) {
          console.error('❌ Error refreshing Gmail access token:', refreshError);
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to refresh Gmail access. Please re-authorize.' 
          }, { status: 401 });
        }
      } else {
        console.error('❌ No refresh token available for user:', userId);
        return NextResponse.json({ 
          success: false, 
          message: 'Gmail access expired. Please re-authorize.' 
        }, { status: 401 });
      }
    }

    // Build MIME email
    const rawEmail = buildMimeEmail({
      to,
      from: tokens.email,
      subject,
      body,
      inReplyTo: messageId,
      references: threadId,
    });

    // Encode email for Gmail API
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email using Gmail API (native fetch, no googleapis library)
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail,
        threadId: threadId || undefined
      })
    });

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      console.error('❌ Gmail API error:', errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Gmail API error: ${errorData.error?.message || 'Unknown error'}` 
      }, { status: gmailResponse.status });
    }

    const result = await gmailResponse.json();
    console.log('✅ Email sent successfully:', result.id);

    return NextResponse.json({ success: true, gmailRes: result });
    
  } catch (error: any) {
    console.error('❌ Gmail reply error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail reply.'
    }, { status: 500 });
  }
}
