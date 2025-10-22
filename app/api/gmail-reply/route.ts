import { NextRequest, NextResponse } from 'next/server';

// Render service URL
const RENDER_SERVICE_URL = 'https://google-api-microservice.onrender.com';

// Helper to build a MIME email with optional attachments
function buildMimeEmail({ to, from, subject, body, inReplyTo, references, attachments }: {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{ name: string; type: string; data: string }>;
}) {
  const paigeFooter = `

---
Sent via Paige - Your Wedding Planning Assistant
View full conversation and manage your wedding planning at https://weddingpaige.com/messages`;
  
  const htmlFooter = `
<br><br>
<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
<p style="color: #666; font-size: 12px; margin: 0;">
  Sent via <strong>Paige</strong> - Your Wedding Planning Assistant<br>
  <a href="https://weddingpaige.com/messages" style="color: #A85C36; text-decoration: none;">View full conversation and manage your wedding planning</a>
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

async function getUserGmailTokens(userId: string) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const userData = userDoc.data();
  const { accessToken, refreshToken } = userData?.googleTokens || {};
  if (!accessToken) return null;
  
  return { 
    accessToken, 
    refreshToken,
    expiryDate: userData?.googleTokens?.expiryDate,
    email: userData?.googleTokens?.email || userData?.googleEmail,
  };
}

export async function POST(req: NextRequest) {
  console.log('🚀 Gmail-reply API called');
  try {
    const { body, to, subject, threadId, messageId, attachments, userId } = await req.json();
    
    console.log('📧 Gmail-reply request:', { to, subject, userId, hasAttachments: !!attachments });

    // Check Gmail quota before sending
    const quotaCheck = await GmailQuotaService.canSendEmail(userId);
    
    if (!quotaCheck.allowed) {
      console.log(`🚫 Gmail quota exceeded for user ${userId}: ${quotaCheck.reason}`);
      return NextResponse.json({
        success: false,
        message: `Gmail sending quota exceeded: ${quotaCheck.reason}. Please try again later or upgrade your plan.`,
        errorType: 'quota_exceeded',
      }, { status: 429 });
    }

    if (!userId) {
      console.error('❌ Gmail-reply: userId is missing');
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    const tokens = await getUserGmailTokens(userId);

    if (!tokens?.accessToken) {
      console.error('❌ Gmail-reply: No Gmail access token found for user:', userId);
      return NextResponse.json({ 
        success: false, 
        message: 'Gmail access token not found. Please re-authorize Gmail access.' 
      }, { status: 401 });
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error("Missing Google API environment variables");
      return NextResponse.json({ 
        success: false, 
        message: 'Server configuration error: Google API credentials missing.' 
      }, { status: 500 });
    }

    const oAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oAuth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    });

    // Check if token needs refreshing
    const tokenExpiry = tokens.expiryDate;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      if (tokens.refreshToken) {
        try {
          const { credentials } = await oAuth2Client.refreshAccessToken();
          oAuth2Client.setCredentials(credentials);
          await adminDb.collection('users').doc(userId).set({
            googleTokens: {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || tokens.refreshToken,
              expiryDate: credentials.expiry_date,
            },
          }, { merge: true });
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

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const rawEmail = buildMimeEmail({
      to,
      from: tokens.email,
      subject,
      body,
      inReplyTo: messageId,
      references: threadId,
      attachments,
    });

    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const gmailRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: threadId,
      },
    });

    // Increment Gmail quota counter after successful send
    await GmailQuotaService.incrementEmailSent(userId);

    return NextResponse.json({ success: true, gmailRes: gmailRes.data });
    
  } catch (error: any) {
    console.error('❌ Gmail reply error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    const errorResult = GmailAuthErrorHandler.handleErrorAndTriggerBanner(error, 'Gmail reply');
    
    if (errorResult.errorType === 'rate_limit') {
      return NextResponse.json({
        success: false,
        message: errorResult.userMessage,
        errorType: errorResult.errorType
      }, { status: 429 });
    }

    if (errorResult.errorType === 'auth') {
      return NextResponse.json({
        success: false,
        message: errorResult.userMessage,
        errorType: errorResult.errorType
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail reply.'
    }, { status: 500 });
  }
}

