import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    console.log('Gmail Push Notification: Received webhook');
    
    // Parse the Pub/Sub message
    const body = await req.json();
    console.log('Gmail Push Notification: Raw body:', JSON.stringify(body, null, 2));

    // Pub/Sub message structure
    if (!body.message || !body.message.data) {
      console.log('Gmail Push Notification: Invalid message format');
      return NextResponse.json({ success: false, message: 'Invalid message format' }, { status: 400 });
    }

    // Decode the base64 message data
    const messageData = Buffer.from(body.message.data, 'base64').toString('utf-8');
    console.log('Gmail Push Notification: Decoded message:', messageData);

    // Parse the Gmail notification
    let gmailNotification;
    try {
      gmailNotification = JSON.parse(messageData);
    } catch (parseError) {
      console.error('Gmail Push Notification: Failed to parse message data:', parseError);
      return NextResponse.json({ success: false, message: 'Failed to parse message data' }, { status: 400 });
    }

    console.log('Gmail Push Notification: Parsed notification:', gmailNotification);

    // Extract user email address from Gmail notification
    const emailAddress = gmailNotification.emailAddress;
    if (!emailAddress) {
      console.log('Gmail Push Notification: No email address in notification');
      return NextResponse.json({ success: false, message: 'No email address in notification' }, { status: 400 });
    }

    console.log('Gmail Push Notification: Processing for email:', emailAddress);

    // Find user by email address in Firestore
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('Gmail Push Notification: Database not available');
      return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    // Query for user with matching email in googleTokens
    const usersSnapshot = await adminDb.collection('users')
      .where('email', '==', emailAddress.toLowerCase())
      .where('gmailConnected', '==', true)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log('Gmail Push Notification: No user found with email:', emailAddress);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    console.log('Gmail Push Notification: Found user:', userId);

    // Get user's Gmail tokens and watch information
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('Gmail Push Notification: User not found:', userId);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};
    const gmailWatch = userData?.gmailWatch || {};

    if (!accessToken || !gmailWatch.historyId) {
      console.log('Gmail Push Notification: User has no Gmail access or watch setup:', userId);
      return NextResponse.json({ success: false, message: 'User has no Gmail access or watch setup' }, { status: 400 });
    }

    // Set up OAuth2 client (using existing pattern)
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
          
          console.log('Gmail Push Notification: Access token refreshed for user:', userId);
        } catch (refreshError) {
          console.error('Gmail Push Notification: Error refreshing token:', refreshError);
          return NextResponse.json({ success: false, message: 'Token refresh failed' }, { status: 401 });
        }
      } else {
        console.log('Gmail Push Notification: Access token expired and no refresh token available');
        return NextResponse.json({ success: false, message: 'Access token expired' }, { status: 401 });
      }
    }

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get the latest history to find new messages
    try {
      console.log('Gmail Push Notification: Fetching history for user:', userId, 'from historyId:', gmailWatch.historyId);
      
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
      console.log('Gmail Push Notification: Found', history.length, 'history entries');

      if (history.length === 0) {
        console.log('Gmail Push Notification: No new messages found');
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

      console.log('Gmail Push Notification: Found', newMessages.length, 'new messages');

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

      // Process each new message for todo suggestions
      let processedCount = 0;
      for (const messageId of newMessages.slice(0, 10)) { // Limit to 10 messages for performance
        try {
          // Get message details with rate limit handling
          const messageResponse = await GmailRateLimitHandler.executeWithRetry(async () => {
            return await gmail.users.messages.get({
              userId: 'me',
              id: messageId,
              format: 'full',
            });
          });

          const message = messageResponse.data;
          console.log('Gmail Push Notification: Processing message:', messageId);

          // Extract message content (simplified - you can enhance this)
          const headers = message.payload?.headers || [];
          const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
          const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
          
          if (!fromHeader?.value || !subjectHeader?.value) {
            console.log('Gmail Push Notification: Skipping message without from/subject:', messageId);
            continue;
          }

          // Extract email address from "Name <email@domain.com>" format
          const fromEmail = fromHeader.value.includes('<') 
            ? fromHeader.value.match(/<([^>]+)>/)?.[1] || fromHeader.value
            : fromHeader.value;

          const subject = subjectHeader.value;

          // Check if this email is from a known contact
          const contactQuery = adminDb.collection(`users/${userId}/contacts`)
            .where('email', '==', fromEmail.toLowerCase());
          
          const contactDocs = await contactQuery.get();
          
          if (contactDocs.empty) {
            console.log('Gmail Push Notification: No contact found for email:', fromEmail);
            continue;
          }

          const contactDoc = contactDocs.docs[0];
          const contactData = contactDoc.data();

          // Extract message body (simplified - you can enhance this)
          let body = '';
          let bodySnippet = '';
          
          if (message.payload?.body?.data) {
            body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
          } else if (message.payload?.parts) {
            // Handle multipart messages
            for (const part of message.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                break;
              }
            }
          }
          
          bodySnippet = body.substring(0, 300) + (body.length > 300 ? '...' : '');

          // Save the actual email message to Firestore (same path as UI listens to)
          const messageData = {
            gmailMessageId: messageId,
            threadId: message.threadId,
            from: fromEmail,
            to: userId, // The user's email (you might need to get this from user data)
            subject: subject,
            body: body,
            bodySnippet: bodySnippet,
            fullBody: body,
            date: message.internalDate ? new Date(parseInt(message.internalDate)).toISOString() : new Date().toISOString(),
            timestamp: admin.firestore.Timestamp.fromDate(new Date(parseInt(message.internalDate) || Date.now())),
            isRead: message.labelIds?.includes('UNREAD') ? false : true,
            direction: 'inbound',
            userId: userId,
            source: 'gmail',
            gmailAccount: emailAddress,
            attachments: [], // You can add attachment handling if needed
            messageIdHeader: message.payload?.headers?.find(h => h.name === 'Message-ID')?.value || null,
          };

          // Save to the messages subcollection using contact email as the path
          // This matches the path that the UI listens to for message fetching
          await adminDb.collection(`users/${userId}/contacts/${fromEmail}/messages`)
            .doc(messageId)
            .set(messageData);

          // Create a simple todo suggestion based on the email subject
          // This is a basic implementation - you can enhance this with AI analysis
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

          console.log('Gmail Push Notification: Saved message and created todo suggestion for contact:', contactDoc.id);
          processedCount++;

        } catch (messageError) {
          console.error('Gmail Push Notification: Error processing message:', messageId, messageError);
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

      console.log('Gmail Push Notification: Successfully processed', processedCount, 'messages for user:', userId);

      // Trigger todo analysis for the processed messages
      if (processedCount > 0) {
        try {
          console.log('Gmail Push Notification: Triggering todo analysis for processed messages');
          
          // Call the analyze-messages-for-todos API to process the new messages
          const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-messages-for-todos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              contactEmail: null, // Will analyze all contacts with new messages
              triggerSource: 'gmail-push-notification'
            }),
          });

          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            console.log('Gmail Push Notification: Todo analysis completed:', analysisResult);
          } else {
            console.error('Gmail Push Notification: Todo analysis failed:', analysisResponse.status);
          }
        } catch (analysisError) {
          console.error('Gmail Push Notification: Error triggering todo analysis:', analysisError);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Processed ${processedCount} new messages`,
        processedCount 
      });

    } catch (historyError: any) {
      console.error('Gmail Push Notification: Error fetching history:', historyError);
      
      // Handle specific Gmail API errors
      if (historyError.code === 403) {
        return NextResponse.json({ success: false, message: 'Gmail API access denied' }, { status: 403 });
      } else if (historyError.code === 404) {
        return NextResponse.json({ success: false, message: 'Gmail account not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: false, message: 'Failed to fetch Gmail history' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Gmail Push Notification: Unexpected error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
