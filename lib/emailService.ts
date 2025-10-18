import sgMail from '@sendgrid/mail';

interface EmailContent {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const sendEmail = async (emailContent: EmailContent): Promise<boolean> => {
  try {
    // Initialize SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

    const msg = {
      to: emailContent.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'hello@weddingpaige.com',
        name: 'Paige AI'
      },
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    await sgMail.send(msg);
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
  // Calculate days until wedding if date is available
  let daysUntilWedding: number | null = null;
  let weddingDateFormatted: string | null = null;
  
  if (userData?.weddingDate && !userData?.weddingDateUndecided) {
    try {
      const weddingDateObj = new Date(userData.weddingDate);
      
      // Check if the date is valid
      if (!isNaN(weddingDateObj.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const timeDiff = weddingDateObj.getTime() - today.getTime();
        daysUntilWedding = Math.ceil(timeDiff / (1000 * 3600 * 24));
        weddingDateFormatted = weddingDateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        console.log('📅 Wedding date processed:', {
          original: userData.weddingDate,
          parsed: weddingDateObj,
          formatted: weddingDateFormatted,
          daysUntil: daysUntilWedding
        });
      } else {
        console.error('❌ Invalid wedding date:', userData.weddingDate);
      }
    } catch (error) {
      console.error('❌ Error processing wedding date:', error, 'Date value:', userData.weddingDate);
    }
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
      // Extract city from full address (e.g., "Yorkville Ct, Dallas, TX, USA" -> "Dallas, TX")
      const extractCity = (fullAddress: string) => {
        const parts = fullAddress.split(', ');
        if (parts.length >= 2) {
          return `${parts[parts.length - 3] || parts[parts.length - 2]}, ${parts[parts.length - 2]}`;
        }
        return fullAddress;
      };
      
      const cityLocation = extractCity(userData.weddingLocation);
      
      statusItems += `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #10B981; font-size: 18px; margin-right: 10px;">✓</span>
          <span style="color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
            <strong>Planning in ${cityLocation}</strong> - great choice!
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
      steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">${stepNumber}. Set your wedding date in Settings</li>`);
      stepNumber++;
    }
    
    if (!hasLocation) {
      steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">${stepNumber}. Add your wedding location</li>`);
      stepNumber++;
    }
    
    if (!hasVenue) {
      steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">${stepNumber}. Browse and select your wedding venue</li>`);
      stepNumber++;
    }
    
    steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">${stepNumber}. Import your vendor contacts</li>`);
    stepNumber++;
    steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">${stepNumber}. Create your first mood board</li>`);
    stepNumber++;
    steps.push(`<li style="margin-bottom: 10px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">${stepNumber}. Set up your guest list and seating chart</li>`);
    
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
          
          <div style="padding: 0 30px 30px 30px; background-color: #ffffff;">
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
  const alertMessage = currentCredits <= 0 
    ? `You've run out of credits! Upgrade your plan to continue using Paige's AI features.`
    : `You have ${currentCredits} credits remaining. Consider upgrading your plan to avoid interruptions.`;

  const emailContent: EmailContent = {
    to: toEmail,
    subject: `⚠️ Credit Alert: ${alertType}`,
    text: `Hello ${userName},\n\n${alertMessage}\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; padding: 30px 20px 20px 20px; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 80px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px; text-align: center; color: #332B42;">⚠️ Credit Alert</h1>
            
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              ${alertMessage}
            </p>
            
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #A85C36;">
              <p style="margin: 0; font-size: 15px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif; line-height: 1.6;">
                <strong>Current Status:</strong><br>
                • Credits Remaining: <strong style="color: ${currentCredits <= 0 ? '#EF4444' : '#A85C36'}">${currentCredits}</strong><br>
                • Subscription: ${subscriptionTier}<br>
                • User Type: ${userType}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/settings" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                ${currentCredits <= 0 ? 'Upgrade Now' : 'Manage Credits'}
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
  return await sendEmail(emailContent);
};

export const sendWeeklyTodoDigestEmail = async (
  toEmail: string,
  userName: string,
  todos: Array<{
    id: string,
    name: string,
    deadline?: Date | string | null,
    category?: string,
    listName?: string,
  }>,
  userId?: string
): Promise<boolean> => {
  // Format todos for email display with the original card-based design
  const formatTodos = () => {
    if (todos.length === 0) {
      return '<p style="color: #666; font-family: \'Work Sans\', Arial, sans-serif;">No upcoming tasks found.</p>';
    }
    
    return todos.map((todo, index) => {
      // Calculate days until deadline
      let dueText = 'No deadline';
      let dueColor = '#666';
      
      if (todo.deadline) {
        const deadline = new Date(todo.deadline);
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          dueText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
          dueColor = '#EF4444';
        } else if (diffDays === 0) {
          dueText = 'Due today';
          dueColor = '#F59E0B';
        } else if (diffDays === 1) {
          dueText = 'Due tomorrow';
          dueColor = '#F59E0B';
        } else {
          dueText = `Due in ${diffDays} days`;
          dueColor = '#F59E0B';
        }
      }
      
      const categoryText = todo.category || 'Full Wedding Checklist';
      const listText = todo.listName ? ` (${todo.listName})` : '';
      
      return `
        <div style="margin-bottom: 16px; padding: 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #E5E7EB;">
          <div style="font-weight: 600; color: #1F2937; font-family: 'Work Sans', Arial, sans-serif; margin-bottom: 8px; font-size: 16px; line-height: 1.4;">
            ${todo.name}
          </div>
          <div style="margin-bottom: 8px;">
            <div style="font-size: 14px; color: #6B7280; font-family: 'Work Sans', Arial, sans-serif;">
              ${categoryText}${listText}
            </div>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: ${dueColor}; font-family: 'Work Sans', Arial, sans-serif;">
            ${dueText}
          </div>
        </div>
      `;
    }).join('');
  };

  const emailContent: EmailContent = {
    to: toEmail,
    subject: "📋 Your Weekly To-Dos",
    text: `Hello ${userName},\n\nHere are your next 5 upcoming to-do items to help you stay on track this week:\n\n${todos.map((todo, index) => `${index + 1}. ${todo.name}${todo.deadline ? ` (Due: ${new Date(todo.deadline).toLocaleDateString()})` : ''}`).join('\n')}\n\nBest regards,\nThe Paige Team`,
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
              Here are your next 5 upcoming to-do items to help you stay on track this week:
            </p>
            
            <div style="margin: 20px 0;">
              ${formatTodos()}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/todo" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                View All To-Dos
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
  
  return await sendEmail(emailContent);
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
  const overdueItemsList = overdueItems.map(item => 
    `<li style="margin-bottom: 10px; font-family: 'Work Sans', Arial, sans-serif;">
      <strong>${item.name}</strong> - $${item.amount.toLocaleString()} 
      <span style="color: #A85C36; font-weight: 600;">(${item.daysOverdue} days overdue)</span>
    </li>`
  ).join('');

  const totalOverdue = overdueItems.reduce((sum, item) => sum + item.amount, 0);

  const emailContent: EmailContent = {
    to: toEmail,
    subject: "⚠️ Overdue Budget Payments Need Your Attention",
    text: `Hello ${userName},\n\nYou have ${overdueItems.length} overdue budget payment(s) totaling $${totalOverdue.toLocaleString()}:\n\n${overdueItems.map(item => `• ${item.name} - $${item.amount.toLocaleString()} (${item.daysOverdue} days overdue)`).join('\n')}\n\nPlease review and update these payments to stay on track!\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; padding: 30px 20px 20px 20px; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 80px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px; text-align: center; color: #332B42;">⚠️ Overdue Budget Payments</h1>
            
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              You have <strong>${overdueItems.length} overdue budget payment(s)</strong> totaling <strong style="color: #A85C36;">$${totalOverdue.toLocaleString()}</strong> that need your attention:
            </p>
            
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #A85C36;">
              <ul style="margin: 0; padding-left: 20px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
                ${overdueItemsList}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/budget" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                Review Budget Payments
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
  return await sendEmail(emailContent);
};

export const sendBudgetCreationReminderEmail = async (
  toEmail: string,
  userName: string,
  userId?: string
): Promise<boolean> => {
  const emailContent: EmailContent = {
    to: toEmail,
    subject: "💰 Start Planning Your Wedding Budget",
    text: `Hello ${userName},\n\nIt's time to start planning your wedding budget! Create your budget to track expenses and stay on track with your wedding planning.\n\nBest regards,\nThe Paige Team`,
    html: `
      <div style="background-color: #F8F6F4; padding: 20px; min-height: 100vh; font-family: 'Work Sans', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #D6D3D1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; padding: 30px 20px 20px 20px; background-color: #ffffff;">
            <a href="https://weddingpaige.com" style="display: inline-block;">
              <img src="https://weddingpaige.com/PaigeFinal.png" alt="Paige AI" style="width: 80px; height: auto;" />
            </a>
          </div>
          
          <div style="padding: 1rem; background-color: #ffffff;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', Arial, sans-serif; letter-spacing: 0.5px; text-align: center; color: #332B42;">💰 Start Planning Your Wedding Budget</h1>
            
            <p style="font-size: 16px; color: #332B42; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #332B42; line-height: 1.6; margin-bottom: 20px; font-family: 'Work Sans', Arial, sans-serif;">
              It's time to start planning your wedding budget! Create your budget to track expenses and stay on track with your wedding planning.
            </p>
            
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #A85C36;">
              <p style="margin: 0; font-size: 15px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif; line-height: 1.6;">
                <strong>Why create a budget?</strong><br>
                • Track all wedding expenses in one place<br>
                • Set realistic spending limits<br>
                • Avoid overspending on any category<br>
                • Stay organized throughout planning
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/budget" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px; font-family: 'Work Sans', Arial, sans-serif; border: 1px solid #A85C36;">
                Create My Budget
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
  return await sendEmail(emailContent);
};

// Re-export functions that were removed but are still being imported
