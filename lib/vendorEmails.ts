import { EmailContent, sendEmail } from './emailService';

// Vendor Communication Emails
export const sendVendorCommunicationEmail = async (
  toEmail: string,
  userName: string,
  vendorName: string,
  messageType: 'new-message' | 'quote-received' | 'booking-confirmed' | 'payment-reminder',
  messageContent?: string,
  quoteAmount?: number,
  dueDate?: string,
  userId?: string
): Promise<boolean> => {
  const getVendorContent = () => {
    switch (messageType) {
      case 'new-message':
        return {
          subject: `💬 New Message from ${vendorName}`,
          title: "New Vendor Message",
          message: `You have a new message from ${vendorName}${messageContent ? `: "${messageContent}"` : ''}.`,
          buttonText: "View Message",
          buttonLink: "/messages"
        };
      case 'quote-received':
        return {
          subject: `💰 Quote Received from ${vendorName}`,
          title: "Quote Received",
          message: `Great news! ${vendorName} has sent you a quote${quoteAmount ? ` for $${quoteAmount}` : ''}.`,
          buttonText: "View Quote",
          buttonLink: "/messages"
        };
      case 'booking-confirmed':
        return {
          subject: `✅ Booking Confirmed with ${vendorName}`,
          title: "Booking Confirmed",
          message: `Congratulations! Your booking with ${vendorName} has been confirmed.`,
          buttonText: "View Booking",
          buttonLink: "/messages"
        };
      case 'payment-reminder':
        return {
          subject: `💳 Payment Reminder for ${vendorName}`,
          title: "Payment Reminder",
          message: `This is a friendly reminder that payment is due for ${vendorName}${dueDate ? ` by ${dueDate}` : ''}.`,
          buttonText: "Make Payment",
          buttonLink: "/messages"
        };
    }
  };

  const content = getVendorContent();

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
              <h3 style="color: #A85C36; margin: 0 0 10px 0; font-family: 'Work Sans', Arial, sans-serif;">Vendor Details:</h3>
              <p style="margin: 0; font-size: 14px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
                <strong>Vendor:</strong> ${vendorName}
              </p>
              ${quoteAmount ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>Quote Amount:</strong> $${quoteAmount}</p>` : ''}
              ${dueDate ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>Due Date:</strong> ${dueDate}</p>` : ''}
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
