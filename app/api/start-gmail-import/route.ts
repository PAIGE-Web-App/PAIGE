import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin'; 
// MODIFIED: Removed all imports from 'firebase/firestore' as we will use Admin SDK methods
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin'; // Import admin to access admin.firestore.Timestamp

// Ensure these are correctly loaded from your .env.local file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // Your OAuth callback URL

export async function POST(req: Request) {
  try {
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('CRITICAL ERROR: adminDb is undefined after getAdminDb() call in start-gmail-import/route.ts');
      return NextResponse.json({ success: false, message: 'Server configuration error: Firestore Admin DB not initialized correctly.' }, { status: 500 });
    }
    console.log('DEBUG: adminDb is successfully obtained in start-gmail-import/route.ts:', !!adminDb); // Log if it's truthy

    const { userId, contacts: incomingContacts } = await req.json();

    // --- ADDED LOGGING FOR DEBUGGING ---
    console.log('API Route: Received payload:', { userId, incomingContacts });
    console.log('API Route: Type of incomingContacts:', typeof incomingContacts);
    console.log('API Route: Is incomingContacts an array?', Array.isArray(incomingContacts));
    // --- END ADDED LOGGING ---

    if (!userId || !incomingContacts || !Array.isArray(incomingContacts)) {
      console.error('API Route: Invalid request payload detected during validation.');
      return NextResponse.json({ success: false, message: 'Invalid request payload. Missing userId or contacts array.' }, { status: 400 });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error("Missing Google API environment variables. Please check .env.local.");
      return NextResponse.json({ success: false, message: 'Server configuration error: Google API credentials missing.' }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const notFoundContacts: { name: string; email: string; message?: string }[] = [];

    // MODIFIED: Use Admin SDK method .get() on DocumentReference
    const userDocRef = adminDb.collection('users').doc(userId); 
    const userDocSnap = await userDocRef.get(); // Use .get() method

    if (!userDocSnap.exists) { // Check .exists property for Admin SDK
      console.error(`User document not found for userId: ${userId}`);
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken || !refreshToken) {
      console.error(`Google tokens not found for user: ${userId}`);
      return NextResponse.json({ success: false, message: 'Google authentication required. Please re-authorize Gmail access.' }, { status: 401 });
    }

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (oauth2Client.isTokenExpiring()) {
      console.log('Access token is expiring, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      // MODIFIED: Use userDocRef.set() which is an Admin SDK method
      await userDocRef.set({
        googleTokens: {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || refreshToken,
          expiryDate: credentials.expiry_date,
        },
      }, { merge: true });
      console.log('Access token refreshed and updated in Firestore.');
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    for (const contact of incomingContacts) {
      const contactEmail = contact.email;

      if (!contactEmail) {
        console.warn(`Skipping contact due to missing email property:`, contact);
        notFoundContacts.push({ name: contact.name || 'Unknown', email: 'Missing', message: 'Missing email address for contact.' });
        continue;
      }

      console.log(`Attempting to import Gmail messages for contact: ${contactEmail}`);

      try {
        // MODIFIED: Build query directly on Admin SDK CollectionReference
        const contactQuery = adminDb.collection(`users/${userId}/contacts`)
          .where('email', '==', contactEmail);
        
        // MODIFIED: Use Admin SDK method .get() on Query
        const contactDocs = await contactQuery.get();

        let contactDocId: string | null = null;

        if (!contactDocs.empty) {
          contactDocId = contactDocs.docs[0].id;
        } else {
          console.warn(`Contact document not found for email: ${contactEmail}. Skipping message import for this email.`);
          notFoundContacts.push({ name: contact.name || contactEmail, email: contactEmail, message: 'Contact not found in Firestore.' });
          continue;
        }

        const res = await gmail.users.messages.list({
          userId: 'me',
          q: `from:${contactEmail} OR to:${contactEmail}`,
          maxResults: 50,
        });

        const messages = res.data.messages;

        if (messages && messages.length > 0) {
          console.log(`Found ${messages.length} messages for ${contactEmail}.`);

          for (const message of messages) {
            try {
              const fullMessageRes = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full',
              });
              const fullMessage = fullMessageRes.data;

              // MODIFIED: Build query directly on Admin SDK CollectionReference
              const existingMessageQuery = adminDb.collection(`users/${userId}/contacts/${contactDocId}/messages`)
                .where('gmailMessageId', '==', message.id);
              
              // MODIFIED: Use Admin SDK method .get() on Query
              const existingMessages = await existingMessageQuery.get();

              if (!existingMessages.empty) {
                console.log(`Gmail message ${message.id} for contact ${contactEmail} already exists. Skipping.`);
                continue;
              }

              const payload = fullMessage.payload;
              const headers = payload?.headers || [];

              const getHeader = (name: string) => headers.find(h => h.name === name)?.value;

              const subject = getHeader('Subject');
              const from = getHeader('From');
              const to = getHeader('To');
              const dateHeader = getHeader('Date');
              const internalDate = fullMessage.internalDate ? new Date(parseInt(fullMessage.internalDate)).toISOString() : new Date().toISOString();

              let body = '';
              const parts = payload?.parts || [];

              const decodeBody = (data: string | undefined | null): string => {
                if (!data) return '';
                try {
                  return Buffer.from(data, 'base64').toString('utf8');
                } catch (e) {
                  console.error('Error decoding base64 body:', e);
                  return '';
                }
              };

              let bodyPart = parts.find(part => part.mimeType === 'text/plain');
              if (!bodyPart) {
                bodyPart = parts.find(part => part.mimeType === 'text/html');
              }

              if (bodyPart?.body?.data) {
                body = decodeBody(bodyPart.body.data);
              } else if (payload?.body?.data) {
                body = decodeBody(payload.body.data);
              } else {
                const findBodyInParts = (p: any[]): string => {
                  for (const part of p) {
                    if (part.body?.data) {
                      return decodeBody(part.body.data);
                    }
                    if (part.parts) {
                      const nestedBody = findBodyInParts(part.parts);
                      if (nestedBody) return nestedBody;
                    }
                  }
                  return '';
                };
                body = findBodyInParts(parts);
              }

              const messageData = {
                gmailMessageId: message.id,
                threadId: fullMessage.threadId,
                from: from || 'unknown@example.com',
                to: to || 'unknown@example.com',
                subject: subject || '(No Subject)',
                bodySnippet: body.substring(0, 300) + (body.length > 300 ? '...' : ''),
                fullBody: body,
                date: dateHeader || internalDate,
                // MODIFIED: Use admin.firestore.Timestamp.fromDate for Admin SDK Timestamp
                timestamp: admin.firestore.Timestamp.fromDate(new Date(dateHeader || internalDate)),
                isRead: fullMessage.labelIds?.includes('UNREAD') ? false : true,
                source: 'gmail',
              };

              // MODIFIED: Use Admin SDK method .add() on CollectionReference
              await adminDb.collection(`users/${userId}/contacts/${contactDocId}/messages`).add(messageData);
              console.log(`Saved Gmail message ${message.id} for contact ${contactEmail}.`);

            } catch (messageError: any) {
              console.error(`Error processing Gmail message ${message.id} for ${contactEmail}:`, messageError);
              if (messageError.code === 401 || messageError.response?.status === 401) {
                console.error(`Gmail token expired for user ${userId}.`);
                throw new Error("Gmail authorization expired. Please re-authorize Gmail access.");
              }
            }
          }
        } else {
          console.log(`No Gmail messages found for ${contactEmail}.`);
        }
      } catch (contactImportError: any) {
        console.error(`Error importing Gmail messages for contact ${contactEmail}:`, contactImportError);
        notFoundContacts.push({ name: contact.name || contactEmail, email: contactEmail, message: contactImportError.message });
      }
    }

    return NextResponse.json({ success: true, message: 'Gmail import process initiated.', notFoundContacts }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in start-gmail-import:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unexpected server error occurred during Gmail import.' }, { status: 500 });
  }
}
