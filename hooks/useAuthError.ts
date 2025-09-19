/**
 * Enhanced Error Handling Hook
 * Works with existing AuthContext to provide better error management
 */

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface AuthError {
  code: string;
  message: string;
  timestamp: number;
  details?: any;
}

export function useAuthError() {
  const [error, setError] = useState<AuthError | null>(null);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`${context}:`, error);
    
    let message = "An unexpected error occurred. Please try again.";
    let code = "UNKNOWN_ERROR";
    
    if (error.code) {
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          code = 'INVALID_CREDENTIALS';
          message = "Email or password is incorrect.";
          break;
        case 'auth/popup-closed-by-user':
          code = 'POPUP_CLOSED';
          message = "Sign-in popup was closed. Please try again.";
          break;
        case 'auth/account-exists-with-different-credential':
          code = 'ACCOUNT_EXISTS';
          message = "An account already exists with this email. Please use a different sign-in method.";
          break;
        case 'auth/operation-not-allowed':
          code = 'OPERATION_NOT_ALLOWED';
          message = "This sign-in method is not enabled. Please try email signup.";
          break;
        case 'auth/unauthorized-domain':
          code = 'UNAUTHORIZED_DOMAIN';
          message = "This domain is not authorized for sign-in.";
          break;
        case 'auth/too-many-requests':
          code = 'TOO_MANY_REQUESTS';
          message = "Too many failed attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          code = 'NETWORK_ERROR';
          message = "Network error. Please check your connection and try again.";
          break;
        default:
          code = error.code || 'UNKNOWN_ERROR';
          message = error.message || message;
      }
    } else if (error.message) {
      message = error.message;
    }
    
    const authError: AuthError = {
      code,
      message,
      timestamp: Date.now(),
      details: error
    };
    
    setError(authError);
    return authError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getErrorMessage = useCallback((error: AuthError | null) => {
    if (!error) return null;
    
    const errorMessages: Record<string, string> = {
      'INVALID_CREDENTIALS': 'Email or password is incorrect.',
      'POPUP_CLOSED': 'Sign-in popup was closed. Please try again.',
      'ACCOUNT_EXISTS': 'An account already exists with this email. Please use a different sign-in method.',
      'OPERATION_NOT_ALLOWED': 'This sign-in method is not enabled. Please try email signup.',
      'UNAUTHORIZED_DOMAIN': 'This domain is not authorized for sign-in.',
      'TOO_MANY_REQUESTS': 'Too many failed attempts. Please try again later.',
      'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
    };

    return errorMessages[error.code] || error.message || 'An unexpected error occurred';
  }, []);

  const isError = useCallback((errorCode: string) => {
    return error?.code === errorCode;
  }, [error]);

  return {
    error,
    handleError,
    clearError,
    getErrorMessage,
    isError
  };
}
