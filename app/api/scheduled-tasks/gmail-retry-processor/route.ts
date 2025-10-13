import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

/**
 * Gmail Retry Job Processor
 * Processes Gmail retry jobs that were created due to rate limits
 * Runs every 5 minutes to retry failed Gmail processing
 */
export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    console.log('Gmail Retry Processor: Starting retry job processing...');

    // Get retry jobs that are due for processing
    const now = admin.firestore.Timestamp.now();
    const retryJobsSnapshot = await adminDb
      .collection('gmail_retry_jobs')
      .where('scheduledFor', '<=', now)
      .where('attempts', '<', 3) // Max 3 attempts
      .orderBy('scheduledFor')
      .limit(5) // Process max 5 jobs at a time
      .get();

    if (retryJobsSnapshot.empty) {
      console.log('Gmail Retry Processor: No retry jobs to process');
      return NextResponse.json({ 
        success: true, 
        message: 'No retry jobs to process',
        processed: 0
      });
    }

    let processedJobs = 0;
    const errors: string[] = [];

    for (const jobDoc of retryJobsSnapshot.docs) {
      const jobData = jobDoc.data();
      const jobId = jobDoc.id;

      try {
        console.log(`Gmail Retry Processor: Processing retry job ${jobId} for user ${jobData.userId}`);

        // Get user data
        const userDocRef = adminDb.collection('users').doc(jobData.userId);
        const userDocSnap = await userDocRef.get();
        
        if (!userDocSnap.exists) {
          console.log(`Gmail Retry Processor: User ${jobData.userId} not found, deleting job`);
          await jobDoc.ref.delete();
          continue;
        }

        const userData = userDocSnap.data();
        const { accessToken, refreshToken } = userData?.googleTokens || {};

        if (!accessToken) {
          console.log(`Gmail Retry Processor: User ${jobData.userId} has no Gmail access, deleting job`);
          await jobDoc.ref.delete();
          continue;
        }

        // Check Gmail quota before processing
        const { GmailQuotaService } = await import('@/utils/gmailQuotaService');
        const quotaCheck = await GmailQuotaService.canSendEmail(jobData.userId);
        
        if (quotaCheck.remaining < 3) {
          console.log(`Gmail Retry Processor: Low quota for user ${jobData.userId}, rescheduling job`);
          await jobDoc.ref.update({
            scheduledFor: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)), // Retry in 30 minutes
            attempts: jobData.attempts + 1
          });
          continue;
        }

        // Set up OAuth2 client
        const { google } = await import('googleapis');
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
              
              console.log('Gmail Retry Processor: Access token refreshed for user:', jobData.userId);
            } catch (refreshError) {
              console.error('Gmail Retry Processor: Error refreshing token:', refreshError);
              errors.push(`Token refresh failed for user ${jobData.userId}`);
              continue;
            }
          } else {
            console.log('Gmail Retry Processor: Access token expired and no refresh token available');
            await jobDoc.ref.delete(); // Delete job if no refresh token
            continue;
          }
        }

        // Create Gmail API client
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Process remaining messages with delays
        const { GmailRateLimitHandler } = await import('@/utils/gmailRateLimitHandler');
        let processedMessages = 0;
        
        for (let i = 0; i < jobData.messages.length; i++) {
          const messageId = jobData.messages[i];
          
          try {
            // Add delay between message processing
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
            }

            // Get message details with minimal format
            const messageResponse = await GmailRateLimitHandler.executeWithRetry(async () => {
              return await gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date']
              });
            });

            const message = messageResponse.data;
            const headers = message.payload?.headers || [];
            const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
            const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
            const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');
            
            if (!fromHeader?.value || !subjectHeader?.value) {
              continue;
            }

            // Extract email address
            const fromEmail = fromHeader.value.includes('<') 
              ? fromHeader.value.match(/<([^>]+)>/)?.[1] || fromHeader.value
              : fromHeader.value;

            // Find contact
            const contactQuery = adminDb.collection(`users/${jobData.userId}/contacts`)
              .where('email', '==', fromEmail.toLowerCase());
            
            const contactDocs = await contactQuery.get();
            
            if (contactDocs.empty) {
              continue;
            }

            const contactDoc = contactDocs.docs[0];

            // Create minimal message data
            const messageData = {
              gmailMessageId: messageId,
              threadId: message.threadId,
              from: fromEmail,
              to: userData?.email || '',
              subject: subjectHeader.value,
              body: '',
              bodySnippet: `Subject: ${subjectHeader.value}`,
              date: dateHeader?.value || new Date().toISOString(),
              timestamp: admin.firestore.Timestamp.fromDate(new Date(message.internalDate || Date.now())),
              isRead: message.labelIds?.includes('UNREAD') ? false : true,
              direction: 'inbound',
              userId: jobData.userId,
              source: 'gmail',
              gmailAccount: userData?.email || '',
              attachments: [],
              messageIdHeader: message.payload?.headers?.find(h => h.name === 'Message-ID')?.value || null,
              needsBodyFetch: true
            };

            // Save message
            await adminDb.collection(`users/${jobData.userId}/contacts/${contactDoc.id}/messages`)
              .doc(messageId)
              .set(messageData);

            // Create todo suggestion
            const todoSuggestion = {
              id: `gmail-${messageId}-${Date.now()}`,
              text: `Follow up on: ${subjectHeader.value}`,
              source: 'gmail',
              messageId: messageId,
              emailFrom: fromEmail,
              emailSubject: subjectHeader.value,
              createdAt: new Date().toISOString(),
              status: 'pending',
            };

            await adminDb.collection(`users/${jobData.userId}/contacts/${contactDoc.id}/todoSuggestions`)
              .doc(todoSuggestion.id)
              .set(todoSuggestion);

            processedMessages++;

          } catch (messageError) {
            console.error(`Gmail Retry Processor: Error processing message ${messageId}:`, messageError);
            
            // If rate limit hit again, reschedule the remaining messages
            if (messageError.status === 429 || messageError.code === 429) {
              const remainingMessages = jobData.messages.slice(i);
              await adminDb.collection('gmail_retry_jobs').add({
                userId: jobData.userId,
                messages: remainingMessages,
                createdAt: new Date(),
                scheduledFor: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // Retry in 10 minutes
                attempts: 0,
                maxAttempts: 3
              });
              console.log(`Gmail Retry Processor: Rescheduled ${remainingMessages.length} messages for user ${jobData.userId}`);
              break;
            }
          }
        }

        // Delete the job if all messages were processed or if no messages were processed
        if (processedMessages === jobData.messages.length || processedMessages === 0) {
          await jobDoc.ref.delete();
          console.log(`Gmail Retry Processor: Completed job ${jobId}, processed ${processedMessages} messages`);
        } else {
          // Update job with remaining messages
          const remainingMessages = jobData.messages.slice(processedMessages);
          await jobDoc.ref.update({
            messages: remainingMessages,
            attempts: jobData.attempts + 1,
            scheduledFor: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)) // Retry in 15 minutes
          });
          console.log(`Gmail Retry Processor: Updated job ${jobId} with ${remainingMessages.length} remaining messages`);
        }

        processedJobs++;

      } catch (error: any) {
        console.error(`Gmail Retry Processor: Error processing job ${jobId}:`, error);
        errors.push(`Job ${jobId}: ${error.message}`);
        
        // Increment attempts and reschedule
        await jobDoc.ref.update({
          attempts: jobData.attempts + 1,
          scheduledFor: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)) // Retry in 30 minutes
        });
      }
    }

    console.log(`Gmail Retry Processor: Completed processing ${processedJobs} jobs`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processedJobs} retry jobs`,
      processed: processedJobs,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Gmail Retry Processor: Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
