require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function sendTestEmail(userId) {
  console.log('Testing Gmail OAuth Email Service for user:', userId);

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    console.error('❌ User not found');
    return;
  }
  const userData = userDoc.data();
  const { accessToken, refreshToken } = userData?.googleTokens || {};
  const userEmail = userData?.email;

  if (!accessToken || !refreshToken) {
    console.error('❌ No Gmail OAuth tokens found for user');
    return;
  }
  if (!userEmail) {
    console.error('❌ No email address in user profile');
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Test sending a simple email
  const testMessage = [
    'To: ' + userEmail,
    'From: ' + userEmail,
    'Subject: Test Email from Paige',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'This is a test email from Paige to verify Gmail OAuth is working! 🎉'
  ].join('\r\n');

  const encodedMessage = Buffer.from(testMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  try {
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.data.id);
    console.log('Thread ID:', result.data.threadId);
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    if (error.code === 401) {
      console.log('💡 Solution: Reconnect Gmail in Settings → Integrations');
    }
  }
}

sendTestEmail('saFckG3oMpV6ZSVjJYdNNiM9qT62'); 