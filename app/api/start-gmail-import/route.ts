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
    console.log('START: /api/start-gmail-import route hit');
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('CRITICAL ERROR: adminDb is undefined after getAdminDb() call in start-gmail-import/route.ts');
      return NextResponse.json({ success: false, message: 'Server configuration error: Firestore Admin DB not initialized correctly.' }, { status: 500 });
    }
    console.log('DEBUG: adminDb is successfully obtained in start-gmail-import/route.ts:', !!adminDb); // Log if it's truthy

    const { userId, contacts: incomingContacts } = await req.json();
    console.log('DEBUG: Received userId:', userId);
    console.log('DEBUG: Received contacts:', incomingContacts);

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

    console.log('DEBUG: User data from Firestore:', {
      hasGoogleTokens: !!userData?.googleTokens,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    });

    if (!accessToken || !refreshToken) {
      console.error(`Google tokens not found for user: ${userId}`);
      return NextResponse.json({ success: false, message: 'Google authentication required. Please re-authorize Gmail access.' }, { status: 401 });
    }

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    console.log('DEBUG: OAuth2 client configured with tokens');

    // Instead of oauth2Client.isTokenExpiring(), check expiry_date
    const tokenExpiry = oauth2Client.credentials.expiry_date;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      console.log('Access token is expiring or expired, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
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
    console.log('DEBUG: Gmail API client initialized');

    // Fetch the authenticated Gmail user's email address
    let gmailUserEmail = '';
    try {
      const profileRes = await gmail.users.getProfile({ userId: 'me' });
      gmailUserEmail = (profileRes.data.emailAddress || '').toLowerCase();
      console.log('DEBUG: Authenticated Gmail user email:', gmailUserEmail);
    } catch (e) {
      console.error('Failed to fetch Gmail user profile:', e);
    }

    for (const contact of incomingContacts) {
      console.log('PROCESSING CONTACT:', contact);
      const contactEmail = contact.email;

      if (!contactEmail) {
        console.warn(`Skipping contact due to missing email property:`, contact);
        notFoundContacts.push({ name: contact.name || 'Unknown', email: 'Missing', message: 'Missing email address for contact.' });
        continue;
      }

      console.log(`DEBUG: Starting Gmail import for contact: ${contactEmail}`);

      try {
        const contactQuery = adminDb.collection(`users/${userId}/contacts`).where('email', '==', contactEmail);
        
        const contactDocs = await contactQuery.get();
        console.log(`DEBUG: Found ${contactDocs.size} contact documents for email ${contactEmail}`);

        let contactDocId: string | null = null;

        if (!contactDocs.empty) {
          contactDocId = contactDocs.docs[0].id;
          console.log(`DEBUG: Using contact document ID: ${contactDocId}`);
        } else {
          console.warn(`Contact document not found for email: ${contactEmail}. Skipping message import for this email.`);
          notFoundContacts.push({ name: contact.name || contactEmail, email: contactEmail, message: 'Contact not found in Firestore.' });
          continue;
        }

        console.log(`DEBUG: Searching Gmail for messages with query: from:${contactEmail} OR to:${contactEmail}`);
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: `from:${contactEmail} OR to:${contactEmail}`,
          maxResults: 50,
        });

        const messages = res.data.messages;
        console.log(`DEBUG: Gmail API response:`, {
          totalResults: res.data.resultSizeEstimate,
          messagesFound: messages?.length || 0
        });

        if (messages && messages.length > 0) {
          console.log(`Found ${messages.length} messages for ${contactEmail}. Starting to process messages...`);

          // Define the collection path once per contact
          const messagesCollectionPath = `users/${userId}/contacts/${contactDocId}/messages`;

          // Check if this contact has messages from a different Gmail account
          const existingGmailMessagesQuery = await adminDb.collection(messagesCollectionPath).where('source', '==', 'gmail').get();
          let existingGmailAccount: string | null = null;
          if (!existingGmailMessagesQuery.empty) {
            const firstMessage = existingGmailMessagesQuery.docs[0].data();
            existingGmailAccount = firstMessage.gmailAccount || null;
            console.log(`[GMAIL IMPORT] Contact ${contactEmail} has existing messages from Gmail account: ${existingGmailAccount}`);
          }

          // If there's a different Gmail account, log a warning
          if (existingGmailAccount && existingGmailAccount !== gmailUserEmail) {
            console.warn(`[GMAIL IMPORT] WARNING: Contact ${contactEmail} has messages from different Gmail account. Existing: ${existingGmailAccount}, Current: ${gmailUserEmail}`);
            console.log(`[GMAIL IMPORT] This may result in mixed messages from different Gmail accounts. Consider re-importing all messages.`);
          }

          // PRESERVE MANUAL MESSAGES: Only delete Gmail messages before import
          console.log(`[GMAIL IMPORT] Checking for existing Gmail messages to delete for contact ${contactEmail}...`);
          const gmailMessagesQuery = existingGmailMessagesQuery; // Reuse the query from above
          console.log(`[GMAIL IMPORT] Found ${gmailMessagesQuery.size} Gmail messages to delete for contact ${contactEmail}`);
          if (!gmailMessagesQuery.empty) {
            const batch = adminDb.batch();
            gmailMessagesQuery.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log(`[GMAIL IMPORT] Deleted ${gmailMessagesQuery.size} Gmail messages for contact ${contactEmail}`);
          }

          let messagesToImport = messages;
          // Sort messages by internalDate (oldest to newest)
          if (messagesToImport && messagesToImport.length > 0) {
            const fullMessages = await Promise.all(messagesToImport.map(async (message) => {
              if (!message.id) return null;
              const fullMessageRes = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'metadata',
              });
              return {
                id: message.id,
                internalDate: fullMessageRes.data.internalDate ? parseInt(fullMessageRes.data.internalDate) : 0
              };
            }));
            // Type guard to filter out null/undefined
            function isValidMessage(m: any): m is { id: string } {
              return m && typeof m.id === 'string';
            }
            const filteredFullMessages = fullMessages.filter(isValidMessage);
            const idToDate = Object.fromEntries(filteredFullMessages.filter(m => m !== null).map(m => [m.id, m.internalDate]).filter(([id, date]) => id && date !== undefined));
            messagesToImport = messagesToImport.slice().filter(isValidMessage).sort((a, b) => (idToDate[a.id] || 0) - (idToDate[b.id] || 0));
          }
          for (const message of messagesToImport) {
            try {
              console.log(`DEBUG: Fetching full message details for message ID: ${message.id}`);
              const fullMessageRes = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full',
              });
              const fullMessage = fullMessageRes.data;

              const existingMessageQuery = adminDb.collection(messagesCollectionPath)
                .where('gmailMessageId', '==', message.id);
              const existingMessages = await existingMessageQuery.get();
              console.log(`DEBUG: Checked for existing message ${message.id}: ${existingMessages.empty ? 'Not found' : 'Already exists'}`);

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

              console.log(`DEBUG: Message details:`, {
                subject,
                from,
                to,
                date: dateHeader || internalDate,
                bodyLength: body.length
              });

              // Determine direction (sent/received) based on user's email
              const userEmail = gmailUserEmail;
              // Helper to extract all email addresses from a header string
              const extractEmails = (header: string | undefined) => {
                if (!header) return [];
                // Match all email addresses in the header
                return Array.from(header.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)).map(m => m[0].toLowerCase());
              };
              const fromEmails = extractEmails(from ? String(from) : undefined);
              const toEmails = extractEmails(to ? String(to) : undefined);
              let direction: 'sent' | 'received' = 'received';
              if (fromEmails.includes(userEmail)) {
                direction = 'sent';
              } else if (toEmails.includes(userEmail)) {
                direction = 'received';
              } else {
                direction = 'received';
              }
              console.log('[GMAIL IMPORT DEBUG]', {
                userEmail,
                from,
                to,
                fromEmails,
                toEmails,
                direction
              });

              const inReplyTo = getHeader('In-Reply-To');
              let parentMessageId: string | undefined = undefined;
              if (inReplyTo) {
                // Find the Firestore message with matching gmailMessageId (strip < > if present)
                const inReplyToId = inReplyTo.replace(/[<>]/g, '');
                const parentQuery = await adminDb.collection(messagesCollectionPath)
                  .where('gmailMessageId', '==', inReplyToId).get();
                if (!parentQuery.empty) {
                  parentMessageId = parentQuery.docs[0].id;
                  console.log(`[GMAIL THREADING] Found parent by gmailMessageId: ${inReplyToId} -> ${parentMessageId}`);
                } else {
                  // Try matching by messageIdHeader as a fallback
                  const fallbackQuery = await adminDb.collection(messagesCollectionPath)
                    .where('messageIdHeader', '==', inReplyTo).get();
                  if (!fallbackQuery.empty) {
                    parentMessageId = fallbackQuery.docs[0].id;
                    console.log(`[GMAIL THREADING] Found parent by messageIdHeader: ${inReplyTo} -> ${parentMessageId}`);
                  } else {
                    // Extra logging for missed threading
                    const allMessages = await adminDb.collection(messagesCollectionPath).get();
                    const allGmailIds = allMessages.docs.map(doc => doc.data().gmailMessageId);
                    const allMessageIdHeaders = allMessages.docs.map(doc => doc.data().messageIdHeader);
                    console.warn(`[GMAIL THREADING] Missed parent for In-Reply-To: ${inReplyTo}. Existing gmailMessageIds:`, allGmailIds, 'Existing messageIdHeaders:', allMessageIdHeaders);
                  }
                }
              }
              if (!parentMessageId && typeof fullMessage.threadId === 'string' && fullMessage.threadId !== message.id) {
                parentMessageId = fullMessage.threadId;
              }

              const messageIdHeader = getHeader('Message-ID');
              if (!messageIdHeader) {
                console.warn(`[GMAIL IMPORT WARNING] Message missing Message-ID header. Gmail ID: ${message.id}`);
              }
              const messageData: any = {
                gmailMessageId: message.id,
                threadId: fullMessage.threadId,
                from: from || 'unknown@example.com',
                to: to || 'unknown@example.com',
                subject: subject || '(No Subject)',
                body: body,
                bodySnippet: body.substring(0, 300) + (body.length > 300 ? '...' : ''),
                fullBody: body,
                date: dateHeader || internalDate,
                timestamp: admin.firestore.Timestamp.fromDate(new Date(dateHeader || internalDate)),
                isRead: fullMessage.labelIds?.includes('UNREAD') ? false : true,
                direction,
                userId: userId,
                source: 'gmail',
                gmailAccount: gmailUserEmail,
                attachments: [], // You can add attachment handling if needed
              };
              if (messageIdHeader) {
                messageData.messageIdHeader = messageIdHeader;
              }
              if (parentMessageId) {
                messageData.parentMessageId = parentMessageId;
              }
              console.log(`[GMAIL IMPORT BODY DEBUG] Gmail ID: ${message.id}, Subject: ${subject}, Body: ${body}`);
              // Save the Gmail message to the correct path
              const messageRef = await adminDb.collection(messagesCollectionPath).add(messageData);
              console.log(`Saved Gmail message ${message.id} for contact ${contactEmail} with ID: ${messageRef.id}`);

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

        // POST-IMPORT THREADING FIX: For any message with In-Reply-To and missing parentMessageId, try to set it now that all messages are present
        if (messages && messages.length > 0) {
          const allImportedMessagesSnap = await adminDb.collection(messagesCollectionPath).get();
          const allImportedMessages: any[] = allImportedMessagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          function isValidMsg(m: any): m is { id: string, gmailMessageId?: string, messageIdHeader?: string, parentMessageId?: string, inReplyTo?: string } {
            return m && typeof m.id === 'string';
          }
          for (const msg of allImportedMessages.filter(isValidMsg)) {
            const inReplyToHeader = msg.inReplyTo;
            if (!msg.parentMessageId && inReplyToHeader) {
              const inReplyToId = String(inReplyToHeader).replace(/[<>]/g, '');
              let parentDoc = allImportedMessages.filter(isValidMsg).find(m => m.gmailMessageId === inReplyToId);
              if (!parentDoc) {
                parentDoc = allImportedMessages.filter(isValidMsg).find(m => m.messageIdHeader === inReplyToHeader);
              }
              if (parentDoc) {
                await adminDb.collection(messagesCollectionPath).doc(msg.id).update({ parentMessageId: parentDoc.id });
                console.log(`[POST-IMPORT THREADING] Set parentMessageId for message ${msg.id} to ${parentDoc.id}`);
              }
            }
          }
        }

      } catch (contactImportError: any) {
        console.error(`Error importing Gmail messages for contact ${contactEmail}:`, contactImportError);
        notFoundContacts.push({ name: contact.name || contactEmail, email: contactEmail, message: contactImportError.message });
      }
    }

    console.log('END: /api/start-gmail-import route');
    return NextResponse.json({ success: true, message: 'Gmail import process completed.', notFoundContacts }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in start-gmail-import:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unexpected server error occurred during Gmail import.' }, { status: 500 });
  }
}
