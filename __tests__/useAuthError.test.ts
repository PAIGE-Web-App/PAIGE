/**
 * Test for useAuthError hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAuthError } from '@/hooks/useAuthError';

describe('useAuthError', () => {
  test('should handle Firebase auth errors correctly', () => {
    const { result } = renderHook(() => useAuthError());

    // Test invalid credentials error
    act(() => {
      const error = result.current.handleError(
        { code: 'auth/invalid-credential' },
        'Login'
      );
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.message).toBe('Email or password is incorrect.');
    });

    // Test popup closed error
    act(() => {
      const error = result.current.handleError(
        { code: 'auth/popup-closed-by-user' },
        'Google Login'
      );
      expect(error.code).toBe('POPUP_CLOSED');
      expect(error.message).toBe('Sign-in popup was closed. Please try again.');
    });

    // Test account exists error
    act(() => {
      const error = result.current.handleError(
        { code: 'auth/account-exists-with-different-credential' },
        'Google Login'
      );
      expect(error.code).toBe('ACCOUNT_EXISTS');
      expect(error.message).toBe('An account already exists with this email. Please use a different sign-in method.');
    });
  });

  test('should clear error correctly', () => {
    const { result } = renderHook(() => useAuthError());

    // Set an error
    act(() => {
      result.current.handleError({ code: 'test' }, 'Test');
    });

    expect(result.current.error).toBeTruthy();

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  test('should get correct error message', () => {
    const { result } = renderHook(() => useAuthError());

    const error = {
      code: 'INVALID_CREDENTIALS',
      message: 'Test message',
      timestamp: Date.now()
    };

    const message = result.current.getErrorMessage(error);
    expect(message).toBe('Email or password is incorrect.');
  });

  test('should check error type correctly', () => {
    const { result } = renderHook(() => useAuthError());

    act(() => {
      result.current.handleError({ code: 'INVALID_CREDENTIALS' }, 'Test');
    });

    expect(result.current.isError('INVALID_CREDENTIALS')).toBe(true);
    expect(result.current.isError('OTHER_ERROR')).toBe(false);
  });
});
