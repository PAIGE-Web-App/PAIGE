// Utility to handle authentication errors globally
export const handleAuthError = (error: any, router: any) => {
  // Check if this is an authentication error
  const isAuthError = error?.message?.includes('authentication') || 
                     error?.message?.includes('auth') ||
                     error?.message?.includes('Too many authentication attempts') ||
                     error?.message?.includes('authentication loop') ||
                     error?.error?.includes('authentication') ||
                     error?.error?.includes('auth');

  if (isAuthError) {
    // Store error info in sessionStorage for the error page
    sessionStorage.setItem('authError', JSON.stringify({
      error: error.error || 'authentication_error',
      message: error.message || 'Authentication error occurred',
      retryAfter: error.retryAfter || 0,
      timestamp: Date.now()
    }));

    // Redirect to error page
    router.push('/error?type=auth');
    return true;
  }

  return false;
};

// Utility to check if we're in an authentication loop
export const isInAuthLoop = () => {
  const authError = sessionStorage.getItem('authError');
  if (!authError) return false;

  try {
    const error = JSON.parse(authError);
    const timeSinceError = Date.now() - error.timestamp;
    
    // If error was more than 5 minutes ago, clear it
    if (timeSinceError > 5 * 60 * 1000) {
      sessionStorage.removeItem('authError');
      return false;
    }

    return true;
  } catch {
    sessionStorage.removeItem('authError');
    return false;
  }
};

// Utility to clear authentication error state
export const clearAuthError = () => {
  sessionStorage.removeItem('authError');
};
