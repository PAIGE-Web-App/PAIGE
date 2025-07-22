// utils/mentionUtils.ts

export interface MentionableUser {
  id: string;
  name: string;
  type: 'partner' | 'planner' | 'user';
  avatar?: string;
  email?: string;
}

export interface ParsedMention {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse text content to find @mentions
 * @param content - The text content to parse
 * @returns Array of parsed mentions with their positions
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const mentionRegex = /@(\w+)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const name = match[1];
    mentions.push({
      id: name.toLowerCase(), // For now, use name as ID
      name: name,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  return mentions;
}

/**
 * Get mentionable users for the current user
 * @param currentUserId - Current user's ID
 * @param currentUserName - Current user's name
 * @param partnerName - Partner's name (if exists)
 * @param partnerEmail - Partner's email (if exists)
 * @param plannerName - Wedding planner's name (if exists)
 * @param plannerEmail - Wedding planner's email (if exists)
 * @returns Array of users that can be mentioned
 */
export function getMentionableUsers(
  currentUserId: string,
  currentUserName: string,
  partnerName?: string | null,
  partnerEmail?: string | null,
  plannerName?: string | null,
  plannerEmail?: string | null
): MentionableUser[] {
  const users: MentionableUser[] = [];

  // Note: Current user is excluded to prevent self-tagging
  // This keeps the interface focused on collaboration

  // Add partner if name exists (email is optional)
  if (partnerName && partnerName.trim()) {
    users.push({
      id: 'partner',
      name: partnerName,
      type: 'partner',
      email: partnerEmail || undefined
    });
  }

  // Add wedding planner if name exists (email is optional)
  if (plannerName && plannerName.trim()) {
    users.push({
      id: 'planner',
      name: plannerName,
      type: 'planner',
      email: plannerEmail || undefined
    });
  }

  return users;
}

/**
 * Filter mentionable users based on search term
 * @param users - Array of mentionable users
 * @param searchTerm - Search term (without @)
 * @returns Filtered array of users
 */
export function filterMentionableUsers(users: MentionableUser[], searchTerm: string): MentionableUser[] {
  if (!searchTerm) return users;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return users.filter(user => 
    user.name.toLowerCase().includes(lowerSearchTerm)
  );
}

/**
 * Replace @mentions in text with formatted mentions
 * @param content - Original text content
 * @param mentions - Array of parsed mentions
 * @returns Formatted text with mentions
 */
export function formatMentions(content: string, mentions: ParsedMention[]): string {
  let formattedContent = content;
  
  // Sort mentions by start index in descending order to avoid index shifting
  const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);
  
  for (const mention of sortedMentions) {
    const before = formattedContent.substring(0, mention.startIndex);
    const after = formattedContent.substring(mention.endIndex);
    formattedContent = `${before}@${mention.name}${after}`;
  }
  
  return formattedContent;
}

/**
 * Extract mention search term from cursor position
 * @param content - Text content
 * @param cursorPosition - Current cursor position
 * @returns Search term and start position for @mention
 */
export function getMentionSearchTerm(content: string, cursorPosition: number): { searchTerm: string; startPosition: number } | null {
  // Look backwards from cursor position to find @ symbol
  let startPosition = cursorPosition;
  
  while (startPosition > 0) {
    startPosition--;
    if (content[startPosition] === '@') {
      const searchTerm = content.substring(startPosition + 1, cursorPosition).trim();
      return { searchTerm, startPosition };
    }
    
    // Stop if we hit a space or newline
    if (content[startPosition] === ' ' || content[startPosition] === '\n') {
      break;
    }
  }
  
  return null;
}

/**
 * Check if cursor is currently in a @mention
 * @param content - Text content
 * @param cursorPosition - Current cursor position
 * @returns True if cursor is in a @mention
 */
export function isInMention(content: string, cursorPosition: number): boolean {
  const mentionInfo = getMentionSearchTerm(content, cursorPosition);
  return mentionInfo !== null;
}

/**
 * Get unique mention IDs from text content
 * @param content - Text content
 * @returns Array of unique mention IDs
 */
export function getMentionIds(content: string): string[] {
  const mentions = parseMentions(content);
  const uniqueIds = new Set(mentions.map(m => m.id));
  return Array.from(uniqueIds);
} 