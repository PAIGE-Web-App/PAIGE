import nodemailer from 'nodemailer';

interface EmailContent {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const sendEmail = async (emailContent: EmailContent): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@weddingpaige.com',
      to: emailContent.to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

export const sendMissedDeadlineEmail = async (
  toEmail: string,
  userName: string,
  overdueTodos: Array<{
    id: string;
    name: string;
    deadline: Date;
    category?: string;
    listName?: string;
    daysOverdue: number;
  }>,
  userId?: string
): Promise<boolean> => {
  // Format overdue todo items for email
  const buildOverdueList = () => {
    if (overdueTodos.length === 0) {
      return '<p style="color: #666; font-family: \'Work Sans\', Arial, sans-serif;">No overdue tasks found.</p>';
    }
    
    return overdueTodos.map((todo, index) => {
      const overdueText = todo.daysOverdue === 1 
        ? `<span style="color: #EF4444;">Overdue by 1 day</span>`
        : `<span style="color: #EF4444;">Overdue by ${todo.daysOverdue} days</span>`;
      
      return `
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-start;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif; font-weight: 600;">
                ${todo.name}
              </h4>
              ${todo.category ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #666; font-family: 'Work Sans', Arial, sans-serif;">${todo.category}</p>` : ''}
              ${todo.listName ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #999; font-family: 'Work Sans', Arial, sans-serif;">📋 ${todo.listName}</p>` : ''}
              <p style="margin: 4px 0 0 0; font-size: 13px; font-family: 'Work Sans', Arial, sans-serif;">${overdueText}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  const emailContent: EmailContent = {
    to: toEmail,
    subject: "⚠️ Overdue Tasks Need Your Attention",
    text: `Hello ${userName},\n\nYou have ${overdueTodos.length} overdue task(s) that need your attention:\n\n${overdueTodos.map((todo, i) => `${i + 1}. ${todo.name} - Overdue by ${todo.daysOverdue} days`).join('\n')}\n\nPlease review and update these tasks to stay on track!\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; padding: 30px 20px 20px 20px; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 80px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px; text-align: center; color: #332B42;">⚠️ Overdue Tasks Alert</h1>
            
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              You have <strong>${overdueTodos.length}</strong> task(s) that are overdue and need your attention:
            </p>
            
            <div style="margin: 20px 0;">
              ${buildOverdueList()}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/todo" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                Review & Update Tasks
              </a>
            </div>
            
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #92400E; margin: 0; font-family: 'Work Sans', Arial, sans-serif; font-size: 14px;">
                💡 <strong>Pro tip:</strong> Consider updating the deadline if the task is no longer urgent, or mark it as complete if you've finished it!
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

  return await sendEmail(emailContent);
};

// Missing function exports for backward compatibility
export const sendNotificationEmail = async (
  toEmail: string,
  userName: string,
  contactName: string,
  messageBody: string,
  userId?: string
): Promise<boolean> => {
  const emailContent: EmailContent = {
    to: toEmail,
    subject: `New Message from ${contactName}`,
    text: `Hello ${userName},\n\nYou have a new message from ${contactName} in Paige:\n\n"${messageBody}"\n\nView and reply at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/messages\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; text-align: center; color: #332B42;">New Message from ${contactName}</h1>
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
        </div>
      </div>
    `
  };
  return await sendEmail(emailContent);
};

export const sendWelcomeEmail = async (
  toEmail: string,
  userName: string,
  userData?: any
): Promise<boolean> => {
  const emailContent: EmailContent = {
    to: toEmail,
    subject: "Welcome to Paige! 🎉",
    text: `Hello ${userName},\n\nWelcome to Paige! Your wedding planning journey starts here.\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; text-align: center; color: #332B42;">Welcome to Paige! 🎉</h1>
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              Welcome to Paige! Your wedding planning journey starts here.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Best regards,<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
        </div>
      </div>
    `
  };
  return await sendEmail(emailContent);
};

export const sendCreditAlertEmail = async (
  toEmail: string,
  userName: string,
  alertType: string,
  currentCredits: number,
  subscriptionTier: string,
  userType: string
): Promise<boolean> => {
  const emailContent: EmailContent = {
    to: toEmail,
    subject: `Credit Alert: ${alertType}`,
    text: `Hello ${userName},\n\nYour credits are running low (${currentCredits} remaining). Consider upgrading your plan.\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; text-align: center; color: #332B42;">Credit Alert</h1>
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              Your credits are running low (${currentCredits} remaining). Consider upgrading your plan.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Best regards,<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
        </div>
      </div>
    `
  };
  return await sendEmail(emailContent);
};

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
  // Use the existing weekly digest logic
  const { sendWeeklyTodoDigest } = await import('./emailIntegrations');
  await sendWeeklyTodoDigest(userId || '');
  return true;
};

export const sendBudgetPaymentOverdueEmail = async (
  toEmail: string,
  userName: string,
  overdueItems: Array<{
    id: string;
    name: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }>,
  userId?: string
): Promise<boolean> => {
  const emailContent: EmailContent = {
    to: toEmail,
    subject: "Budget Payment Overdue Reminder",
    text: `Hello ${userName},\n\nYou have overdue budget payments that need attention.\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; text-align: center; color: #332B42;">Budget Payment Overdue</h1>
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              You have overdue budget payments that need attention.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Best regards,<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
        </div>
      </div>
    `
  };
  return await sendEmail(emailContent);
};

export const sendBudgetCreationReminderEmail = async (
  toEmail: string,
  userName: string,
  userId?: string
): Promise<boolean> => {
  const emailContent: EmailContent = {
    to: toEmail,
    subject: "Start Planning Your Wedding Budget",
    text: `Hello ${userName},\n\nIt's time to start planning your wedding budget!\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; text-align: center; color: #332B42;">Start Planning Your Wedding Budget</h1>
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              It's time to start planning your wedding budget!
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px; font-family: 'Work Sans', Arial, sans-serif;">
              Best regards,<br>
              <strong>The Paige Team</strong>
            </p>
          </div>
        </div>
      </div>
    `
  };
  return await sendEmail(emailContent);
};

// Re-export functions that were removed but are still being imported
