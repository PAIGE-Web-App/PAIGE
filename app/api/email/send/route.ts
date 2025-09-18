// app/api/email/send/route.ts
// Email sending API endpoint for job queue

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';

// Create reusable transporter object using Gmail API OAuth
const createGmailTransporter = async (userId: string) => {
  try {
    // Get user's Gmail OAuth tokens from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.error('User not found:', userId);
      return null;
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken) {
      console.error('No Gmail OAuth access token found for user:', userId);
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
      refresh_token: refreshToken || undefined,
    });

    // Check if token needs refresh
    const tokenExpiry = oauth2Client.credentials.expiry_date;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      if (refreshToken) {
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
      } else {
        console.log('Access token expired and no refresh token available (Firebase popup flow)');
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

// Fallback to SendGrid if configured
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

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, from, userId } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    let transporter: any = null;
    
    // Try Gmail API OAuth first if userId is provided
    if (userId) {
      transporter = await createGmailTransporter(userId);
    }
    
    // Fallback to SendGrid if Gmail OAuth fails or isn't available
    if (!transporter) {
      transporter = createSendGridTransporter();
    }
    
    if (!transporter) {
      throw new Error('No email service configured. Please set up Gmail OAuth or SendGrid credentials.');
    }

    const fromEmail = from || process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || 'notifications@paige.app';
    
    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      text: body,
      html: body
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 