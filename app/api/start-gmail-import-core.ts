// Shared Gmail import logic that can be used by both routes
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { SmartGmailAuth } from '@/utils/smartGmailAuth';
import { GmailRateLimitHandler } from '@/utils/gmailRateLimitHandler';
import { GmailQuotaService } from '@/utils/gmailQuotaService';
import { GmailAuthErrorHandler } from '@/utils/gmailAuthErrorHandler';
import * as admin from 'firebase-admin';

export async function performGmailImport(params: any) {
  try {
    console.log('🟢 START: Gmail import core function');
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('🔴 CRITICAL ERROR: adminDb is undefined');
      return { success: false, message: 'Server configuration error: Firestore Admin DB not initialized correctly.' };
    }
    console.log('🟢 adminDb successfully obtained:', !!adminDb);

    const { userId, contacts: incomingContacts, config } = params;
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
      return { success: false, message: 'Invalid request payload. Missing userId or contacts array.' };
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error("Missing Google API environment variables. Please check .env.local.");
      return { success: false, message: 'Server configuration error: Google API credentials missing.' };
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
      return { success: false, message: 'User not found.' };
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
      
      return { 
        success: false, 
        message: errorMessage,
        errorType: authResult.errorType,
        status: 401
      };
    }

    console.log('✅ Gmail authentication successful for user:', userId);

    const gmail = authResult.gmail!;
    console.log('DEBUG: Gmail API client initialized with smart authentication');

    // Use cached email address instead of making Gmail API call (saves quota)
    const userData = userDocSnap.data();
    const gmailEmail = userData?.googleTokens?.email || userData?.googleEmail;
    
    if (!gmailEmail) {
      console.error('No Gmail email found for user');
      return { success: false, message: 'Gmail email not found. Please re-authorize Gmail access.' };
    }

    console.log('Using cached Gmail email:', gmailEmail);

    // Process each contact
    for (const contact of incomingContacts) {
      const contactEmail = contact.email;
      const contactName = contact.name || contactEmail;
      
      console.log(`Processing contact: ${contactName} (${contactEmail})`);

      try {
        // Build Gmail search query
        const gmailQuery = `from:${contactEmail} OR to:${contactEmail}`;
        
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

        const messages = res.data.messages || [];
        console.log(`Found ${messages.length} Gmail messages for ${contactEmail}`);

        // Check import quota before processing messages
        const messageCount = messages?.length || 0;
        if (messageCount > 0) {
          const quotaCheck = await GmailQuotaService.canImportMessages(userId, messageCount);
          
          if (!quotaCheck.allowed) {
            console.log(`🚫 Gmail import quota exceeded for user ${userId}: ${quotaCheck.reason}`);
            return {
              success: false,
              message: `Import quota exceeded: ${quotaCheck.reason}`,
              quotaExceeded: true
            };
          }
        }

        if (messages.length === 0) {
          console.log(`No Gmail messages found for ${contactEmail}.`);
          continue;
        }

        // Get message details
        const messagesToImport = [];
        let importedCount = 0;

        for (const message of messages.slice(0, config?.maxEmails || 25)) {
          try {
            const messageRes = await GmailRateLimitHandler.executeWithRetry(async () => {
              return await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full'
              });
            });

            const messageData = messageRes.data;
            const headers = messageData.payload?.headers || [];
            
            const subject = headers.find(h => h.name === 'Subject')?.value || '';
            const from = headers.find(h => h.name === 'From')?.value || '';
            const to = headers.find(h => h.name === 'To')?.value || '';
            const date = headers.find(h => h.name === 'Date')?.value || '';
            
            // Extract body
            let body = '';
            if (messageData.payload?.body?.data) {
              body = Buffer.from(messageData.payload.body.data, 'base64').toString();
            } else if (messageData.payload?.parts) {
              for (const part of messageData.payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                  body = Buffer.from(part.body.data, 'base64').toString();
                  break;
                }
              }
            }

            // Apply filters
            const filterWords = config?.filterWords || [];
            if (shouldFilterMessage(subject, body, filterWords)) {
              console.log(`Filtered out message: ${subject}`);
              continue;
            }

            // Check date range
            if (config?.dateRange === 'last_week') {
              const messageDate = new Date(date);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              
              if (messageDate < weekAgo) {
                console.log(`Message too old: ${subject}`);
                continue;
              }
            }

            const messageDoc = {
              id: message.id,
              subject,
              from,
              to,
              body,
              date,
              timestamp: admin.firestore.Timestamp.fromDate(new Date(date)),
              threadId: messageData.threadId,
              messageId: message.id,
              userId,
              contactEmail,
              contactName,
              importedAt: admin.firestore.Timestamp.now()
            };

            messagesToImport.push(messageDoc);
            importedCount++;

          } catch (messageError: any) {
            console.error(`Error processing message ${message.id}:`, messageError);
            
            // Handle Gmail auth errors
            if (messageError.message?.includes('Invalid Credentials') || 
                messageError.message?.includes('insufficient authentication')) {
              console.error('Gmail authorization expired during import');
              throw new Error("Gmail authorization expired. Please re-authorize Gmail access.");
            }
          }
        }

        // Import messages to Firestore
        if (messagesToImport.length > 0) {
          const batch = adminDb.batch();
          
          for (const messageDoc of messagesToImport) {
            const messageRef = adminDb
              .collection(`users/${userId}/contacts/${contact.id}/messages`)
              .doc(messageDoc.id);
            batch.set(messageRef, messageDoc);
          }
          
          await batch.commit();
          console.log(`✅ Imported ${importedCount} messages for ${contactEmail}`);
          
          // Update Gmail quota after successful import
          if (importedCount > 0) {
            await GmailQuotaService.incrementMessagesImported(userId, importedCount);
            console.log(`✅ Incremented import quota for user ${userId} by ${importedCount} messages`);
          }
        }

      } catch (contactImportError: any) {
        console.error(`Error importing Gmail messages for contact ${contactEmail}:`, contactImportError);
        
        // OPTIMIZATION: Handle Gmail auth errors and trigger reauth banner if needed
        const errorResult = GmailAuthErrorHandler.handleErrorAndTriggerBanner(
          contactImportError, 
          `Gmail import for ${contactEmail}`
        );
        
        // Use user-friendly error message
        const userMessage = errorResult.userMessage || 'Failed to import Gmail messages';
        
        notFoundContacts.push({
          name: contactName,
          email: contactEmail,
          message: userMessage
        });
      }
    }

    return {
      success: true,
      message: `Gmail import completed. ${notFoundContacts.length > 0 ? `Some contacts had issues: ${notFoundContacts.map(c => c.name).join(', ')}` : 'All contacts processed successfully.'}`,
      notFoundContacts,
      importedCount: importedCount
    };

  } catch (error: any) {
    console.error('Gmail import core error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during Gmail import.',
      status: 500
    };
  }
}
