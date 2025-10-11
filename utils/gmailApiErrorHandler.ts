/**
 * Gmail API Error Handler
 * Dispatches custom events when Gmail API calls fail with auth errors
 */

export interface GmailApiError {
  status: number;
  message: string;
  requiresReauth?: boolean;
}

/**
 * Dispatches a custom event when Gmail API errors occur
 * This allows the GmailAuthContext to react immediately to auth failures
 */
export function dispatchGmailApiError(error: GmailApiError) {
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('gmail-api-error', {
      detail: { error }
    });
    window.dispatchEvent(customEvent);
    console.log('🚨 Gmail API error dispatched:', error);
  }
}

/**
 * Wrapper for fetch calls to Gmail APIs that automatically handles auth errors
 */
export async function gmailApiCall(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if this is an auth error
      if (response.status === 401 || errorData.requiresReauth) {
        dispatchGmailApiError({
          status: response.status,
          message: errorData.error || 'Gmail authentication failed',
          requiresReauth: errorData.requiresReauth
        });
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response;
  } catch (error) {
    // Re-throw the error after dispatching
    throw error;
  }
}

/**
 * Hook for components to manually trigger Gmail auth check
 * Useful for retry buttons or manual auth checks
 */
export function useGmailAuthCheck() {
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('gmail-api-error', {
      detail: { error: { status: 401, message: 'Manual auth check triggered' } }
    });
    window.dispatchEvent(customEvent);
  }
}
