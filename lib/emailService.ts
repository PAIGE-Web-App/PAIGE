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
    subject: `💬 New message from ${contactName}`,
    text: `Hello ${userName},\n\nYou have a new message from ${contactName} in Paige:\n\n"${messageBody}"\n\nView and reply at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/messages\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; padding: 30px 20px 20px 20px; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 80px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px; text-align: center; color: #332B42;">New Message from ${contactName}</h1>
            
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              You have a new message from <strong>${contactName}</strong> in Paige:
            </p>
            
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #A85C36;">
              <p style="margin: 0; font-size: 15px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif; line-height: 1.6; font-style: italic;">
                "${messageBody.replace(/\n/g, '<br>')}"
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/messages" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                View & Reply in Paige
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Best regards,<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
          
          <div style="background-color: #f8f6f4; padding: 20px; text-align: center;">
            <a href="https://weddingpaige.com" style="display: inline-block; margin-bottom: 10px;">
              <img src="https://weddingpaige.com/PaigeFav.png" alt="Paige" style="width: 32px; height: auto;" />
            </a>
            <p style="margin: 0; font-size: 12px; color: #7A7A7A; font-family: 'Work Sans', Arial, sans-serif;">
              This email was sent from Paige - your wedding planning assistant
            </p>
          </div>
        </div>
      </div>
    `
  };

  return sendEmail(emailContent, userId);
}; 

// sendTodoNotificationEmail removed - not used in actual system flows

// Welcome Email Series - Dynamic content based on user data
export const sendWelcomeEmail = async (
  toEmail: string,
  userName: string,
  userData?: {
    weddingDate?: Date | string | null;
    weddingDateUndecided?: boolean;
    weddingLocation?: string | null;
    weddingLocationUndecided?: boolean;
    hasVenue?: boolean;
    partnerName?: string;
    guestCount?: number;
    maxBudget?: number;
  },
  userId?: string
): Promise<boolean> => {
  // Calculate days until wedding if date is available
  let daysUntilWedding: number | null = null;
  let weddingDateFormatted: string | null = null;
  
  if (userData?.weddingDate && !userData?.weddingDateUndecided) {
    const weddingDateObj = new Date(userData.weddingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = weddingDateObj.getTime() - today.getTime();
    daysUntilWedding = Math.ceil(timeDiff / (1000 * 3600 * 24));
    weddingDateFormatted = weddingDateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // Build dynamic status section
  const buildStatusSection = () => {
    const hasWeddingDate = userData?.weddingDate && !userData?.weddingDateUndecided;
    const hasLocation = userData?.weddingLocation && !userData?.weddingLocationUndecided;
    const hasVenue = userData?.hasVenue === true;
    
    let statusItems = '';
    
    if (hasWeddingDate && daysUntilWedding !== null) {
      statusItems += `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #10B981; font-size: 18px; margin-right: 10px;">✓</span>
          <span style="color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
            <strong>Your wedding is on ${weddingDateFormatted}</strong> - ${daysUntilWedding} days away!
          </span>
        </div>
      `;
    } else {
      statusItems += `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #EAB308; font-size: 18px; margin-right: 10px;">📅</span>
          <span style="color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
            Set your wedding date in <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/settings" style="color: #A85C36; text-decoration: none;">Settings</a> to get personalized planning timelines
          </span>
        </div>
      `;
    }
    
    if (hasLocation) {
      statusItems += `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #10B981; font-size: 18px; margin-right: 10px;">✓</span>
          <span style="color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
            <strong>Planning in ${userData.weddingLocation}</strong> - great choice!
          </span>
        </div>
      `;
    } else {
      statusItems += `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #EAB308; font-size: 18px; margin-right: 10px;">📍</span>
          <span style="color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
            Add your wedding location to get venue suggestions
          </span>
        </div>
      `;
    }
    
    if (hasVenue) {
      statusItems += `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #10B981; font-size: 18px; margin-right: 10px;">✓</span>
          <span style="color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
            <strong>Venue selected</strong> - you're ahead of the game!
          </span>
        </div>
      `;
    } else {
      statusItems += `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #EAB308; font-size: 18px; margin-right: 10px;">🏛️</span>
          <span style="color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
            Browse venues in your area to find the perfect match
          </span>
        </div>
      `;
    }
    
    return statusItems;
  };

  // Build next steps section
  const buildNextSteps = () => {
    const hasWeddingDate = userData?.weddingDate && !userData?.weddingDateUndecided;
    const hasLocation = userData?.weddingLocation && !userData?.weddingLocationUndecided;
    const hasVenue = userData?.hasVenue === true;
    
    let steps = [];
    let stepNumber = 1;
    
    if (!hasWeddingDate) {
      steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>${stepNumber}.</strong> Set your wedding date in Settings</li>`);
      stepNumber++;
    }
    
    if (!hasLocation) {
      steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>${stepNumber}.</strong> Add your wedding location</li>`);
      stepNumber++;
    }
    
    if (!hasVenue) {
      steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>${stepNumber}.</strong> Browse and select your wedding venue</li>`);
      stepNumber++;
    }
    
    steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>${stepNumber}.</strong> Import your vendor contacts</li>`);
    stepNumber++;
    steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>${stepNumber}.</strong> Create your first mood board</li>`);
    stepNumber++;
    steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>${stepNumber}.</strong> Set up your guest list and seating chart</li>`);
    
    return steps.join('');
  };

  const emailContent: EmailContent = {
    to: toEmail,
    subject: "Welcome to Paige - Your Wedding Planning Journey Begins! 🎉",
    text: `Hello ${userName},\n\nWelcome to Paige! We're thrilled to be part of your wedding planning journey${userData?.partnerName ? ` with ${userData.partnerName}` : ''}.\n\nPaige is your AI-powered wedding planning assistant, designed to help you:\n• Organize your guest list and seating charts\n• Manage your vendor communications\n• Track your to-do list and deadlines\n• Generate personalized planning insights\n\nGet started by exploring your dashboard and setting up your wedding details.\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; padding: 30px 20px 20px 20px; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 80px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px; text-align: center; color: #332B42;">Welcome to Paige! 🎉</h1>
            
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              Welcome to Paige! We're thrilled to be part of your wedding planning journey${userData?.partnerName ? ` with <strong>${userData.partnerName}</strong>` : ''}.
            </p>
            
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #A85C36; margin: 0 0 15px 0; font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">Your Planning Status:</h3>
              ${buildStatusSection()}
            </div>
            
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #A85C36; margin: 0 0 15px 0; font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">What Paige Can Do for You:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
                <li style="margin-bottom: 8px;">Organize your guest list and seating charts</li>
                <li style="margin-bottom: 8px;">Manage your vendor communications in one place</li>
                <li style="margin-bottom: 8px;">Track your to-do list with AI-powered suggestions</li>
                <li style="margin-bottom: 8px;">Generate personalized planning insights</li>
                <li style="margin-bottom: 8px;">Create beautiful mood boards for inspiration</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/dashboard" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                Go to Your Dashboard
              </a>
            </div>
            
            <div style="background-color: #E0F2FE; border-left: 4px solid #3B82F6; padding: 16px; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #1E40AF; margin: 0 0 10px 0; font-family: 'Work Sans', Arial, sans-serif; font-size: 14px;">📋 Your Next Steps:</h4>
              <ol style="margin: 0; padding-left: 20px;">
                ${buildNextSteps()}
              </ol>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Happy planning!<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
          
          <div style="background-color: #f8f6f4; padding: 20px; text-align: center;">
            <a href="https://weddingpaige.com" style="display: inline-block; margin-bottom: 10px;">
              <img src="https://weddingpaige.com/PaigeFav.png" alt="Paige" style="width: 32px; height: auto;" />
            </a>
            <p style="margin: 0; font-size: 12px; color: #7A7A7A; font-family: 'Work Sans', Arial, sans-serif;">
              This email was sent from Paige - your wedding planning assistant
            </p>
          </div>
        </div>
      </div>
    `
  };

  return sendEmail(emailContent, userId);
};

// Credit System Alerts
export const sendCreditAlertEmail = async (
  toEmail: string,
  userName: string,
  alertType: 'low' | 'refresh' | 'depleted',
  currentCredits: number,
  subscriptionTier: string,
  userType: 'couple' | 'planner',
  userId?: string
): Promise<boolean> => {
  const getAlertContent = () => {
    // Calculate daily credit allocation based on subscription tier
    const dailyAllocation = userType === 'couple' 
      ? subscriptionTier === 'free' ? 15 
      : subscriptionTier === 'premium' ? 22 
      : 45
      : subscriptionTier === 'free' ? 25
      : subscriptionTier === 'starter' ? 100
      : subscriptionTier === 'professional' ? 300
      : 1000;
    
    const usagePercentage = Math.round(((dailyAllocation - currentCredits) / dailyAllocation) * 100);
    
    switch (alertType) {
      case 'low':
        return {
          subject: "⚠️ Low Credits Alert - Action Needed",
          title: "Low Credits Alert",
          message: `You have ${currentCredits} credits remaining (${usagePercentage}% used). Consider refreshing your credits to continue using Paige's AI features.`,
          buttonText: "Refresh Credits",
          buttonLink: "/settings"
        };
      case 'refresh':
        return {
          subject: "🎉 Credits Refreshed - You're All Set!",
          title: "Credits Refreshed!",
          message: `Your credits have been refreshed! You now have ${currentCredits} credits to continue planning your perfect wedding.`,
          buttonText: "Continue Planning",
          buttonLink: "/dashboard"
        };
      case 'depleted':
        return {
          subject: "🚨 Credits Depleted - Upgrade Required",
          title: "Credits Depleted",
          message: `You've used all your credits. Upgrade your plan to continue using Paige's AI features and keep your wedding planning on track.`,
          buttonText: "Upgrade Plan",
          buttonLink: "/settings"
        };
    }
  };

  const content = getAlertContent();

  const emailContent: EmailContent = {
    to: toEmail,
    subject: content.subject,
    text: `Hello ${userName},\n\n${content.message}\n\nVisit Paige to ${content.buttonText.toLowerCase()}.\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background-color: #A85C36; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px;">${content.title}</h1>
          </div>
          
          <div style="text-align: center; padding: 20px 0; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 100px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              ${content.message}
            </p>
            
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #7A7A7A; line-height: 1.6; font-family: 'Work Sans', Arial, sans-serif;">
                <strong>Current Credits:</strong> ${currentCredits}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}${content.buttonLink}" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                ${content.buttonText}
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Best regards,<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
          
          <div style="background-color: #f8f6f4; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #7A7A7A; font-family: 'Work Sans', Arial, sans-serif;">
              This email was sent from Paige - your wedding planning assistant
            </p>
          </div>
        </div>
      </div>
    `
  };

  return sendEmail(emailContent, userId);
}; 
// Weekly Todo Digest Email - Sent every Sunday with upcoming tasks
export const sendWeeklyTodoDigestEmail = async (
  toEmail: string,
  userName: string,
  todos: Array<{
    id: string;
    name: string;
    deadline?: Date | string | null;
    category?: string;
    listName?: string;
  }>,
  userId?: string
): Promise<boolean> => {
  // Format todo items for email
  const buildTodoList = () => {
    if (todos.length === 0) {
      return '<p style="color: #666; font-family: \'Work Sans\', Arial, sans-serif;">No upcoming tasks at the moment. Great job staying on top of things!</p>';
    }
    
    return todos.map((todo, index) => {
      let deadlineText = '';
      if (todo.deadline) {
        const deadlineDate = new Date(todo.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysUntil < 0) {
          deadlineText = `<span style="color: #EF4444;">Overdue by ${Math.abs(daysUntil)} days</span>`;
        } else if (daysUntil === 0) {
          deadlineText = `<span style="color: #F59E0B;">Due today</span>`;
        } else if (daysUntil === 1) {
          deadlineText = `<span style="color: #F59E0B;">Due tomorrow</span>`;
        } else if (daysUntil <= 7) {
          deadlineText = `<span style="color: #A85C36;">Due in ${daysUntil} days</span>`;
        } else {
          deadlineText = `<span style="color: #666;">Due ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
        }
      }
      
      return `
        <div style="background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-start;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif; font-weight: 600;">
                ${todo.name}
              </h4>
              ${todo.category ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #666; font-family: 'Work Sans', Arial, sans-serif;">${todo.category}</p>` : ''}
              ${todo.listName ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #999; font-family: 'Work Sans', Arial, sans-serif;">📋 ${todo.listName}</p>` : ''}
              ${deadlineText ? `<p style="margin: 4px 0 0 0; font-size: 13px; font-family: 'Work Sans', Arial, sans-serif;">${deadlineText}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  const emailContent: EmailContent = {
    to: toEmail,
    subject: "📋 Your Weekly To-Dos",
    text: `Hello ${userName},\n\nHere are your upcoming to-do items for this week:\n\n${todos.map((todo, i) => `${i + 1}. ${todo.name}${todo.deadline ? ` - Due: ${new Date(todo.deadline).toLocaleDateString()}` : ''}`).join('\n')}\n\nStay organized and keep up the great work!\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; padding: 30px 20px 20px 20px; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 80px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px; text-align: center; color: #332B42;">📋 Your Weekly To-Dos</h1>
            
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              Here are your next <strong>${todos.length}</strong> upcoming to-do items to help you stay on track this week:
            </p>
            
            <div style="margin: 20px 0;">
              ${buildTodoList()}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/todo" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                View All Tasks
              </a>
            </div>
            
            <div style="background-color: #E0F2FE; border-left: 4px solid #3B82F6; padding: 16px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #1E40AF; margin: 0; font-family: 'Work Sans', Arial, sans-serif; font-size: 14px;">
                💡 <strong>Pro tip:</strong> Set aside time each Sunday to review your tasks for the upcoming week. Small, consistent progress leads to big results!
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Stay organized and keep up the great work!<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
          
          <div style="background-color: #f8f6f4; padding: 20px; text-align: center;">
            <a href="https://weddingpaige.com" style="display: inline-block; margin-bottom: 10px;">
              <img src="https://weddingpaige.com/PaigeFav.png" alt="Paige" style="width: 32px; height: auto;" />
            </a>
            <p style="margin: 0; font-size: 12px; color: #7A7A7A; font-family: 'Work Sans', Arial, sans-serif;">
              This email was sent from Paige - your wedding planning assistant
            </p>
          </div>
        </div>
      </div>
    `
  };

  return sendEmail(emailContent, userId);
};
