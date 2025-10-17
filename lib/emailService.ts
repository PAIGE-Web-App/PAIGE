import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { getAdminDb } from './firebaseAdmin';

// Create reusable transporter object using Gmail API OAuth
const createGmailTransporter = async (userId: string) => {
  try {
    // Get user's Gmail OAuth tokens from Firestore
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('Admin DB not initialized');
      return null;
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.error('User not found:', userId);
      return null;
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken || !refreshToken) {
      console.error('No Gmail OAuth tokens found for user:', userId);
      return null;
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Check if token needs refresh
    const tokenExpiry = oauth2Client.credentials.expiry_date;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await userDocRef.set({
          googleTokens: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || refreshToken,
            expiryDate: credentials.expiry_date,
          },
        }, { merge: true });
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return null;
      }
    }

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Return a custom transporter that uses Gmail API
    return {
      sendMail: async (mailOptions: any) => {
        const { to, from, subject, text, html } = mailOptions;
        
        // Build MIME message
        const message = [
          `To: ${to}`,
          `From: ${from}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: multipart/alternative; boundary="boundary"',
          '',
          '--boundary',
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          text,
          '',
          '--boundary',
          'Content-Type: text/html; charset="UTF-8"',
          '',
          html,
          '',
          '--boundary--'
        ].join('\r\n');

        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });

        return {
          messageId: response.data.id,
          response: response.data
        };
      }
    };
  } catch (error) {
    console.error('Error creating Gmail transporter:', error);
    return null;
  }
};

// Primary SendGrid transporter for professional email service
const createSendGridTransporter = () => {
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }
  return null;
};

export interface EmailContent {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (emailContent: EmailContent, userId?: string): Promise<boolean> => {
  try {
    // Use direct email sending instead of queue
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: emailContent.to,
        subject: emailContent.subject,
        body: emailContent.html || emailContent.text,
        from: process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER || 'notifications@paige.app',
        userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send email: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendTestEmail = async (toEmail: string, userName: string, userId?: string): Promise<boolean> => {
  const testMessage = "This is a test notification from Paige to verify your notification settings are working correctly! 🎉";
  
  const emailContent: EmailContent = {
    to: toEmail,
    subject: 'Test Notification from Paige',
    text: `Hello ${userName},\n\n${testMessage}\n\nIf you received this email, your email notifications are working correctly!\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #A85C36;">Test Notification from Paige</h2>
        <p>Hello ${userName},</p>
        <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; line-height: 1.6;">${testMessage}</p>
        </div>
        <p>If you received this email, your email notifications are working correctly!</p>
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The Paige Team
        </p>
      </div>
    `
  };

  return sendEmail(emailContent, userId);
};

export const sendNotificationEmail = async (
  toEmail: string, 
  userName: string, 
  contactName: string, 
  messageBody: string,
  userId?: string
): Promise<boolean> => {
  const emailContent: EmailContent = {
    to: toEmail,
    subject: `New message from ${contactName} in Paige`,
    text: `Hello ${userName},\n\nYou have a new message from ${contactName} in Paige:\n\n"${messageBody}"\n\nView and reply at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://paige.app'}\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #A85C36;">New Message from ${contactName}</h2>
        <p>Hello ${userName},</p>
        <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; line-height: 1.6;">${messageBody.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paige.app'}" 
             style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Message in Paige
          </a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">
          This message was sent from Paige - your wedding planning assistant
        </p>
      </div>
    `
  };

  return sendEmail(emailContent, userId);
}; 

export const sendTodoNotificationEmail = async (
  toEmail: string, 
  userName: string, 
  todoName: string,
  action: 'assigned' | 'updated' | 'completed',
  assignedBy: string,
  userId?: string
): Promise<boolean> => {
  const actionText = action === 'assigned' ? 'assigned to you' : 
                    action === 'updated' ? 'updated' : 'marked as completed';
  
  const emailContent: EmailContent = {
    to: toEmail,
    subject: `To-do item "${todoName}" ${actionText} in Paige`,
    text: `Hello ${userName},\n\n${assignedBy} has ${actionText} the to-do item "${todoName}" in Paige.\n\nView and manage your tasks at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://paige.app'}\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #A85C36;">To-do Item ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h2>
        <p>Hello ${userName},</p>
        <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; line-height: 1.6;"><strong>${assignedBy}</strong> has ${actionText} the to-do item:</p>
          <h3 style="color: #332B42; margin: 10px 0;">"${todoName}"</h3>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paige.app'}/todo" 
             style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Tasks in Paige
          </a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">
          This notification was sent from Paige - your wedding planning assistant
        </p>
      </div>
    `
  };

  return sendEmail(emailContent, userId);
}; 