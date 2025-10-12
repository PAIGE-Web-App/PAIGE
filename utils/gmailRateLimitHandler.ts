/**
 * Gmail API Rate Limit Handler
 * Provides exponential backoff and retry logic for Gmail API calls
 */

export interface GmailRateLimitOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
}

export class GmailRateLimitHandler {
  private static readonly DEFAULT_OPTIONS: Required<GmailRateLimitOptions> = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    jitter: true
  };

  /**
   * Execute a Gmail API call with rate limit handling
   */
  static async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    options: GmailRateLimitOptions = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        lastError = error;

        // Check if this is a rate limit error
        if (this.isRateLimitError(error) && attempt < opts.maxRetries) {
          const delay = this.calculateDelay(attempt, opts, error);
          console.log(`Gmail rate limit hit, retrying after ${delay}ms (attempt ${attempt}/${opts.maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        // If not a rate limit error, or max retries reached, throw the error
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is a rate limit error
   */
  private static isRateLimitError(error: any): boolean {
    return (
      error.status === 429 ||
      error.code === 429 ||
      error.message?.toLowerCase().includes('rate limit') ||
      error.message?.toLowerCase().includes('quota exceeded') ||
      error.message?.toLowerCase().includes('user-rate limit') ||
      error.message?.toLowerCase().includes('daily limit')
    );
  }

  /**
   * Calculate delay for exponential backoff
   */
  private static calculateDelay(
    attempt: number,
    options: Required<GmailRateLimitOptions>,
    error: any
  ): number {
    // Try to get retry-after header from Gmail API
    const retryAfter = error.response?.headers?.['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000; // Convert seconds to milliseconds
    }

    // Calculate exponential backoff delay
    let delay = options.baseDelay * Math.pow(2, attempt - 1);

    // Add jitter to prevent thundering herd
    if (options.jitter) {
      delay = delay + Math.random() * 1000;
    }

    // Cap at max delay
    return Math.min(delay, options.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle Gmail API errors and return appropriate response
   */
  static handleGmailError(error: any): { success: false; error: string; requiresReauth?: boolean; status: number } {
    console.error('Gmail API error:', error);

    // Handle rate limit errors
    if (this.isRateLimitError(error)) {
      return {
        success: false,
        error: error.message || 'Gmail rate limit exceeded. Please wait before trying again.',
        status: 429
      };
    }

    // Handle authentication errors
    if (
      error.message?.includes('invalid_grant') ||
      error.message?.includes('invalid_token') ||
      error.message?.includes('unauthorized') ||
      error.message?.includes('forbidden') ||
      error.status === 401 ||
      error.status === 403
    ) {
      return {
        success: false,
        error: 'Gmail authentication expired. Please re-authenticate.',
        requiresReauth: true,
        status: 401
      };
    }

    // Handle quota exceeded errors
    if (error.message?.toLowerCase().includes('quota exceeded')) {
      return {
        success: false,
        error: 'Gmail daily quota exceeded. Please try again tomorrow.',
        status: 429
      };
    }

    // Generic error
    return {
      success: false,
      error: error.message || 'Gmail API error occurred.',
      status: 500
    };
  }
}
