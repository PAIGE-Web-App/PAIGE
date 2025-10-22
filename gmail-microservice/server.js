const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString());
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Helper to get user Gmail tokens from Firestore
async function getUserGmailTokens(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
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
  } catch (error) {
    console.error('Error getting user Gmail tokens:', error);
    return null;
  }
}

// Helper to refresh Gmail token
async function refreshGmailToken(userId, refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Gmail token');
    }

    const data = await response.json();
    
    // Update token in Firestore
    await db.collection('users').doc(userId).update({
      'googleTokens.accessToken': data.access_token,
      'googleTokens.expiryDate': Date.now() + (data.expires_in * 1000)
    });

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Gmail token:', error);
    throw error;
  }
}

// Helper to build MIME email
function buildMimeEmail({ to, from, subject, body, inReplyTo, references, attachments }) {
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'gmail-microservice'
  });
});

// Gmail Reply endpoint
app.post('/gmail-reply', async (req, res) => {
  try {
    console.log('📧 Gmail Reply request received');
    const { body, to, subject, threadId, messageId, attachments, userId } = req.body;
    
    console.log('📧 Request details:', { to, subject, userId, hasAttachments: !!attachments });

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required.' 
      });
    }

    // Get user's Gmail tokens
    const tokens = await getUserGmailTokens(userId);

    if (!tokens?.accessToken) {
      console.error('❌ No Gmail access token found for user:', userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Gmail access token not found. Please re-authorize Gmail access.' 
      });
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
          return res.status(401).json({ 
            success: false, 
            message: 'Failed to refresh Gmail access. Please re-authorize.' 
          });
        }
      } else {
        console.error('❌ No refresh token available for user:', userId);
        return res.status(401).json({ 
          success: false, 
          message: 'Gmail access expired. Please re-authorize.' 
        });
      }
    }

    // Set up Gmail API client
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oAuth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Build MIME email
    const rawEmail = buildMimeEmail({
      to,
      from: tokens.email,
      subject,
      body,
      inReplyTo: messageId,
      references: threadId,
      attachments,
    });

    // Encode email for Gmail API
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const gmailRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: threadId,
      },
    });

    console.log('✅ Email sent successfully:', gmailRes.data.id);

    res.json({ 
      success: true, 
      gmailRes: gmailRes.data 
    });
    
  } catch (error) {
    console.error('❌ Gmail reply error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail reply.'
    });
  }
});

// Gmail Send endpoint (for new messages)
app.post('/gmail-send', async (req, res) => {
  try {
    console.log('📧 Gmail Send request received');
    const { body, to, subject, attachments, userId } = req.body;
    
    console.log('📧 Request details:', { to, subject, userId, hasAttachments: !!attachments });

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required.' 
      });
    }

    // Get user's Gmail tokens
    const tokens = await getUserGmailTokens(userId);

    if (!tokens?.accessToken) {
      console.error('❌ No Gmail access token found for user:', userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Gmail access token not found. Please re-authorize Gmail access.' 
      });
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
          return res.status(401).json({ 
            success: false, 
            message: 'Failed to refresh Gmail access. Please re-authorize.' 
          });
        }
      } else {
        console.error('❌ No refresh token available for user:', userId);
        return res.status(401).json({ 
          success: false, 
          message: 'Gmail access expired. Please re-authorize.' 
        });
      }
    }

    // Set up Gmail API client
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oAuth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Build MIME email
    const rawEmail = buildMimeEmail({
      to,
      from: tokens.email,
      subject,
      body,
      attachments,
    });

    // Encode email for Gmail API
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const gmailRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log('✅ Email sent successfully:', gmailRes.data.id);

    res.json({ 
      success: true, 
      gmailRes: gmailRes.data 
    });
    
  } catch (error) {
    console.error('❌ Gmail send error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail send.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gmail Microservice running on port ${PORT}`);
  console.log(`📧 Health check: http://localhost:${PORT}/health`);
  console.log(`📧 Gmail Reply: http://localhost:${PORT}/gmail-reply`);
  console.log(`📧 Gmail Send: http://localhost:${PORT}/gmail-send`);
});
