import { EmailContent, sendEmail } from './emailService';

// Task Assignment Notifications
export const sendTaskAssignmentEmail = async (
  toEmail: string,
  userName: string,
  taskName: string,
  action: 'assigned' | 'completed' | 'updated' | 'overdue',
  assignedBy?: string,
  dueDate?: string,
  userId?: string
): Promise<boolean> => {
  const getTaskContent = () => {
    switch (action) {
      case 'assigned':
        return {
          subject: `📋 New Task Assigned: "${taskName}"`,
          title: "New Task Assigned",
          message: `You've been assigned a new task: "${taskName}"${assignedBy ? ` by ${assignedBy}` : ''}${dueDate ? `. Due: ${dueDate}` : ''}.`,
          buttonText: "View Task",
          buttonLink: "/todo"
        };
      case 'completed':
        return {
          subject: `✅ Task Completed: "${taskName}"`,
          title: "Task Completed",
          message: `Great job! The task "${taskName}" has been completed${assignedBy ? ` by ${assignedBy}` : ''}.`,
          buttonText: "View Tasks",
          buttonLink: "/todo"
        };
      case 'updated':
        return {
          subject: `📝 Task Updated: "${taskName}"`,
          title: "Task Updated",
          message: `The task "${taskName}" has been updated${assignedBy ? ` by ${assignedBy}` : ''}${dueDate ? `. New due date: ${dueDate}` : ''}.`,
          buttonText: "View Task",
          buttonLink: "/todo"
        };
      case 'overdue':
        return {
          subject: `⚠️ Overdue Task: "${taskName}"`,
          title: "Task Overdue",
          message: `The task "${taskName}" is now overdue${dueDate ? ` (was due: ${dueDate})` : ''}. Please complete it as soon as possible.`,
          buttonText: "Complete Task",
          buttonLink: "/todo"
        };
    }
  };

  const content = getTaskContent();

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
              <h3 style="color: #A85C36; margin: 0 0 10px 0; font-family: 'Work Sans', Arial, sans-serif;">Task Details:</h3>
              <p style="margin: 0; font-size: 14px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
                <strong>Task:</strong> ${taskName}
              </p>
              ${assignedBy ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;"><strong>Assigned by:</strong> ${assignedBy}</p>` : ''}
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

// Wedding Planning Milestone Emails
export const sendMilestoneEmail = async (
  toEmail: string,
  userName: string,
  milestone: '12-months' | '6-months' | '3-months' | '1-month' | '1-week',
  weddingDate: string,
  userId?: string
): Promise<boolean> => {
  const getMilestoneContent = () => {
    switch (milestone) {
      case '12-months':
        return {
          subject: "🎉 12 Months to Go - Let's Start Planning!",
          title: "12 Months to Go!",
          message: `Congratulations! You have 12 months until your wedding on ${weddingDate}. This is the perfect time to start planning and booking your key vendors.`,
          tips: [
            "Set your wedding budget and guest list",
            "Book your venue and photographer",
            "Start researching vendors",
            "Create your wedding website"
          ],
          buttonText: "Start Planning",
          buttonLink: "/dashboard"
        };
      case '6-months':
        return {
          subject: "📅 6 Months to Go - Time to Book Vendors!",
          title: "6 Months to Go!",
          message: `You're halfway there! With 6 months until your wedding on ${weddingDate}, it's time to book your remaining vendors and finalize details.`,
          tips: [
            "Book your florist, DJ, and caterer",
            "Order your wedding dress/suit",
            "Send save-the-dates",
            "Plan your honeymoon"
          ],
          buttonText: "Continue Planning",
          buttonLink: "/dashboard"
        };
      case '3-months':
        return {
          subject: "⏰ 3 Months to Go - Final Details Time!",
          title: "3 Months to Go!",
          message: `The countdown is on! With 3 months until your wedding on ${weddingDate}, it's time to finalize all the details and start the final preparations.`,
          tips: [
            "Send out wedding invitations",
            "Schedule hair and makeup trials",
            "Finalize your menu and timeline",
            "Book transportation"
          ],
          buttonText: "Finalize Details",
          buttonLink: "/dashboard"
        };
      case '1-month':
        return {
          subject: "🚀 1 Month to Go - Final Countdown!",
          title: "1 Month to Go!",
          message: `The final month is here! Your wedding on ${weddingDate} is just around the corner. Time to make sure everything is perfect!`,
          tips: [
            "Confirm all vendor details",
            "Pick up your wedding rings",
            "Finalize seating arrangements",
            "Pack for your honeymoon"
          ],
          buttonText: "Final Preparations",
          buttonLink: "/dashboard"
        };
      case '1-week':
        return {
          subject: "💍 1 Week to Go - You're Almost There!",
          title: "1 Week to Go!",
          message: `This is it! Your wedding on ${weddingDate} is just one week away. You've got this!`,
          tips: [
            "Confirm final details with all vendors",
            "Get your marriage license",
            "Pack your wedding day essentials",
            "Relax and enjoy the moment!"
          ],
          buttonText: "Final Week Checklist",
          buttonLink: "/dashboard"
        };
    }
  };

  const content = getMilestoneContent();

  const emailContent: EmailContent = {
    to: toEmail,
    subject: content.subject,
    text: `Hello ${userName},\n\n${content.message}\n\nKey tasks for this milestone:\n${content.tips.map(tip => `• ${tip}`).join('\n')}\n\nVisit Paige to ${content.buttonText.toLowerCase()}.\n\nBest regards,\nThe Paige Team`,
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
              <h3 style="color: #A85C36; margin: 0 0 15px 0; font-family: 'Work Sans', Arial, sans-serif;">Key Tasks for This Milestone:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #332B42; font-family: 'Work Sans', Arial, sans-serif;">
                ${content.tips.map(tip => `<li style="margin-bottom: 8px;">${tip}</li>`).join('')}
              </ul>
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
