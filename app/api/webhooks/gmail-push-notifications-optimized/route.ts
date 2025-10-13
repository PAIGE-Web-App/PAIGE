import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

/**
 * OPTIMIZED Gmail Push Notifications Webhook
 * 
 * Key Optimizations:
 * 1. Batch processing with delays between API calls
 * 2. Limit to 3 messages per webhook (instead of 10)
 * 3. Add 2-second delay between message processing
 * 4. Skip processing if quota is low
 * 5. Use minimal message format to reduce API calls
 * 6. Implement exponential backoff for failures
 */

export async function POST(req: NextRequest) {
  try {
    console.log('Gmail Push Notification (Optimized): Received webhook');
    
    // Parse the Pub/Sub message
    const body = await req.json();
    console.log('Gmail Push Notification (Optimized): Raw body:', JSON.stringify(body, null, 2));

    // Pub/Sub message structure
    if (!body.message || !body.message.data) {
      console.log('Gmail Push Notification (Optimized): Invalid message format');
      return NextResponse.json({ success: false, message: 'Invalid message format' }, { status: 400 });
    }

    // Decode the base64 message data
    const messageData = Buffer.from(body.message.data, 'base64').toString('utf-8');
    console.log('Gmail Push Notification (Optimized): Decoded message:', messageData);

    // Parse the Gmail notification
    let gmailNotification;
    try {
      gmailNotification = JSON.parse(messageData);
    } catch (parseError) {
      console.error('Gmail Push Notification (Optimized): Failed to parse message data:', parseError);
      return NextResponse.json({ success: false, message: 'Failed to parse message data' }, { status: 400 });
    }

    // Extract user email address from Gmail notification
    const emailAddress = gmailNotification.emailAddress;
    if (!emailAddress) {
      console.log('Gmail Push Notification (Optimized): No email address in notification');
      return NextResponse.json({ success: false, message: 'No email address in notification' }, { status: 400 });
    }

    console.log('Gmail Push Notification (Optimized): Processing for email:', emailAddress);

    // Find user by email address in Firestore
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('Gmail Push Notification (Optimized): Database not available');
      return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    // Query for user with matching email
    const usersSnapshot = await adminDb.collection('users')
      .where('email', '==', emailAddress.toLowerCase())
      .where('gmailConnected', '==', true)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log('Gmail Push Notification (Optimized): No user found with email:', emailAddress);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    console.log('Gmail Push Notification (Optimized): Found user:', userId);

    // Check if Gmail Watch is active
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('Gmail Push Notification (Optimized): User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const gmailWatch = userData?.gmailWatch || {};

    // Check if Gmail Watch is disabled
    if (!gmailWatch.isActive) {
      console.log('Gmail Push Notification (Optimized): Gmail Watch is disabled for user:', userId);
      return NextResponse.json({ success: true, message: 'Gmail Watch disabled' });
    }

    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken || !gmailWatch.historyId) {
      console.log('Gmail Push Notification (Optimized): User has no Gmail access or watch setup:', userId);
      return NextResponse.json({ success: false, message: 'User has no Gmail access or watch setup' }, { status: 400 });
    }

    // Check Gmail quota before processing
    const { GmailQuotaService } = await import('@/utils/gmailQuotaService');
    const quotaCheck = await GmailQuotaService.canSendEmail(userId);
    
    if (quotaCheck.remaining < 5) { // If less than 5 emails remaining, skip processing
      console.log('Gmail Push Notification (Optimized): Low quota, skipping processing for user:', userId, 'Remaining:', quotaCheck.remaining);
      return NextResponse.json({ success: true, message: 'Low quota, skipping processing' });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    });

    // Check if token needs refresh
    const tokenExpiry = userData?.googleTokens?.expiryDate;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      if (refreshToken) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          
          // Update tokens in Firestore
          await userDocRef.set({
            googleTokens: {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || refreshToken,
              expiryDate: credentials.expiry_date,
            },
          }, { merge: true });
          
          console.log('Gmail Push Notification (Optimized): Access token refreshed for user:', userId);
        } catch (refreshError) {
          console.error('Gmail Push Notification (Optimized): Error refreshing token:', refreshError);
          return NextResponse.json({ success: false, message: 'Token refresh failed' }, { status: 401 });
        }
      } else {
        console.log('Gmail Push Notification (Optimized): Access token expired and no refresh token available');
        return NextResponse.json({ success: false, message: 'Access token expired' }, { status: 401 });
      }
    }

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get the latest history to find new messages
    try {
      console.log('Gmail Push Notification (Optimized): Fetching history for user:', userId, 'from historyId:', gmailWatch.historyId);
      
      // Import rate limit handler
      const { GmailRateLimitHandler } = await import('@/utils/gmailRateLimitHandler');
      
      const historyResponse = await GmailRateLimitHandler.executeWithRetry(async () => {
        return await gmail.users.history.list({
          userId: 'me',
          startHistoryId: gmailWatch.historyId,
          historyTypes: ['messageAdded'],
        });
      });

      const history = historyResponse.data.history || [];
      console.log('Gmail Push Notification (Optimized): Found', history.length, 'history entries');

      if (history.length === 0) {
        console.log('Gmail Push Notification (Optimized): No new messages found');
        return NextResponse.json({ success: true, message: 'No new messages' });
      }

      // Process new messages
      const newMessages = [];
      for (const historyItem of history) {
        if (historyItem.messagesAdded) {
          for (const messageAdded of historyItem.messagesAdded) {
            if (messageAdded.message?.id) {
              newMessages.push(messageAdded.message.id);
            }
          }
        }
      }

      console.log('Gmail Push Notification (Optimized): Found', newMessages.length, 'new messages');

      if (newMessages.length === 0) {
        // Update the last processed history ID
        await userDocRef.set({
          gmailWatch: {
            ...gmailWatch,
            lastProcessedHistoryId: historyResponse.data.historyId,
          },
        }, { merge: true });
        
        return NextResponse.json({ success: true, message: 'No new messages to process' });
      }

      // OPTIMIZATION: Limit to 3 messages per webhook and add delays
      const messagesToProcess = newMessages.slice(0, 3);
      console.log('Gmail Push Notification (Optimized): Processing', messagesToProcess.length, 'messages (limited from', newMessages.length, ')');

      // Process each new message with delays
      let processedCount = 0;
      for (let i = 0; i < messagesToProcess.length; i++) {
        const messageId = messagesToProcess[i];
        
        try {
          // Add delay between message processing (except for first message)
          if (i > 0) {
            console.log('Gmail Push Notification (Optimized): Waiting 2 seconds before processing next message...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Get message details with MINIMAL format to reduce API call size
          const messageResponse = await GmailRateLimitHandler.executeWithRetry(async () => {
            return await gmail.users.messages.get({
              userId: 'me',
              id: messageId,
              format: 'metadata', // OPTIMIZATION: Use metadata instead of full
              metadataHeaders: ['From', 'Subject', 'Date'] // Only get essential headers
            });
          });

          const message = messageResponse.data;
          console.log('Gmail Push Notification (Optimized): Processing message:', messageId);

          // Extract message content from metadata
          const headers = message.payload?.headers || [];
          const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
          const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
          const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');
          
          if (!fromHeader?.value || !subjectHeader?.value) {
            console.log('Gmail Push Notification (Optimized): Skipping message without from/subject:', messageId);
            continue;
          }

          // Extract email address from "Name <email@domain.com>" format
          const fromEmail = fromHeader.value.includes('<') 
            ? fromHeader.value.match(/<([^>]+)>/)?.[1] || fromHeader.value
            : fromHeader.value;

          const subject = subjectHeader.value;
          const messageDate = dateHeader?.value || new Date().toISOString();

          // Check if this email is from a known contact
          const contactQuery = adminDb.collection(`users/${userId}/contacts`)
            .where('email', '==', fromEmail.toLowerCase());
          
          const contactDocs = await contactQuery.get();
          
          if (contactDocs.empty) {
            console.log('Gmail Push Notification (Optimized): No contact found for email:', fromEmail);
            continue;
          }

          const contactDoc = contactDocs.docs[0];
          const contactData = contactDoc.data();

          // Create minimal message data (no body to save API calls)
          const messageData = {
            gmailMessageId: messageId,
            threadId: message.threadId,
            from: fromEmail,
            to: emailAddress,
            subject: subject,
            body: '', // OPTIMIZATION: Don't fetch body content
            bodySnippet: `Subject: ${subject}`, // Use subject as snippet
            date: messageDate,
            timestamp: admin.firestore.Timestamp.fromDate(new Date(message.internalDate || Date.now())),
            isRead: message.labelIds?.includes('UNREAD') ? false : true,
            direction: 'inbound',
            userId: userId,
            source: 'gmail',
            gmailAccount: emailAddress,
            attachments: [],
            messageIdHeader: message.payload?.headers?.find(h => h.name === 'Message-ID')?.value || null,
            // Add flag to indicate this needs body content fetched later
            needsBodyFetch: true
          };

          // Save to the messages subcollection that the UI listens to
          await adminDb.collection(`users/${userId}/contacts/${contactDoc.id}/messages`)
            .doc(messageId)
            .set(messageData);

          // Create a simple todo suggestion based on the email subject
          const todoSuggestion = {
            id: `gmail-${messageId}-${Date.now()}`,
            text: `Follow up on: ${subject}`,
            source: 'gmail',
            messageId: messageId,
            emailFrom: fromEmail,
            emailSubject: subject,
            createdAt: new Date().toISOString(),
            status: 'pending',
          };

          // Store the todo suggestion for this contact
          await adminDb.collection(`users/${userId}/contacts/${contactDoc.id}/todoSuggestions`)
            .doc(todoSuggestion.id)
            .set(todoSuggestion);

          console.log('Gmail Push Notification (Optimized): Saved message and created todo suggestion for contact:', contactDoc.id);
          processedCount++;

        } catch (messageError) {
          console.error('Gmail Push Notification (Optimized): Error processing message:', messageId, messageError);
          
          // If it's a rate limit error, stop processing and schedule retry
          if (messageError.status === 429 || messageError.code === 429) {
            console.log('Gmail Push Notification (Optimized): Rate limit hit, stopping processing');
            
            // Schedule a retry job for the remaining messages
            if (messagesToProcess.length > i + 1) {
              const remainingMessages = messagesToProcess.slice(i + 1);
              await adminDb.collection('gmail_retry_jobs').add({
                userId: userId,
                messages: remainingMessages,
                createdAt: new Date(),
                scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
                attempts: 0,
                maxAttempts: 3
              });
              console.log('Gmail Push Notification (Optimized): Scheduled retry job for', remainingMessages.length, 'remaining messages');
            }
            break;
          }
          continue;
        }
      }

      // Update the last processed history ID
      await userDocRef.set({
        gmailWatch: {
          ...gmailWatch,
          lastProcessedHistoryId: historyResponse.data.historyId,
          lastProcessedAt: new Date().toISOString(),
        },
      }, { merge: true });

      console.log('Gmail Push Notification (Optimized): Successfully processed', processedCount, 'messages for user:', userId);

      return NextResponse.json({ 
        success: true, 
        message: `Processed ${processedCount} new messages`,
        processedCount,
        totalFound: newMessages.length,
        optimized: true
      });

    } catch (historyError: any) {
      console.error('Gmail Push Notification (Optimized): Error fetching history:', historyError);
      
      // Handle specific Gmail API errors
      if (historyError.code === 403) {
        return NextResponse.json({ success: false, message: 'Gmail API access denied' }, { status: 403 });
      } else if (historyError.code === 404) {
        return NextResponse.json({ success: false, message: 'Gmail account not found' }, { status: 404 });
      } else if (historyError.status === 429 || historyError.code === 429) {
        console.log('Gmail Push Notification (Optimized): Rate limit hit on history fetch');
        return NextResponse.json({ success: false, message: 'Rate limit hit, will retry later' }, { status: 429 });
      }
      
      return NextResponse.json({ success: false, message: 'Failed to fetch Gmail history' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Gmail Push Notification (Optimized): Unexpected error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
