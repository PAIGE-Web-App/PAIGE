/**
 * Centralized Gmail OAuth Scopes Configuration
 * 
 * This file centralizes all Gmail-related OAuth scopes to avoid hardcoding
 * and ensure consistency across the application.
 */

export const GMAIL_SCOPES = {
  // Core Gmail scopes
  READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  SEND: 'https://www.googleapis.com/auth/gmail.send',
  MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  
  // Calendar scopes (used in some flows)
  CALENDAR: 'https://www.googleapis.com/auth/calendar',
  CALENDAR_EVENTS: 'https://www.googleapis.com/auth/calendar.events',
} as const;

/**
 * Get the complete scope string for Gmail integration
 * This includes all necessary scopes for full Gmail functionality
 */
export function getGmailScopeString(): string {
  return [
    GMAIL_SCOPES.READONLY,
    GMAIL_SCOPES.SEND,
    GMAIL_SCOPES.MODIFY,
  ].join(' ');
}

/**
 * Get the complete scope string for Gmail + Calendar integration
 * This includes Gmail and Calendar scopes for full integration
 */
export function getGmailCalendarScopeString(): string {
  return [
    GMAIL_SCOPES.READONLY,
    GMAIL_SCOPES.SEND,
    GMAIL_SCOPES.MODIFY,
    GMAIL_SCOPES.CALENDAR,
    GMAIL_SCOPES.CALENDAR_EVENTS,
  ].join(' ');
}

/**
 * Add Gmail scopes to a GoogleAuthProvider
 * @param provider - The GoogleAuthProvider instance
 * @param includeCalendar - Whether to include Calendar scopes (default: false)
 */
export function addGmailScopes(
  provider: any, 
  includeCalendar: boolean = false
): void {
  provider.addScope(GMAIL_SCOPES.READONLY);
  provider.addScope(GMAIL_SCOPES.SEND);
  provider.addScope(GMAIL_SCOPES.MODIFY);
  
  if (includeCalendar) {
    provider.addScope(GMAIL_SCOPES.CALENDAR);
    provider.addScope(GMAIL_SCOPES.CALENDAR_EVENTS);
  }
}

/**
 * Check if a scope string contains all required Gmail scopes
 * @param scopeString - The scope string to check
 * @returns boolean indicating if all required scopes are present
 */
export function hasRequiredGmailScopes(scopeString: string): boolean {
  const requiredScopes = [
    GMAIL_SCOPES.READONLY,
    GMAIL_SCOPES.SEND,
    GMAIL_SCOPES.MODIFY,
  ];
  
  return requiredScopes.every(scope => scopeString.includes(scope));
}

/**
 * Get missing Gmail scopes from a scope string
 * @param scopeString - The scope string to check
 * @returns Array of missing scope strings
 */
export function getMissingGmailScopes(scopeString: string): string[] {
  const requiredScopes = [
    GMAIL_SCOPES.READONLY,
    GMAIL_SCOPES.SEND,
    GMAIL_SCOPES.MODIFY,
  ];
  
  return requiredScopes.filter(scope => !scopeString.includes(scope));
}
