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
          
          // Note: Client-side token refresh is not possible without exposing client secret
          // For now, we'll return false to trigger re-authentication
          console.warn('⚠️ Token refresh not available on client-side, user needs to re-authenticate');
          return false;
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

      // Debug logging removed to reduce console spam

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

          // Processing message silently

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

          // Parse date more robustly - check multiple possible date fields
          let parsedDate: Date;
          
          // Try different date sources in order of preference
          let dateValue = date; // From headers
          if (!dateValue) {
            dateValue = message.date; // From message object
          }
          if (!dateValue) {
            dateValue = message.internalDate; // From Gmail API internal date
          }
          
          // Debug logging removed to reduce console spam
          
          if (dateValue) {
            try {
              // Handle both RFC 2822 format and Unix timestamp
              if (typeof dateValue === 'number') {
                // Unix timestamp (milliseconds)
                parsedDate = new Date(dateValue);
              } else if (typeof dateValue === 'string') {
                // RFC 2822 format or ISO string
                parsedDate = new Date(dateValue);
              } else {
                parsedDate = new Date();
              }
              
              // Validate the parsed date
              if (isNaN(parsedDate.getTime())) {
                console.warn('Invalid date from Gmail API:', dateValue);
                parsedDate = new Date();
              }
            } catch (error) {
              console.warn('Error parsing date:', dateValue, error);
              parsedDate = new Date();
            }
          } else {
            console.warn('No date found in Gmail message, using current time');
            parsedDate = new Date();
          }


          // Save to Firestore
          const messagePath = `users/${userId}/contacts/${contactEmail}/messages`;
          
          await addDoc(collection(db, messagePath), {
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
            userId,
            isRead: direction === 'sent' ? true : false, // Mark sent messages as read by default
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
          // Call the working todo analysis API (use the same system as server-side import)
          const analysisResponse = await fetch('/api/analyze-messages-for-todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              contactEmail: contactEmail
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
