/**
 * Gmail Authentication Error Handler
 * 
 * This utility provides a centralized way to handle Gmail authentication errors
 * that occur during actual API usage, and trigger the global reauth banner.
 * 
 * Key Features:
 * - Detects auth errors at the point of API usage
 * - Triggers global reauth banner automatically
 * - Provides user-friendly error messages
 * - Prevents excessive banner triggers
 */

export interface GmailErrorHandlerResult {
  shouldShowBanner: boolean;
  errorMessage: string;
  errorType: 'auth' | 'rate_limit' | 'permission' | 'network' | 'unknown';
  userMessage: string;
}

export class GmailAuthErrorHandler {
  /**
   * Handle Gmail API errors and determine if reauth banner should be shown
   */
  static handleGmailError(error: any, context: string = 'Gmail API'): GmailErrorHandlerResult {
    console.error(`${context} error:`, error);

    const status = error.status || error.code;
    const message = error.message || '';

    // Authentication errors (401)
    if (status === 401 || message.toLowerCase().includes('invalid credentials')) {
      return {
        shouldShowBanner: true,
        errorType: 'auth',
        errorMessage: message,
        userMessage: 'Your Gmail connection has expired. Please re-authenticate to continue.'
      };
    }

    // Permission errors (403)
    if (status === 403 || message.toLowerCase().includes('insufficient permission')) {
      return {
        shouldShowBanner: true,
        errorType: 'permission',
        errorMessage: message,
        userMessage: 'Gmail permissions need to be updated. Please re-authenticate to grant required permissions.'
      };
    }

    // Rate limit errors (429)
    if (status === 429 || message.toLowerCase().includes('rate limit')) {
      return {
        shouldShowBanner: false,
        errorType: 'rate_limit',
        errorMessage: message,
        userMessage: 'Gmail rate limit reached. Please try again in a few minutes.'
      };
    }

    // Network errors
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return {
        shouldShowBanner: false,
        errorType: 'network',
        errorMessage: message,
        userMessage: 'Network error. Please check your connection and try again.'
      };
    }

    // Unknown errors
    return {
      shouldShowBanner: false,
      errorType: 'unknown',
      errorMessage: message,
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }

  /**
   * Trigger the global Gmail reauth banner
   */
  static triggerReauthBanner() {
    // Dispatch a custom event that the GmailAuthContext can listen to
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('gmail-auth-required', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(event);
      console.log('Gmail reauth banner triggered via custom event');
    }
  }

  /**
   * Handle Gmail error and trigger banner if needed
   */
  static handleErrorAndTriggerBanner(error: any, context: string = 'Gmail API'): GmailErrorHandlerResult {
    const result = this.handleGmailError(error, context);
    
    if (result.shouldShowBanner) {
      this.triggerReauthBanner();
    }
    
    return result;
  }
}

