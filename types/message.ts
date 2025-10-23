export interface Message {
  id: string;
  subject: string;
  body: string;
  timestamp: string;
  from: string;
  to: string;
  source: 'gmail' | 'manual' | 'inapp';
  isRead: boolean;
  gmailMessageId?: string;
  threadId?: string;
  userId: string;
  attachments?: { name: string }[];
  direction: 'sent' | 'received';
  parentMessageId?: string;
  messageIdHeader?: string;
  // New fields for in-app messaging
  inAppMessageId?: string;
  notificationSent?: boolean;
  // Legacy fields for backward compatibility
  via?: string;
  contactId?: string;
  createdAt?: Date;
  fullBody?: string;
  // Gmail import date field
  date?: Date;
}

// Simple message interface for basic messaging (used in app/page.tsx)
export interface SimpleMessage {
  id: string;
  via: string;
  timestamp: string;
  body: string;
  contactId: string;
  createdAt: Date;
  userId: string;
  attachments?: { name: string; }[];
} 