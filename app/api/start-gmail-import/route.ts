import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { SmartGmailAuth } from '@/utils/smartGmailAuth';
import { GmailRateLimitHandler } from '@/utils/gmailRateLimitHandler';
import { GmailQuotaService } from '@/utils/gmailQuotaService';
import { GmailAuthErrorHandler } from '@/utils/gmailAuthErrorHandler';

// Ensure these are correctly loaded from your .env.local file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export async function POST(req: Request) {
  try {
    console.log('🟢 START: /api/start-gmail-import route hit');
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('🔴 CRITICAL ERROR: adminDb is undefined after getAdminDb() call');
      return NextResponse.json({ success: false, message: 'Server configuration error: Firestore Admin DB not initialized correctly.' }, { status: 500 });
    }
    console.log('🟢 adminDb successfully obtained:', !!adminDb);

    const { userId, contacts: incomingContacts, config } = await req.json();
    console.log('🟢 Request params:', {
      userId,
      contactsCount: incomingContacts?.length,
      contacts: incomingContacts?.map(c => ({ email: c.email, name: c.name })),
      config
    });

    // Helper function to check if message should be filtered out
    const shouldFilterMessage = (subject: string, body: string, filterWords: string[]): boolean => {
      if (!filterWords || filterWords.length === 0) return false;
      
      const subjectLower = (subject || '').toLowerCase();
      const bodyLower = (body || '').toLowerCase();
      
      return filterWords.some(word => 
        subjectLower.includes(word.toLowerCase()) || 
        bodyLower.includes(word.toLowerCase())
      );
    };

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

    // OPTIMIZATION: Use SmartGmailAuth for intelligent authentication handling
    console.log('🟢 Checking Gmail authentication for user:', userId);
    const authResult = await SmartGmailAuth.getAuthenticatedGmailClient(userId);
    console.log('🟢 Gmail auth result:', {
      success: authResult.success,
      needsReauth: authResult.needsReauth,
      errorType: authResult.errorType,
      message: authResult.message
    });

    if (!authResult.success) {
      console.error('🔴 Gmail authentication failed:', {
        userId,
        errorType: authResult.errorType,
        message: authResult.message,
        needsReauth: authResult.needsReauth
      });
      
      // Provide specific error messages based on error type
      let errorMessage = 'Gmail authentication required. Please re-authorize Gmail access.';
      if (authResult.errorType === 'missing_refresh_token') {
        errorMessage = 'Gmail access token expired and cannot be refreshed. Please re-authorize Gmail access.';
      } else if (authResult.errorType === 'invalid_tokens') {
        errorMessage = 'Gmail tokens are invalid. Please re-authorize Gmail access.';
      }
      
      return NextResponse.json({ 
        success: false, 
        message: errorMessage,
        errorType: authResult.errorType
      }, { status: 401 });
    }

    console.log('✅ Gmail authentication successful for user:', userId);

    const gmail = authResult.gmail!;
    console.log('DEBUG: Gmail API client initialized with smart authentication');

    // Use cached email address instead of making Gmail API call (saves quota)
    const userData = userDocSnap.data();
    const gmailEmail = userData?.googleTokens?.email || userData?.googleEmail;
    
    if (!gmailEmail) {
      console.error('No Gmail email found for user');
      return NextResponse.json({ success: false, message: 'Gmail email not found. Please re-authorize Gmail access.' }, { status: 500 });
    }

    console.log('Using cached Gmail email:', gmailEmail);

    const importPromises = incomingContacts.map(async (contact: any) => {
      const contactEmail = contact.email;
      const contactName = contact.name || contactEmail;
      console.log(`🟢 Starting import for contact: ${contactName} (${contactEmail})`);

      if (!contactEmail) {
        console.warn(`Skipping contact due to missing email: ${contactName}`);
        notFoundContacts.push({ name: contactName, email: contactEmail, message: 'Missing email' });
        return { success: false, contactEmail, message: 'Missing contact email' };
      }

      // Construct Gmail query
      const daysToImport = config?.days || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToImport);
      const formattedStartDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD

      let gmailQuery = `from:${contactEmail} OR to:${contactEmail} after:${formattedStartDate}`;
      if (config?.checkForNewOnly) {
        // For checking new messages, only get messages since the last import date
        const lastImportDate = contact.lastImportDate;
        if (lastImportDate) {
          const lastImportDateObj = new Date(lastImportDate);
          lastImportDateObj.setSeconds(lastImportDateObj.getSeconds() + 1); // Add 1 second to avoid re-importing the last message
          gmailQuery = `from:${contactEmail} OR to:${contactEmail} after:${lastImportDateObj.toISOString().split('T')[0]}`;
          console.log(`🟢 Checking for new messages for ${contactEmail} since ${lastImportDateObj.toISOString()}`);
        } else {
          console.log(`🟢 No last import date for ${contactEmail}, importing for last ${daysToImport} days.`);
        }
      }

      console.log(`🟢 Gmail query for ${contactEmail}:`, gmailQuery);

      let messages: any[] = [];
      let nextPageToken: string | undefined | null = undefined;
      let importedCount = 0;
      let totalMessagesFetched = 0;
      const maxMessagesPerContact = config?.maxEmails || 25; // Default to 25 messages per contact

      do {
        console.log(`🟢 About to query Gmail with:`, {
          query: gmailQuery,
          maxResults: config?.checkForNewOnly ? 10 : 50,
          checkForNewOnly: config?.checkForNewOnly,
          pageToken: nextPageToken
        });

        // Use rate limit handler
        const res = await GmailRateLimitHandler.executeWithRetry(async () => {
          return await gmail.users.messages.list({
            userId: 'me',
            q: gmailQuery,
            maxResults: config?.checkForNewOnly ? 10 : 50, // Limit results for new message checks
            pageToken: nextPageToken || undefined,
          });
        });

        const gmailMessages = res.data.messages || [];
        totalMessagesFetched += gmailMessages.length;
        console.log(`🟢 Fetched ${gmailMessages.length} messages from Gmail API for ${contactEmail}. Total fetched: ${totalMessagesFetched}`);

        if (gmailMessages.length === 0) {
          console.log(`🟢 No more messages found for ${contactEmail}.`);
          break;
        }

        // Check import quota before processing messages
        const messageCount = gmailMessages.length || 0;
        if (messageCount > 0) {
          const quotaCheck = await GmailQuotaService.canImportMessages(userId, messageCount);
          
          if (!quotaCheck.allowed) {
            console.log(`🚫 Gmail import quota exceeded for user ${userId}: ${quotaCheck.reason}`);
            return NextResponse.json({
              success: false,
              message: `Gmail import quota exceeded. ${quotaCheck.reason}`,
              errorType: 'quota_exceeded'
            }, { status: 429 });
          }
        }

        const messageDetailsPromises = gmailMessages.map(async (msg: any) => {
          // Use rate limit handler for message.get
          return GmailRateLimitHandler.executeWithRetry(async () => {
            return await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full' // 'full' includes headers and body
            });
          });
        });

        const detailedMessages = await Promise.all(messageDetailsPromises);
        console.log(`🟢 Processed ${detailedMessages.length} detailed messages for ${contactEmail}.`);

        for (const detailedMsg of detailedMessages) {
          if (messages.length >= maxMessagesPerContact) {
            console.log(`🟢 Reached max messages (${maxMessagesPerContact}) for ${contactEmail}. Stopping import for this contact.`);
            break;
          }

          const headers = detailedMsg.data.payload?.headers;
          const subject = headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
          const fromHeader = headers?.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const toHeader = headers?.find((h: any) => h.name === 'To')?.value || 'Unknown';
          const dateHeader = headers?.find((h: any) => h.name === 'Date')?.value;
          const messageIdHeader = headers?.find((h: any) => h.name === 'Message-ID')?.value;
          const inReplyToHeader = headers?.find((h: any) => h.name === 'In-Reply-To')?.value;
          const referencesHeader = headers?.find((h: any) => h.name === 'References')?.value;
          const threadId = detailedMsg.data.threadId;

          const body = getMessageBody(detailedMsg.data.payload);

          // Filter out messages based on keywords
          if (config?.filterWords && shouldFilterMessage(subject, body, config.filterWords)) {
            console.log(`🟡 Filtering message (subject: "${subject}") for ${contactEmail}`);
            continue;
          }

          // Determine sender and recipient
          const isSentByCurrentUser = fromHeader.includes(gmailEmail);
          const sender = isSentByCurrentUser ? gmailEmail : contactEmail;
          const recipient = isSentByCurrentUser ? contactEmail : gmailEmail;

          // Convert date to Firestore Timestamp
          const messageDate = dateHeader ? new Date(dateHeader) : new Date();
          const timestamp = admin.firestore.Timestamp.fromDate(messageDate);

          const messageData = {
            id: detailedMsg.data.id,
            threadId: threadId,
            subject: subject,
            from: fromHeader,
            to: toHeader,
            sender: sender,
            recipient: recipient,
            body: body,
            timestamp: timestamp,
            messageId: messageIdHeader,
            inReplyTo: inReplyToHeader,
            references: referencesHeader,
            isRead: detailedMsg.data.labelIds?.includes('UNREAD') ? false : true,
            labels: detailedMsg.data.labelIds || [],
            // Add other relevant fields as needed
          };

          messages.push(messageData);
          importedCount++;
        }

        nextPageToken = res.data.nextPageToken;
        console.log(`🟢 Next page token for ${contactEmail}:`, nextPageToken ? 'present' : 'absent');

      } while (nextPageToken && messages.length < maxMessagesPerContact);

      console.log(`🟢 Finished fetching messages for ${contactEmail}. Total imported: ${importedCount}`);

      // Save messages to Firestore
      if (messages.length > 0) {
        const batch = adminDb.batch();
        const contactMessagesCollectionRef = adminDb.collection(`users/${userId}/contacts/${contact.id}/messages`);

        messages.forEach(msg => {
          const msgRef = contactMessagesCollectionRef.doc(msg.id);
          batch.set(msgRef, msg, { merge: true });
        });

        await batch.commit();
        console.log(`✅ Successfully saved ${messages.length} messages to Firestore for ${contactEmail}.`);

        // Update Gmail quota after successful import
        if (importedCount > 0) {
          await GmailQuotaService.incrementMessagesImported(userId, importedCount);
          console.log(`✅ Incremented import quota for user ${userId} by ${importedCount} messages`);
        }

        // POST-IMPORT THREADING FIX: For any message with In-Reply-To and missing parentMessageId, try to set it now that all messages are present
        if (messages.length > 0) {
          console.log(`🟢 Starting post-import threading fix for ${contactEmail}...`);
          const messagesToUpdate = messages.filter(msg => msg.inReplyTo && !msg.parentMessageId);
          if (messagesToUpdate.length > 0) {
            const threadingBatch = adminDb.batch();
            for (const msg of messagesToUpdate) {
              const parentMessageId = msg.inReplyTo.replace(/[<>]/g, ''); // Clean up In-Reply-To header
              const parentMessageSnap = await contactMessagesCollectionRef.where('messageId', '==', parentMessageId).limit(1).get();
              if (!parentMessageSnap.empty) {
                const parentMsg = parentMessageSnap.docs[0].data();
                const msgRef = contactMessagesCollectionRef.doc(msg.id);
                threadingBatch.update(msgRef, { parentMessageId: parentMsg.id });
                console.log(`  - Set parentMessageId for message ${msg.id} to ${parentMsg.id}`);
              }
            }
            await threadingBatch.commit();
            console.log(`✅ Completed post-import threading fix for ${contactEmail}.`);
          } else {
            console.log(`🟢 No messages needed threading fix for ${contactEmail}.`);
          }
        }

        return { success: true, contactEmail, importedCount };
      } else {
        console.log(`No Gmail messages found for ${contactEmail}.`);
        return { success: true, contactEmail, importedCount: 0, message: 'No new messages found' };
      }

    } catch (contactImportError: any) {
      console.error(`🔴 Error importing Gmail messages for contact ${contactEmail}:`, contactImportError);

      // OPTIMIZATION: Handle Gmail auth errors and trigger reauth banner if needed
      const errorResult = GmailAuthErrorHandler.handleErrorAndTriggerBanner(
        contactImportError, 
        `Gmail import for ${contactEmail}`
      );

      // Use user-friendly error message
      let userFacingMessage = errorResult.userFacingMessage || `Failed to import messages for ${contactName}. Please try again.`;
      if (contactImportError.message?.includes('invalid_grant') || contactImportError.message?.includes('Token has been revoked')) {
        userFacingMessage = 'Gmail authorization expired. Please re-authorize Gmail access in settings.';
      }

      return {
        success: false,
        contactEmail,
        message: userFacingMessage,
        error: contactImportError.message,
        errorType: errorResult.errorType
      };
    }
  });

  const importResults = await Promise.all(importPromises);
  console.log('🟢 All contact imports completed. Results:', importResults);

  const overallSuccess = importResults.every(result => result.success);
  const totalImportedCount = importResults.reduce((sum, result) => sum + (result.importedCount || 0), 0);

  if (!overallSuccess) {
    const failedContacts = importResults.filter(result => !result.success);
    const errorMessage = `Failed to import messages for some contacts: ${failedContacts.map(f => f.contactEmail).join(', ')}. Details: ${failedContacts.map(f => f.message).join('; ')}`;
    console.error('🔴 Overall Gmail import failed:', errorMessage);
    return NextResponse.json({
      success: false,
      message: errorMessage,
      results: importResults,
      totalImported: totalImportedCount
    }, { status: 500 });
  }

  console.log(`✅ Overall Gmail import successful. Total messages imported: ${totalImportedCount}`);
  return NextResponse.json({
    success: true,
    message: `Successfully imported ${totalImportedCount} Gmail messages.`,
    results: importResults,
    totalImported: totalImportedCount
  }, { status: 200 });

} catch (error: any) {
  console.error('🔴 API Error in start-gmail-import:', error);
  return NextResponse.json({
    success: false,
    message: error.message || 'An unexpected server error occurred during Gmail import.'
  }, { status: 500 });
}
}

function getMessageBody(payload: any): string {
  if (!payload) return '';

  // Prioritize plain text body
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // Fallback to HTML if plain text is not available
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  } else if (payload.body?.data) {
    // Direct body data (for messages without parts)
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return '';
}