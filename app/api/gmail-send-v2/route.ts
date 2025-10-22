import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';

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
  // Add Paige footer to the email body
  const paigeFooter = `

---
Sent via Paige - Your Wedding Planning Assistant
View full conversation and manage your wedding planning: https://weddingpaige.com/messages`;

  const bodyWithFooter = body + paigeFooter;
  
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
    `--${boundary}--`
  ];

  return headers.join('\r\n') + '\r\n\r\n' + messageParts.join('\r\n');
}

export async function POST(req: NextRequest) {
  console.log('🚀 Gmail-reply API called (RESTORING GMAIL FUNCTIONALITY)');
  try {
    const { userId, to, subject, body, threadId, messageId, attachments } = await req.json();
    
    console.log('📧 Gmail-reply request:', { to, subject, userId, hasAttachments: !!attachments });

    if (!userId || !to || !subject || !body) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: userId, to, subject, body' 
      }, { status: 400 });
    }

    // Get user's Gmail tokens from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    if (!userData?.googleTokens) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
    }
    
    const { access_token, refresh_token, email: userEmail } = userData.googleTokens;
    
    // Initialize Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      access_token,
      refresh_token,
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Build the email
    const email = buildMimeEmail({
      to,
      from: userEmail,
      subject,
      body,
      inReplyTo: messageId,
      references: threadId,
      attachments
    });
    
    // Send the email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(email).toString('base64'),
      },
    });
    
    console.log('✅ Gmail reply sent successfully:', result.data);
    
    return NextResponse.json({ 
      success: true, 
      messageId: result.data.id,
      message: 'Email sent successfully via Gmail API' 
    });
    
  } catch (error: any) {
    console.error('❌ Gmail reply error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}