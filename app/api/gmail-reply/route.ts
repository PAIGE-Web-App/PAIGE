import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// Helper to build a MIME email with optional attachments
function buildMimeEmail({ to, from, subject, body, inReplyTo, references, attachments }) {
  let boundary = '----=_Part_' + Math.random().toString(36).substring(2, 15);
  let headers = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: <${inReplyTo}>`);
  if (references) headers.push(`References: <${references}>`);

  let messageParts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
    '',
  ];

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      messageParts.push(
        `--${boundary}`,
        `Content-Type: ${att.type}; name="${att.name}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${att.name}"`,
        '',
        att.data,
        ''
      );
    }
  }
  messageParts.push(`--${boundary}--`, '');
  return headers.join('\r\n') + '\r\n\r\n' + messageParts.join('\r\n');
}

async function getUserGmailTokens(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const tokens = userDoc.data()?.googleTokens;
  if (!tokens?.accessToken || !tokens?.refreshToken) return null;
  return tokens;
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

    // Refresh token if needed
    let accessToken = tokens.accessToken;
    if (tokens.expiresAt && tokens.expiresAt < Date.now()) {
      const { credentials } = await oAuth2Client.refreshAccessToken();
      accessToken = credentials.access_token;
      oAuth2Client.setCredentials(credentials);
      // Update Firestore with new tokens
      await db.collection('users').doc(userId).set({
        googleTokens: {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || tokens.refreshToken,
          expiresAt: credentials.expiry_date,
        },
      }, { merge: true });
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
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
} 