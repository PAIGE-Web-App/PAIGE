import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin'; 
// MODIFIED: Removed all imports from 'firebase/firestore' as we will use Admin SDK methods
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin'; // Import admin to access admin.firestore.Timestamp
import { SmartGmailAuth } from '@/utils/smartGmailAuth';
import { GmailRateLimitHandler } from '@/utils/gmailRateLimitHandler';
import { GmailQuotaService } from '@/utils/gmailQuotaService';
import { GmailAuthErrorHandler } from '@/utils/gmailAuthErrorHandler';

// Ensure these are correctly loaded from your .env.local file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // Your OAuth callback URL

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
    const userEmail = await SmartGmailAuth.getUserGmailEmail(userId);
    const gmailUserEmail = userEmail ? userEmail.toLowerCase() : '';
    console.log('Using cached Gmail user email:', gmailUserEmail);

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
        
        // Build Gmail query - if checkForNewOnly is true, only get recent messages
        let gmailQuery = `from:${contactEmail} OR to:${contactEmail}`;
        if (config?.checkForNewOnly) {
          // Only get messages from the last 24 hours for new message checks
          // Use a more reliable date calculation
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
          const oneDayAgoMs = oneDayAgo.getTime();
          gmailQuery += ` after:${Math.floor(oneDayAgoMs / 1000)}`;
          console.log(`DEBUG: Check for new only - limiting to messages after: ${oneDayAgo.toISOString()}`);
          console.log(`DEBUG: Current time: ${now.toISOString()}, One day ago: ${oneDayAgo.toISOString()}`);
        }
        
        // For debugging, let's try a less restrictive query first
        if (config?.checkForNewOnly) {
          console.log(`DEBUG: Trying less restrictive query for debugging...`);
          // Try without the restrictive filters first
          gmailQuery = `from:${contactEmail} OR to:${contactEmail}`;
          if (config?.checkForNewOnly) {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
            const oneDayAgoMs = oneDayAgo.getTime();
            gmailQuery += ` after:${Math.floor(oneDayAgoMs / 1000)}`;
          }
        } else {
          // Add more specific query parameters to avoid duplicates
          gmailQuery += ` -is:chats -is:snoozed -is:important`; // Exclude chats, snoozed, and important labels
        }
        
        console.log(`DEBUG: About to query Gmail with:`, {
          query: gmailQuery,
          maxResults: config?.checkForNewOnly ? 10 : 50,
          checkForNewOnly: config?.checkForNewOnly
        });
        
        // Use rate limit handler
        const res = await GmailRateLimitHandler.executeWithRetry(async () => {
          return await gmail.users.messages.list({
            userId: 'me',
            q: gmailQuery,
            maxResults: config?.checkForNewOnly ? 10 : 50, // Limit results for new message checks
          });
        });

        const messages = res.data.messages;
        console.log(`DEBUG: Gmail API response:`, {
          totalResults: res.data.resultSizeEstimate,
          messagesFound: messages?.length || 0,
          query: gmailQuery,
          checkForNewOnly: config?.checkForNewOnly
        });

        // Check import quota before processing messages
        const messageCount = messages?.length || 0;
        if (messageCount > 0) {
          const quotaCheck = await GmailQuotaService.canImportMessages(userId, messageCount);
          
          if (!quotaCheck.allowed) {
            console.log(`🚫 Gmail import quota exceeded for user ${userId}: ${quotaCheck.reason}`);
            return NextResponse.json({
              success: false,
              message: quotaCheck.reason || 'Daily import limit reached',
              quotaExceeded: true,
              remaining: quotaCheck.remaining,
              resetAt: quotaCheck.resetAt,
              contactEmail
            }, { status: 429 });
          }
        }
        
        // Log each message ID for debugging
        if (messages && messages.length > 0) {
          console.log(`DEBUG: Message IDs returned by Gmail:`, messages.map(m => m.id));
          console.log(`DEBUG: Full Gmail response:`, {
            resultSizeEstimate: res.data.resultSizeEstimate,
            nextPageToken: res.data.nextPageToken,
            messages: messages.map(m => ({ id: m.id, threadId: m.threadId }))
          });
        } else {
          console.log(`DEBUG: No messages returned by Gmail for query: ${gmailQuery}`);
        }

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
          // Skip deletion if we're just checking for new messages
          if (!config?.checkForNewOnly) {
            console.log(`[GMAIL IMPORT] Checking for existing Gmail messages to delete for contact ${contactEmail}...`);
            const gmailMessagesQuery = existingGmailMessagesQuery; // Reuse the query from above
            console.log(`[GMAIL IMPORT] Found ${gmailMessagesQuery.size} Gmail messages to delete for contact ${contactEmail}`);
            if (!gmailMessagesQuery.empty) {
              const batch = adminDb.batch();
              gmailMessagesQuery.docs.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              console.log(`[GMAIL IMPORT] Deleted ${gmailMessagesQuery.size} Gmail messages for contact ${contactEmail}`);
            }
          } else {
            console.log(`[GMAIL IMPORT] Check for new only - skipping deletion of existing messages`);
          }

          let messagesToImport = messages;
          // Sort messages by internalDate (oldest to newest)
          if (messagesToImport && messagesToImport.length > 0) {
            const fullMessages = await Promise.all(messagesToImport.map(async (message) => {
              if (!message.id) return null;
              const fullMessageRes = await GmailRateLimitHandler.executeWithRetry(async () => {
                return await gmail.users.messages.get({
                  userId: 'me',
                  id: message.id,
                  format: 'metadata',
                });
              });
              return {
                id: message.id,
                internalDate: fullMessageRes.data.internalDate ? parseInt(fullMessageRes.data.internalDate) : 0
              };
            }));
            // Type guard to filter out null/undefined
            function isValidMessage(m: any): m is { id: string; internalDate?: string } {
              return m && typeof m.id === 'string';
            }
            const filteredFullMessages = fullMessages.filter(isValidMessage);
            const idToDate = Object.fromEntries(filteredFullMessages.filter(m => m !== null).map(m => [m.id, m.internalDate]).filter(([id, date]) => id && date !== undefined));
            messagesToImport = messagesToImport.slice().filter(isValidMessage).sort((a, b) => (idToDate[a.id] || 0) - (idToDate[b.id] || 0));
          }
          
          // Track imported message count for quota
          let importedCount = 0;
          
          for (const message of messagesToImport) {
            try {
              console.log(`DEBUG: Fetching full message details for message ID: ${message.id}`);
              const fullMessageRes = await GmailRateLimitHandler.executeWithRetry(async () => {
                return await gmail.users.messages.get({
                  userId: 'me',
                  id: message.id!,
                  format: 'full',
                });
              });
              const fullMessage = fullMessageRes.data;

              // Always check for duplicates to prevent importing the same message multiple times
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

              // Apply filter words if provided
              const filterWords = config?.filterWords || [];
              if (shouldFilterMessage(subject || '', body, filterWords)) {
                console.log(`[FILTER] Skipping message ${message.id} for ${contactEmail} - contains filter words:`, filterWords);
                continue;
              }

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
              
              // Log message details for debugging
              console.log(`DEBUG: Processing new message:`, {
                id: message.id,
                from: from,
                to: to,
                subject: subject,
                direction: direction,
                userEmail: gmailUserEmail
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
              
              // Increment imported count for quota tracking
              importedCount++;

            } catch (messageError: any) {
              console.error(`Error processing Gmail message ${message.id} for ${contactEmail}:`, messageError);
              if (messageError.code === 401 || messageError.response?.status === 401) {
                console.error(`Gmail token expired for user ${userId}.`);
                throw new Error("Gmail authorization expired. Please re-authorize Gmail access.");
              }
            }
          }
          
          // Update Gmail quota after successful import
          if (importedCount > 0) {
            await GmailQuotaService.incrementMessagesImported(userId, importedCount);
            console.log(`✅ Incremented import quota for user ${userId} by ${importedCount} messages`);
          }

          // POST-IMPORT THREADING FIX: For any message with In-Reply-To and missing parentMessageId, try to set it now that all messages are present
          if (messagesToImport && messagesToImport.length > 0) {
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
        } else {
          console.log(`No Gmail messages found for ${contactEmail}.`);
        }

      } catch (contactImportError: any) {
        console.error(`Error importing Gmail messages for contact ${contactEmail}:`, contactImportError);
        
        // OPTIMIZATION: Handle Gmail auth errors and trigger reauth banner if needed
        const errorResult = GmailAuthErrorHandler.handleErrorAndTriggerBanner(
          contactImportError, 
          `Gmail import for ${contactEmail}`
        );
        
        // Use user-friendly error message
        notFoundContacts.push({ 
          name: contact.name || contactEmail, 
          email: contactEmail, 
          message: errorResult.userMessage || contactImportError.message 
        });
      }
    }

    console.log('END: /api/start-gmail-import route');
    
    // Check if todo analysis is requested
    const { enableTodoScanning = false, storeSuggestionsMode = false } = await req.json().catch(() => ({}));
    
    if (enableTodoScanning) {
      try {
        console.log('🟢 Starting todo analysis for imported messages...');
        // Add a delay to ensure messages are fully committed to Firestore
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Add timeout to prevent hanging
        const analysisPromise = performTodoAnalysis(
          userId, 
          incomingContacts,
          storeSuggestionsMode
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Todo analysis timeout after 30 seconds')), 30000)
        );
        
        const todoAnalysis = await Promise.race([analysisPromise, timeoutPromise]);
        console.log('🟢 Todo analysis completed:', todoAnalysis);
        
        // If storeSuggestionsMode is enabled, suggestions are already stored
        if (storeSuggestionsMode) {
          return NextResponse.json({
            success: true, 
            message: 'Gmail import process completed.', 
            notFoundContacts,
            todoSuggestionsStored: true,
            suggestionsCount: todoAnalysis.totalSuggestions || 0
          }, { status: 200 });
        }
        
        // Return analysis in response for immediate modal
        return NextResponse.json({
          success: true, 
          message: 'Gmail import process completed.', 
          notFoundContacts,
          todoAnalysis: todoAnalysis
        }, { status: 200 });
        
      } catch (todoError) {
        console.error('🔴 Todo analysis failed:', todoError);
        // Don't fail the entire import if todo analysis fails
        return NextResponse.json({
          success: true, 
          message: 'Gmail import process completed.', 
          notFoundContacts,
          todoAnalysis: { 
            error: 'Todo analysis failed', 
            message: todoError.message,
            timeout: todoError.message.includes('timeout')
          }
        }, { status: 200 });
      }
    }
    
    return NextResponse.json({ success: true, message: 'Gmail import process completed.', notFoundContacts }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in start-gmail-import:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unexpected server error occurred during Gmail import.' }, { status: 500 });
  }
}

// Todo analysis function (copied from enhanced route)
async function performTodoAnalysis(userId: string, contacts: any[], storeSuggestionsMode: boolean = false) {
  try {
    // Get recent messages for analysis
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      throw new Error('Firestore Admin DB not initialized');
    }
    
    // Only analyze messages for the specific contacts being imported
    const targetContactIds = contacts?.map(c => c.id) || [];
    
    let allMessages: any[] = [];
    let messagesPerContact: Map<string, any[]> = new Map();
    
    // Get contacts to analyze (either specific ones or all)
    const contactsToAnalyze = targetContactIds.length > 0 
      ? targetContactIds 
      : (await adminDb.collection(`users/${userId}/contacts`).get()).docs.map(d => d.id);
    
    // Check each contact's message collection
    for (const contactId of contactsToAnalyze) {
      const contactDoc = await adminDb.collection(`users/${userId}/contacts`).doc(contactId).get();
      if (!contactDoc.exists) continue;
      
      const contactData = contactDoc.data();
      
      const messagesSnapshot = await adminDb
        .collection(`users/${userId}/contacts/${contactId}/messages`)
        .orderBy('timestamp', 'desc')
        .limit(10) // Only check last 10 messages per contact for efficiency
        .get();
      
      const contactMessages = messagesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        contactId: contactId,
        contactName: contactData.name || contactData.email || 'Unknown',
        contactEmail: contactData.email,
        contactCategory: contactData.category,
        ...doc.data()
      }));
      
      messagesPerContact.set(contactId, contactMessages);
      allMessages = allMessages.concat(contactMessages);
    }
    
    // Sort by timestamp and limit to 25 most recent
    allMessages.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    const messages = allMessages.slice(0, 25);

    console.log(`🟢 Found ${messages.length} messages for analysis from ${contactsToAnalyze.length} contacts`);
    
    // Get existing todos
    const todosSnapshot = await adminDb
      .collection(`users/${userId}/todos`)
      .get();
    
    const existingTodos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get wedding context
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const weddingContext = {
      weddingDate: userData?.weddingDate,
      weddingLocation: userData?.weddingLocation,
      guestCount: userData?.guestCount,
      maxBudget: userData?.maxBudget,
      vibe: userData?.vibe
    };

    let totalNewTodos = 0;
    let totalTodoUpdates = 0;
    let totalCompletedTodos = 0;

    // Batch analyze messages for better performance
    const batchSize = 5; // Process 5 messages at a time
    const batches = [];
    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }
    
    console.log(`🟢 Processing ${messages.length} messages in ${batches.length} batches of ${batchSize}`);
    
    let allNewTodos: any[] = [];
    let allTodoUpdates: any[] = [];
    let allCompletedTodos: any[] = [];
    
    // Track suggestions per contact for storage mode
    const suggestionsPerContact: Map<string, any> = new Map();
    
    for (const batch of batches) {
      // Process batch in parallel
      const batchPromises = batch.map(async (message) => {
        try {
          console.log(`🟢 Analyzing message: "${message.subject}" from ${message.contactEmail}`);
          const analysisResult = await analyzeMessageForTodos(
            message.body || '',
            message.subject || '',
            {
              name: message.contactName,
              email: message.contactEmail,
              category: message.contactCategory
            },
            existingTodos,
            weddingContext,
            userId
          );

          return { message, analysisResult };
        } catch (analysisError) {
          console.error('Error analyzing message for todos:', analysisError);
          return { message, analysisResult: { newTodos: [], todoUpdates: [], completedTodos: [] } };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results for review
      for (const { message, analysisResult } of batchResults) {
        // Add unique IDs to todos for tracking
        const todosWithIds = analysisResult.newTodos.map(todo => ({
          ...todo,
          id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sourceMessage: message.subject,
          sourceContact: message.contactEmail || message.from || 'unknown',
          sourceMessageId: message.id
        }));
        
        allNewTodos = allNewTodos.concat(todosWithIds);
        allTodoUpdates = allTodoUpdates.concat(analysisResult.todoUpdates);
        allCompletedTodos = allCompletedTodos.concat(analysisResult.completedTodos);
        
        // Group by contact for storage mode
        if (storeSuggestionsMode && message.contactId) {
          const contactId = message.contactId;
          if (!suggestionsPerContact.has(contactId)) {
            suggestionsPerContact.set(contactId, {
              newTodos: [],
              todoUpdates: [],
              completedTodos: []
            });
          }
          const contactSuggestions = suggestionsPerContact.get(contactId);
          contactSuggestions.newTodos = contactSuggestions.newTodos.concat(todosWithIds);
          contactSuggestions.todoUpdates = contactSuggestions.todoUpdates.concat(analysisResult.todoUpdates);
          contactSuggestions.completedTodos = contactSuggestions.completedTodos.concat(analysisResult.completedTodos);
        }
      }
    }
    
    // If storeSuggestionsMode is enabled, save suggestions to each contact document
    if (storeSuggestionsMode && adminDb) {
      for (const [contactId, suggestions] of suggestionsPerContact.entries()) {
        const totalSuggestions = suggestions.newTodos.length + suggestions.todoUpdates.length + suggestions.completedTodos.length;
        
        if (totalSuggestions > 0) {
          await adminDb.collection(`users/${userId}/contacts`).doc(contactId).update({
            pendingTodoSuggestions: {
              count: suggestions.newTodos.length,
              suggestions: suggestions.newTodos,
              todoUpdates: suggestions.todoUpdates,
              completedTodos: suggestions.completedTodos,
              lastAnalyzedAt: admin.firestore.Timestamp.now(),
              status: 'pending'
            }
          });
          console.log(`🟢 Stored ${totalSuggestions} suggestions for contact ${contactId}`);
        }
      }
    }
    
    // Return analysis results for review (legacy mode) or summary (store mode)
    return {
      messagesAnalyzed: messages.length,
      newTodosSuggested: allNewTodos.length,
      todosUpdated: allTodoUpdates.length,
      todosCompleted: allCompletedTodos.length,
      totalSuggestions: allNewTodos.length + allTodoUpdates.length + allCompletedTodos.length,
      analysisResults: {
        newTodos: allNewTodos,
        todoUpdates: allTodoUpdates,
        completedTodos: allCompletedTodos,
        messagesAnalyzed: messages.length
      }
    };

  } catch (error) {
    console.error('Todo analysis error:', error);
    throw error;
  }
}

async function analyzeMessageForTodos(
  messageBody: string,
  subject: string,
  contact: any,
  existingTodos: any[],
  weddingContext: any,
  userId: string
) {
  try {
    // Use the N8N workflow for proper AI analysis
    const n8nWebhookUrl = process.env.N8N_MESSAGE_ANALYSIS_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.warn('N8N message analysis webhook URL not configured, using local analysis');
      return await analyzeMessageLocally(messageBody, subject, contact, existingTodos, weddingContext, userId);
    }

    console.log(`🟢 Calling N8N webhook for analysis`);
    console.log(`🟢 Subject: "${subject}", Vendor: ${contact.name || contact.email}, Existing todos: ${existingTodos.length}`);

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_content: messageBody,
        subject: subject,
        vendor_category: contact.category || 'Unknown',
        vendor_name: contact.name || contact.email,
        vendorName: contact.name || contact.email,
        existing_todos: existingTodos.map(todo => ({
          id: todo.id,
          name: todo.name,
          note: todo.note,
          category: todo.category,
          deadline: todo.deadline,
          isCompleted: todo.isCompleted || false
        })),
        wedding_context: weddingContext,
        user_id: userId,
        message_id: `gmail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }),
    });

    if (!response.ok) {
      throw new Error(`N8N Message Analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success && result.analysis) {
      // Transform N8N response to match TodoItem structure
      const transformedAnalysis = {
        newTodos: result.analysis.newTodos?.map((todo: any) => ({
          name: todo.name,
          note: todo.description || todo.notes,
          category: todo.category,
          deadline: todo.dueDate ? new Date(todo.dueDate) : null,
        })) || [],
        todoUpdates: result.analysis.todoUpdates || [],
        completedTodos: result.analysis.completedTodos || []
      };
      return transformedAnalysis;
    } else {
      console.warn('N8N analysis returned unsuccessful result, using local analysis:', result);
      return await analyzeMessageLocally(messageBody, subject, contact, existingTodos, weddingContext, userId);
    }
  } catch (error) {
    console.error('N8N Message analysis error, using local analysis:', error);
    return await analyzeMessageLocally(messageBody, subject, contact, existingTodos, weddingContext, userId);
  }
}

async function analyzeMessageLocally(
  messageBody: string,
  subject: string,
  contact: any,
  existingTodos: any[],
  weddingContext: any,
  userId: string
) {
  try {
    console.log(`🟢 Analyzing message locally: "${subject}" from ${contact.name || contact.email}`);
    
    const newTodos = [];
    const todoUpdates = [];
    const completedTodos = [];
    
    const messageText = `${subject} ${messageBody}`.toLowerCase();
    const contactName = contact.name || contact.email || 'Unknown';
    
    console.log(`🟢 Contact info - Name: ${contact.name}, Email: ${contact.email}, Category: ${contact.category}`);
    
    // Only create todos for messages that actually contain actionable content
    const hasActionableContent = (
      messageText.includes('please') || 
      messageText.includes('need to') || 
      messageText.includes('deadline') || 
      messageText.includes('due by') || 
      messageText.includes('confirm') || 
      messageText.includes('payment') || 
      messageText.includes('invoice') || 
      messageText.includes('$') ||
      messageText.includes('schedule') ||
      messageText.includes('timeline') ||
      messageText.includes('wedding') ||
      messageText.includes('venue') ||
      messageText.includes('catering') ||
      messageText.includes('photography') ||
      messageText.includes('flowers') ||
      messageText.includes('music') ||
      messageText.includes('dress') ||
      messageText.includes('cake')
    ) && (
      // Additional check: message must be longer than 50 characters to avoid spam/auto-replies
      messageBody.length > 50
    );
    
    if (!hasActionableContent) {
      console.log(`🟢 No actionable content found in message: ${subject} (length: ${messageBody.length})`);
      return { newTodos, todoUpdates, completedTodos };
    }
    
    console.log(`🟢 Found actionable content in message: ${subject}`);
    
    // Extract specific action items from the message
    const actionItems = extractActionItems(messageText, subject, contactName);
    
    for (const action of actionItems) {
      newTodos.push({
        name: action.name,
        note: action.description, // Use 'note' field to match TodoItem structure
        category: action.category,
        deadline: action.dueDate ? new Date(action.dueDate) : null,
        sourceMessage: subject,
        sourceContact: contactName,
        sourceEmail: contact.email,
        confidenceScore: calculateConfidenceScore(messageText, action.name),
      });
    }
    
    return {
      newTodos,
      todoUpdates,
      completedTodos
    };
    
  } catch (error) {
    console.error('Local message analysis error:', error);
    return { newTodos: [], todoUpdates: [], completedTodos: [] };
  }
}

function extractActionItems(messageText: string, subject: string, contactName: string) {
  const actionItems = [];
  
  // Only extract very specific, clear action items
  // Be much more conservative - only create todos for obvious action items
  
  // Payment-related items (very specific)
  if (messageText.includes('payment') || messageText.includes('invoice') || messageText.includes('$')) {
    const amount = extractAmount(messageText);
    actionItems.push({
      name: `Process vendor payment${amount ? ` (${amount})` : ''}`,
      description: `Payment request from ${contactName} - ${subject}`,
      priority: 'high',
      category: 'payment',
      notes: `From message: "${subject}" - Review invoice details and process payment`,
      dueDate: extractDate(messageText),
      estimatedTime: '15 minutes'
    });
  }
  
  // Deadline-related items (very specific)
  if (messageText.includes('deadline') || messageText.includes('due by') || messageText.includes('urgent')) {
    actionItems.push({
      name: `Complete urgent vendor task`,
      description: `Urgent deadline from ${contactName} - ${subject}`,
      priority: 'high',
      category: 'timeline',
      notes: `From message: "${subject}" - Review deadline requirements and prioritize completion`,
      dueDate: extractDate(messageText),
      estimatedTime: '2 hours'
    });
  }
  
  // Confirmation requests (very specific)
  if (messageText.includes('please confirm') || messageText.includes('confirm by')) {
    actionItems.push({
      name: `Confirm vendor details and requirements`,
      description: `Confirmation needed from ${contactName} - ${subject}`,
      priority: 'medium',
      category: 'vendor',
      notes: `From message: "${subject}" - Review and confirm all details before proceeding`,
      dueDate: extractDate(messageText),
      estimatedTime: '15 minutes'
    });
  }
  
  return actionItems;
}

function extractAmount(text: string): string | null {
  const amountPatterns = [
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars?/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD/i
  ];
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Helper function to extract dates from message text
function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{1,2}-\d{1,2}-\d{4})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Calculate confidence score based on message content and action relevance
function calculateConfidenceScore(messageText: string, actionName: string): number {
  let score = 0.5; // Base score
  
  // Increase score for specific keywords
  if (messageText.includes('please') || messageText.includes('need to')) score += 0.2;
  if (messageText.includes('urgent') || messageText.includes('asap')) score += 0.2;
  if (messageText.includes('deadline') || messageText.includes('due by')) score += 0.15;
  if (messageText.includes('confirm') || messageText.includes('verify')) score += 0.1;
  
  // Increase score for payment-related content
  if (actionName.includes('payment') && (messageText.includes('$') || messageText.includes('invoice'))) {
    score += 0.2;
  }
  
  // Increase score for deadline-related content
  if (actionName.includes('deadline') && (messageText.includes('deadline') || messageText.includes('due'))) {
    score += 0.2;
  }
  
  // Increase score for confirmation-related content
  if (actionName.includes('confirm') && (messageText.includes('confirm') || messageText.includes('verify'))) {
    score += 0.2;
  }
  
  // Cap at 1.0
  return Math.min(1.0, score);
}
