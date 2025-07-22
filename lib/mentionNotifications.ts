// lib/mentionNotifications.ts
import { getMentionIds, parseMentions } from '@/utils/mentionUtils';
import { type VendorComment } from './vendorComments';

export interface MentionNotification {
  id: string;
  commentId: string;
  vendorId: string;
  vendorName: string;
  commentContent: string;
  mentionedBy: string;
  mentionedByAvatar?: string;
  mentionedUser: string;
  createdAt: Date;
  isRead: boolean;
}

/**
 * Create notification data for @mentions
 * @param comment - The comment containing mentions
 * @param mentionedUser - The user being mentioned
 * @returns Notification data
 */
export function createMentionNotification(
  comment: VendorComment,
  mentionedUser: string
): Omit<MentionNotification, 'id' | 'createdAt' | 'isRead'> {
  return {
    commentId: comment.id,
    vendorId: comment.vendorId,
    vendorName: comment.vendorName,
    commentContent: comment.content,
    mentionedBy: comment.authorName,
    mentionedByAvatar: comment.authorAvatar,
    mentionedUser
  };
}

/**
 * Extract mentioned users from comment content
 * @param content - Comment content
 * @returns Array of mentioned user names
 */
export function extractMentionedUsers(content: string): string[] {
  const mentions = parseMentions(content);
  return mentions.map(mention => mention.name);
}

/**
 * Check if a comment contains @mentions
 * @param content - Comment content
 * @returns True if comment contains mentions
 */
export function hasMentions(content: string): boolean {
  return content.includes('@');
}

/**
 * Format mention notification message
 * @param notification - The notification data
 * @returns Formatted message
 */
export function formatMentionMessage(notification: MentionNotification): string {
  return `${notification.mentionedBy} mentioned you in a comment about ${notification.vendorName}`;
}

/**
 * Get notification preview text
 * @param commentContent - The comment content
 * @param maxLength - Maximum length for preview
 * @returns Preview text
 */
export function getNotificationPreview(commentContent: string, maxLength: number = 100): string {
  if (commentContent.length <= maxLength) {
    return commentContent;
  }
  
  // Try to break at a word boundary
  const truncated = commentContent.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
} 