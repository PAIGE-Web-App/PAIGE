/**
 * Client-Side Gmail API Service
 * 
 * This service handles all Gmail operations directly from the browser,
 * bypassing Vercel's restrictions on server-side external API calls.
 * 
 * Benefits:
 * - Faster performance (no server round-trip)
 * - Better security (tokens never leave browser)
 * - More reliable (no server dependencies)
 * - Better error handling (direct Gmail API responses)
 */

interface GmailMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{
    name: string;
    type: string;
    data: string;
  }>;
}

interface GmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
  errorType?: string;
}

export class GmailClientService {
  private static instance: GmailClientService;
  private accessToken: string | null = null;
  private userEmail: string | null = null;

  private constructor() {}

  public static getInstance(): GmailClientService {
    if (!GmailClientService.instance) {
      GmailClientService.instance = new GmailClientService();
    }
    return GmailClientService.instance;
  }

  /**
   * Initialize the service with user's Gmail access token
   */
  public async initialize(userId: string): Promise<boolean> {
    try {
      console.log('🔧 Initializing Gmail client service for user:', userId);
      
      // Get user's Gmail tokens from Firestore
      const tokens = await this.getUserGmailTokens(userId);
      
      if (!tokens?.accessToken) {
        console.error('❌ No Gmail access token found for user:', userId);
        return false;
      }

      this.accessToken = tokens.accessToken;
      this.userEmail = tokens.email;
      
      console.log('✅ Gmail client service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gmail client service:', error);
      return false;
    }
  }

  /**
   * Get user's Gmail tokens from Firestore
   */
  private async getUserGmailTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
    email: string;
  } | null> {
    try {
      // Import Firebase client SDK
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { getAuth } = await import('firebase/auth');
      
      const db = getFirestore();
      const auth = getAuth();
      
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      const { accessToken, refreshToken, expiryDate, email } = userData?.googleTokens || {};
      
      if (!accessToken) {
        return null;
      }

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

  /**
   * Refresh Gmail access token if needed
   */
  private async refreshTokenIfNeeded(userId: string): Promise<boolean> {
    try {
      const tokens = await this.getUserGmailTokens(userId);
      if (!tokens) return false;

      // Check if token needs refreshing
      if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
        if (tokens.refreshToken) {
          console.log('🔄 Refreshing Gmail access token...');
          
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
              client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!,
              refresh_token: tokens.refreshToken,
              grant_type: 'refresh_token'
            })
          });

          if (response.ok) {
            const data = await response.json();
            
            // Update token in Firestore
            const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
            const db = getFirestore();
            
            await updateDoc(doc(db, 'users', userId), {
              'googleTokens.accessToken': data.access_token,
              'googleTokens.expiryDate': Date.now() + (data.expires_in * 1000)
            });

            this.accessToken = data.access_token;
            console.log('✅ Gmail access token refreshed successfully');
            return true;
          }
        }
        
        console.error('❌ Failed to refresh Gmail token');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error refreshing Gmail token:', error);
      return false;
    }
  }

  /**
   * Build MIME email with optional attachments
   */
  private buildMimeEmail(message: GmailMessage): string {
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
    
    const bodyWithFooter = message.body + paigeFooter;
    const htmlBody = message.body.replace(/\n/g, '<br>') + htmlFooter;
    
    let boundary = '----=_Part_' + Math.random().toString(36).substring(2, 15);
    let headers = [
      `To: ${message.to}`,
      `From: ${message.from}`,
      `Subject: ${message.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];
    if (message.inReplyTo) headers.push(`In-Reply-To: <${message.inReplyTo}>`);
    if (message.references) headers.push(`References: <${message.references}>`);

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

    if (message.attachments && message.attachments.length > 0) {
      const mixedBoundary = '----=_Part_' + Math.random().toString(36).substring(2, 15);
      const mixedHeaders = [
        `To: ${message.to}`,
        `From: ${message.from}`,
        `Subject: ${message.subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      ];
      if (message.inReplyTo) mixedHeaders.push(`In-Reply-To: <${message.inReplyTo}>`);
      if (message.references) mixedHeaders.push(`References: <${message.references}>`);

      let mixedParts = [
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        ...messageParts,
        `--${boundary}--`,
        '',
      ];

      for (const att of message.attachments) {
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

  /**
   * Send Gmail reply
   */
  public async sendReply(
    userId: string,
    messageData: {
      to: string;
      subject: string;
      body: string;
      threadId?: string;
      messageId?: string;
      attachments?: Array<{ name: string; type: string; data: string }>;
    }
  ): Promise<GmailResponse> {
    try {
      console.log('📧 Sending Gmail reply via client-side API');
      
      // Ensure service is initialized
      if (!this.accessToken) {
        const initialized = await this.initialize(userId);
        if (!initialized) {
          return {
            success: false,
            error: 'Gmail access token not found. Please re-authorize Gmail access.',
            errorType: 'auth'
          };
        }
      }

      // Refresh token if needed
      const tokenValid = await this.refreshTokenIfNeeded(userId);
      if (!tokenValid) {
        return {
          success: false,
          error: 'Gmail access expired. Please re-authorize.',
          errorType: 'auth'
        };
      }

      // Build MIME email
      const rawEmail = this.buildMimeEmail({
        to: messageData.to,
        from: this.userEmail!,
        subject: messageData.subject,
        body: messageData.body,
        inReplyTo: messageData.messageId,
        references: messageData.threadId,
        attachments: messageData.attachments,
      });

      // Encode email for Gmail API
      const encodedEmail = btoa(rawEmail)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email using Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedEmail,
          threadId: messageData.threadId || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Gmail API error:', errorData);
        
        return {
          success: false,
          error: `Gmail API error: ${errorData.error?.message || 'Unknown error'}`,
          errorType: response.status === 401 ? 'auth' : 'api_error'
        };
      }

      const result = await response.json();
      console.log('✅ Gmail reply sent successfully:', result.id);

      return {
        success: true,
        messageId: result.id,
        threadId: result.threadId
      };

    } catch (error: any) {
      console.error('❌ Gmail reply error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during Gmail reply.',
        errorType: 'network_error'
      };
    }
  }

  /**
   * Send new Gmail message
   */
  public async sendNewMessage(
    userId: string,
    messageData: {
      to: string;
      subject: string;
      body: string;
      attachments?: Array<{ name: string; type: string; data: string }>;
    }
  ): Promise<GmailResponse> {
    try {
      console.log('📧 Sending new Gmail message via client-side API');
      
      // Ensure service is initialized
      if (!this.accessToken) {
        const initialized = await this.initialize(userId);
        if (!initialized) {
          return {
            success: false,
            error: 'Gmail access token not found. Please re-authorize Gmail access.',
            errorType: 'auth'
          };
        }
      }

      // Refresh token if needed
      const tokenValid = await this.refreshTokenIfNeeded(userId);
      if (!tokenValid) {
        return {
          success: false,
          error: 'Gmail access expired. Please re-authorize.',
          errorType: 'auth'
        };
      }

      // Build MIME email
      const rawEmail = this.buildMimeEmail({
        to: messageData.to,
        from: this.userEmail!,
        subject: messageData.subject,
        body: messageData.body,
        attachments: messageData.attachments,
      });

      // Encode email for Gmail API
      const encodedEmail = btoa(rawEmail)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email using Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Gmail API error:', errorData);
        
        return {
          success: false,
          error: `Gmail API error: ${errorData.error?.message || 'Unknown error'}`,
          errorType: response.status === 401 ? 'auth' : 'api_error'
        };
      }

      const result = await response.json();
      console.log('✅ Gmail message sent successfully:', result.id);

      return {
        success: true,
        messageId: result.id,
        threadId: result.threadId
      };

    } catch (error: any) {
      console.error('❌ Gmail send error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during Gmail send.',
        errorType: 'network_error'
      };
    }
  }

  /**
   * Check if Gmail is available and authenticated
   */
  public async isGmailAvailable(userId: string): Promise<boolean> {
    try {
      const initialized = await this.initialize(userId);
      if (!initialized) return false;

      // Test Gmail API access
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Gmail availability check failed:', error);
      return false;
    }
  }

  /**
   * Check if there's Gmail history with a specific contact
   */
  public async checkGmailHistory(contactEmail: string, userId: string): Promise<{ hasHistory: boolean; error?: string }> {
    try {
      // Initialize with userId
      await this.initialize(userId);
      
      if (!this.accessToken) {
        return { hasHistory: false, error: 'Gmail not authenticated' };
      }

      // Use Gmail API to search for messages with this contact
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:${contactEmail} OR to:${contactEmail}&maxResults=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { hasHistory: false, error: 'Gmail authentication expired' };
        }
        throw new Error(`Gmail API error: ${response.status}`);
      }

      const data = await response.json();
      const hasHistory = !!(data.messages && data.messages.length > 0);
      
      console.log(`🔍 Gmail history check for ${contactEmail}:`, { hasHistory, total: data.resultSizeEstimate });
      
      return { hasHistory };
    } catch (error) {
      console.error('❌ Error checking Gmail history:', error);
      return { hasHistory: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Import Gmail messages for a specific contact
   */
  public async importGmailMessages(contactEmail: string, userId: string, config: { maxResults?: number; enableTodoScanning?: boolean } = {}): Promise<{ success: boolean; totalImportedMessages?: number; error?: string }> {
    try {
      // Initialize with userId
      await this.initialize(userId);
      
      if (!this.accessToken) {
        return { success: false, error: 'Gmail not authenticated' };
      }

      const maxResults = config.maxResults || 15;
      console.log(`📥 Importing Gmail messages for ${contactEmail} (max: ${maxResults})`);

      // Get message list
      const messagesResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:${contactEmail} OR to:${contactEmail}&maxResults=${maxResults}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!messagesResponse.ok) {
        if (messagesResponse.status === 401) {
          return { success: false, error: 'Gmail authentication expired' };
        }
        throw new Error(`Gmail API error: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const messages = messagesData.messages || [];
      
      console.log(`📨 Found ${messages.length} messages to import`);

      if (messages.length === 0) {
        return { success: true, totalImportedMessages: 0 };
      }

      // Get full message details
      const messagePromises = messages.map(async (message: any) => {
        const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${message.id}`);
          return null;
        }

        return await messageResponse.json();
      });

      const fullMessages = await Promise.all(messagePromises);
      const validMessages = fullMessages.filter(msg => msg !== null);

      console.log(`✅ Successfully fetched ${validMessages.length} message details`);

      // Process and save messages to Firestore
      const { db } = await import('@/lib/firebase');
      const { collection, addDoc, Timestamp, query, where, getDocs } = await import('firebase/firestore');

      // Get existing message IDs to avoid duplicates
      const messagesRef = collection(db, `users/${userId}/contacts/${contactEmail}/messages`);
      const existingMessagesQuery = query(messagesRef);
      const existingMessagesSnapshot = await getDocs(existingMessagesQuery);
      const existingMessageIds = new Set(
        existingMessagesSnapshot.docs.map(doc => doc.data().id)
      );

      console.log(`📋 Found ${existingMessageIds.size} existing messages, checking for duplicates...`);
      console.log(`📋 Existing message IDs:`, Array.from(existingMessageIds).slice(0, 5)); // Show first 5 IDs
      console.log(`📋 New message IDs to check:`, validMessages.slice(0, 5).map(m => m.id)); // Show first 5 new IDs

      let importedCount = 0;
      let skippedCount = 0;
      
      for (const message of validMessages) {
        try {
          // Skip if message already exists
          if (existingMessageIds.has(message.id)) {
            console.log(`⏭️ Skipping duplicate message: ${message.id}`);
            skippedCount++;
            continue;
          }

          console.log(`✅ Processing new message: ${message.id}`);

          // Extract message data
          const headers = message.payload.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const to = headers.find((h: any) => h.name === 'To')?.value || '';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';

          // Extract body
          let body = '';
          if (message.payload.body && message.payload.body.data) {
            body = Buffer.from(message.payload.body.data, 'base64').toString();
          } else if (message.payload.parts) {
            for (const part of message.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                body = Buffer.from(part.body.data, 'base64').toString();
                break;
              }
            }
          }

          // Determine direction
          const direction = from.includes(contactEmail) ? 'received' : 'sent';

          // Parse date more robustly
          let parsedDate: Date;
          if (date) {
            try {
              // Gmail API returns dates in RFC 2822 format
              parsedDate = new Date(date);
              // Validate the parsed date
              if (isNaN(parsedDate.getTime())) {
                console.warn('Invalid date from Gmail API:', date);
                parsedDate = new Date();
              }
            } catch (error) {
              console.warn('Error parsing date:', date, error);
              parsedDate = new Date();
            }
          } else {
            parsedDate = new Date();
          }

          // Save to Firestore
          await addDoc(collection(db, `users/${userId}/contacts/${contactEmail}/messages`), {
            id: message.id,
            threadId: message.threadId,
            subject,
            body,
            from,
            to,
            date: parsedDate,
            direction,
            source: 'gmail',
            createdAt: Timestamp.now(),
            userId
          });

          importedCount++;
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
        }
      }

      console.log(`✅ Successfully imported ${importedCount} new messages (skipped ${skippedCount} duplicates)`);

      // Trigger todo analysis if enabled
      if (config.enableTodoScanning && importedCount > 0) {
        console.log('🔄 Triggering todo analysis...');
        try {
          // Call the server-side todo analysis API
          const analysisResponse = await fetch('/api/scan-messages-for-todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              contactId: contactEmail, // Use contactEmail as contactId since that's the path structure
              scanType: 'recent_messages',
              maxMessages: 20,
              enableRAG: true
            })
          });
          
          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            console.log('✅ Todo analysis completed:', analysisResult);
          } else {
            console.warn('Todo analysis API call failed:', analysisResponse.status);
          }
        } catch (error) {
          console.error('❌ Todo analysis failed:', error);
          // Don't fail the import if analysis fails
        }
      }

      return { 
        success: true, 
        totalImportedMessages: importedCount 
      };

    } catch (error) {
      console.error('❌ Error importing Gmail messages:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const gmailClientService = GmailClientService.getInstance();
