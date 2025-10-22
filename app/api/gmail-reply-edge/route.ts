import { NextRequest, NextResponse } from 'next/server';

// Force this route to use Edge Runtime instead of Node.js
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Edge Runtime - Gmail reply test');
    
    const { userId, to, subject, body, threadId, messageId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // For Edge Runtime, we can't use Firebase Admin SDK
    // We'll need to use Firestore REST API or pass tokens from client
    // For now, let's use a workaround: expect tokens in the request
    const { accessToken: providedAccessToken, userEmail: providedUserEmail } = await req.json();
    
    const accessToken = providedAccessToken;
    const userEmail = providedUserEmail;
    
    // TODO: Implement proper Firestore REST API access with service account
    // For production, we'll need to either:
    // 1. Pass tokens from client (less secure)
    // 2. Use Firestore REST API with service account (requires OAuth2)
    // 3. Use a middleware route that runs on Node.js runtime

    if (!accessToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Gmail access token not found' 
      }, { status: 401 });
    }

    // Build MIME email
    const rawEmail = `To: ${to}
From: ${userEmail}
Subject: ${subject}
${threadId ? `In-Reply-To: <${messageId}>` : ''}
${threadId ? `References: <${threadId}>` : ''}
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

${body}

---
Sent via Paige - Your Wedding Planning Assistant
View full conversation at https://weddingpaige.com/messages`;

    // Base64 encode for Gmail API
    const encodedEmail = btoa(rawEmail)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email using Gmail API
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
    console.error('❌ Edge Gmail error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
