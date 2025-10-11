import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Helper to build a MIME email with optional attachments
function buildMimeEmail({ to, from, subject, body, inReplyTo, references, attachments }) {
  // Add Paige footer to the email body
  const paigeFooter = `

---
Sent via Paige - Your Wedding Planning Assistant
View full conversation and manage your wedding planning at https://paige.app`;
  
  const htmlFooter = `
<br><br>
<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
<p style="color: #666; font-size: 12px; margin: 0;">
  Sent via <strong>Paige</strong> - Your Wedding Planning Assistant<br>
  <a href="https://paige.app" style="color: #A85C36; text-decoration: none;">View full conversation and manage your wedding planning</a>
</p>`;
  
  const bodyWithFooter = body + paigeFooter;
  const htmlBody = body.replace(/\n/g, '<br>') + htmlFooter;
  
  let boundary = '----=_Part_' + Math.random().toString(36).substring(2, 15);
  let headers = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: <${inReplyTo}>`);
  if (references) headers.push(`References: <${references}>`);

  let messageParts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyWithFooter,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    `<html><body>${htmlBody}</body></html>`,
    '',
  ];

  // If there are attachments, we need to wrap everything in a multipart/mixed
  if (attachments && attachments.length > 0) {
    const mixedBoundary = '----=_Part_' + Math.random().toString(36).substring(2, 15);
    const mixedHeaders = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ];
    if (inReplyTo) mixedHeaders.push(`In-Reply-To: <${inReplyTo}>`);
    if (references) mixedHeaders.push(`References: <${references}>`);

    let mixedParts = [
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      ...messageParts,
      `--${boundary}--`,
      '',
    ];

    // Add attachments
    for (const att of attachments) {
      mixedParts.push(
        `--${mixedBoundary}`,
        `Content-Type: ${att.type}; name="${att.name}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${att.name}"`,
        '',
        att.data,
        ''
      );
    }
    mixedParts.push(`--${mixedBoundary}--`, '');
    return mixedHeaders.join('\r\n') + '\r\n\r\n' + mixedParts.join('\r\n');
  }

  messageParts.push(`--${boundary}--`, '');
  return headers.join('\r\n') + '\r\n\r\n' + messageParts.join('\r\n');
}

async function getUserGmailTokens(userId) {
  const adminDb = (await import('@/lib/firebaseAdmin')).adminDb;
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const userData = userDoc.data();
  const { accessToken, refreshToken } = userData?.googleTokens || {};
  if (!accessToken) return null;
  return { accessToken, refreshToken };
}

// This is a scaffold for sending Gmail replies with attachments
export async function POST(req: NextRequest) {
  try {
    const {
      body,
      to,
      subject,
      threadId,
      messageId,
      attachments, // [{ name: string, type: string, data: base64 }]
      userId,
    } = await req.json();

    // Retrieve user's Gmail OAuth tokens from Firestore
    const tokens = await getUserGmailTokens(userId);
    if (!tokens) throw new Error('No Gmail OAuth tokens found for user.');

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error('Google API credentials missing in environment variables.');
    }

    // Set up OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
    oAuth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    // Check if token needs refresh
    const tokenExpiry = oAuth2Client.credentials.expiry_date;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      if (tokens.refreshToken) {
        try {
          const { credentials } = await oAuth2Client.refreshAccessToken();
          oAuth2Client.setCredentials(credentials);
          const adminDb = (await import('@/lib/firebaseAdmin')).adminDb;
          await adminDb.collection('users').doc(userId).set({
            googleTokens: {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || tokens.refreshToken,
              expiryDate: credentials.expiry_date,
            },
          }, { merge: true });
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return NextResponse.json({ 
            error: 'Failed to refresh Google authentication. Please re-authorize Gmail access.',
            requiresReauth: true 
          }, { status: 401 });
        }
      } else {
        console.log('Access token expired and no refresh token available (Firebase popup flow)');
        return NextResponse.json({ 
          error: 'Gmail access token expired. Please re-authorize Gmail access.',
          requiresReauth: true 
        }, { status: 401 });
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Fetch the real Gmail sender email
    let senderEmail = 'me';
    try {
      const profileRes = await gmail.users.getProfile({ userId: 'me' });
      if (profileRes.data.emailAddress) {
        senderEmail = profileRes.data.emailAddress;
      }
    } catch (e) {
      console.error('Failed to fetch Gmail user profile:', e);
    }

    // Build MIME message
    const rawMessage = buildMimeEmail({
      to,
      from: senderEmail,
      subject,
      body,
      inReplyTo: messageId,
      references: threadId,
      attachments,
    });
    const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send the message
    const gmailRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        ...(threadId && { threadId }),
      },
    });

    return NextResponse.json({ success: true, gmailRes: gmailRes.data });
  } catch (error: any) {
    console.error('Gmail reply error:', error);
    
    // Handle specific Google OAuth errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('invalid_token')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google authentication expired. Please re-authenticate with Gmail.',
        needsReauth: true 
      }, { status: 401 });
    }
    
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
} 